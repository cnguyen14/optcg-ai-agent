from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from app.services.ai_provider import AIProviderFactory, AIProvider
import logging

logger = logging.getLogger(__name__)


class DeckAnalysisState(TypedDict):
    """State for deck analysis graph"""

    deck_data: Dict
    user_query: str
    card_synergies: List[Dict]
    meta_context: Dict
    cost_analysis: Dict
    recommendations: List[Dict]
    final_report: str
    ai_provider: str  # Which AI provider to use
    ai_model: str | None  # Specific model to use (optional)
    llm: Any  # The LLM instance


async def synergy_analyzer_node(state: DeckAnalysisState):
    """Analyze card synergies in deck"""
    logger.info("Running synergy analyzer node")

    deck_data = state["deck_data"]
    llm = state["llm"]

    # Extract card information for analysis
    cards_info = []
    for deck_card in deck_data.get("deck_cards", []):
        card = deck_card.get("card", {})
        cards_info.append(
            {
                "name": card.get("name"),
                "type": card.get("type"),
                "cost": card.get("cost"),
                "category": card.get("category"),
                "attribute": card.get("attribute"),
                "quantity": deck_card.get("quantity"),
            }
        )

    # Use LLM to identify synergies
    prompt = f"""
    Analyze the following One Piece TCG deck for card synergies:

    Leader: {deck_data.get('leader', {}).get('name')}
    Cards: {cards_info}

    Identify key synergies:
    1. Category/tribal synergies (cards with same category)
    2. Attribute synergies (cards that boost specific attributes)
    3. Cost curve synergies (smooth DON!! progression)
    4. Combo synergies (cards that work well together)

    Return your analysis as a JSON-like structure focusing on the top 5 synergies.
    """

    try:
        response = await llm.ainvoke(prompt)
        state["card_synergies"] = [
            {
                "type": "llm_identified",
                "analysis": response.content,
            }
        ]
    except Exception as e:
        logger.error(f"Error in synergy analysis: {e}")
        state["card_synergies"] = []

    return state


async def cost_analyzer_node(state: DeckAnalysisState):
    """Analyze DON!! cost curve"""
    logger.info("Running cost analyzer node")

    deck_data = state["deck_data"]
    llm = state["llm"]

    # Calculate cost curve
    cost_curve = {}
    for deck_card in deck_data.get("deck_cards", []):
        card = deck_card["card"]
        cost = card.get("cost", 0)
        quantity = deck_card.get("quantity", 0)
        cost_curve[cost] = cost_curve.get(cost, 0) + quantity

    prompt = f"""
    Analyze this One Piece TCG deck's DON!! cost curve:

    Cost Curve: {cost_curve}
    Total Cards: {deck_data.get('total_cards', 0)}
    Average Cost: {deck_data.get('avg_cost', 0)}

    Consider DON!! progression:
    - Turn 1: 1 DON available
    - Turn 2: 3 DON available (2 new + 1 from turn 1)
    - Turn 3: 5 DON available
    - Turn 4: 7 DON available
    - Turn 5: 9 DON available

    Guidelines:
    - Early game (1-3 cost): Should have ~40% of cards
    - Mid game (4-6 cost): Should have ~40% of cards
    - Late game (7+ cost): Should have ~20% of cards

    Provide insights on:
    1. Whether the curve is balanced
    2. Potential dead turns (not enough cards to play)
    3. Recommendations for improvement
    """

    try:
        response = await llm.ainvoke(prompt)
        state["cost_analysis"] = {
            "curve": cost_curve,
            "analysis": response.content,
        }
    except Exception as e:
        logger.error(f"Error in cost analysis: {e}")
        state["cost_analysis"] = {"curve": cost_curve, "analysis": "Error analyzing cost curve"}

    return state


async def recommendation_node(state: DeckAnalysisState):
    """Generate card recommendations"""
    logger.info("Running recommendation node")

    deck_data = state["deck_data"]
    llm = state["llm"]
    synergies = state.get("card_synergies", [])
    cost_analysis = state.get("cost_analysis", {})

    prompt = f"""
    Based on the deck analysis, provide specific card recommendations:

    Leader: {deck_data.get('leader', {}).get('name')}
    Colors: {deck_data.get('color_distribution', {})}
    Identified Synergies: {synergies}
    Cost Analysis: {cost_analysis.get('analysis', '')}

    Provide:
    1. Top 5 cards to ADD (with reasoning)
    2. Top 5 cards to REMOVE (with reasoning)
    3. General strategy tips

    Focus on cards that:
    - Fill gaps in the cost curve
    - Enhance existing synergies
    - Are competitively viable in the current meta
    """

    try:
        response = await llm.ainvoke(prompt)
        state["recommendations"] = [
            {
                "type": "ai_recommendation",
                "content": response.content,
            }
        ]
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        state["recommendations"] = []

    return state


async def synthesizer_node(state: DeckAnalysisState):
    """Synthesize final report"""
    logger.info("Running synthesizer node")

    deck_data = state["deck_data"]
    llm = state["llm"]
    synergies = state.get("card_synergies", [])
    cost_analysis = state.get("cost_analysis", {})
    recommendations = state.get("recommendations", [])

    prompt = f"""
    Create a comprehensive deck analysis report for this One Piece TCG deck:

    **Deck Name:** {deck_data.get('name')}
    **Leader:** {deck_data.get('leader', {}).get('name')}
    **Total Cards:** {deck_data.get('total_cards')}
    **Average Cost:** {deck_data.get('avg_cost')}
    **Colors:** {deck_data.get('color_distribution')}

    **Synergy Analysis:**
    {synergies}

    **Cost Curve Analysis:**
    {cost_analysis.get('analysis', '')}

    **Recommendations:**
    {recommendations}

    Format the report in markdown with the following sections:
    1. **Executive Summary** (2-3 sentences)
    2. **Strengths** (3-5 bullet points)
    3. **Weaknesses** (3-5 bullet points)
    4. **Key Synergies** (describe top synergies)
    5. **Cost Curve Assessment**
    6. **Recommended Changes** (specific cards to add/remove)
    7. **Strategy Tips** (how to pilot the deck)

    Be specific, actionable, and constructive.
    """

    try:
        response = await llm.ainvoke(prompt)
        state["final_report"] = response.content
    except Exception as e:
        logger.error(f"Error synthesizing report: {e}")
        state["final_report"] = "Error generating deck analysis report"

    return state


def build_analyzer_graph():
    """Build the deck analyzer LangGraph"""
    workflow = StateGraph(DeckAnalysisState)

    # Add nodes
    workflow.add_node("synergy_analyzer", synergy_analyzer_node)
    workflow.add_node("cost_analyzer", cost_analyzer_node)
    workflow.add_node("recommendations", recommendation_node)
    workflow.add_node("synthesizer", synthesizer_node)

    # Define edges
    workflow.set_entry_point("synergy_analyzer")
    workflow.add_edge("synergy_analyzer", "cost_analyzer")
    workflow.add_edge("cost_analyzer", "recommendations")
    workflow.add_edge("recommendations", "synthesizer")
    workflow.add_edge("synthesizer", END)

    return workflow.compile()


def create_deck_analyzer(
    provider: AIProvider = "anthropic",
    model: str | None = None,
    temperature: float = 0.7,
):
    """
    Create a deck analyzer with specified AI provider

    Args:
        provider: AI provider to use
        model: Specific model (optional)
        temperature: Temperature for generation

    Returns:
        Compiled LangGraph analyzer
    """
    # Get LLM instance
    llm = AIProviderFactory.get_llm(provider, temperature, model)

    # Return the compiled graph
    return build_analyzer_graph(), llm
