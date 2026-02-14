from sqlalchemy import select, or_, func
from app.models import Card, Leader
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
            "Search the card database for One Piece TCG cards and leaders. "
            "Filter by name, color, cost range, type, or category. "
            "Set type to 'Leader' to search for leader cards specifically. "
            "Returns up to 15 matching results with their details."
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
                    "description": "Card type (Character, Event, Stage, Leader).",
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
        card_type = self.args.get("type", "")
        limit = min(int(self.args.get("limit", 15)), 25)

        # If searching for leaders, query the leaders table
        if card_type and card_type.lower() == "leader":
            return await self._search_leaders(db, limit)

        # Regular card search
        query = select(Card)

        if name := self.args.get("name"):
            query = query.where(func.lower(Card.name).contains(name.lower()))
        if color := self.args.get("color"):
            query = query.where(Card.color.ilike(f"%{color}%"))
        if (cost_min := self.args.get("cost_min")) is not None:
            query = query.where(Card.cost >= int(cost_min))
        if (cost_max := self.args.get("cost_max")) is not None:
            query = query.where(Card.cost <= int(cost_max))
        if card_type:
            query = query.where(func.lower(Card.type) == card_type.lower())
        if category := self.args.get("category"):
            query = query.where(Card.category.ilike(f"%{category}%"))
        if (power_min := self.args.get("power_min")) is not None:
            query = query.where(Card.power >= int(power_min))

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

    async def _search_leaders(self, db, limit: int) -> ToolResponse:
        """Search the leaders table."""
        query = select(Leader)

        if name := self.args.get("name"):
            query = query.where(func.lower(Leader.name).contains(name.lower()))
        if color := self.args.get("color"):
            # Leaders store colors as an array; check if any color matches
            query = query.where(Leader.colors.any(color))
        if category := self.args.get("category"):
            query = query.where(Leader.category.ilike(f"%{category}%"))
        if (power_min := self.args.get("power_min")) is not None:
            query = query.where(Leader.power >= int(power_min))

        query = query.limit(limit)

        result = await db.execute(query)
        leaders = result.scalars().all()

        if not leaders:
            return ToolResponse(message="No leaders found matching your criteria.")

        lines = [f"Found {len(leaders)} leader(s):\n"]
        for l in leaders:
            parts = [f"**{l.name}** ({l.id})"]
            parts.append("Type: Leader")
            if l.colors:
                parts.append(f"Colors: {', '.join(l.colors)}")
            if l.life is not None:
                parts.append(f"Life: {l.life}")
            if l.power is not None:
                parts.append(f"Power: {l.power}")
            if l.category:
                parts.append(f"Category: {l.category}")
            if l.text:
                parts.append(f"Effect: {l.text[:150]}")
            lines.append(" | ".join(parts))

        return ToolResponse(message="\n".join(lines))
