from sqlalchemy import select
from app.models import Leader
from app.agents.core.tool import BaseTool, ToolResponse, register_tool


@register_tool
class SetDeckLeaderTool(BaseTool):
    """Set the leader for the deck currently being built."""

    @classmethod
    def name(cls) -> str:
        return "set_deck_leader"

    @classmethod
    def description(cls) -> str:
        return (
            "Set the leader card for the deck being built in the deck builder. "
            "Validates that the leader exists in the database. "
            "The frontend will update the deck builder UI automatically."
        )

    @classmethod
    def parameters(cls) -> dict:
        return {
            "type": "object",
            "properties": {
                "leader_id": {
                    "type": "string",
                    "description": "The leader card ID (e.g. 'OP01-001').",
                },
            },
            "required": ["leader_id"],
        }

    async def execute(self) -> ToolResponse:
        db = self.agent.db
        leader_id = self.args.get("leader_id", "")

        if not leader_id:
            return ToolResponse(message="leader_id is required.")

        result = await db.execute(
            select(Leader).where(Leader.id == leader_id)
        )
        leader = result.scalar_one_or_none()

        if not leader:
            return ToolResponse(
                message=f"Leader '{leader_id}' not found in the database. Use search_cards to find valid leaders."
            )

        leader_data = {
            "id": leader.id,
            "name": leader.name,
            "life": leader.life,
            "power": leader.power,
            "colors": leader.colors or [],
            "attribute": leader.attribute,
            "text": leader.text,
            "category": leader.category,
            "set_code": leader.set_code,
            "image_url": leader.image_url,
        }

        return ToolResponse(
            message=f"Leader set to {leader.name} ({leader.id}) — Colors: {', '.join(leader.colors or [])} | Life: {leader.life} | Power: {leader.power}",
            data={"action": "set_leader", "leader": leader_data},
        )
