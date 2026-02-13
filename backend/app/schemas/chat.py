from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class ConversationCreate(BaseModel):
    title: str | None = None
    context: dict | None = None
    provider: str | None = None
    model: str | None = None


class ConversationResponse(BaseModel):
    id: UUID
    title: str | None
    context: dict | None
    provider: str | None
    model: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    provider: str | None = None
    model: str | None = None
    api_keys: dict[str, str] | None = None  # {provider_id: api_key}
    local_url: str | None = None  # Base URL for local AI server


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str | None
    tool_calls: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationWithMessages(ConversationResponse):
    messages: list[MessageResponse] = []
