import json
import httpx
from pydantic import BaseModel
from crewai.tools import BaseTool

from core.config import settings
from core.database import supabase
from core.vector_store import qdrant, COLLECTION_NAME
from tools.embeddings import generate_embedding

import google.genai as genai
from google.genai import types as genai_types

_gemini = genai.Client(api_key=settings.GEMINI_API_KEY)

_REST_HEADERS = {
    "apikey": settings.SUPABASE_SECRET_KEY,
    "Authorization": f"Bearer {settings.SUPABASE_SECRET_KEY}",
}

_SCHEMA = """\
Tables and columns:
  colaboradores          — id, nome, ramo (Business|Tech), seniority, anos_experiencia, bio
  colaborador_skills     — colaborador_id, skill_id, nivel
  skills_catalog         — id, nome
  colaborador_idiomas    — colaborador_id, idioma_id, nivel
  idiomas_catalog        — id, nome, codigo
  colaborador_certificacoes — colaborador_id, cert_id, ano
  certificacoes_catalog  — id, nome, emissor
  experiencias           — colaborador_id, empresa, role, data_inicio, data_fim, descricao
  projetos               — colaborador_id, nome, descricao, tecnologias
"""

_POSTREST_EXAMPLES = """\
PostgREST query rules:
  • Filter columns: seniority=ilike.*senior*, anos_experiencia=gte.5, ramo=eq.Tech
  • Embed relation: select=nome,colaborador_skills(nivel,skills_catalog(nome))
  • Inner join (required for filtering on relation):
      select=nome,colaborador_skills!inner(nivel,skills_catalog!inner(nome))
      &colaborador_skills.skills_catalog.nome=ilike.*python*
  • Idioma join:
      select=nome,ramo,colaborador_idiomas!inner(nivel,idiomas_catalog!inner(nome))
      &colaborador_idiomas.idiomas_catalog.nome=ilike.*alemão*
  • Cert join:
      select=nome,colaborador_certificacoes!inner(ano,certificacoes_catalog!inner(nome,emissor))
      &colaborador_certificacoes.certificacoes_catalog.nome=ilike.*cloud*
  • Counting: set prefer_count=true — returns Content-Range header
  • Ordering: &order=anos_experiencia.desc

Always URL-encode spaces as %20 inside ilike patterns when needed.
"""


class _SQLInput(BaseModel):
    question: str


class SQLSearchTool(BaseTool):
    name: str = "sql_search"
    description: str = (
        "Search collaborators using structured queries against the Supabase database. "
        "Use for questions about names, ramo, seniority, years of experience, "
        "specific skills, languages, or certifications."
    )
    args_schema: type[BaseModel] = _SQLInput

    def _run(self, question: str) -> str:
        prompt = f"""\
You are a PostgREST query generator for a Supabase database.

{_SCHEMA}
{_POSTREST_EXAMPLES}

Question: {question}

Return a JSON object with exactly these fields:
  "endpoint": string — starts with /colaboradores, includes ?select=... and all filters
  "prefer_count": boolean — true only when the question asks for a count/total

Return only the JSON, no markdown.
"""
        response = _gemini.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai_types.GenerateContentConfig(response_mime_type="application/json"),
        )
        try:
            spec = json.loads(response.text)
            endpoint: str = spec["endpoint"]
            prefer_count: bool = spec.get("prefer_count", False)
        except Exception as exc:
            return f"Error parsing query spec: {exc}\nRaw: {response.text}"

        url = f"{settings.SUPABASE_URL}/rest/v1{endpoint}"
        headers = dict(_REST_HEADERS)
        if prefer_count:
            headers["Prefer"] = "count=exact"

        try:
            resp = httpx.get(url, headers=headers, timeout=15)
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as exc:
            return f"HTTP {exc.response.status_code}: {exc.response.text[:300]}"
        except Exception as exc:
            return f"Query execution error: {exc}"

        if prefer_count:
            content_range = resp.headers.get("content-range", "?")
            total = content_range.split("/")[-1] if "/" in content_range else content_range
            return f"Total: {total} collaborator(s) match.\n{_format_rows(data[:10])}"

        if not data:
            return "No collaborators found matching the criteria."

        return f"Found {len(data)} collaborator(s):\n{_format_rows(data)}"


def _format_rows(rows: list[dict]) -> str:
    lines = []
    for row in rows:
        parts = [row.get("nome", "Unknown")]
        if row.get("ramo"):
            parts.append(row["ramo"])
        if row.get("seniority"):
            parts.append(row["seniority"])
        if row.get("anos_experiencia") is not None:
            parts.append(f"{row['anos_experiencia']} anos exp.")

        skills = [
            s["skills_catalog"]["nome"]
            for s in (row.get("colaborador_skills") or [])
            if s.get("skills_catalog")
        ]
        if skills:
            parts.append(f"Skills: {', '.join(skills)}")

        idiomas = [
            i["idiomas_catalog"]["nome"]
            for i in (row.get("colaborador_idiomas") or [])
            if i.get("idiomas_catalog")
        ]
        if idiomas:
            parts.append(f"Idiomas: {', '.join(idiomas)}")

        certs = [
            c["certificacoes_catalog"]["nome"]
            for c in (row.get("colaborador_certificacoes") or [])
            if c.get("certificacoes_catalog")
        ]
        if certs:
            parts.append(f"Certs: {', '.join(certs)}")

        lines.append("- " + " | ".join(parts))

        if row.get("bio"):
            lines.append(f"  Bio: {row['bio'][:150]}")

    return "\n".join(lines)


# ── RAG tool ─────────────────────────────────────────────────────────────────


class _RAGInput(BaseModel):
    question: str


class RAGSearchTool(BaseTool):
    name: str = "rag_search"
    description: str = (
        "Search collaborators using semantic similarity over free-text profile data "
        "(bio, experiencias, projetos). Use for questions about past projects, "
        "technologies used in context, domain experience, or soft skills."
    )
    args_schema: type[BaseModel] = _RAGInput

    def _run(self, question: str) -> str:
        import traceback

        # Step 1: generate embedding
        try:
            vector = generate_embedding(question)
            print(f"[RAG] Embedding OK — dim={len(vector)}, first5={[round(v, 4) for v in vector[:5]]}")
        except Exception:
            msg = f"[RAG] ERROR generating embedding:\n{traceback.format_exc()}"
            print(msg)
            return msg

        # Step 2: search Qdrant
        try:
            collections = [c.name for c in qdrant.get_collections().collections]
            print(f"[RAG] Qdrant collections available: {collections}")
            print(f"[RAG] Searching collection '{COLLECTION_NAME}' for: {question!r}")

            hits = qdrant.query_points(
                collection_name=COLLECTION_NAME,
                query=vector,
                limit=5,
            ).points
            print(f"[RAG] Qdrant returned {len(hits)} hit(s)")
            for h in hits:
                print(f"  id={h.id}  score={h.score:.4f}  payload={h.payload}")
        except Exception:
            msg = f"[RAG] ERROR querying Qdrant:\n{traceback.format_exc()}"
            print(msg)
            return msg

        if not hits:
            msg = "RAG search returned no results — the Qdrant collection may be empty. Run reindex_all.py to populate it."
            print(f"[RAG] {msg}")
            return msg

        ids = [str(h.id) for h in hits]
        score_map = {str(h.id): h.score for h in hits}

        # Step 3: fetch full profiles from Supabase
        try:
            rows = (
                supabase.table("colaboradores")
                .select(
                    "id, nome, ramo, seniority, anos_experiencia, bio, "
                    "colaborador_skills(nivel, skills_catalog(nome))"
                )
                .in_("id", ids)
                .execute()
                .data
            )
            print(f"[RAG] Supabase returned {len(rows)} profile(s) for ids={ids}")
        except Exception:
            msg = f"[RAG] ERROR fetching profiles from Supabase:\n{traceback.format_exc()}"
            print(msg)
            return msg

        if not rows:
            msg = f"[RAG] Qdrant returned {len(hits)} hit(s) but Supabase found no matching profiles for ids={ids}. IDs may not match."
            print(msg)
            return msg

        rows.sort(key=lambda r: score_map.get(str(r.get("id")), 0), reverse=True)

        lines = []
        for row in rows:
            score = score_map.get(str(row.get("id")), 0)
            name = row.get("nome", "Unknown")
            ramo = row.get("ramo", "")
            seniority = row.get("seniority", "")
            bio = row.get("bio", "")
            skills = [
                s["skills_catalog"]["nome"]
                for s in (row.get("colaborador_skills") or [])
                if s.get("skills_catalog")
            ]

            header = f"- {name} (similarity: {score:.3f})"
            if ramo:
                header += f" | {ramo}"
            if seniority:
                header += f" | {seniority}"
            if skills:
                header += f" | Skills: {', '.join(skills[:6])}"
            lines.append(header)
            if bio:
                lines.append(f"  Bio: {bio[:200]}")

        result = f"Top {len(rows)} semantic matches:\n" + "\n".join(lines)
        print(f"[RAG] Returning result ({len(result)} chars)")
        return result
