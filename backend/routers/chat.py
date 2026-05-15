from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from agents.crew import run_search
from core.database import supabase

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    question: str
    session_id: Optional[str] = None


@router.post("")
def chat(body: ChatRequest):
    result = run_search(body.question)

    if body.session_id:
        _persist(body.session_id, body.question, result["answer"], result.get("type"))

    return result


def _persist(session_id: str, question: str, answer: str, search_type: Optional[str]) -> None:
    existing = (
        supabase.table("chat_messages")
        .select("id")
        .eq("session_id", session_id)
        .execute()
        .data
    )
    is_first = len(existing) == 0

    supabase.table("chat_messages").insert([
        {"session_id": session_id, "role": "user", "content": question},
        {"session_id": session_id, "role": "assistant", "content": answer, "type": search_type},
    ]).execute()

    updates: dict = {"updated_at": "now()"}
    if is_first:
        updates["titulo"] = question[:50]

    supabase.table("chat_sessions").update(updates).eq("id", session_id).execute()
