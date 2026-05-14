from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.database import supabase
from core.vector_store import qdrant, ensure_collection
from routers.catalog import router as catalog_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify Supabase connectivity by fetching one row from any catalog table
    supabase.table("skills_catalog").select("id").limit(1).execute()

    # Ensure the Qdrant collection exists
    ensure_collection()

    yield


app = FastAPI(title="TalentRadar API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(catalog_router, prefix="/api")


@app.get("/health")
def health():
    supabase_ok = False
    qdrant_ok = False
    details: dict = {}

    try:
        supabase.table("skills_catalog").select("id").limit(1).execute()
        supabase_ok = True
    except Exception as exc:
        details["supabase_error"] = str(exc)

    try:
        qdrant.get_collections()
        qdrant_ok = True
    except Exception as exc:
        details["qdrant_error"] = str(exc)

    overall = "ok" if (supabase_ok and qdrant_ok) else "degraded"
    return {
        "status": overall,
        "supabase": "ok" if supabase_ok else "error",
        "qdrant": "ok" if qdrant_ok else "error",
        **details,
    }
