"""Re-index all colaboradores into Qdrant. Run from the backend/ directory:

    python -m scripts.reindex_all
"""
import sys
import logging
from pathlib import Path

# Ensure backend/ is on sys.path when run directly
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.database import supabase
from core.vector_store import ensure_collection
from tools.ingest import ingest_colaborador

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    ensure_collection()

    ids = [row["id"] for row in supabase.table("colaboradores").select("id").execute().data]
    logger.info("Found %d colaboradores to index", len(ids))

    ok = 0
    errors = 0
    for colaborador_id in ids:
        try:
            ingest_colaborador(colaborador_id)
            ok += 1
        except Exception as exc:
            logger.error("Failed to ingest %s: %s", colaborador_id, exc)
            errors += 1

    logger.info("Done — %d indexed, %d errors", ok, errors)


if __name__ == "__main__":
    main()
