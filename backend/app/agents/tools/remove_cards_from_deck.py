from app.agents.core.tool import BaseTool, ToolResponse, register_tool


@register_tool
class RemoveCardsFromDeckTool(BaseTool):
    """Remove cards from the deck currently being built."""

    @classmethod
    def name(cls) -> str:
        return "remove_cards_from_deck"

    @classmethod
    def description(cls) -> str:
        return (
            "Remove one or more cards from the deck being built in the deck builder. "
            "The frontend will handle the removal from the Zustand store."
        )

    @classmethod
    def parameters(cls) -> dict:
        return {
            "type": "object",
            "properties": {
                "card_ids": {
                    "type": "array",
                    "description": "Array of card IDs to remove from the deck.",
                    "items": {"type": "string"},
                },
            },
            "required": ["card_ids"],
        }

    async def execute(self) -> ToolResponse:
        card_ids = self.args.get("card_ids", [])

        if not card_ids:
            return ToolResponse(message="No card IDs specified.")

        return ToolResponse(
            message=f"Removed {len(card_ids)} card(s) from deck: {', '.join(card_ids)}",
            data={"action": "remove_cards", "card_ids": card_ids},
        )
