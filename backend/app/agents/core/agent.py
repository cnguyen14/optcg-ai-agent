from __future__ import annotations

import json
import logging
from typing import Any, AsyncGenerator, Callable
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.core.prompt_builder import build_system_prompt
from app.agents.core.tool import get_tools_by_names, ToolResponse
from app.services.conversation_service import ConversationService
from app.services.knowledge_service import KnowledgeService
from app.services.memory_service import MemoryService

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 15
HISTORY_WINDOW = 20  # messages kept in the loop

# Main agent tools — search and manage_deck are instant (no LLM sub-agents),
# analyze_strategy invokes a strategy agent for complex deck building.
MAIN_AGENT_TOOLS = ["search_cards", "manage_deck", "analyze_strategy", "search_knowledge", "response"]


class OPTCGAgent:
    """Monologue-loop agent for OPTCG tasks."""

    def __init__(
        self,
        llm: Any,
        conversation_id: UUID,
        db: AsyncSession,
        memory_service: MemoryService,
        knowledge_service: KnowledgeService,
        conversation_service: ConversationService,
        context: dict | None = None,
    ):
        self.llm = llm
        self.conversation_id = conversation_id
        self.db = db
        self.memory = memory_service
        self.knowledge = knowledge_service
        self.conversations = conversation_service
        self.context = context or {}

    async def monologue(
        self,
        user_message: str,
    ) -> AsyncGenerator[dict, None]:
        """
        Run the agent monologue loop, yielding SSE-compatible events.

        Event types:
          thinking   — agent's reasoning
          tool_use   — tool being called
          tool_result — tool execution result
          token      — streaming response text chunk
          done       — final complete response
          error      — error occurred
        """

        # 1. Recall relevant knowledge
        memories = []
        try:
            memories = await self.knowledge.query(user_message, limit=3)
        except Exception as e:
            logger.warning(f"Knowledge recall failed: {e}")

        # 2. Build system prompt
        system_prompt = build_system_prompt(
            context=self.context,
            memories=memories,
            tool_names=MAIN_AGENT_TOOLS,
        )

        # 3. Load conversation history
        history = await self.conversations.get_history(
            self.db, self.conversation_id, limit=HISTORY_WINDOW
        )

        # 4. Build messages for LLM
        messages = self._build_messages(system_prompt, history, user_message)

        # 5. Save user message to DB
        await self.conversations.add_message(
            self.db, self.conversation_id, "user", user_message
        )

        # 6. Monologue loop
        final_text = ""
        for iteration in range(MAX_ITERATIONS):
            logger.info(f"Agent iteration {iteration + 1}/{MAX_ITERATIONS}")

            try:
                tool_schemas = self._get_tool_schemas()

                # Stream LLM response — buffer text until we know if a tool call follows.
                # Intermediate reasoning text is discarded; only text-only responses are yielded.
                streamed_text = ""
                tool_call = None

                async for chunk_text, chunk_tool_calls in self._stream_llm_with_tools(
                    messages, tool_schemas
                ):
                    if chunk_text:
                        streamed_text += chunk_text

                    if chunk_tool_calls:
                        tool_call = chunk_tool_calls

                if tool_call:
                    tool_name = tool_call["name"]
                    tool_args = tool_call["args"]

                    # Emit thinking event with descriptive label
                    if tool_name == "search_cards":
                        thought = f"Searching cards: {tool_args.get('name', tool_args.get('type', ''))}"
                    elif tool_name == "manage_deck":
                        thought = f"Modifying deck: {tool_args.get('action', '')}"
                    elif tool_name == "analyze_strategy":
                        thought = f"Analyzing strategy: {tool_args.get('task', '')[:80]}"
                    elif tool_name == "search_knowledge":
                        thought = f"Looking up rules: {tool_args.get('query', '')[:80]}"
                    else:
                        thought = f"Using {tool_name} tool..."
                    yield {
                        "type": "thinking",
                        "data": {"thoughts": [thought]},
                    }

                    # Emit tool_use event
                    yield {
                        "type": "tool_use",
                        "data": {"tool": tool_name, "args": tool_args},
                    }

                    # Execute the tool
                    result = await self._execute_tool(tool_name, tool_args)

                    # Emit tool_result event
                    tool_result_data = {"tool": tool_name, "result": result.message[:500]}
                    if result.data:
                        tool_result_data["action_data"] = result.data
                    yield {
                        "type": "tool_result",
                        "data": tool_result_data,
                    }

                    if result.break_loop:
                        # The "response" tool — this is the final answer
                        final_text = result.message
                        yield {"type": "token", "data": {"text": final_text}}
                        break

                    # Add tool interaction to messages for next iteration
                    messages.append({
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [{
                            "id": f"call_{iteration}",
                            "type": "function",
                            "function": {"name": tool_name, "arguments": json.dumps(tool_args)},
                        }],
                    })
                    messages.append({
                        "role": "tool",
                        "tool_call_id": f"call_{iteration}",
                        "content": result.message,
                    })
                else:
                    # No tool call — text is the final response, yield it now
                    if streamed_text:
                        yield {"type": "token", "data": {"text": streamed_text}}
                    final_text = streamed_text
                    break

            except Exception as e:
                logger.error(f"Agent iteration error: {e}", exc_info=True)
                yield {"type": "error", "data": {"detail": str(e)}}
                final_text = f"I encountered an error: {str(e)}"
                break
        else:
            final_text = "I've reached the maximum number of reasoning steps. Here's what I found so far — please try a more specific question."
            yield {"type": "token", "data": {"text": final_text}}

        # 7. Save assistant response
        msg = await self.conversations.add_message(
            self.db, self.conversation_id, "assistant", final_text
        )

        yield {
            "type": "done",
            "data": {"message_id": str(msg.id), "full_text": final_text},
        }

    def _build_messages(
        self,
        system_prompt: str,
        history: list[dict],
        user_message: str,
    ) -> list[dict]:
        """Build the message list for the LLM call."""
        messages = [{"role": "system", "content": system_prompt}]

        for entry in history:
            messages.append({
                "role": entry["role"],
                "content": entry.get("content", ""),
            })

        messages.append({"role": "user", "content": user_message})
        return messages

    def _get_tool_schemas(self) -> list[dict]:
        """Get tool schemas formatted for LangChain tool calling."""
        tools = get_tools_by_names(MAIN_AGENT_TOOLS)
        return [tool_cls.schema() for tool_cls in tools.values()]

    def _to_lc_messages(self, messages: list[dict]) -> list:
        """Convert raw message dicts to LangChain message objects."""
        from langchain_core.messages import (
            SystemMessage, HumanMessage, AIMessage, ToolMessage,
        )

        lc_messages = []
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content", "") or ""

            if role == "system":
                lc_messages.append(SystemMessage(content=content))
            elif role == "user":
                lc_messages.append(HumanMessage(content=content))
            elif role == "assistant":
                tc = msg.get("tool_calls")
                if tc:
                    lc_tool_calls = []
                    for call in tc:
                        lc_tool_calls.append({
                            "id": call["id"],
                            "name": call["function"]["name"],
                            "args": json.loads(call["function"]["arguments"]),
                        })
                    lc_messages.append(AIMessage(content="", tool_calls=lc_tool_calls))
                else:
                    lc_messages.append(AIMessage(content=content))
            elif role == "tool":
                lc_messages.append(ToolMessage(
                    content=content,
                    tool_call_id=msg.get("tool_call_id", ""),
                ))

        return lc_messages

    async def _stream_llm_with_tools(
        self,
        messages: list[dict],
        tool_schemas: list[dict],
    ) -> AsyncGenerator[tuple[str, dict | None], None]:
        """
        Stream LLM response, yielding (text_chunk, tool_call) tuples.

        For pure text responses, yields (chunk, None) per token.
        For tool-call responses, accumulates tool call info and yields
        ("", tool_call_dict) once complete.
        """
        lc_messages = self._to_lc_messages(messages)

        # Bind tools
        if tool_schemas:
            tools_for_lc = [
                {"type": "function", "function": schema}
                for schema in tool_schemas
            ]
            llm_bound = self.llm.bind_tools(tools_for_lc)
        else:
            llm_bound = self.llm

        # Accumulate tool call chunks
        accumulated_tool_calls: list[dict] = []

        async for chunk in llm_bound.astream(lc_messages):
            # Yield text content tokens
            text = ""
            if hasattr(chunk, "content") and chunk.content:
                text = chunk.content

            # Accumulate tool call fragments
            if hasattr(chunk, "tool_call_chunks") and chunk.tool_call_chunks:
                for tc_chunk in chunk.tool_call_chunks:
                    idx = tc_chunk.get("index", 0)
                    while len(accumulated_tool_calls) <= idx:
                        accumulated_tool_calls.append({"name": "", "args": ""})
                    if tc_chunk.get("name"):
                        accumulated_tool_calls[idx]["name"] += tc_chunk["name"]
                    if tc_chunk.get("args"):
                        accumulated_tool_calls[idx]["args"] += tc_chunk["args"]

            # Also check tool_calls on the chunk (some providers send complete)
            if hasattr(chunk, "tool_calls") and chunk.tool_calls:
                for tc in chunk.tool_calls:
                    accumulated_tool_calls = [{
                        "name": tc["name"],
                        "args": json.dumps(tc.get("args", {})),
                    }]

            if text:
                yield (text, None)

        # After stream ends, check if we got a tool call
        if accumulated_tool_calls and accumulated_tool_calls[0]["name"]:
            tc = accumulated_tool_calls[0]
            try:
                args = json.loads(tc["args"]) if tc["args"] else {}
            except json.JSONDecodeError:
                args = {}
            yield ("", {"name": tc["name"], "args": args})

    def _extract_tool_call(self, response: Any) -> dict | None:
        """Extract tool call from LangChain response."""
        if hasattr(response, "tool_calls") and response.tool_calls:
            tc = response.tool_calls[0]
            return {
                "name": tc["name"],
                "args": tc.get("args", {}),
            }
        return None

    def _extract_text(self, response: Any) -> str:
        """Extract text content from LangChain response."""
        if hasattr(response, "content"):
            return response.content or ""
        return str(response)

    async def _execute_tool(self, name: str, args: dict) -> ToolResponse:
        """Look up and execute a registered tool (main agent tools only)."""
        main_tools = get_tools_by_names(MAIN_AGENT_TOOLS)
        tool_cls = main_tools.get(name)
        if not tool_cls:
            return ToolResponse(message=f"Unknown tool: {name}")

        tool = tool_cls(agent=self, args=args)
        try:
            return await tool.execute()
        except Exception as e:
            logger.error(f"Tool {name} failed: {e}", exc_info=True)
            return ToolResponse(message=f"Tool error: {str(e)}")
