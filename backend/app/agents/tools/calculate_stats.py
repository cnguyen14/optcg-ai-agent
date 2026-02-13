from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models import Deck, DeckCard
from app.services.deck_validator import DeckValidator
from app.agents.core.tool import BaseTool, ToolResponse, register_tool


@register_tool
class CalculateStatsTool(BaseTool):
    """Calculate detailed deck statistics."""

    @classmethod
    def name(cls) -> str:
        return "calculate_stats"

    @classmethod
    def description(cls) -> str:
        return (
            "Calculate detailed statistics for a deck: cost curve, color distribution, "
            "power distribution, type breakdown, counter distribution, and more."
        )

    @classmethod
    def parameters(cls) -> dict:
        return {
            "type": "object",
            "properties": {
                "deck_id": {
                    "type": "string",
                    "description": "UUID of the deck to analyze.",
                },
            },
            "required": ["deck_id"],
        }

    async def execute(self) -> ToolResponse:
        deck_id_str = self.args.get("deck_id") or self.agent.context.get("deck_id")
        if not deck_id_str:
            return ToolResponse(message="No deck_id provided.")

        try:
            deck_id = UUID(deck_id_str)
        except ValueError:
            return ToolResponse(message=f"Invalid deck_id: {deck_id_str}")

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

        validator = DeckValidator()
        base_stats = validator.calculate_deck_stats(deck)

        # Additional stats
        type_counts: dict[str, int] = {}
        counter_counts: dict[int, int] = {}
        power_dist: dict[str, int] = {}
        keyword_counts: dict[str, int] = {}

        for dc in deck.deck_cards:
            card = dc.card
            qty = dc.quantity

            # Type breakdown
            t = card.type or "Unknown"
            type_counts[t] = type_counts.get(t, 0) + qty

            # Counter distribution
            if card.counter is not None:
                counter_counts[card.counter] = counter_counts.get(card.counter, 0) + qty

            # Power distribution (buckets)
            if card.power is not None:
                if card.power <= 3000:
                    bucket = "0-3000"
                elif card.power <= 5000:
                    bucket = "4000-5000"
                elif card.power <= 7000:
                    bucket = "6000-7000"
                else:
                    bucket = "8000+"
                power_dist[bucket] = power_dist.get(bucket, 0) + qty

            # Simple keyword detection
            if card.text:
                text_lower = card.text.lower()
                for kw in ["blocker", "rush", "double attack", "banish", "on play", "on k.o."]:
                    if kw in text_lower:
                        keyword_counts[kw] = keyword_counts.get(kw, 0) + qty

        # Format output
        lines = [f"# Deck Statistics: {deck.name}\n"]

        lines.append(f"**Total cards:** {base_stats['total_cards']}")
        lines.append(f"**Average cost:** {base_stats['avg_cost']}")
        lines.append("")

        lines.append("## Cost Curve")
        for cost in sorted(base_stats["cost_curve"].keys()):
            count = base_stats["cost_curve"][cost]
            bar = "█" * count
            lines.append(f"  {cost}: {bar} ({count})")
        lines.append("")

        lines.append("## Color Distribution")
        for color, count in sorted(base_stats["color_distribution"].items(), key=lambda x: -x[1]):
            lines.append(f"  {color}: {count}")
        lines.append("")

        lines.append("## Type Breakdown")
        for t, count in sorted(type_counts.items(), key=lambda x: -x[1]):
            lines.append(f"  {t}: {count}")
        lines.append("")

        if power_dist:
            lines.append("## Power Distribution")
            for bucket in ["0-3000", "4000-5000", "6000-7000", "8000+"]:
                if bucket in power_dist:
                    lines.append(f"  {bucket}: {power_dist[bucket]}")
            lines.append("")

        if counter_counts:
            lines.append("## Counter Values")
            for val in sorted(counter_counts.keys()):
                lines.append(f"  +{val}: {counter_counts[val]} cards")
            lines.append("")

        if keyword_counts:
            lines.append("## Keywords")
            for kw, count in sorted(keyword_counts.items(), key=lambda x: -x[1]):
                lines.append(f"  {kw}: {count}")

        return ToolResponse(message="\n".join(lines))
