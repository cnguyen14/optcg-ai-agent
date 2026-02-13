from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models import Deck, DeckCard
from app.agents.core.tool import BaseTool, ToolResponse, register_tool


@register_tool
class GetDeckInfoTool(BaseTool):
    """Load full details for a deck."""

    @classmethod
    def name(cls) -> str:
        return "get_deck_info"

    @classmethod
    def description(cls) -> str:
        return (
            "Load complete information about a deck including its leader, all cards, "
            "quantities, stats, and metadata. Use the deck_id from the conversation context "
            "or ask the user for it."
        )

    @classmethod
    def parameters(cls) -> dict:
        return {
            "type": "object",
            "properties": {
                "deck_id": {
                    "type": "string",
                    "description": "UUID of the deck to load.",
                },
            },
            "required": ["deck_id"],
        }

    async def execute(self) -> ToolResponse:
        deck_id_str = self.args.get("deck_id") or self.agent.context.get("deck_id")
        if not deck_id_str:
            return ToolResponse(message="No deck_id provided. Please specify a deck or open one first.")

        try:
            deck_id = UUID(deck_id_str)
        except ValueError:
            return ToolResponse(message=f"Invalid deck_id format: {deck_id_str}")

        db = self.agent.db
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
            return ToolResponse(message=f"Deck not found: {deck_id_str}")

        # Format deck info
        lines = [f"# {deck.name}"]
        if deck.description:
            lines.append(f"*{deck.description}*\n")

        if deck.leader:
            lines.append(f"**Leader:** {deck.leader.name} ({deck.leader.id})")
            lines.append(f"  Life: {deck.leader.life} | Colors: {', '.join(deck.leader.colors)}")
            if deck.leader.text:
                lines.append(f"  Effect: {deck.leader.text[:200]}")
            lines.append("")

        lines.append(f"**Total cards:** {deck.total_cards}")
        if deck.avg_cost:
            lines.append(f"**Avg cost:** {float(deck.avg_cost):.2f}")
        if deck.color_distribution:
            dist = ", ".join(f"{c}: {n}" for c, n in deck.color_distribution.items())
            lines.append(f"**Colors:** {dist}")
        lines.append("")

        # Group cards by type
        by_type: dict[str, list] = {}
        for dc in deck.deck_cards:
            card = dc.card
            t = card.type or "Unknown"
            by_type.setdefault(t, []).append((card, dc.quantity))

        for card_type, cards in sorted(by_type.items()):
            lines.append(f"### {card_type}s ({sum(q for _, q in cards)})")
            for card, qty in sorted(cards, key=lambda x: (x[0].cost or 0, x[0].name)):
                cost_str = f"Cost {card.cost}" if card.cost is not None else ""
                power_str = f"Power {card.power}" if card.power is not None else ""
                stats = " | ".join(filter(None, [cost_str, power_str]))
                lines.append(f"- {qty}x {card.name} ({card.id}) [{stats}]")
            lines.append("")

        return ToolResponse(message="\n".join(lines))
