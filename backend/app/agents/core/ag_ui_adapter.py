"""Translates OPTCGAgent monologue events → AG-UI protocol events."""

from __future__ import annotations

import json
import logging
from uuid import uuid4

from ag_ui.core import (
    RunStartedEvent,
    RunFinishedEvent,
    RunErrorEvent,
    TextMessageStartEvent,
    TextMessageContentEvent,
    TextMessageEndEvent,
    ToolCallStartEvent,
    ToolCallArgsEvent,
    ToolCallEndEvent,
    ToolCallResultEvent,
    StateSnapshotEvent,
    CustomEvent,
)
from ag_ui.encoder import EventEncoder

from app.agents.core.agent import OPTCGAgent

logger = logging.getLogger(__name__)


class AGUIAdapter:
    """Wraps OPTCGAgent.monologue() and yields AG-UI SSE strings."""

    def __init__(self, agent: OPTCGAgent, encoder: EventEncoder | None = None):
        self.agent = agent
        self.encoder = encoder or EventEncoder()

    async def stream(self, user_message: str, run_id: str, thread_id: str):
        msg_id = str(uuid4())
        tool_idx = 0

        # RUN_STARTED
        yield self.encoder.encode(
            RunStartedEvent(thread_id=thread_id, run_id=run_id)
        )

        # STATE_SNAPSHOT — expose deck context to the frontend
        yield self.encoder.encode(
            StateSnapshotEvent(snapshot=self.agent.context)
        )

        # TEXT_MESSAGE_START
        yield self.encoder.encode(
            TextMessageStartEvent(message_id=msg_id, role="assistant")
        )

        try:
            async for event in self.agent.monologue(user_message):
                etype = event.get("type", "")
                data = event.get("data", {})

                if etype == "token":
                    text = data.get("text", "")
                    if text:
                        yield self.encoder.encode(
                            TextMessageContentEvent(
                                message_id=msg_id, delta=text
                            )
                        )

                elif etype == "thinking":
                    thoughts = data.get("thoughts", [])
                    if thoughts:
                        yield self.encoder.encode(
                            CustomEvent(
                                name="thinking",
                                value={"thoughts": thoughts},
                            )
                        )

                elif etype == "tool_use":
                    tc_id = f"tc_{tool_idx}"
                    yield self.encoder.encode(
                        ToolCallStartEvent(
                            tool_call_id=tc_id,
                            tool_call_name=data.get("tool", "unknown"),
                            parent_message_id=msg_id,
                        )
                    )
                    yield self.encoder.encode(
                        ToolCallArgsEvent(
                            tool_call_id=tc_id,
                            delta=json.dumps(data.get("args", {})),
                        )
                    )
                    yield self.encoder.encode(
                        ToolCallEndEvent(tool_call_id=tc_id)
                    )

                elif etype == "tool_result":
                    tc_id = f"tc_{tool_idx}"
                    result_msg_id = str(uuid4())
                    yield self.encoder.encode(
                        ToolCallResultEvent(
                            message_id=result_msg_id,
                            tool_call_id=tc_id,
                            content=data.get("result", ""),
                            role="tool",
                        )
                    )
                    # Emit deck_action CustomEvent if tool returned action_data
                    action_data = data.get("action_data")
                    if action_data:
                        yield self.encoder.encode(
                            CustomEvent(name="deck_action", value=action_data)
                        )
                    tool_idx += 1

                elif etype == "error":
                    yield self.encoder.encode(
                        RunErrorEvent(message=data.get("detail", "Unknown error"))
                    )

                elif etype == "done":
                    # Will be handled after the loop
                    pass

        except Exception as e:
            logger.error(f"AG-UI stream error: {e}", exc_info=True)
            yield self.encoder.encode(
                RunErrorEvent(message=str(e))
            )

        # TEXT_MESSAGE_END + RUN_FINISHED
        yield self.encoder.encode(TextMessageEndEvent(message_id=msg_id))
        yield self.encoder.encode(
            RunFinishedEvent(thread_id=thread_id, run_id=run_id)
        )
