from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from app.schemas.card import CardResponse, LeaderResponse


class DeckCardCreate(BaseModel):
    """Schema for adding a card to a deck"""

    card_id: str
    quantity: int = Field(ge=1, le=4, description="Quantity must be between 1 and 4")


class DeckCardResponse(BaseModel):
    """Deck card response with card details"""

    id: UUID4
    card: CardResponse
    quantity: int

    class Config:
        from_attributes = True


class DeckCreate(BaseModel):
    """Schema for creating a new deck"""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    leader_id: str
    is_public: bool = False
    cards: list[DeckCardCreate] = []


class DeckUpdate(BaseModel):
    """Schema for updating a deck"""

    name: str | None = None
    description: str | None = None
    is_public: bool | None = None
    leader_id: str | None = None
    cards: list[DeckCardCreate] | None = None


class DeckResponse(BaseModel):
    """Deck response schema"""

    id: UUID4
    user_id: UUID4 | None = None
    name: str
    description: str | None
    leader_id: str
    leader: LeaderResponse | None = None
    is_public: bool
    total_cards: int
    avg_cost: float | None
    color_distribution: dict | None
    deck_cards: list[DeckCardResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
