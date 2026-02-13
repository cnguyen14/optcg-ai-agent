import httpx
from app.models import Card, Leader
from sqlalchemy.ext.asyncio import AsyncSession
import logging

logger = logging.getLogger(__name__)


class OPTCGAPIClient:
    """Client for syncing cards from optcgapi.com"""

    SET_CARDS_URL = "https://optcgapi.com/api/allSetCards/"
    ST_CARDS_URL = "https://optcgapi.com/api/allSTCards/"

    async def fetch_all_cards(self) -> list[dict]:
        """Fetch all cards from both set and starter deck endpoints"""
        all_cards = []
        async with httpx.AsyncClient(timeout=60.0) as client:
            for url in [self.SET_CARDS_URL, self.ST_CARDS_URL]:
                try:
                    logger.info(f"Fetching cards from {url}")
                    response = await client.get(url)
                    response.raise_for_status()
                    data = response.json()
                    if isinstance(data, list):
                        logger.info(f"Got {len(data)} cards from {url}")
                        all_cards.extend(data)
                    else:
                        logger.error(f"Unexpected response format from {url}: {type(data)}")
                except httpx.HTTPError as e:
                    logger.error(f"HTTP error fetching from {url}: {e}")
                except Exception as e:
                    logger.error(f"Error fetching from {url}: {e}")

        logger.info(f"Total cards fetched: {len(all_cards)}")
        return all_cards

    async def sync_to_database(self, db: AsyncSession) -> dict:
        """Sync all cards to database. Returns sync statistics."""
        cards_data = await self.fetch_all_cards()

        if not cards_data:
            logger.warning("No cards fetched from API")
            return {"cards_synced": 0, "leaders_synced": 0}

        cards_synced = 0
        leaders_synced = 0
        errors = 0

        for card_data in cards_data:
            try:
                card_type = card_data.get("card_type", "")
                is_leader = card_type == "Leader"

                if is_leader:
                    leader = self._map_leader(card_data)
                    await db.merge(leader)
                    leaders_synced += 1
                else:
                    card = self._map_card(card_data)
                    await db.merge(card)
                    cards_synced += 1

            except Exception as e:
                card_id = card_data.get("card_set_id", "unknown")
                logger.error(f"Error syncing card {card_id}: {e}")
                errors += 1
                continue

        await db.commit()

        logger.info(
            f"Sync complete: {cards_synced} cards, {leaders_synced} leaders synced, {errors} errors"
        )

        return {
            "cards_synced": cards_synced,
            "leaders_synced": leaders_synced,
            "errors": errors,
        }

    def _safe_int(self, value) -> int | None:
        """Convert a string or number to int, returning None on failure."""
        if value is None:
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None

    def _extract_set_code(self, set_id: str | None) -> str | None:
        """Extract set code from set_id (e.g. 'OP-01' -> 'OP01', 'ST-01' -> 'ST01')."""
        if not set_id:
            return None
        return set_id.replace("-", "")

    def _parse_colors(self, color_str: str | None) -> list[str]:
        """Parse color string into list of colors.

        The API uses space-separated colors for multi-color cards (e.g. "Green Red").
        Valid OPTCG colors: Red, Green, Blue, Purple, Black, Yellow.
        """
        if not color_str:
            return []
        valid_colors = {"Red", "Green", "Blue", "Purple", "Black", "Yellow"}
        # Split on spaces and check if each token is a valid color
        tokens = color_str.strip().split()
        colors = [t for t in tokens if t in valid_colors]
        if colors:
            return colors
        # Fallback: return the whole string as a single color
        return [color_str.strip()]

    def _map_card(self, data: dict) -> Card:
        """Map API card data to Card model."""
        return Card(
            id=data["card_set_id"],
            name=data.get("card_name", ""),
            type=data.get("card_type", "Character"),
            color=data.get("card_color"),
            cost=self._safe_int(data.get("card_cost")),
            power=self._safe_int(data.get("card_power")),
            counter=self._safe_int(data.get("counter_amount")),
            attribute=data.get("attribute"),
            text=data.get("card_text"),
            rarity=data.get("rarity"),
            category=data.get("sub_types"),
            set_code=self._extract_set_code(data.get("set_id")),
            image_url=data.get("card_image"),
        )

    def _map_leader(self, data: dict) -> Leader:
        """Map API card data to Leader model."""
        return Leader(
            id=data["card_set_id"],
            name=data.get("card_name", ""),
            life=self._safe_int(data.get("life")) or 5,
            power=self._safe_int(data.get("card_power")),
            colors=self._parse_colors(data.get("card_color")),
            attribute=data.get("attribute"),
            text=data.get("card_text"),
            featured_character=data.get("card_name"),
            category=data.get("sub_types"),
            set_code=self._extract_set_code(data.get("set_id")),
            image_url=data.get("card_image"),
        )
