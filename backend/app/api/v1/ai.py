from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models import Deck, DeckCard
from app.database import get_db
from app.agents.deck_analyzer_graph import create_deck_analyzer
from app.services.ai_provider import AIProviderFactory, AIProvider
from app.config import settings
from uuid import UUID
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def serialize_deck(deck: Deck) -> dict:
    """Serialize deck for AI analysis"""
    return {
        "id": str(deck.id),
        "name": deck.name,
        "description": deck.description,
        "leader": {
            "id": deck.leader.id,
            "name": deck.leader.name,
            "life": deck.leader.life,
            "colors": deck.leader.colors,
        }
        if deck.leader
        else None,
        "total_cards": deck.total_cards,
        "avg_cost": float(deck.avg_cost) if deck.avg_cost else 0,
        "color_distribution": deck.color_distribution or {},
        "deck_cards": [
            {
                "id": str(dc.id),
                "quantity": dc.quantity,
                "card": {
                    "id": dc.card.id,
                    "name": dc.card.name,
                    "type": dc.card.type,
                    "color": dc.card.color,
                    "cost": dc.card.cost,
                    "power": dc.card.power,
                    "counter": dc.card.counter,
                    "attribute": dc.card.attribute,
                    "text": dc.card.text,
                    "category": dc.card.category,
                },
            }
            for dc in deck.deck_cards
        ],
    }


@router.post("/analyze-deck/{deck_id}")
async def analyze_deck(
    deck_id: UUID,
    provider: AIProvider = Query(
        default=None,
        description="AI provider to use (anthropic, openai, openrouter, gemini, kimi)",
    ),
    model: str | None = Query(default=None, description="Specific model to use"),
    temperature: float = Query(default=0.7, ge=0, le=1, description="Temperature"),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze a deck using AI

    This endpoint uses a LangGraph agent to:
    1. Analyze card synergies
    2. Evaluate cost curve
    3. Generate recommendations
    4. Synthesize a comprehensive report

    Supports multiple AI providers:
    - anthropic: Claude (Sonnet, Opus, Haiku)
    - openai: GPT-4, GPT-3.5
    - openrouter: Multiple models via OpenRouter
    - gemini: Google Gemini
    - kimi: Moonshot AI (Kimi)
    """
    # Use default provider if none specified
    if provider is None:
        provider = settings.default_ai_provider

    # Fetch deck with all relationships
    result = await db.execute(
        select(Deck)
        .where(Deck.id == deck_id)
        .options(
            selectinload(Deck.deck_cards).selectinload(DeckCard.card),
            selectinload(Deck.leader),
        )
    )
    deck = result.scalar_one_or_none()

    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    # Serialize deck for AI
    deck_data = serialize_deck(deck)

    try:
        # Create analyzer with specified provider
        logger.info(
            f"Starting AI analysis for deck {deck_id} with provider: {provider}"
        )

        analyzer, llm = create_deck_analyzer(provider, model, temperature)

        # Run LangGraph analysis
        result = await analyzer.ainvoke(
            {
                "deck_data": deck_data,
                "user_query": "Analyze this deck comprehensively",
                "card_synergies": [],
                "meta_context": {},
                "cost_analysis": {},
                "recommendations": [],
                "final_report": "",
                "ai_provider": provider,
                "ai_model": model,
                "llm": llm,
            }
        )

        logger.info(f"AI analysis complete for deck {deck_id}")

        return {
            "deck_id": str(deck_id),
            "deck_name": deck.name,
            "provider": provider,
            "model": model,
            "analysis": result["final_report"],
            "synergies": result.get("card_synergies", []),
            "cost_analysis": result.get("cost_analysis", {}),
            "recommendations": result.get("recommendations", []),
        }

    except ValueError as e:
        # Handle missing API keys
        logger.error(f"Configuration error: {e}")
        raise HTTPException(
            status_code=400, detail=f"AI provider not configured: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error analyzing deck {deck_id}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error analyzing deck: {str(e)}"
        )


@router.get("/providers")
async def list_providers():
    """
    List available AI providers and their configuration status

    Returns information about which providers are configured
    and available for use, along with their supported models.
    """
    providers = AIProviderFactory.get_available_providers()

    return {
        "default_provider": settings.default_ai_provider,
        "providers": providers,
    }


@router.get("/providers/{provider}")
async def get_provider_info(provider: AIProvider):
    """Get information about a specific AI provider"""
    try:
        info = AIProviderFactory.get_provider_info(provider)
        return info
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/quick-tips/{deck_id}")
async def quick_tips(deck_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get quick tips for a deck (faster, simpler analysis)"""
    result = await db.execute(
        select(Deck)
        .where(Deck.id == deck_id)
        .options(
            selectinload(Deck.deck_cards).selectinload(DeckCard.card),
            selectinload(Deck.leader),
        )
    )
    deck = result.scalar_one_or_none()

    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    # Simple tips based on deck stats
    tips = []

    # Check total cards
    if deck.total_cards < 50:
        tips.append(
            f"Your deck has {deck.total_cards} cards. Add {50 - deck.total_cards} more cards to reach 50."
        )
    elif deck.total_cards > 50:
        tips.append(
            f"Your deck has {deck.total_cards} cards. Remove {deck.total_cards - 50} cards to reach 50."
        )

    # Check cost curve
    if deck.avg_cost and deck.avg_cost > 5:
        tips.append(
            f"Your average cost is {deck.avg_cost}, which is high. Consider adding more low-cost cards."
        )
    elif deck.avg_cost and deck.avg_cost < 3:
        tips.append(
            f"Your average cost is {deck.avg_cost}, which is low. Consider adding some high-impact late-game cards."
        )

    # Check color distribution
    if deck.color_distribution:
        dominant_color = max(deck.color_distribution, key=deck.color_distribution.get)
        tips.append(f"Your deck is primarily {dominant_color}-focused.")

    return {"deck_id": str(deck_id), "tips": tips}
