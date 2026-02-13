from app.agents.core.tool import BaseTool, ToolResponse, register_tool


@register_tool
class SearchKnowledgeTool(BaseTool):
    """Search the OPTCG rules knowledge base via RAG."""

    @classmethod
    def name(cls) -> str:
        return "search_knowledge"

    @classmethod
    def description(cls) -> str:
        return (
            "Search the One Piece TCG rules and keyword knowledge base. "
            "Use this for rules questions, keyword definitions, game mechanics, "
            "turn structure, and any official game rules."
        )

    @classmethod
    def parameters(cls) -> dict:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The rules question or topic to search for.",
                },
            },
            "required": ["query"],
        }

    async def execute(self) -> ToolResponse:
        query = self.args.get("query", "")
        if not query:
            return ToolResponse(message="Please provide a search query.")

        try:
            results = await self.agent.knowledge.query(query, limit=5)
        except Exception as e:
            return ToolResponse(
                message=f"Knowledge base search failed: {str(e)}. "
                "The knowledge base may not be indexed yet."
            )

        if not results:
            return ToolResponse(
                message="No relevant knowledge found. I'll answer based on my general knowledge of OPTCG."
            )

        lines = ["Relevant knowledge from the rules database:\n"]
        for i, r in enumerate(results, 1):
            source = r.get("source", "unknown")
            text = r.get("text", "")
            score = r.get("score", 0)
            lines.append(f"**[{i}] {source}** (relevance: {score:.2f})")
            lines.append(text)
            lines.append("")

        return ToolResponse(message="\n".join(lines))
