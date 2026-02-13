from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DECIMAL, TIMESTAMP, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class Deck(Base):
    """Deck model - represents a player's constructed deck"""

    __tablename__ = "decks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    leader_id = Column(String(20), ForeignKey("leaders.id"))
    is_public = Column(Boolean, default=False)
    total_cards = Column(Integer, default=0)
    avg_cost = Column(DECIMAL(5, 2))
    color_distribution = Column(JSONB)  # {"Red": 25, "Blue": 15, "Green": 10}
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    deck_cards = relationship("DeckCard", back_populates="deck", cascade="all, delete-orphan")
    leader = relationship("Leader")
    user = relationship("User", back_populates="decks")

    def __repr__(self):
        return f"<Deck {self.id}: {self.name}>"


class DeckCard(Base):
    """Junction table for deck-card relationship with quantity"""

    __tablename__ = "deck_cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deck_id = Column(UUID(as_uuid=True), ForeignKey("decks.id", ondelete="CASCADE"), nullable=False)
    card_id = Column(String(20), ForeignKey("cards.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    deck = relationship("Deck", back_populates="deck_cards")
    card = relationship("Card")

    def __repr__(self):
        return f"<DeckCard deck={self.deck_id} card={self.card_id} qty={self.quantity}>"
