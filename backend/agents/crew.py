import os
os.environ["CREWAI_DISABLE_TELEMETRY"] = "true"
os.environ["OTEL_SDK_DISABLED"] = "true"

from crewai import Agent, Task, Crew, LLM

from core.config import settings
from agents.tools import SQLSearchTool, RAGSearchTool

llm = LLM(model="gemini/gemini-2.5-flash", api_key=settings.GEMINI_API_KEY)

sql_tool = SQLSearchTool()
rag_tool = RAGSearchTool()

# ── Agents ───────────────────────────────────────────────────────────────────

router_agent = Agent(
    role="Query Router",
    goal=(
        "Classify every incoming question as either SQL or RAG.\n\n"
        "Use SQL when the question involves structured fields that exist as explicit "
        "columns or catalog entries in the database:\n"
        "  - name, age, ramo (Business/Tech), seniority/role, years of experience\n"
        "  - skills (from skills_catalog), idiomas (from idiomas_catalog), "
        "certificacoes (from certificacoes_catalog)\n"
        "  - counting, listing, filtering, ranking by these fields\n"
        "Examples: 'quantos Senior Engineers temos?', 'quem tem CrewAI avançado?', "
        "'lista quem fala alemão', 'quantas pessoas do ramo Business têm mais de 5 anos?'\n\n"
        "Use RAG when the question involves free-text data — bio, experiencia descriptions, "
        "projeto descriptions:\n"
        "  - past projects, specific technologies used in a project context\n"
        "  - soft skills, working style, domain experience described in free text\n"
        "  - anything requiring semantic understanding of narrative text\n"
        "Examples: 'quem já desenvolveu um chatbot com LangGraph?', "
        "'encontra alguém com experiência em projectos bancários', "
        "'quem tem background em automação de processos industriais?'"
    ),
    backstory="You are an expert at understanding questions about a team directory and routing them to the right search engine.",
    llm=llm,
    allow_delegation=False,
    verbose=False,
)

sql_agent = Agent(
    role="SQL Search Specialist",
    goal="Answer questions about collaborators using structured database queries.",
    backstory="You are a database expert who finds collaborators by querying structured fields like skills, languages, seniority, and years of experience.",
    tools=[sql_tool],
    llm=llm,
    allow_delegation=False,
    verbose=False,
)

rag_agent = Agent(
    role="Semantic Search Specialist",
    goal="Find collaborators by semantic similarity in free-text profile data such as bio, project descriptions, and experience narratives.",
    backstory="You are an AI search expert who finds collaborators based on the meaning and context of their profile text.",
    tools=[rag_tool],
    llm=llm,
    allow_delegation=False,
    verbose=False,
)

synthesizer_agent = Agent(
    role="Response Synthesizer",
    goal=(
        "Combine search results into a clear, helpful answer in Portuguese. "
        "Always mention which collaborators were found and explain why they match the question."
    ),
    backstory="You are a helpful assistant who presents search results clearly and concisely in Portuguese, explaining why each person matches the query.",
    llm=llm,
    allow_delegation=False,
    verbose=False,
)


# ── Orchestration ─────────────────────────────────────────────────────────────

def run_search(question: str) -> dict:
    # Step 1: classify
    route_task = Task(
        description=(
            f"Classify this question and return exactly one word — SQL or RAG.\n\n"
            f"Question: {question}"
        ),
        expected_output="Exactly one word: SQL or RAG",
        agent=router_agent,
    )
    route_output = Crew(
        agents=[router_agent],
        tasks=[route_task],
        verbose=False,
    ).kickoff()

    raw_route = route_output.raw.strip().upper()
    search_type = "RAG" if "RAG" in raw_route else "SQL"
    search_agent = rag_agent if search_type == "RAG" else sql_agent

    # Step 2: search
    search_task = Task(
        description=(
            f"Find collaborators who match the following question.\n\n"
            f"Question: {question}\n\n"
            "Use your search tool and return all matching collaborators with their details."
        ),
        expected_output="List of matching collaborators with name, ramo, seniority, skills, and relevant details.",
        agent=search_agent,
    )

    # Step 3: synthesize
    synth_task = Task(
        description=(
            f"The user asked: {question}\n\n"
            "Using the search results from the previous task, write a clear and helpful "
            "answer in Portuguese. Mention each collaborator found and explain briefly "
            "why they match. If no results were found, say so politely."
        ),
        expected_output="A clear, concise answer in Portuguese listing matched collaborators and why they match.",
        agent=synthesizer_agent,
        context=[search_task],
    )

    result = Crew(
        agents=[search_agent, synthesizer_agent],
        tasks=[search_task, synth_task],
        verbose=False,
    ).kickoff()

    return {"answer": result.raw, "type": search_type}
