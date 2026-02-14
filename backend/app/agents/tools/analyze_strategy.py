from app.agents.core.tool import BaseTool, ToolResponse, register_tool
from app.agents.services.search_service import SearchService
from app.agents.services.strategy_agent import StrategyAgent
from app.agents.services.card_manager import CardManager


@register_tool
class AnalyzeStrategyTool(BaseTool):
    """Invoke the strategy agent for complex deck building and analysis."""

    @classmethod
    def name(cls) -> str:
        return "analyze_strategy"

    @classmethod
    def description(cls) -> str:
        return (
            "Analyze deck strategy and build a deck plan. Use this for complex tasks like "
            "'help me finish my deck', 'build a competitive red aggro deck', "
            "'suggest improvements', or 'fill my remaining slots'. "
            "The strategy agent will search for real cards, create a plan, and auto-execute it. "
            "Do NOT use this for simple card additions — use manage_deck directly for those."
        )

    @classmethod
    def parameters(cls) -> dict:
        return {
            "type": "object",
            "properties": {
                "task": {
                    "type": "string",
                    "description": (
                        "Description of the strategy task. Be specific about the user's goals — "
                        "e.g. 'Build an aggressive red rush deck that wins fast' or "
                        "'Fill the remaining 30 slots with cards that synergize with the Straw Hat Crew archetype'."
                    ),
                },
            },
            "required": ["task"],
        }

    async def execute(self) -> ToolResponse:
        search = SearchService(self.agent.db)
        strategy = StrategyAgent(
            llm=self.agent.llm,
            search_service=search,
            context=self.agent.context,
        )

        # Get deck state from context
        deck_state = None
        if self.agent.context:
            deck_state = self.agent.context.get("deck_builder_state")

        plan = await strategy.analyze_and_plan(
            task=self.args["task"],
            deck_state=deck_state,
        )

        # Auto-execute: apply plan changes immediately
        if plan.cards_to_add or plan.leader_to_set or plan.cards_to_remove:
            manager = CardManager(self.agent.db)
            result = await manager.execute_plan(plan)

            if result.errors:
                # Plan had issues — return reasoning + errors
                error_text = "\n".join(result.errors)
                return ToolResponse(
                    message=f"{plan.reasoning}\n\n**Issues encountered:**\n{error_text}",
                    data=result.action_data,
                )

            # Success — return reasoning + execution summary
            message = plan.reasoning
            if result.summary:
                message += f"\n\n**Changes applied:**\n{result.summary}"

            return ToolResponse(message=message, data=result.action_data)

        # Analysis-only — no modifications needed
        return ToolResponse(message=plan.reasoning)
