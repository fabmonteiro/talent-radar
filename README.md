# TalentRadar

An internal talent-management platform that lets you search, browse, and query your team's profiles through a natural-language chat interface powered by a multi-agent AI system.

> Built as a learning project to explore production-grade AI engineering patterns: multi-agent orchestration, hybrid search (SQL + vector), and full-stack deployment on the modern Vercel/Render stack.

---

## Overview

TalentRadar stores rich collaborator profiles — skills, languages, certifications, work experience, and project history — and exposes them through two surfaces:

1. **A structured CRUD interface** to manage collaborators, catalog entries (skills, languages, certifications), and view dashboards.
2. **An AI chat interface** where you type natural-language questions in Portuguese and a multi-agent CrewAI system routes the question to either a SQL agent (structured filters) or a RAG agent (semantic search over free-text), then synthesises the result in Portuguese.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 14)  — Vercel                            │
│  Pages: Dashboard · Collaborators · Chat · Admin            │
│  UI: shadcn/ui + Tailwind CSS + Recharts                    │
└────────────────────────┬────────────────────────────────────┘
                         │ REST (NEXT_PUBLIC_API_URL)
┌────────────────────────▼────────────────────────────────────┐
│  Backend (FastAPI + Python 3.11)  — Render                  │
│                                                             │
│  Routers:                                                   │
│   /api/colaboradores  — CRUD + triggers ingest pipeline     │
│   /api/catalog        — skills / idiomas / certificacoes    │
│   /api/chat           — AI chat endpoint                    │
│   /api/chat/sessions  — persistent chat history            │
│   /api/dashboard      — aggregated stats                    │
│   /health             — liveness probe                      │
│                                                             │
│  CrewAI Multi-Agent System:                                 │
│   Router Agent → SQL Agent ──► PostgREST (Supabase)         │
│               └→ RAG Agent ──► Qdrant vector search         │
│   Synthesizer Agent  (combines & responds in PT)            │
└──────┬──────────────────────────┬───────────────────────────┘
       │                          │
┌──────▼──────┐          ┌────────▼────────┐
│  Supabase   │          │     Qdrant      │
│ PostgreSQL  │          │ Vector Database │
│ (structured │          │  (768-dim       │
│   data)     │          │   embeddings)   │
└─────────────┘          └─────────────────┘
```

---

## Features

- **Collaborator profiles** — name, seniority/role, years of experience, bio, skills (with proficiency level), languages (with proficiency level), certifications (with year), work experience, and projects
- **Catalog management** — admin UI to add/edit/archive skills, languages, and certifications
- **Dashboard** — bar and pie charts showing team distribution by track, seniority, top skills, and language coverage
- **Hybrid AI search** — the chat agent automatically chooses SQL for structured queries and semantic search for narrative questions
- **Persistent chat sessions** — conversations are stored in Supabase; each session is titled from the first message and shows message count
- **SQL badge / RAG badge** — every AI response in the chat shows which search path was used
- **Automatic vector ingest** — every time a collaborator is created or updated, their profile is embedded and upserted into Qdrant immediately
- **Health endpoint** — `/health` checks both Supabase and Qdrant connectivity

---

## Tech Stack

### Next.js 14 + shadcn/ui

React framework with file-based routing and server-side rendering capabilities. Chosen because it is the industry standard for production-grade web applications in 2025/26 and deploys trivially on Vercel (same company). `shadcn/ui` provides accessible, well-designed components that live directly in your codebase rather than in an opaque dependency — you own the code and can customise freely.

**Alternatives considered:** Vite + React, Remix, SvelteKit, Nuxt (Vue)

---

### FastAPI

Asynchronous Python REST framework. Chosen over Flask and Django REST Framework because it is significantly faster, provides automatic type validation through Pydantic, and generates interactive Swagger documentation at `/docs` with zero configuration. FastAPI is the de-facto standard for AI/ML backends in Python and appears in virtually every AI Engineer job description in Europe today.

**Alternatives considered:** Flask, Django REST Framework, Express.js (Node), Hono

---

### CrewAI

Multi-agent orchestration framework. Chosen because it has a simple, readable API for defining agents with roles, goals, and tools. The approach of explicit `role`/`goal`/`backstory` prompts per agent makes the system easy to reason about and iterate on. LangGraph would be a more explicit and controllable alternative for very complex stateful flows, but for this use case CrewAI is more readable and faster to iterate.

The system uses four agents:

| Agent | Responsibility |
|---|---|
| **Router** | Classifies each question as `SQL` or `RAG` |
| **SQL Agent** | Uses a PostgREST query-generation tool against Supabase |
| **RAG Agent** | Uses a semantic search tool against Qdrant |
| **Synthesizer** | Combines results and writes a Portuguese response |

**Alternatives considered:** LangGraph, AutoGen (Microsoft), LlamaIndex Workflows, Google ADK

---

### Gemini 2.5 Flash

Base LLM for all agents. The same model is used for both chat generation and the intermediate PostgREST query-generation step in the SQL tool.

**Alternatives considered:** GPT-4o (OpenAI), Claude 3.5 Sonnet (Anthropic), Llama 3.3 (Meta, open-source), Mistral Large

---

### Supabase — PostgreSQL

Hosted PostgreSQL with an auto-generated REST API via PostgREST. Chosen because it is open-source, has a genuinely usable free tier, and automatically exposes a REST API from the SQL schema — eliminating the need to write boilerplate CRUD routes by hand. The SQL agent directly hits the PostgREST REST API to query collaborator data using complex joins, `ilike` filters, and `Content-Range` counting. This would not be possible with a document database.

Unlike Firebase, data is relational and strongly typed, which is essential for the join-heavy queries the SQL agent generates (e.g., filtering by skill level through a junction table, or counting collaborators by certification issuer and year).

**Alternatives considered:** Firebase (Google), PlanetScale, Neon, AWS RDS, MongoDB Atlas, Turso

---

### Qdrant

Vector database for storing embeddings and performing semantic search. Chosen because it is open-source, consistently top-ranked in 2025/26 benchmarks, supports native hybrid search (dense + BM25), and has a permanently free cloud tier. Pinecone is proprietary and expensive at scale; ChromaDB is excellent for local development but lacks production-grade cloud hosting for free; Weaviate is more complex to configure.

Vectors are 768-dimensional and indexed with cosine distance. Each collaborator gets a single point in the collection, with a payload containing name, ramo, seniority, and skill names for fast pre-filtering.

**Alternatives considered:** Pinecone, Weaviate, ChromaDB, pgvector (PostgreSQL extension), Milvus, Redis VSS

---

### gemini-embedding-001

Embedding model for generating vector representations of collaborator profiles. Chosen because it lives in the same Google ecosystem as the rest of the project (no additional API key), is available at no extra cost on the free tier, and the 768-dimensional output is sufficient for the scale of this project.

At ingest time, the full collaborator profile is serialised into a single text document (name + role + skills + languages + certifications + bio + experiences + projects) and embedded as one vector. At query time, the user's question is embedded with the same model and the nearest vectors are retrieved.

**Alternatives considered:** text-embedding-ada-002 (OpenAI), text-embedding-3-large (OpenAI), sentence-transformers (local, open-source), Cohere Embed

---

### Vercel

Frontend deployment. Chosen because it has the tightest integration with Next.js (both are from the same company — Vercel created Next.js), automatic preview deployments from GitHub PRs, and a generous free tier. The build pipeline, CDN, and HTTPS certificate are all managed with zero configuration.

**Alternatives considered:** Netlify, AWS Amplify, Cloudflare Pages, Render

---

### Render

Backend deployment. Chosen because it has a genuinely free tier for Docker-based web services, deploys straight from a GitHub repo using `render.yaml` at the project root, and requires no credit card. The `render.yaml` points to `backend/Dockerfile` with `backend/` as the Docker context; Render handles builds, environment variable injection, HTTPS, and automatic restarts. Railway was the first choice but required a paid plan; Render covers this project's needs entirely for free.

> **Note:** Render's free tier spins down services after 15 minutes of inactivity. The first request after a cold start may take 30–60 seconds while the container restarts.

**Alternatives considered:** Railway, Fly.io, Google Cloud Run, AWS Lambda, Heroku

---

## Project Structure

```
talent-radar/
├── render.yaml               # Render build + deploy config (points to backend/Dockerfile)
│
├── backend/
│   ├── Dockerfile            # python:3.11-slim + uv, exposes port 8000
│   ├── .dockerignore
│   ├── pyproject.toml        # uv-managed dependencies
│   ├── uv.lock
│   ├── main.py               # FastAPI app, lifespan, CORS, router registration
│   │
│   ├── core/
│   │   ├── config.py         # Pydantic Settings — reads .env
│   │   ├── database.py       # Supabase client singleton
│   │   └── vector_store.py   # Qdrant client singleton + ensure_collection()
│   │
│   ├── agents/
│   │   ├── crew.py           # Router / SQL / RAG / Synthesizer agents + run_search()
│   │   └── tools.py          # SQLSearchTool (PostgREST) + RAGSearchTool (Qdrant)
│   │
│   ├── routers/
│   │   ├── colaboradores.py  # CRUD + triggers ingest on create/update
│   │   ├── catalog.py        # Skills / idiomas / certificacoes catalogs
│   │   ├── chat.py           # POST /chat — calls run_search(), persists history
│   │   ├── chat_history.py   # GET/POST/DELETE sessions and messages
│   │   └── dashboard.py      # Aggregated stats for the dashboard page
│   │
│   ├── tools/
│   │   ├── embeddings.py     # generate_embedding() using gemini-embedding-001
│   │   └── ingest.py         # ingest_colaborador() — builds profile text, embeds, upserts to Qdrant
│   │
│   ├── models/
│   │   └── colaborador.py    # Pydantic request/response models
│   │
│   ├── database/
│   │   ├── schema.sql        # Full PostgreSQL schema + seed data — run in Supabase SQL editor
│   │   └── chat_history.sql  # Chat sessions and messages tables
│   │
│   └── scripts/
│       └── reindex_all.py    # One-off script to re-embed all collaborators into Qdrant
│
└── frontend/
    ├── vercel.json           # Vercel deployment config (Next.js framework)
    ├── .env.example          # NEXT_PUBLIC_API_URL=http://localhost:8000
    ├── package.json
    │
    ├── app/
    │   ├── layout.tsx        # Root layout with sidebar and theme provider
    │   ├── page.tsx          # Redirect to /dashboard
    │   ├── dashboard/        # Charts: team distribution, top skills, languages
    │   ├── collaborators/    # List + detail modal + create + edit pages
    │   ├── chat/             # AI chat with session sidebar and SQL/RAG badges
    │   └── admin/            # Catalog management (skills, languages, certifications)
    │
    └── components/
        ├── Sidebar.tsx
        ├── ColaboradorForm.tsx
        └── ui/               # shadcn/ui components (badge, button, card, input, ...)
```

---

## Database Schema

The schema lives in `backend/database/schema.sql`. Run it once in the Supabase SQL Editor.

```
skills_catalog          — id, nome, categoria, ativo
idiomas_catalog         — id, nome, codigo, ativo
certificacoes_catalog   — id, nome, emissor, ativo

colaboradores           — id, nome, ramo (Business|Tech), seniority, anos_experiencia, bio
  ├── colaborador_skills       (colaborador_id, skill_id, nivel)
  ├── colaborador_idiomas      (colaborador_id, idioma_id, nivel)
  ├── colaborador_certificacoes (colaborador_id, cert_id, ano)
  ├── experiencias             (colaborador_id, empresa, role, data_inicio, data_fim, descricao)
  └── projetos                 (colaborador_id, nome, descricao, tecnologias)

chat_sessions    — id, titulo, created_at, updated_at
chat_messages    — id, session_id, role (user|assistant), content, type (SQL|RAG)
```

The `seniority` column stores exact role names. The SQL agent is prompted with the full list to prevent fuzzy matching:

- **Tech track:** Assistant Engineer, Engineer, Senior Engineer, Lead Engineer, Senior Lead Engineer, Project Manager, Expert Engineer, Technical Manager, Evangelist, Manager, Director, Principal Director, Partner, Executive Director
- **Business track:** BA, BAC, BC, BPC, BEM, Manager, Senior Manager, Experienced Manager, Director, Principal Director, Partner, Executive Director

---

## Multi-Agent System

Every chat message goes through a deterministic three-step pipeline:

```
User question
     │
     ▼
┌─────────────┐
│ Router Agent│  → Returns exactly "SQL" or "RAG"
└──────┬──────┘
       │
   SQL ┤ RAG
       │
┌──────▼──────┐         ┌──────────────┐
│  SQL Agent  │ OR      │   RAG Agent  │
│             │         │              │
│ Generates a │         │ Embeds query │
│ PostgREST   │         │ → Qdrant ANN │
│ query via   │         │ → Supabase   │
│ Gemini      │         │   full fetch │
└──────┬──────┘         └──────┬───────┘
       └──────────┬────────────┘
                  ▼
       ┌──────────────────────┐
       │  Synthesizer Agent   │
       │  Writes PT response  │
       └──────────────────────┘
```

**When SQL is used:** Questions about structured fields — seniority, ramo, years of experience, skills with a specific proficiency level, languages, certifications. The SQL agent prompts Gemini to generate a valid PostgREST query URL, then hits the Supabase REST API directly.

**When RAG is used:** Questions about narrative content — past projects, technologies mentioned in project descriptions, domain experience, soft skills in bios. The RAG agent embeds the question, retrieves the top-5 nearest collaborator vectors from Qdrant, fetches their full profiles from Supabase, and returns them ranked by similarity score.

---

## Ingest Pipeline

When a collaborator is created or updated via the API, `ingest_colaborador()` runs automatically:

1. Fetch the full collaborator profile from Supabase (all relations joined)
2. Serialise to a single text document:
   ```
   Nome: Alice. Ramo: Tech. Função: Senior Engineer. Anos de experiência: 6.
   Skills: Python (Avançado), FastAPI (Avançado), CrewAI (Intermédio).
   Idiomas: Inglês (Fluente), Português (Nativo).
   Bio: ...  Experiências: ...  Projectos: ...
   ```
3. Call `gemini-embedding-001` to get a 768-dim vector
4. Upsert the point into Qdrant with a payload of `{nome, ramo, seniority, skill_names}`

To rebuild the entire index (e.g., after changing the profile serialisation format):
```bash
cd backend
uv run python scripts/reindex_all.py
```

---

## Local Development

### Prerequisites

- Python 3.11 + [uv](https://github.com/astral-sh/uv)
- Node.js 18+
- A Supabase project with the schema applied (`backend/database/schema.sql` + `backend/database/chat_history.sql`)
- A Qdrant Cloud cluster (free tier is sufficient)
- A Gemini API key

### 1. Clone and configure environment

```bash
git clone <repo-url>
cd talent-radar

# Copy and fill in the root .env
cp .env.example .env
```

Root `.env`:
```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SECRET_KEY=eyJ...
QDRANT_URL=https://xxxx.qdrant.io
QDRANT_API_KEY=xxxx
GEMINI_API_KEY=AIza...
```

### 2. Run the backend

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --port 8000
```

Swagger docs available at: `http://localhost:8000/docs`

### 3. Run the frontend

```bash
cd frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

App available at: `http://localhost:3000`

### 4. Populate Qdrant (first run)

After adding collaborators via the UI or directly in Supabase, run:

```bash
cd backend
uv run python scripts/reindex_all.py
```

---

## Environment Variables

### Backend (root `.env`, read by `backend/core/config.py`)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL (`https://xxxx.supabase.co`) |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `SUPABASE_SECRET_KEY` | Supabase service role key (used for direct REST API calls in the SQL agent) |
| `QDRANT_URL` | Qdrant cluster URL |
| `QDRANT_API_KEY` | Qdrant API key |
| `GEMINI_API_KEY` | Google AI Studio or Vertex AI API key |

### Frontend (`.env.local` for local, set in Vercel dashboard for production)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API (e.g., `https://your-app.onrender.com`) |

---

## Deployment

### Backend → Render

1. Push to GitHub
2. Go to [render.com](https://render.com) → **New** → **Web Service** → connect the repo
3. Render auto-detects `render.yaml` at the root — confirm the service name and click **Deploy**
4. Under **Environment**, add all six backend environment variables (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`, `GEMINI_API_KEY`)
5. Render exposes the service at a `*.onrender.com` URL

### Frontend → Vercel

1. Import the repo in Vercel
2. Set the root directory to `frontend/`
3. Add the environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
   ```
4. Vercel picks up `frontend/vercel.json` and deploys Next.js automatically

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check (Supabase + Qdrant) |
| `GET` | `/api/colaboradores` | List all collaborators (full profiles) |
| `GET` | `/api/colaboradores/{id}` | Get single collaborator |
| `POST` | `/api/colaboradores` | Create collaborator + auto-ingest to Qdrant |
| `PUT` | `/api/colaboradores/{id}` | Update collaborator + re-ingest to Qdrant |
| `DELETE` | `/api/colaboradores/{id}` | Delete collaborator + remove from Qdrant |
| `GET` | `/api/catalog/skills` | List skills catalog |
| `POST` | `/api/catalog/skills` | Add skill to catalog |
| `GET` | `/api/dashboard` | Aggregated stats for charts |
| `POST` | `/api/chat` | Send a question to the multi-agent system |
| `GET` | `/api/chat/sessions` | List all chat sessions |
| `POST` | `/api/chat/sessions` | Create a new chat session |
| `GET` | `/api/chat/sessions/{id}/messages` | Get all messages in a session |
| `DELETE` | `/api/chat/sessions/{id}` | Delete a session and its messages |
