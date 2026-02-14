import json
import logging
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from ag_ui.encoder import EventEncoder

from app.config import settings
from app.database import get_db
from app.schemas.chat import (
    ConversationCreate,
    ConversationResponse,
    ConversationSummary,
    ConversationWithMessages,
    MessageCreate,
    MessageResponse,
)
from app.services.ai_provider import AIProviderFactory
from app.services.conversation_service import ConversationService
from app.services.memory_service import MemoryService
from app.services.knowledge_service import KnowledgeService
from app.agents.core.agent import OPTCGAgent
from app.agents.core.ag_ui_adapter import AGUIAdapter
# Import tools so the registry is populated
import app.agents.tools  # noqa: F401

logger = logging.getLogger(__name__)
router = APIRouter()

# Shared service instances
_conversation_service = ConversationService()
_memory_service = MemoryService()
_knowledge_service = KnowledgeService(_memory_service)


# ── Conversations ──


@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    data: ConversationCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat conversation."""
    conv = await _conversation_service.create_conversation(
        db,
        title=data.title,
        context=data.context,
        provider=data.provider or settings.default_ai_provider,
        model=data.model,
    )
    return conv


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List all conversations."""
    return await _conversation_service.list_conversations(db, limit, offset)


@router.get("/conversations/by-deck/{deck_id}", response_model=ConversationWithMessages | None)
async def get_conversation_by_deck(
    deck_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get the most recent conversation for a deck."""
    return await _conversation_service.get_conversation_by_deck(db, deck_id)


@router.get("/conversations/by-deck/{deck_id}/all", response_model=list[ConversationSummary])
async def list_conversations_by_deck(
    deck_id: str,
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List all conversations for a deck with message counts and previews."""
    return await _conversation_service.list_conversations_by_deck(
        db, deck_id, limit, offset
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationWithMessages)
async def get_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a conversation with its messages."""
    conv = await _conversation_service.get_conversation(db, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a conversation and all its messages."""
    deleted = await _conversation_service.delete_conversation(db, conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")


# ── Messages ──


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
async def get_messages(
    conversation_id: UUID,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Get messages for a conversation."""
    return await _conversation_service.get_messages(
        db, conversation_id, limit, offset
    )


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: UUID,
    data: MessageCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message and get an SSE-streamed AI response.

    Returns Server-Sent Events with types:
    - thinking: Agent reasoning steps
    - tool_use: Tool being called
    - tool_result: Tool execution result
    - token: Streaming response text
    - done: Final complete response
    - error: Error occurred
    """
    # Verify conversation exists
    conv = await _conversation_service.get_conversation(db, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Acquire lock to prevent concurrent messages
    locked = await _conversation_service.acquire_lock(conversation_id)
    if not locked:
        raise HTTPException(
            status_code=409,
            detail="Another message is being processed for this conversation",
        )

    # Determine provider/model
    provider = data.provider or conv.provider or settings.default_ai_provider
    model = data.model or conv.model

    async def event_generator():
        try:
            # Create LLM instance (user keys override server .env)
            llm = AIProviderFactory.get_llm(
                provider=provider,
                model=model,
                api_keys=data.api_keys,
                local_url=data.local_url,
            )

            # Create agent
            agent = OPTCGAgent(
                llm=llm,
                conversation_id=conversation_id,
                db=db,
                memory_service=_memory_service,
                knowledge_service=_knowledge_service,
                conversation_service=_conversation_service,
                context=conv.context or {},
            )

            # Run monologue loop and yield events
            async for event in agent.monologue(data.content):
                event_type = event.get("type", "unknown")
                event_data = event.get("data", {})
                yield {
                    "event": event_type,
                    "data": json.dumps(event_data),
                }

        except ValueError as e:
            logger.error(f"Config error: {e}")
            yield {
                "event": "error",
                "data": json.dumps({"detail": str(e)}),
            }
        except Exception as e:
            logger.error(f"Agent error: {e}", exc_info=True)
            yield {
                "event": "error",
                "data": json.dumps({"detail": f"Agent error: {str(e)}"}),
            }
        finally:
            await _conversation_service.release_lock(conversation_id)

    return EventSourceResponse(event_generator())


# ── AG-UI Protocol Endpoint ──


class AGUIRequest(BaseModel):
    """Simplified RunAgentInput for our frontend."""

    thread_id: str | None = None  # maps to conversation_id (null = new)
    run_id: str | None = None
    messages: list[dict] = Field(default_factory=list)
    state: dict = Field(default_factory=dict)  # provider, model, api_keys, deck_id
    context: list[dict] = Field(default_factory=list)  # [{type, value}]


@router.post("/ag-ui")
async def ag_ui_endpoint(
    data: AGUIRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    AG-UI protocol endpoint for chat.

    Streams AG-UI events (RUN_STARTED, TEXT_MESSAGE_CONTENT, TOOL_CALL_*, etc.)
    following https://github.com/ag-ui-protocol/ag-ui
    """
    encoder = EventEncoder()

    # Extract user message — last message with role "user"
    user_message = ""
    for msg in reversed(data.messages):
        if msg.get("role") == "user":
            user_message = msg.get("content", "")
            break
    if not user_message:
        raise HTTPException(status_code=400, detail="No user message found")

    # Extract settings from state
    state = data.state or {}
    provider = state.get("provider") or settings.default_ai_provider
    model = state.get("model") or None
    api_keys = state.get("api_keys") or None
    local_url = state.get("local_url") or None
    deck_id = state.get("deck_id") or None
    deck_builder_state = state.get("deck_builder_state") or None

    # Extract page from context
    page = None
    for ctx in data.context:
        if ctx.get("type") == "page":
            page = ctx.get("value")

    # Resolve or create conversation from thread_id
    thread_id = data.thread_id
    conversation_id: UUID | None = None

    if thread_id:
        try:
            conversation_id = UUID(thread_id)
            conv = await _conversation_service.get_conversation(db, conversation_id)
            if not conv:
                conversation_id = None
        except ValueError:
            conversation_id = None

    if not conversation_id:
        # Create new conversation
        context: dict = {}
        if deck_id:
            context["deck_id"] = deck_id
        if page:
            context["page"] = page
        if deck_builder_state:
            context["deck_builder_state"] = deck_builder_state

        conv = await _conversation_service.create_conversation(
            db,
            title=None,
            context=context,
            provider=provider,
            model=model,
        )
        conversation_id = conv.id
        thread_id = str(conversation_id)

    # Acquire lock
    locked = await _conversation_service.acquire_lock(conversation_id)
    if not locked:
        raise HTTPException(
            status_code=409,
            detail="Another message is being processed for this conversation",
        )

    run_id = data.run_id or str(uuid4())

    async def event_stream():
        try:
            llm = AIProviderFactory.get_llm(
                provider=provider,
                model=model,
                api_keys=api_keys,
                local_url=local_url,
            )

            # Merge latest request state into conversation context
            agent_context = dict(conv.context or {})
            if deck_id:
                agent_context["deck_id"] = deck_id
            if page:
                agent_context["page"] = page
            if deck_builder_state:
                agent_context["deck_builder_state"] = deck_builder_state

            agent = OPTCGAgent(
                llm=llm,
                conversation_id=conversation_id,
                db=db,
                memory_service=_memory_service,
                knowledge_service=_knowledge_service,
                conversation_service=_conversation_service,
                context=agent_context,
            )

            adapter = AGUIAdapter(agent, encoder)

            async for chunk in adapter.stream(user_message, run_id, thread_id):
                yield chunk

        except ValueError as e:
            logger.error(f"AG-UI config error: {e}")
            from ag_ui.core import RunErrorEvent

            yield encoder.encode(RunErrorEvent(message=str(e)))
        except Exception as e:
            logger.error(f"AG-UI error: {e}", exc_info=True)
            from ag_ui.core import RunErrorEvent

            yield encoder.encode(RunErrorEvent(message=f"Agent error: {str(e)}"))
        finally:
            await _conversation_service.release_lock(conversation_id)

    return StreamingResponse(
        event_stream(),
        media_type=encoder.get_content_type(),
        headers={
            "X-Thread-Id": thread_id,
            "Access-Control-Expose-Headers": "X-Thread-Id",
        },
    )
