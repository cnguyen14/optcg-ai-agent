from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage

if TYPE_CHECKING:
    from app.agents.core.agent import OPTCGAgent
    from app.agents.core.tool import BaseTool

logger = logging.getLogger(__name__)


@dataclass
class SubAgentResult:
    """Result returned by a sub-agent run."""

    message: str
    tool_calls: list[dict] = field(default_factory=list)
    action_data_list: list[dict] = field(default_factory=list)


class SubAgent:
    """
    A focused sub-agent that runs its own LLM loop with a restricted tool set.

    Uses the parent OPTCGAgent's DB session, context, and services so existing
    tools work without modification.
    """

    MAX_ITERATIONS = 5

    def __init__(
        self,
        llm: Any,
        system_prompt: str,
        allowed_tools: dict[str, type[BaseTool]],
        agent_ref: OPTCGAgent,
    ):
        self.llm = llm
        self.system_prompt = system_prompt
        self.allowed_tools = allowed_tools
        self.agent_ref = agent_ref

    @staticmethod
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

    async def run(self, task: str) -> SubAgentResult:
        """Execute the sub-agent loop and return the result."""
        messages: list = [
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=task),
        ]

        # Bind only allowed tools to LLM
        tool_schemas = [
            {"type": "function", "function": cls.schema()}
            for cls in self.allowed_tools.values()
        ]
        llm_bound = self.llm.bind_tools(tool_schemas) if tool_schemas else self.llm

        tool_calls_log: list[dict] = []
        action_data_list: list[dict] = []

        for iteration in range(self.MAX_ITERATIONS):
            logger.info(f"Sub-agent iteration {iteration + 1}/{self.MAX_ITERATIONS}")

            try:
                response = await llm_bound.ainvoke(messages)
            except Exception as e:
                logger.error(f"Sub-agent LLM error: {e}", exc_info=True)
                return SubAgentResult(message=f"Sub-agent error: {e}")

            # Debug: log full response structure
            has_tool_calls = hasattr(response, "tool_calls") and response.tool_calls
            has_content = hasattr(response, "content") and response.content
            logger.info(
                f"Sub-agent response: has_content={has_content}, "
                f"has_tool_calls={has_tool_calls}, "
                f"content_preview={repr(response.content[:100]) if has_content else 'None'}, "
                f"tool_calls={response.tool_calls if has_tool_calls else 'None'}"
            )

            # Check for tool calls
            if has_tool_calls:
                tc = response.tool_calls[0]
                tool_name = tc["name"]
                tool_args = tc.get("args", {})

                # Fix: LLM sometimes adds "proxy_" prefix to tool names
                if tool_name.startswith("proxy_"):
                    tool_name = tool_name[len("proxy_"):]

                # Fix: LLM sometimes passes array/object args as JSON strings
                tool_args = self._fix_json_string_args(tool_args)

                tool_calls_log.append({"name": tool_name, "args": tool_args})
                logger.info(f"Sub-agent calling tool: {tool_name} with args: {tool_args}")

                # Execute the tool
                tool_cls = self.allowed_tools.get(tool_name)
                if not tool_cls:
                    logger.warning(f"Sub-agent unknown tool: {tool_name}, available: {list(self.allowed_tools.keys())}")
                    tool_result_text = f"Unknown tool: {tool_name}. Available tools: {', '.join(self.allowed_tools.keys())}"
                else:
                    tool = tool_cls(agent=self.agent_ref, args=tool_args)
                    try:
                        result = await tool.execute()
                        tool_result_text = result.message
                        if result.data:
                            action_data_list.append(result.data)
                    except Exception as e:
                        logger.error(f"Sub-agent tool {tool_name} failed: {e}", exc_info=True)
                        # If this was a DB-level error, rollback to reset the transaction
                        from sqlalchemy.exc import SQLAlchemyError
                        if isinstance(e, SQLAlchemyError):
                            try:
                                await self.agent_ref.db.rollback()
                            except Exception:
                                pass
                        tool_result_text = f"Tool error: {e}"

                logger.info(f"Sub-agent tool result: {tool_result_text[:200]}")

                # Add to messages for next iteration
                call_id = f"sub_{iteration}"
                messages.append(AIMessage(
                    content="",
                    tool_calls=[{"id": call_id, "name": tool_name, "args": tool_args}],
                ))
                messages.append(ToolMessage(
                    content=tool_result_text,
                    tool_call_id=call_id,
                ))
            else:
                # No tool call — LLM responded with text
                text = response.content if hasattr(response, "content") else str(response)
                return SubAgentResult(
                    message=text or "",
                    tool_calls=tool_calls_log,
                    action_data_list=action_data_list,
                )

        # Hit max iterations — return what we have
        return SubAgentResult(
            message="Sub-agent reached maximum iterations.",
            tool_calls=tool_calls_log,
            action_data_list=action_data_list,
        )
