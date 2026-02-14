"""SearchService — pure DB queries for cards and leaders (no LLM)."""

from __future__ import annotations

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Card, Leader


class SearchService:
    """Search the OPTCG card database. Returns structured dicts, not formatted text."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def search_cards(
        self,
        *,
        name: str | None = None,
        color: str | None = None,
        cost_min: int | None = None,
        cost_max: int | None = None,
        card_type: str | None = None,
        category: str | None = None,
        power_min: int | None = None,
        set_code: str | None = None,
        text_contains: str | None = None,
        limit: int = 15,
    ) -> list[dict]:
        """Search the Card table with filters. Returns list of card dicts."""
        query = select(Card)

        if name:
            query = query.where(func.lower(Card.name).contains(name.lower()))
        if color:
            query = query.where(Card.color.ilike(f"%{color}%"))
        if cost_min is not None:
            query = query.where(Card.cost >= cost_min)
        if cost_max is not None:
            query = query.where(Card.cost <= cost_max)
        if card_type:
            query = query.where(func.lower(Card.type) == card_type.lower())
        if category:
            query = query.where(Card.category.ilike(f"%{category}%"))
        if power_min is not None:
            query = query.where(Card.power >= power_min)
        if set_code:
            query = query.where(Card.set_code == set_code)
        if text_contains:
            query = query.where(Card.text.ilike(f"%{text_contains}%"))

        query = query.limit(min(limit, 25))

        result = await self.db.execute(query)
        return [_card_to_dict(c) for c in result.scalars().all()]

    async def search_leaders(
        self,
        *,
        name: str | None = None,
        color: str | None = None,
        category: str | None = None,
        set_code: str | None = None,
        power_min: int | None = None,
        limit: int = 15,
    ) -> list[dict]:
        """Search the Leader table with filters. Returns list of leader dicts."""
        query = select(Leader)

        if name:
            query = query.where(func.lower(Leader.name).contains(name.lower()))
        if color:
            query = query.where(Leader.colors.any(color))
        if category:
            query = query.where(Leader.category.ilike(f"%{category}%"))
        if set_code:
            query = query.where(Leader.set_code == set_code)
        if power_min is not None:
            query = query.where(Leader.power >= power_min)

        query = query.limit(min(limit, 25))

        result = await self.db.execute(query)
        return [_leader_to_dict(l) for l in result.scalars().all()]

    async def get_card_by_id(self, card_id: str) -> dict | None:
        """Fetch a single card by ID."""
        result = await self.db.execute(select(Card).where(Card.id == card_id))
        card = result.scalar_one_or_none()
        return _card_to_dict(card) if card else None

    async def get_leader_by_id(self, leader_id: str) -> dict | None:
        """Fetch a single leader by ID."""
        result = await self.db.execute(select(Leader).where(Leader.id == leader_id))
        leader = result.scalar_one_or_none()
        return _leader_to_dict(leader) if leader else None

    async def get_cards_by_ids(self, card_ids: list[str]) -> dict[str, dict]:
        """Fetch multiple cards by ID. Returns {card_id: card_dict}."""
        result = await self.db.execute(select(Card).where(Card.id.in_(card_ids)))
        return {c.id: _card_to_dict(c) for c in result.scalars().all()}


# ── Serializers ──


def _card_to_dict(card: Card) -> dict:
    return {
        "id": card.id,
        "name": card.name,
        "type": card.type,
        "color": card.color,
        "cost": card.cost,
        "power": card.power,
        "counter": card.counter,
        "attribute": card.attribute,
        "text": card.text,
        "trigger": card.trigger,
        "rarity": card.rarity,
        "category": card.category,
        "set_code": card.set_code,
        "image_url": card.image_url,
    }


def _leader_to_dict(leader: Leader) -> dict:
    return {
        "id": leader.id,
        "name": leader.name,
        "life": leader.life,
        "power": leader.power,
        "colors": leader.colors or [],
        "attribute": leader.attribute,
        "text": leader.text,
        "category": leader.category,
        "set_code": leader.set_code,
        "image_url": leader.image_url,
    }


def format_card_results(results: list[dict], result_type: str = "card") -> str:
    """Format card/leader dicts into a human-readable string for tool responses."""
    if not results:
        return f"No {result_type}s found matching your criteria."

    lines = [f"Found {len(results)} {result_type}(s):\n"]
    for item in results:
        if "life" in item:
            # Leader
            parts = [f"**{item['name']}** ({item['id']})"]
            parts.append("Type: Leader")
            if item.get("colors"):
                parts.append(f"Colors: {', '.join(item['colors'])}")
            if item.get("life") is not None:
                parts.append(f"Life: {item['life']}")
            if item.get("power") is not None:
                parts.append(f"Power: {item['power']}")
            if item.get("category"):
                parts.append(f"Category: {item['category']}")
            if item.get("text"):
                parts.append(f"Effect: {item['text'][:150]}")
        else:
            # Card
            parts = [f"**{item['name']}** ({item['id']})"]
            parts.append(f"Type: {item.get('type', '?')}")
            if item.get("color"):
                parts.append(f"Color: {item['color']}")
            if item.get("cost") is not None:
                parts.append(f"Cost: {item['cost']}")
            if item.get("power") is not None:
                parts.append(f"Power: {item['power']}")
            if item.get("counter") is not None:
                parts.append(f"Counter: {item['counter']}")
            if item.get("category"):
                parts.append(f"Category: {item['category']}")
            if item.get("text"):
                parts.append(f"Effect: {item['text'][:150]}")

        lines.append(" | ".join(parts))

    return "\n".join(lines)
