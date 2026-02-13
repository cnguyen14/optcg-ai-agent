from app.agents.core.tool import BaseTool, ToolResponse, register_tool


@register_tool
class ResponseTool(BaseTool):
    """Final response tool — breaks the monologue loop."""

    @classmethod
    def name(cls) -> str:
        return "response"

    @classmethod
    def description(cls) -> str:
        return (
            "Deliver your final answer to the user. You MUST call this tool to send your response. "
            "Use markdown formatting for readability."
        )

    @classmethod
    def parameters(cls) -> dict:
        return {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "Your final response to the user in markdown format.",
                },
            },
            "required": ["text"],
        }

    async def execute(self) -> ToolResponse:
        return ToolResponse(
            message=self.args.get("text", ""),
            break_loop=True,
        )
