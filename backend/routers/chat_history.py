from fastapi import APIRouter, HTTPException

from core.database import supabase

router = APIRouter(prefix="/chat", tags=["chat"])


def _404():
    return HTTPException(status_code=404, detail="Session not found")


# ── Sessions ──────────────────────────────────────────────────────────────────

@router.get("/sessions")
def list_sessions():
    rows = (
        supabase.table("chat_sessions")
        .select("id, titulo, created_at, updated_at, chat_messages(count)")
        .order("updated_at", desc=True)
        .execute()
        .data
    )
    for row in rows:
        counts = row.pop("chat_messages", [])
        row["message_count"] = counts[0]["count"] if counts else 0
    return rows


@router.post("/sessions", status_code=201)
def create_session():
    result = supabase.table("chat_sessions").insert({}).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create session")
    return result.data[0]


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: str):
    supabase.table("chat_sessions").delete().eq("id", session_id).execute()


@router.get("/sessions/{session_id}/messages")
def get_messages(session_id: str):
    result = (
        supabase.table("chat_sessions")
        .select("id")
        .eq("id", session_id)
        .execute()
    )
    if not result.data:
        raise _404()

    return (
        supabase.table("chat_messages")
        .select("id, role, content, type, created_at")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
        .data
    )
