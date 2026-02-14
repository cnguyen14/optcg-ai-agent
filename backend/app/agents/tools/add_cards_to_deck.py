from sqlalchemy import select
from app.models import Card
from app.agents.core.tool import BaseTool, ToolResponse, register_tool


@register_tool
class AddCardsToDeckTool(BaseTool):
    """Add cards to the deck currently being built."""

    @classmethod
    def name(cls) -> str:
        return "add_cards_to_deck"

    @classmethod
    def description(cls) -> str:
        return (
            "Add one or more cards to the deck being built in the deck builder. "
            "Validates that all cards exist in the database and optionally checks color identity "
            "against the leader's colors. The frontend enforces the 4-copy limit automatically."
        )

    @classmethod
    def parameters(cls) -> dict:
        return {
            "type": "object",
            "properties": {
                "cards": {
                    "type": "array",
                    "description": "Array of cards to add, each with card_id and quantity.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "card_id": {
                                "type": "string",
                                "description": "The card ID (e.g. 'OP01-004').",
                            },
                            "quantity": {
                                "type": "integer",
                                "description": "Number of copies to add (1-4).",
                            },
                        },
                        "required": ["card_id", "quantity"],
                    },
                },
                "leader_colors": {
                    "type": "array",
                    "description": "The leader's colors for color identity validation (e.g. ['Red', 'Green']).",
                    "items": {"type": "string"},
                },
            },
            "required": ["cards"],
        }

    async def execute(self) -> ToolResponse:
        db = self.agent.db
        cards_input = self.args.get("cards", [])
        leader_colors = self.args.get("leader_colors") or []

        if not cards_input:
            return ToolResponse(message="No cards specified.")

        # Collect all card IDs
        card_ids = [c["card_id"] for c in cards_input]
        quantity_map = {c["card_id"]: min(max(c.get("quantity", 1), 1), 4) for c in cards_input}

        # Fetch cards from DB
        result = await db.execute(
            select(Card).where(Card.id.in_(card_ids))
        )
        found_cards = {c.id: c for c in result.scalars().all()}

        # Validate existence
        missing = [cid for cid in card_ids if cid not in found_cards]
        if missing:
            return ToolResponse(
                message=f"Cards not found: {', '.join(missing)}. Use search_cards to find valid card IDs."
            )

        # Validate color identity if leader_colors provided
        color_violations = []
        if leader_colors:
            leader_color_set = {c.strip() for c in leader_colors}
            for cid, card in found_cards.items():
                if card.color:
                    card_colors = {c.strip() for c in card.color.split(",")}
                    if not card_colors.issubset(leader_color_set):
                        color_violations.append(
                            f"{card.name} ({card.id}) is {card.color} — not in leader colors {leader_colors}"
                        )

        if color_violations:
            return ToolResponse(
                message="Color identity violations:\n" + "\n".join(color_violations) +
                "\nThese cards don't match the leader's color identity. Choose different cards or confirm override."
            )

        # Build response
        cards_data = []
        added_lines = []
        for cid in card_ids:
            card = found_cards[cid]
            qty = quantity_map[cid]
            card_data = {
                "id": card.id,
                "name": card.name,
                "type": card.type,
                "color": card.color,
                "cost": card.cost,
                "power": card.power,
                "counter": card.counter,
                "attribute": card.attribute,
                "text": card.text,
                "trigger": card.trigger,
                "rarity": card.rarity,
                "category": card.category,
                "set_code": card.set_code,
                "image_url": card.image_url,
            }
            cards_data.append({
                "card": card_data,
                "quantity": qty,
            })
            added_lines.append(f"  {qty}x {card.name} ({card.id}) — {card.type}, Cost {card.cost}")

        total_added = sum(quantity_map[cid] for cid in card_ids)

        return ToolResponse(
            message=f"Added {total_added} card(s) to deck:\n" + "\n".join(added_lines),
            data={"action": "add_cards", "cards": cards_data},
        )
