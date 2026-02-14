from app.agents.core.tool import BaseTool, ToolResponse, register_tool, get_tools_by_names
from app.agents.core.sub_agent import SubAgent
from app.agents.core.prompt_builder import build_ui_agent_prompt

UI_TOOLS = [
    "set_deck_leader",
    "add_cards_to_deck",
    "remove_cards_from_deck",
]


@register_tool
class ModifyDeckTool(BaseTool):
    """Delegate deck modification tasks to a focused UI sub-agent."""

    @classmethod
    def name(cls) -> str:
        return "modify_deck"

    @classmethod
    def description(cls) -> str:
        return (
            "Modify the deck in the deck builder: set leader, add cards, or remove cards. "
            "Delegates to a deck modification agent. You MUST provide specific card IDs "
            "(obtained from query_data) — never guess IDs. Include leader colors for validation."
        )

    @classmethod
    def parameters(cls) -> dict:
        return {
            "type": "object",
            "properties": {
                "task": {
                    "type": "string",
                    "description": (
                        "Description of the deck modification to perform. Include specific "
                        "card IDs and quantities — e.g. 'Add 4x OP01-006 and 4x OP01-016 to the deck. "
                        "Leader colors are Red.' or 'Set leader to OP01-001'."
                    ),
                },
            },
            "required": ["task"],
        }

    async def execute(self) -> ToolResponse:
        prompt = build_ui_agent_prompt(self.agent.context)
        tools = get_tools_by_names(UI_TOOLS)
        sub = SubAgent(self.agent.llm, prompt, tools, self.agent)
        result = await sub.run(self.args["task"])

        # Bubble up action_data from sub-agent tool results
        combined: dict | None = None
        if len(result.action_data_list) == 1:
            combined = result.action_data_list[0]
        elif result.action_data_list:
            combined = {
                "action": "batch_deck_update",
                "actions": result.action_data_list,
            }

        return ToolResponse(message=result.message, data=combined)
