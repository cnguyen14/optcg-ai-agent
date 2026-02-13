#!/usr/bin/env python3
"""Index OPTCG knowledge base documents into Qdrant."""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.memory_service import MemoryService
from app.services.knowledge_service import KnowledgeService


async def main():
    print("Initializing memory service...")
    memory = MemoryService()
    memory.initialize_collections()

    print("Indexing knowledge base...")
    knowledge = KnowledgeService(memory)
    total = await knowledge.index_rules()

    print(f"Done! Indexed {total} chunks into Qdrant.")


if __name__ == "__main__":
    asyncio.run(main())
