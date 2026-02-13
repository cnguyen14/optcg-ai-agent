from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.models import Deck, DeckCard, Card, Leader
from app.schemas.deck import DeckCreate, DeckResponse, DeckUpdate
from app.database import get_db
from app.services.deck_validator import DeckValidator
from uuid import UUID
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", response_model=DeckResponse, status_code=201)
async def create_deck(
    deck_data: DeckCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new deck"""
    # Verify leader exists
    leader = await db.get(Leader, deck_data.leader_id)
    if not leader:
        raise HTTPException(status_code=404, detail="Leader not found")

    # Create deck (no user_id for MVP - no auth yet)
    deck = Deck(
        user_id=None,
        name=deck_data.name,
        description=deck_data.description,
        leader_id=deck_data.leader_id,
        is_public=deck_data.is_public,
    )

    db.add(deck)
    await db.flush()  # Get deck.id

    # Add cards to deck
    for card_item in deck_data.cards:
        # Verify card exists
        card = await db.get(Card, card_item.card_id)
        if not card:
            raise HTTPException(
                status_code=404, detail=f"Card {card_item.card_id} not found"
            )

        deck_card = DeckCard(
            deck_id=deck.id, card_id=card_item.card_id, quantity=card_item.quantity
        )
        db.add(deck_card)

    await db.commit()

    # Reload deck with relationships
    result = await db.execute(
        select(Deck)
        .where(Deck.id == deck.id)
        .options(
            selectinload(Deck.deck_cards).selectinload(DeckCard.card),
            selectinload(Deck.leader),
        )
    )
    deck = result.scalar_one()

    # Calculate and update deck stats
    validator = DeckValidator()
    stats = validator.calculate_deck_stats(deck)

    deck.total_cards = stats["total_cards"]
    deck.avg_cost = stats["avg_cost"]
    deck.color_distribution = stats["color_distribution"]

    await db.commit()

    # Reload with all relationships for response serialization
    result = await db.execute(
        select(Deck)
        .where(Deck.id == deck.id)
        .options(
            selectinload(Deck.deck_cards).selectinload(DeckCard.card),
            selectinload(Deck.leader),
        )
    )
    return result.scalar_one()


@router.get("/", response_model=list[DeckResponse])
async def list_decks(
    is_public: bool | None = Query(None, description="Filter by public/private"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List decks"""
    query = select(Deck).options(
        selectinload(Deck.deck_cards).selectinload(DeckCard.card),
        selectinload(Deck.leader),
    )

    # Filter by public
    if is_public is not None:
        query = query.where(Deck.is_public == is_public)

    # Apply pagination
    query = query.limit(limit).offset(offset).order_by(Deck.created_at.desc())

    result = await db.execute(query)
    decks = result.scalars().all()

    return decks


@router.get("/{deck_id}", response_model=DeckResponse)
async def get_deck(deck_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a specific deck by ID"""
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

    return deck


@router.patch("/{deck_id}", response_model=DeckResponse)
async def update_deck(
    deck_id: UUID, deck_update: DeckUpdate, db: AsyncSession = Depends(get_db)
):
    """Update a deck (metadata and/or cards)"""
    # Load deck with relationships
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

    # Update metadata fields
    if deck_update.name is not None:
        deck.name = deck_update.name
    if deck_update.description is not None:
        deck.description = deck_update.description
    if deck_update.is_public is not None:
        deck.is_public = deck_update.is_public

    # Update leader
    if deck_update.leader_id is not None:
        leader = await db.get(Leader, deck_update.leader_id)
        if not leader:
            raise HTTPException(status_code=404, detail="Leader not found")
        deck.leader_id = deck_update.leader_id

    # Replace cards if provided
    if deck_update.cards is not None:
        # Delete existing deck cards
        await db.execute(
            delete(DeckCard).where(DeckCard.deck_id == deck_id)
        )

        # Add new cards
        for card_item in deck_update.cards:
            card = await db.get(Card, card_item.card_id)
            if not card:
                raise HTTPException(
                    status_code=404, detail=f"Card {card_item.card_id} not found"
                )
            deck_card = DeckCard(
                deck_id=deck.id,
                card_id=card_item.card_id,
                quantity=card_item.quantity,
            )
            db.add(deck_card)

        await db.flush()

        # Reload to get new deck_cards for stats calculation
        await db.refresh(deck)
        result = await db.execute(
            select(Deck)
            .where(Deck.id == deck_id)
            .options(
                selectinload(Deck.deck_cards).selectinload(DeckCard.card),
                selectinload(Deck.leader),
            )
        )
        deck = result.scalar_one()

        # Recalculate stats
        validator = DeckValidator()
        stats = validator.calculate_deck_stats(deck)
        deck.total_cards = stats["total_cards"]
        deck.avg_cost = stats["avg_cost"]
        deck.color_distribution = stats["color_distribution"]

    await db.commit()

    # Reload with all relationships for response serialization
    result = await db.execute(
        select(Deck)
        .where(Deck.id == deck_id)
        .options(
            selectinload(Deck.deck_cards).selectinload(DeckCard.card),
            selectinload(Deck.leader),
        )
    )
    return result.scalar_one()


@router.delete("/{deck_id}", status_code=204)
async def delete_deck(deck_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a deck"""
    deck = await db.get(Deck, deck_id)

    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    await db.delete(deck)
    await db.commit()

    return None


@router.post("/{deck_id}/validate")
async def validate_deck(deck_id: UUID, db: AsyncSession = Depends(get_db)):
    """Validate a deck against One Piece TCG rules"""
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

    validator = DeckValidator()
    is_valid, errors = await validator.validate_deck(deck, db)

    return {"is_valid": is_valid, "errors": errors}
