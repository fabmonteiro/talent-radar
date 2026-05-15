import logging

from qdrant_client.models import PointStruct

from core.database import supabase
from core.vector_store import qdrant, COLLECTION_NAME
from tools.embeddings import generate_embedding

logger = logging.getLogger(__name__)

_FULL_SELECT = (
    "id, nome, ramo, seniority, anos_experiencia, bio, "
    "colaborador_skills(nivel, skills_catalog(nome, categoria)), "
    "colaborador_idiomas(nivel, idiomas_catalog(nome)), "
    "colaborador_certificacoes(ano, certificacoes_catalog(nome, emissor)), "
    "experiencias(empresa, role, data_inicio, data_fim, descricao), "
    "projetos(nome, descricao, tecnologias)"
)


def _build_profile_text(c: dict) -> str:
    parts: list[str] = []

    parts.append(f"Nome: {c.get('nome', '')}.")
    if c.get("ramo"):
        parts.append(f"Ramo: {c['ramo']}.")
    if c.get("seniority"):
        parts.append(f"Função: {c['seniority']}.")
    if c.get("anos_experiencia") is not None:
        parts.append(f"Anos de experiência: {c['anos_experiencia']}.")

    skills = c.get("colaborador_skills") or []
    if skills:
        skill_strs = [
            f"{s['skills_catalog']['nome']} ({s['nivel']})" if s.get("nivel") else s["skills_catalog"]["nome"]
            for s in skills
            if s.get("skills_catalog")
        ]
        if skill_strs:
            parts.append(f"Skills: {', '.join(skill_strs)}.")

    idiomas = c.get("colaborador_idiomas") or []
    if idiomas:
        idioma_strs = [
            f"{i['idiomas_catalog']['nome']} ({i['nivel']})" if i.get("nivel") else i["idiomas_catalog"]["nome"]
            for i in idiomas
            if i.get("idiomas_catalog")
        ]
        if idioma_strs:
            parts.append(f"Idiomas: {', '.join(idioma_strs)}.")

    certs = c.get("colaborador_certificacoes") or []
    if certs:
        cert_strs = []
        for cert in certs:
            cat = cert.get("certificacoes_catalog")
            if not cat:
                continue
            s = cat["nome"]
            if cat.get("emissor"):
                s += f" ({cat['emissor']}"
                if cert.get("ano"):
                    s += f", {cert['ano']}"
                s += ")"
            cert_strs.append(s)
        if cert_strs:
            parts.append(f"Certificações: {', '.join(cert_strs)}.")

    if c.get("bio"):
        parts.append(f"Bio: {c['bio']}")

    experiencias = c.get("experiencias") or []
    if experiencias:
        exp_strs = []
        for exp in experiencias:
            s = exp.get("empresa", "")
            if exp.get("role"):
                s += f" — {exp['role']}"
            inicio = exp.get("data_inicio", "")
            fim = exp.get("data_fim") or "presente"
            if inicio:
                s += f" ({inicio}–{fim})"
            if exp.get("descricao"):
                s += f": {exp['descricao']}"
            exp_strs.append(s)
        parts.append(f"Experiências: {'. '.join(exp_strs)}.")

    projetos = c.get("projetos") or []
    if projetos:
        proj_strs = []
        for proj in projetos:
            s = proj.get("nome", "")
            if proj.get("descricao"):
                s += f" — {proj['descricao']}"
            if proj.get("tecnologias"):
                s += f" [{proj['tecnologias']}]"
            proj_strs.append(s)
        parts.append(f"Projectos: {'. '.join(proj_strs)}.")

    return " ".join(parts)


def ingest_colaborador(colaborador_id: str) -> None:
    result = supabase.table("colaboradores").select(_FULL_SELECT).eq("id", colaborador_id).execute()
    if not result.data:
        logger.warning("ingest_colaborador: colaborador %s not found", colaborador_id)
        return

    c = result.data[0]
    profile_text = _build_profile_text(c)
    vector = generate_embedding(profile_text)

    skill_names = [
        s["skills_catalog"]["nome"]
        for s in (c.get("colaborador_skills") or [])
        if s.get("skills_catalog")
    ]

    payload = {
        "nome": c.get("nome"),
        "ramo": c.get("ramo"),
        "seniority": c.get("seniority"),
        "anos_experiencia": c.get("anos_experiencia"),
        "skill_names": skill_names,
    }

    qdrant.upsert(
        collection_name=COLLECTION_NAME,
        points=[PointStruct(id=colaborador_id, vector=vector, payload=payload)],
    )
    logger.info("Ingested colaborador %s into Qdrant", colaborador_id)


def delete_colaborador_from_qdrant(colaborador_id: str) -> None:
    qdrant.delete(
        collection_name=COLLECTION_NAME,
        points_selector=[colaborador_id],
    )
    logger.info("Deleted colaborador %s from Qdrant", colaborador_id)
