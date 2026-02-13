import logging
from pathlib import Path
from app.services.memory_service import MemoryService

logger = logging.getLogger(__name__)

KNOWLEDGE_DIR = Path(__file__).parent.parent / "knowledge"


class KnowledgeService:
    """High-level wrapper for knowledge-base operations (rules RAG)."""

    def __init__(self, memory_service: MemoryService):
        self.memory = memory_service

    async def index_rules(self) -> int:
        """Index all markdown files in the knowledge directory."""
        total = 0
        if not KNOWLEDGE_DIR.exists():
            logger.warning(f"Knowledge directory not found: {KNOWLEDGE_DIR}")
            return 0

        for md_file in sorted(KNOWLEDGE_DIR.glob("*.md")):
            count = await self.memory.index_document(
                str(md_file), collection="optcg_knowledge"
            )
            total += count
            logger.info(f"Indexed {count} chunks from {md_file.name}")

        return total

    async def query(self, question: str, limit: int = 5) -> list[dict]:
        """Query the knowledge base for relevant text chunks."""
        return await self.memory.search(
            query=question,
            collection="optcg_knowledge",
            limit=limit,
            threshold=0.25,
        )
