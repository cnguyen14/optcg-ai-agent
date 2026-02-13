"""
Standalone script to sync cards from optcgapi.com into the database.

Usage:
    cd backend
    uv run python -m scripts.sync_cards
"""

import asyncio
import logging
from app.database import AsyncSessionLocal
from app.services.card_sync import OPTCGAPIClient

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


async def main():
    logger.info("Starting card sync from optcgapi.com...")

    client = OPTCGAPIClient()
    async with AsyncSessionLocal() as db:
        stats = await client.sync_to_database(db)

    logger.info(f"Sync complete!")
    logger.info(f"  Cards synced: {stats['cards_synced']}")
    logger.info(f"  Leaders synced: {stats['leaders_synced']}")
    logger.info(f"  Errors: {stats.get('errors', 0)}")


if __name__ == "__main__":
    asyncio.run(main())
