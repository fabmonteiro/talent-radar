from fastapi import APIRouter
from pydantic import BaseModel

from agents.crew import run_search

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    question: str


@router.post("")
def chat(body: ChatRequest):
    return run_search(body.question)
