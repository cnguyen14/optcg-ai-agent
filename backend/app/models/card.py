from sqlalchemy import Column, String, Integer, Text, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import ARRAY
from app.database import Base


class Card(Base):
    """One Piece TCG Card model"""

    __tablename__ = "cards"

    id = Column(String(20), primary_key=True)  # e.g., "OP01-001"
    name = Column(String(255), nullable=False, index=True)
    type = Column(String(20), nullable=False)  # Character, Event, Stage
    color = Column(String(50))  # Red, Blue, Green, Purple, Black, Yellow
    cost = Column(Integer)
    power = Column(Integer)
    counter = Column(Integer)
    attribute = Column(String(100))  # Slash, Strike, Ranged, Wisdom, Special
    text = Column(Text)  # Card ability text
    trigger = Column(Text)  # Trigger effect
    rarity = Column(String(10))  # C, UC, R, SR, SEC, L
    category = Column(String(100))  # Character category (e.g., "Straw Hat Crew")
    set_code = Column(String(10))  # OP01, OP02, etc.
    image_url = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self):
        return f"<Card {self.id}: {self.name}>"


class Leader(Base):
    """One Piece TCG Leader card model"""

    __tablename__ = "leaders"

    id = Column(String(20), primary_key=True)  # e.g., "OP01-001"
    name = Column(String(255), nullable=False, index=True)
    life = Column(Integer, nullable=False)  # Life points (usually 4 or 5)
    power = Column(Integer)
    colors = Column(ARRAY(String))  # Array of colors this leader supports
    attribute = Column(String(100))
    text = Column(Text)  # Leader ability text
    featured_character = Column(String(255))  # Main character name
    category = Column(String(100))
    set_code = Column(String(10))
    image_url = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self):
        return f"<Leader {self.id}: {self.name}>"
