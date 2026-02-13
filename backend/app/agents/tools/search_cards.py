from sqlalchemy import select, or_, func
from app.models import Card
from app.agents.core.tool import BaseTool, ToolResponse, register_tool


@register_tool
class SearchCardsTool(BaseTool):
    """Search for cards by name, color, cost, type, or category."""

    @classmethod
    def name(cls) -> str:
        return "search_cards"

    @classmethod
    def description(cls) -> str:
        return (
            "Search the card database for One Piece TCG cards. "
            "Filter by name, color, cost range, type, or category. "
            "Returns up to 15 matching cards with their details."
        )

    @classmethod
    def parameters(cls) -> dict:
        return {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Card name or partial name to search for.",
                },
                "color": {
                    "type": "string",
                    "description": "Card color (Red, Green, Blue, Purple, Black, Yellow).",
                },
                "cost_min": {
                    "type": "integer",
                    "description": "Minimum cost filter.",
                },
                "cost_max": {
                    "type": "integer",
                    "description": "Maximum cost filter.",
                },
                "type": {
                    "type": "string",
                    "description": "Card type (Character, Event, Stage).",
                },
                "category": {
                    "type": "string",
                    "description": "Card category / trait (e.g. Straw Hat Crew, Navy).",
                },
                "power_min": {
                    "type": "integer",
                    "description": "Minimum power filter.",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max results to return (default 15).",
                },
            },
            "required": [],
        }

    async def execute(self) -> ToolResponse:
        db = self.agent.db
        query = select(Card)

        if name := self.args.get("name"):
            query = query.where(func.lower(Card.name).contains(name.lower()))
        if color := self.args.get("color"):
            query = query.where(Card.color.ilike(f"%{color}%"))
        if (cost_min := self.args.get("cost_min")) is not None:
            query = query.where(Card.cost >= cost_min)
        if (cost_max := self.args.get("cost_max")) is not None:
            query = query.where(Card.cost <= cost_max)
        if card_type := self.args.get("type"):
            query = query.where(func.lower(Card.type) == card_type.lower())
        if category := self.args.get("category"):
            query = query.where(Card.category.ilike(f"%{category}%"))
        if (power_min := self.args.get("power_min")) is not None:
            query = query.where(Card.power >= power_min)

        limit = min(self.args.get("limit", 15), 25)
        query = query.limit(limit)

        result = await db.execute(query)
        cards = result.scalars().all()

        if not cards:
            return ToolResponse(message="No cards found matching your criteria.")

        lines = [f"Found {len(cards)} card(s):\n"]
        for c in cards:
            parts = [f"**{c.name}** ({c.id})"]
            parts.append(f"Type: {c.type}")
            if c.color:
                parts.append(f"Color: {c.color}")
            if c.cost is not None:
                parts.append(f"Cost: {c.cost}")
            if c.power is not None:
                parts.append(f"Power: {c.power}")
            if c.counter is not None:
                parts.append(f"Counter: {c.counter}")
            if c.category:
                parts.append(f"Category: {c.category}")
            if c.text:
                parts.append(f"Effect: {c.text[:150]}")
            lines.append(" | ".join(parts))

        return ToolResponse(message="\n".join(lines))
