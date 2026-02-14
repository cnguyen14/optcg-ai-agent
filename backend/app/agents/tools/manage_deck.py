from app.agents.core.tool import BaseTool, ToolResponse, register_tool
from app.agents.services.card_manager import CardManager


@register_tool
class ManageDeckTool(BaseTool):
    """Execute deck modifications directly — set leader, add cards, remove cards."""

    @classmethod
    def name(cls) -> str:
        return "manage_deck"

    @classmethod
    def description(cls) -> str:
        return (
            "Modify the deck in the deck builder: set a leader, add cards, or remove cards. "
            "Pass structured parameters — the action type plus the relevant data. "
            "You MUST provide specific card IDs (obtained from search_cards) — never guess IDs. "
            "Include leader_colors when adding cards for color identity validation."
        )

    @classmethod
    def parameters(cls) -> dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["set_leader", "add_cards", "remove_cards"],
                    "description": "The type of deck modification to perform.",
                },
                "leader_id": {
                    "type": "string",
                    "description": "Leader card ID (for set_leader action).",
                },
                "cards": {
                    "type": "array",
                    "description": "Cards to add (for add_cards action). Each item has card_id and quantity.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "card_id": {"type": "string", "description": "The card ID."},
                            "quantity": {"type": "integer", "description": "Number of copies (1-4)."},
                        },
                        "required": ["card_id", "quantity"],
                    },
                },
                "card_ids": {
                    "type": "array",
                    "description": "Card IDs to remove (for remove_cards action).",
                    "items": {"type": "string"},
                },
                "leader_colors": {
                    "type": "array",
                    "description": "The leader's colors for color identity validation when adding cards.",
                    "items": {"type": "string"},
                },
            },
            "required": ["action"],
        }

    async def execute(self) -> ToolResponse:
        import json

        action = self.args.get("action", "")
        manager = CardManager(self.agent.db)

        # Fix: LLM sometimes passes JSON string args
        cards = self.args.get("cards", [])
        if isinstance(cards, str):
            try:
                cards = json.loads(cards)
            except (json.JSONDecodeError, ValueError):
                cards = []

        card_ids = self.args.get("card_ids", [])
        if isinstance(card_ids, str):
            try:
                card_ids = json.loads(card_ids)
            except (json.JSONDecodeError, ValueError):
                card_ids = []

        leader_colors = self.args.get("leader_colors", [])
        if isinstance(leader_colors, str):
            try:
                leader_colors = json.loads(leader_colors)
            except (json.JSONDecodeError, ValueError):
                leader_colors = []

        if action == "set_leader":
            leader_id = self.args.get("leader_id", "")
            if not leader_id:
                return ToolResponse(message="leader_id is required for set_leader action.")
            result = await manager.set_leader(leader_id)

        elif action == "add_cards":
            if not cards:
                return ToolResponse(message="cards array is required for add_cards action.")
            result = await manager.add_cards(cards, leader_colors or None)

        elif action == "remove_cards":
            if not card_ids:
                return ToolResponse(message="card_ids array is required for remove_cards action.")
            result = await manager.remove_cards(card_ids)

        else:
            return ToolResponse(
                message=f"Unknown action: {action}. Use 'set_leader', 'add_cards', or 'remove_cards'."
            )

        # Check for errors
        if result.errors:
            return ToolResponse(message="\n".join(result.errors))

        return ToolResponse(message=result.summary, data=result.action_data)
