from pydantic import BaseModel, Field
from datetime import datetime


class CardResponse(BaseModel):
    """Card response schema"""

    id: str
    name: str
    type: str
    color: str | None = None
    cost: int | None = None
    power: int | None = None
    counter: int | None = None
    attribute: str | None = None
    text: str | None = None
    trigger: str | None = None
    rarity: str | None = None
    category: str | None = None
    set_code: str | None = None
    image_url: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeaderResponse(BaseModel):
    """Leader response schema"""

    id: str
    name: str
    life: int
    power: int | None = None
    colors: list[str]
    attribute: str | None = None
    text: str | None = None
    featured_character: str | None = None
    category: str | None = None
    set_code: str | None = None
    image_url: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
