from collections import Counter

from fastapi import APIRouter

from core.database import supabase

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_stats():
    # ── Core collaborator fields ───────────────────────────────────────
    colabs = (
        supabase.table("colaboradores")
        .select("id, ramo, seniority, anos_experiencia")
        .execute()
        .data
    )

    total = len(colabs)

    ramo_counter = Counter(c["ramo"] for c in colabs if c.get("ramo"))
    by_ramo = {
        "Business": ramo_counter.get("Business", 0),
        "Tech": ramo_counter.get("Tech", 0),
    }

    seniority_counter = Counter(
        (c.get("seniority"), c.get("ramo"))
        for c in colabs
        if c.get("seniority")
    )
    by_seniority = sorted(
        [
            {"seniority": s, "ramo": r or "", "count": n}
            for (s, r), n in seniority_counter.items()
        ],
        key=lambda x: -x["count"],
    )

    exp_values = [c["anos_experiencia"] for c in colabs if c.get("anos_experiencia") is not None]
    avg_anos = round(sum(exp_values) / len(exp_values), 1) if exp_values else 0.0

    # ── Skills ─────────────────────────────────────────────────────────
    skills_rows = (
        supabase.table("colaborador_skills")
        .select("skills_catalog(nome)")
        .execute()
        .data
    )
    skill_names = [
        row["skills_catalog"]["nome"]
        for row in skills_rows
        if row.get("skills_catalog")
    ]
    top_skills = [
        {"skill": name, "count": n}
        for name, n in Counter(skill_names).most_common(10)
    ]

    # ── Idiomas ────────────────────────────────────────────────────────
    idioma_rows = (
        supabase.table("colaborador_idiomas")
        .select("idiomas_catalog(nome)")
        .execute()
        .data
    )
    idioma_names = [
        row["idiomas_catalog"]["nome"]
        for row in idioma_rows
        if row.get("idiomas_catalog")
    ]
    by_idioma = [
        {"idioma": name, "count": n}
        for name, n in Counter(idioma_names).most_common()
    ]

    # ── Certificações ──────────────────────────────────────────────────
    cert_rows = (
        supabase.table("colaborador_certificacoes")
        .select("certificacoes_catalog(nome)")
        .execute()
        .data
    )
    cert_names = [
        row["certificacoes_catalog"]["nome"]
        for row in cert_rows
        if row.get("certificacoes_catalog")
    ]
    by_certificacao = [
        {"certificacao": name, "count": n}
        for name, n in Counter(cert_names).most_common()
    ]

    return {
        "total_colaboradores": total,
        "by_ramo": by_ramo,
        "by_seniority": by_seniority,
        "top_skills": top_skills,
        "by_idioma": by_idioma,
        "by_certificacao": by_certificacao,
        "avg_anos_experiencia": avg_anos,
    }
