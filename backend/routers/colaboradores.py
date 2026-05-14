from fastapi import APIRouter, HTTPException

from core.database import supabase
from models.colaborador import (
    ColaboradorCreate,
    ColaboradorUpdate,
    ExperienciaCreate,
    ProjetoCreate,
    ColaboradorSkillCreate,
    ColaboradorIdiomaCreate,
    ColaboradorCertCreate,
)

router = APIRouter(prefix="/colaboradores", tags=["colaboradores"])

# Select used for list (lighter — only skills for card badges)
_LIST_SELECT = (
    "id, nome, seniority, anos_experiencia, bio, "
    "colaborador_skills(skill_id, nivel, skills_catalog(nome, categoria))"
)

# Select used for single-record detail / edit
_FULL_SELECT = (
    "*, "
    "colaborador_skills(skill_id, nivel, skills_catalog(id, nome, categoria)), "
    "colaborador_idiomas(idioma_id, nivel, idiomas_catalog(id, nome, codigo)), "
    "colaborador_certificacoes(cert_id, ano, certificacoes_catalog(id, nome, emissor)), "
    "experiencias(*), "
    "projetos(*)"
)


def _404(resource: str = "Colaborador") -> HTTPException:
    return HTTPException(status_code=404, detail=f"{resource} not found")


# ── CRUD ───────────────────────────────────────────────────────────────────

@router.get("")
def list_colaboradores():
    return supabase.table("colaboradores").select(_LIST_SELECT).order("nome").execute().data


@router.post("", status_code=201)
def create_colaborador(body: ColaboradorCreate):
    result = supabase.table("colaboradores").insert(body.model_dump(exclude_none=True)).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create colaborador")
    return result.data[0]


@router.get("/{id}")
def get_colaborador(id: str):
    result = supabase.table("colaboradores").select(_FULL_SELECT).eq("id", id).execute()
    if not result.data:
        raise _404()
    return result.data[0]


@router.patch("/{id}")
def update_colaborador(id: str, body: ColaboradorUpdate):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("colaboradores").update(updates).eq("id", id).execute()
    if not result.data:
        raise _404()
    return result.data[0]


@router.delete("/{id}", status_code=204)
def delete_colaborador(id: str):
    supabase.table("colaboradores").delete().eq("id", id).execute()


# ── Skills ─────────────────────────────────────────────────────────────────

@router.post("/{id}/skills", status_code=201)
def add_skill(id: str, body: ColaboradorSkillCreate):
    data = {"colaborador_id": id, **body.model_dump(exclude_none=True)}
    result = supabase.table("colaborador_skills").insert(data).execute()
    return result.data[0]


@router.delete("/{id}/skills/{skill_id}", status_code=204)
def remove_skill(id: str, skill_id: str):
    supabase.table("colaborador_skills").delete().eq("colaborador_id", id).eq("skill_id", skill_id).execute()


# ── Idiomas ────────────────────────────────────────────────────────────────

@router.post("/{id}/idiomas", status_code=201)
def add_idioma(id: str, body: ColaboradorIdiomaCreate):
    data = {"colaborador_id": id, **body.model_dump(exclude_none=True)}
    result = supabase.table("colaborador_idiomas").insert(data).execute()
    return result.data[0]


@router.delete("/{id}/idiomas/{idioma_id}", status_code=204)
def remove_idioma(id: str, idioma_id: str):
    supabase.table("colaborador_idiomas").delete().eq("colaborador_id", id).eq("idioma_id", idioma_id).execute()


# ── Certificações ──────────────────────────────────────────────────────────

@router.post("/{id}/certificacoes", status_code=201)
def add_certificacao(id: str, body: ColaboradorCertCreate):
    data = {"colaborador_id": id, **body.model_dump(exclude_none=True)}
    result = supabase.table("colaborador_certificacoes").insert(data).execute()
    return result.data[0]


@router.delete("/{id}/certificacoes/{cert_id}", status_code=204)
def remove_certificacao(id: str, cert_id: str):
    supabase.table("colaborador_certificacoes").delete().eq("colaborador_id", id).eq("cert_id", cert_id).execute()


# ── Experiências ───────────────────────────────────────────────────────────

@router.post("/{id}/experiencias", status_code=201)
def add_experiencia(id: str, body: ExperienciaCreate):
    data = {"colaborador_id": id, **body.model_dump(exclude_none=True)}
    result = supabase.table("experiencias").insert(data).execute()
    return result.data[0]


@router.delete("/{id}/experiencias/{exp_id}", status_code=204)
def remove_experiencia(id: str, exp_id: str):
    supabase.table("experiencias").delete().eq("id", exp_id).eq("colaborador_id", id).execute()


# ── Projetos ───────────────────────────────────────────────────────────────

@router.post("/{id}/projetos", status_code=201)
def add_projeto(id: str, body: ProjetoCreate):
    data = {"colaborador_id": id, **body.model_dump(exclude_none=True)}
    result = supabase.table("projetos").insert(data).execute()
    return result.data[0]


@router.delete("/{id}/projetos/{projeto_id}", status_code=204)
def remove_projeto(id: str, projeto_id: str):
    supabase.table("projetos").delete().eq("id", projeto_id).eq("colaborador_id", id).execute()
