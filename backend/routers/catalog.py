from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.database import supabase

router = APIRouter(prefix="/catalog", tags=["catalog"])


# ── Shared helpers ─────────────────────────────────────────────────────────

def _not_found(resource: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"{resource} not found")


def _require_update(updates: dict) -> None:
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")


# ── Skills ─────────────────────────────────────────────────────────────────

class SkillCreate(BaseModel):
    nome: str
    categoria: str


class SkillUpdate(BaseModel):
    nome: Optional[str] = None
    categoria: Optional[str] = None
    ativo: Optional[bool] = None


@router.get("/skills")
def list_skills():
    return supabase.table("skills_catalog").select("*").order("nome").execute().data


@router.post("/skills", status_code=201)
def create_skill(body: SkillCreate):
    result = supabase.table("skills_catalog").insert(body.model_dump()).execute()
    return result.data[0]


@router.patch("/skills/{id}")
def update_skill(id: str, body: SkillUpdate):
    updates = body.model_dump(exclude_none=True)
    _require_update(updates)
    result = supabase.table("skills_catalog").update(updates).eq("id", id).execute()
    if not result.data:
        raise _not_found("Skill")
    return result.data[0]


# ── Idiomas ────────────────────────────────────────────────────────────────

class IdiomaCreate(BaseModel):
    nome: str
    codigo: str


class IdiomaUpdate(BaseModel):
    nome: Optional[str] = None
    codigo: Optional[str] = None
    ativo: Optional[bool] = None


@router.get("/idiomas")
def list_idiomas():
    return supabase.table("idiomas_catalog").select("*").order("nome").execute().data


@router.post("/idiomas", status_code=201)
def create_idioma(body: IdiomaCreate):
    result = supabase.table("idiomas_catalog").insert(body.model_dump()).execute()
    return result.data[0]


@router.patch("/idiomas/{id}")
def update_idioma(id: str, body: IdiomaUpdate):
    updates = body.model_dump(exclude_none=True)
    _require_update(updates)
    result = supabase.table("idiomas_catalog").update(updates).eq("id", id).execute()
    if not result.data:
        raise _not_found("Idioma")
    return result.data[0]


# ── Certificações ──────────────────────────────────────────────────────────

class CertCreate(BaseModel):
    nome: str
    emissor: str


class CertUpdate(BaseModel):
    nome: Optional[str] = None
    emissor: Optional[str] = None
    ativo: Optional[bool] = None


@router.get("/certificacoes")
def list_certificacoes():
    return supabase.table("certificacoes_catalog").select("*").order("nome").execute().data


@router.post("/certificacoes", status_code=201)
def create_certificacao(body: CertCreate):
    result = supabase.table("certificacoes_catalog").insert(body.model_dump()).execute()
    return result.data[0]


@router.patch("/certificacoes/{id}")
def update_certificacao(id: str, body: CertUpdate):
    updates = body.model_dump(exclude_none=True)
    _require_update(updates)
    result = supabase.table("certificacoes_catalog").update(updates).eq("id", id).execute()
    if not result.data:
        raise _not_found("Certificação")
    return result.data[0]
