from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models import Deck, DeckCard
from app.services.deck_validator import DeckValidator
from app.agents.core.tool import BaseTool, ToolResponse, register_tool


@register_tool
class ValidateDeckTool(BaseTool):
    """Validate a deck against OPTCG construction rules."""

    @classmethod
    def name(cls) -> str:
        return "validate_deck"

    @classmethod
    def description(cls) -> str:
        return (
            "Validate a deck against official One Piece TCG rules: "
            "50-card requirement, 4-copy limit, and color identity. "
            "Returns whether the deck is valid and any errors."
        )

    @classmethod
    def parameters(cls) -> dict:
        return {
            "type": "object",
            "properties": {
                "deck_id": {
                    "type": "string",
                    "description": "UUID of the deck to validate.",
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
        is_valid, errors = await validator.validate_deck(deck, db)

        if is_valid:
            return ToolResponse(message="Deck is **valid** and meets all OPTCG construction rules.")

        lines = ["Deck has the following **validation errors**:\n"]
        for err in errors:
            lines.append(f"- {err}")
        return ToolResponse(message="\n".join(lines))
