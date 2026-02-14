from app.agents.core.tool import BaseTool, ToolResponse, register_tool
from app.agents.services.search_service import SearchService, format_card_results


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
            "Filter by name, color, cost range, type, category, power, set code, or effect text. "
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
                "set_code": {
                    "type": "string",
                    "description": "Set code filter (e.g. OP01, OP02).",
                },
                "text_contains": {
                    "type": "string",
                    "description": "Search within card effect text.",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max results to return (default 15).",
                },
            },
            "required": [],
        }

    async def execute(self) -> ToolResponse:
        search = SearchService(self.agent.db)
        card_type = self.args.get("type", "")
        limit = min(int(self.args.get("limit", 15)), 25)

        # If searching for leaders, query the leaders table
        if card_type and card_type.lower() == "leader":
            results = await search.search_leaders(
                name=self.args.get("name"),
                color=self.args.get("color"),
                category=self.args.get("category"),
                set_code=self.args.get("set_code"),
                power_min=self.args.get("power_min"),
                limit=limit,
            )
            return ToolResponse(
                message=format_card_results(results, "leader"),
                data={"type": "card_results", "cards": results},
            )

        # Regular card search
        results = await search.search_cards(
            name=self.args.get("name"),
            color=self.args.get("color"),
            cost_min=self.args.get("cost_min"),
            cost_max=self.args.get("cost_max"),
            card_type=card_type or None,
            category=self.args.get("category"),
            power_min=self.args.get("power_min"),
            set_code=self.args.get("set_code"),
            text_contains=self.args.get("text_contains"),
            limit=limit,
        )
        return ToolResponse(
            message=format_card_results(results, "card"),
            data={"type": "card_results", "cards": results},
        )
