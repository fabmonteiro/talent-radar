from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from core.config import settings

COLLECTION_NAME = "colaboradores"
VECTOR_SIZE = 768  # Gemini text-embedding-004

qdrant: QdrantClient = QdrantClient(
    url=settings.QDRANT_URL,
    api_key=settings.QDRANT_API_KEY,
)


def ensure_collection() -> None:
    existing = {c.name for c in qdrant.get_collections().collections}
    if COLLECTION_NAME not in existing:
        qdrant.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
