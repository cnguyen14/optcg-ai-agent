import json
import logging
from uuid import UUID

import redis.asyncio as aioredis
from sqlalchemy import select, desc, func, literal_column
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.conversation import Conversation, Message

logger = logging.getLogger(__name__)

HISTORY_TTL = 7200  # 2 hours


class ConversationService:
    """Conversation and message CRUD with Redis caching."""

    def __init__(self):
        self.redis: aioredis.Redis | None = None

    async def _get_redis(self) -> aioredis.Redis:
        if self.redis is None:
            self.redis = aioredis.from_url(
                settings.redis_url, decode_responses=True
            )
        return self.redis

    # ── Conversations ──

    async def create_conversation(
        self,
        db: AsyncSession,
        title: str | None = None,
        context: dict | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> Conversation:
        conv = Conversation(
            title=title,
            context=context,
            provider=provider,
            model=model,
        )
        db.add(conv)
        await db.flush()
        await db.refresh(conv)
        return conv

    async def list_conversations(
        self,
        db: AsyncSession,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Conversation]:
        result = await db.execute(
            select(Conversation)
            .order_by(desc(Conversation.updated_at))
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_conversation(
        self, db: AsyncSession, conversation_id: UUID
    ) -> Conversation | None:
        result = await db.execute(
            select(Conversation)
            .where(Conversation.id == conversation_id)
            .options(selectinload(Conversation.messages))
        )
        return result.scalar_one_or_none()

    async def get_conversation_by_deck(
        self, db: AsyncSession, deck_id: str
    ) -> Conversation | None:
        """Get the most recent conversation for a given deck."""
        result = await db.execute(
            select(Conversation)
            .where(Conversation.context["deck_id"].astext == deck_id)
            .options(selectinload(Conversation.messages))
            .order_by(desc(Conversation.updated_at))
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def list_conversations_by_deck(
        self,
        db: AsyncSession,
        deck_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> list[dict]:
        """List all conversations for a deck with message count and preview."""
        # Subquery for message count per conversation
        count_sq = (
            select(
                Message.conversation_id,
                func.count(Message.id).label("message_count"),
            )
            .group_by(Message.conversation_id)
            .subquery()
        )

        # Subquery for first user message preview
        # Use row_number to pick the earliest user message per conversation
        row_num = (
            func.row_number()
            .over(
                partition_by=Message.conversation_id,
                order_by=Message.created_at,
            )
            .label("rn")
        )
        first_msg_sq = (
            select(
                Message.conversation_id,
                Message.content.label("first_message_preview"),
                row_num,
            )
            .where(Message.role == "user")
            .subquery()
        )
        first_user = (
            select(
                first_msg_sq.c.conversation_id,
                first_msg_sq.c.first_message_preview,
            )
            .where(first_msg_sq.c.rn == 1)
            .subquery()
        )

        stmt = (
            select(
                Conversation,
                func.coalesce(count_sq.c.message_count, 0).label("message_count"),
                first_user.c.first_message_preview,
            )
            .outerjoin(count_sq, Conversation.id == count_sq.c.conversation_id)
            .outerjoin(first_user, Conversation.id == first_user.c.conversation_id)
            .where(Conversation.context["deck_id"].astext == deck_id)
            .order_by(desc(Conversation.updated_at))
            .limit(limit)
            .offset(offset)
        )

        result = await db.execute(stmt)
        rows = result.all()

        summaries = []
        for conv, msg_count, preview in rows:
            summaries.append({
                "id": conv.id,
                "title": conv.title,
                "context": conv.context,
                "provider": conv.provider,
                "model": conv.model,
                "is_active": conv.is_active,
                "created_at": conv.created_at,
                "updated_at": conv.updated_at,
                "message_count": msg_count,
                "first_message_preview": (preview[:120] + "…") if preview and len(preview) > 120 else preview,
            })
        return summaries

    async def delete_conversation(
        self, db: AsyncSession, conversation_id: UUID
    ) -> bool:
        conv = await db.get(Conversation, conversation_id)
        if not conv:
            return False
        await db.delete(conv)
        # Clear Redis cache
        r = await self._get_redis()
        await r.delete(f"conv:{conversation_id}:history")
        return True

    # ── Messages ──

    async def add_message(
        self,
        db: AsyncSession,
        conversation_id: UUID,
        role: str,
        content: str | None = None,
        tool_calls: dict | None = None,
        metadata: dict | None = None,
    ) -> Message:
        msg = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            tool_calls=tool_calls,
            metadata_=metadata,
        )
        db.add(msg)
        await db.flush()
        await db.refresh(msg)

        # Update Redis cache
        r = await self._get_redis()
        cache_key = f"conv:{conversation_id}:history"
        entry = json.dumps({
            "id": str(msg.id),
            "role": msg.role,
            "content": msg.content,
            "tool_calls": msg.tool_calls,
            "created_at": msg.created_at.isoformat(),
        })
        await r.rpush(cache_key, entry)
        await r.expire(cache_key, HISTORY_TTL)

        # Update conversation timestamp
        conv = await db.get(Conversation, conversation_id)
        if conv:
            from datetime import datetime
            conv.updated_at = datetime.utcnow()

        return msg

    async def get_history(
        self,
        db: AsyncSession,
        conversation_id: UUID,
        limit: int = 50,
    ) -> list[dict]:
        """Get message history. Tries Redis first, falls back to DB."""
        r = await self._get_redis()
        cache_key = f"conv:{conversation_id}:history"

        # Try Redis
        cached = await r.lrange(cache_key, -limit, -1)
        if cached:
            return [json.loads(entry) for entry in cached]

        # Fallback to DB
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
            .limit(limit)
        )
        messages = result.scalars().all()

        history = []
        for msg in messages:
            entry = {
                "id": str(msg.id),
                "role": msg.role,
                "content": msg.content,
                "tool_calls": msg.tool_calls,
                "created_at": msg.created_at.isoformat(),
            }
            history.append(entry)
            # Re-cache
            await r.rpush(cache_key, json.dumps(entry))

        if history:
            await r.expire(cache_key, HISTORY_TTL)

        return history

    async def get_messages(
        self,
        db: AsyncSession,
        conversation_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Message]:
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    # ── Locking ──

    async def acquire_lock(self, conversation_id: UUID, ttl: int = 60) -> bool:
        r = await self._get_redis()
        return bool(await r.set(
            f"conv:{conversation_id}:lock", "1", nx=True, ex=ttl
        ))

    async def release_lock(self, conversation_id: UUID):
        r = await self._get_redis()
        await r.delete(f"conv:{conversation_id}:lock")
