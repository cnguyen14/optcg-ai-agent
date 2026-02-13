import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.config import settings
from app.database import get_db
from app.schemas.chat import (
    ConversationCreate,
    ConversationResponse,
    ConversationWithMessages,
    MessageCreate,
    MessageResponse,
)
from app.services.ai_provider import AIProviderFactory
from app.services.conversation_service import ConversationService
from app.services.memory_service import MemoryService
from app.services.knowledge_service import KnowledgeService
from app.agents.core.agent import OPTCGAgent
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
