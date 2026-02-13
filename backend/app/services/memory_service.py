import logging
from pathlib import Path

from openai import OpenAI
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings

logger = logging.getLogger(__name__)

EMBEDDING_DIMENSION = 1536  # text-embedding-3-small


class MemoryService:
    """Qdrant-backed vector memory for RAG and knowledge storage."""

    def __init__(self):
        self.client = QdrantClient(url=settings.qdrant_url)
        self.openai = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=1500,
            chunk_overlap=200,
            separators=["\n## ", "\n### ", "\n\n", "\n", ". ", " "],
        )

    def initialize_collections(self):
        """Create Qdrant collections if they don't exist."""
        for name in ("optcg_knowledge", "optcg_analysis"):
            if not self.client.collection_exists(name):
                self.client.create_collection(
                    collection_name=name,
                    vectors_config=qmodels.VectorParams(
                        size=EMBEDDING_DIMENSION,
                        distance=qmodels.Distance.COSINE,
                    ),
                )
                logger.info(f"Created Qdrant collection: {name}")

    def _embed(self, texts: list[str]) -> list[list[float]]:
        """Embed texts using OpenAI embeddings."""
        if not self.openai:
            raise RuntimeError("OpenAI API key required for embeddings")

        resp = self.openai.embeddings.create(
            model=settings.embedding_model,
            input=texts,
        )
        return [item.embedding for item in resp.data]

    async def search(
        self,
        query: str,
        collection: str = "optcg_knowledge",
        limit: int = 5,
        threshold: float = 0.3,
    ) -> list[dict]:
        """Search for relevant documents in a collection."""
        vectors = self._embed([query])
        results = self.client.query_points(
            collection_name=collection,
            query=vectors[0],
            limit=limit,
            score_threshold=threshold,
        )
        return [
            {
                "text": point.payload.get("text", ""),
                "source": point.payload.get("source", ""),
                "score": point.score,
            }
            for point in results.points
        ]

    async def insert(
        self,
        text: str,
        collection: str,
        metadata: dict | None = None,
    ):
        """Insert a single text chunk into a collection."""
        import uuid

        vectors = self._embed([text])
        payload = {"text": text, **(metadata or {})}
        self.client.upsert(
            collection_name=collection,
            points=[
                qmodels.PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vectors[0],
                    payload=payload,
                )
            ],
        )

    async def index_document(self, filepath: str, collection: str = "optcg_knowledge"):
        """Chunk a markdown document and index all chunks."""
        import uuid

        path = Path(filepath)
        if not path.exists():
            logger.warning(f"File not found: {filepath}")
            return 0

        content = path.read_text(encoding="utf-8")
        chunks = self.splitter.split_text(content)

        if not chunks:
            return 0

        vectors = self._embed(chunks)
        points = [
            qmodels.PointStruct(
                id=str(uuid.uuid4()),
                vector=vec,
                payload={"text": chunk, "source": path.name},
            )
            for chunk, vec in zip(chunks, vectors)
        ]

        self.client.upsert(collection_name=collection, points=points)
        logger.info(f"Indexed {len(points)} chunks from {path.name}")
        return len(points)
