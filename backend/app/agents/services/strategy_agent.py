"""StrategyAgent — LLM-powered deck building strategist with mini tool loop."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage

from app.agents.services.search_service import SearchService

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


@dataclass
class StrategyPlan:
    """The output of the strategy agent."""

    leader_to_set: str | None = None
    cards_to_add: list[dict] = field(default_factory=list)  # [{card_id, quantity}]
    cards_to_remove: list[str] = field(default_factory=list)
    leader_colors: list[str] | None = None
    reasoning: str = ""


# Tool schemas for the strategy agent's internal tools
_STRATEGY_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_cards",
            "description": (
                "Search the card database for One Piece TCG cards. "
                "Returns matching cards with their details."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Card name or partial name."},
                    "color": {"type": "string", "description": "Card color (Red, Green, Blue, Purple, Black, Yellow)."},
                    "cost_min": {"type": "integer", "description": "Minimum cost."},
                    "cost_max": {"type": "integer", "description": "Maximum cost."},
                    "type": {"type": "string", "description": "Card type (Character, Event, Stage)."},
                    "category": {"type": "string", "description": "Card category/trait."},
                    "power_min": {"type": "integer", "description": "Minimum power."},
                    "text_contains": {"type": "string", "description": "Search card effect text."},
                    "limit": {"type": "integer", "description": "Max results (default 15)."},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_leaders",
            "description": "Search for leader cards.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Leader name or partial name."},
                    "color": {"type": "string", "description": "Leader color."},
                    "category": {"type": "string", "description": "Leader category/trait."},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "submit_plan",
            "description": (
                "Submit your final deck building plan. Call this exactly once when done."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "leader_to_set": {
                        "type": "string",
                        "description": "Leader card ID to set, or null if keeping current leader.",
                    },
                    "cards_to_add": {
                        "type": "array",
                        "description": "Cards to add to the deck.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "card_id": {"type": "string"},
                                "quantity": {"type": "integer"},
                                "name": {"type": "string"},
                                "reason": {"type": "string"},
                            },
                            "required": ["card_id", "quantity"],
                        },
                    },
                    "cards_to_remove": {
                        "type": "array",
                        "description": "Card IDs to remove from the deck.",
                        "items": {"type": "string"},
                    },
                    "reasoning": {
                        "type": "string",
                        "description": "Overall strategy explanation in markdown.",
                    },
                },
                "required": ["cards_to_add", "reasoning"],
            },
        },
    },
]


class StrategyAgent:
    """LLM-powered agent that plans deck modifications by searching real cards."""

    MAX_ITERATIONS = 8

    def __init__(
        self,
        llm: Any,
        search_service: SearchService,
        context: dict | None = None,
    ):
        self.llm = llm
        self.search = search_service
        self.context = context or {}

    async def analyze_and_plan(
        self,
        task: str,
        deck_state: dict | None = None,
    ) -> StrategyPlan:
        """
        Run the strategy agent loop: search for cards, then submit a plan.

        Args:
            task: The user's deck building request.
            deck_state: Current deck builder state (leader, cards, total).
        """
        system_prompt = self._build_prompt(deck_state)
        messages: list = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=task),
        ]

        llm_bound = self.llm.bind_tools(_STRATEGY_TOOLS)

        for iteration in range(self.MAX_ITERATIONS):
            logger.info(f"Strategy agent iteration {iteration + 1}/{self.MAX_ITERATIONS}")

            try:
                response = await llm_bound.ainvoke(messages)
            except Exception as e:
                logger.error(f"Strategy agent LLM error: {e}", exc_info=True)
                return StrategyPlan(reasoning=f"Strategy planning failed: {e}")

            # Check for tool calls
            if hasattr(response, "tool_calls") and response.tool_calls:
                tc = response.tool_calls[0]
                tool_name = tc["name"]
                tool_args = tc.get("args", {})

                # Fix proxy_ prefix (some providers add it)
                if tool_name.startswith("proxy_"):
                    tool_name = tool_name[len("proxy_"):]

                # Fix JSON string args
                tool_args = _fix_json_string_args(tool_args)

                logger.info(f"Strategy agent calling: {tool_name}({tool_args})")

                # Execute tool
                if tool_name == "submit_plan":
                    return self._parse_plan(tool_args, deck_state)

                result_text = await self._execute_tool(tool_name, tool_args)

                # Add to messages for next iteration
                call_id = f"strategy_{iteration}"
                messages.append(AIMessage(
                    content="",
                    tool_calls=[{"id": call_id, "name": tool_name, "args": tool_args}],
                ))
                messages.append(ToolMessage(content=result_text, tool_call_id=call_id))
            else:
                # No tool call — LLM responded with text (shouldn't happen, but handle gracefully)
                text = response.content if hasattr(response, "content") else ""
                logger.warning("Strategy agent responded with text instead of tool call")
                return StrategyPlan(reasoning=text or "No plan generated.")

        # Hit max iterations
        logger.warning("Strategy agent hit max iterations")
        return StrategyPlan(reasoning="Strategy analysis reached iteration limit. Please try a more specific request.")

    async def _execute_tool(self, name: str, args: dict) -> str:
        """Execute a strategy agent tool (search_cards or search_leaders)."""
        from app.agents.services.search_service import format_card_results

        if name == "search_cards":
            results = await self.search.search_cards(
                name=args.get("name"),
                color=args.get("color"),
                cost_min=args.get("cost_min"),
                cost_max=args.get("cost_max"),
                card_type=args.get("type"),
                category=args.get("category"),
                power_min=args.get("power_min"),
                text_contains=args.get("text_contains"),
                limit=int(args.get("limit", 15)),
            )
            return format_card_results(results, "card")

        elif name == "search_leaders":
            results = await self.search.search_leaders(
                name=args.get("name"),
                color=args.get("color"),
                category=args.get("category"),
            )
            return format_card_results(results, "leader")

        return f"Unknown tool: {name}"

    def _parse_plan(self, args: dict, deck_state: dict | None) -> StrategyPlan:
        """Parse the submit_plan tool call args into a StrategyPlan."""
        cards_to_add = []
        for card in args.get("cards_to_add", []):
            cards_to_add.append({
                "card_id": card["card_id"],
                "quantity": min(max(int(card.get("quantity", 1)), 1), 4),
            })

        # Determine leader colors for validation
        leader_colors = None
        if deck_state:
            leader = deck_state.get("leader")
            if leader:
                leader_colors = leader.get("colors")

        return StrategyPlan(
            leader_to_set=args.get("leader_to_set"),
            cards_to_add=cards_to_add,
            cards_to_remove=args.get("cards_to_remove", []),
            leader_colors=leader_colors,
            reasoning=args.get("reasoning", ""),
        )

    def _build_prompt(self, deck_state: dict | None) -> str:
        """Build the strategy agent system prompt."""
        prompt_path = PROMPTS_DIR / "strategy_agent.md"
        base = prompt_path.read_text(encoding="utf-8") if prompt_path.exists() else ""

        rules_path = PROMPTS_DIR / "system_rules.md"
        rules = rules_path.read_text(encoding="utf-8") if rules_path.exists() else ""

        # Add current deck state
        context_block = ""
        if deck_state:
            parts = ["## Current Deck State"]
            leader = deck_state.get("leader")
            if leader:
                parts.append(
                    f"- Leader: {leader.get('name', '?')} ({leader.get('id', '?')}) — "
                    f"Colors: {', '.join(leader.get('colors', []))}"
                )
            else:
                parts.append("- Leader: Not set")

            total = deck_state.get("total_cards", 0)
            parts.append(f"- Total cards: {total}/50 — {50 - total} slots remaining")

            cards = deck_state.get("cards", [])
            if cards:
                parts.append("- Cards in deck:")
                for c in cards[:30]:
                    parts.append(
                        f"  - {c.get('quantity', 1)}x {c.get('name', '?')} "
                        f"({c.get('id', '?')}) [{c.get('type', '?')}, "
                        f"Cost {c.get('cost', '?')}, {c.get('color', '?')}]"
                    )
                if len(cards) > 30:
                    parts.append(f"  - ... and {len(cards) - 30} more")

            context_block = "\n".join(parts)

        sections = [s for s in [base, rules, context_block] if s.strip()]
        return "\n\n---\n\n".join(sections)


def _fix_json_string_args(args: dict) -> dict:
    """Parse JSON string values that should be lists or dicts."""
    fixed = {}
    for k, v in args.items():
        if isinstance(v, str) and v.startswith(("[", "{")):
            try:
                fixed[k] = json.loads(v)
            except (json.JSONDecodeError, ValueError):
                fixed[k] = v
        else:
            fixed[k] = v
    return fixed
