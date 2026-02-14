from app.agents.core.tool import BaseTool, ToolResponse, register_tool, get_tools_by_names
from app.agents.core.sub_agent import SubAgent
from app.agents.core.prompt_builder import build_data_agent_prompt

DATA_TOOLS = [
    "search_cards",
    "get_deck_info",
    "validate_deck",
    "calculate_stats",
    "search_knowledge",
]


@register_tool
class QueryDataTool(BaseTool):
    """Delegate data retrieval tasks to a focused data sub-agent."""

    @classmethod
    def name(cls) -> str:
        return "query_data"

    @classmethod
    def description(cls) -> str:
        return (
            "Query card data, deck information, rules, or statistics. "
            "Delegates to a data retrieval agent that can search cards, "
            "get deck info, validate decks, calculate stats, and look up rules. "
            "Use this for ANY information gathering before making deck modifications."
        )

    @classmethod
    def parameters(cls) -> dict:
        return {
            "type": "object",
            "properties": {
                "task": {
                    "type": "string",
                    "description": (
                        "Description of the data to retrieve. Be specific about "
                        "what you need — e.g. 'Search for red characters with cost 3 or less' "
                        "or 'Get the current deck info and validate it'."
                    ),
                },
            },
            "required": ["task"],
        }

    async def execute(self) -> ToolResponse:
        prompt = build_data_agent_prompt(self.agent.context)
        tools = get_tools_by_names(DATA_TOOLS)
        sub = SubAgent(self.agent.llm, prompt, tools, self.agent)
        result = await sub.run(self.args["task"])
        return ToolResponse(message=result.message)
