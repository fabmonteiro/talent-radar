"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  Plus,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = `${process.env.NEXT_PUBLIC_API_URL}/api`;

const EXAMPLES = [
  "Quantos colaboradores temos no ramo Tech?",
  "Quem tem CrewAI avançado e fala inglês fluente?",
  "Há alguém com experiência em projectos para o sector bancário?",
];

// ── Types ────────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  titulo: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface Message {
  id: string | number;
  type: "user" | "ai";
  text: string;
  searchType?: "SQL" | "RAG";
}

let localId = 0;

const WELCOME: Message = {
  id: "welcome",
  type: "ai",
  text:
    "Olá! Sou o assistente de pesquisa do TalentRadar. Posso ajudá-lo a encontrar colaboradores com base em:\n\n" +
    "• **Dados estruturados** — ramo, seniority, anos de experiência, skills, idiomas, certificações (usa SQL)\n" +
    "• **Perfil narrativo** — experiências em projectos, tecnologias usadas, background de domínio (usa RAG semântico)\n\n" +
    "Experimente uma das perguntas abaixo ou escreva a sua própria.",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "agora mesmo";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min atrás`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h atrás`;
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

function renderText(text: string) {
  return text.split("\n").map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={j}>{part.slice(2, -2)}</strong>
      ) : (
        part
      )
    );
    return (
      <span key={i}>
        {parts}
        {i < arr.length - 1 && <br />}
      </span>
    );
  });
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SearchBadge({ type }: { type: "SQL" | "RAG" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase",
        type === "SQL"
          ? "bg-teal-500/15 text-teal-400 border border-teal-500/25"
          : "bg-violet-500/15 text-violet-400 border border-violet-500/25"
      )}
    >
      <Sparkles className="w-2.5 h-2.5" />
      {type}
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5 max-w-[85%]">
      <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
        <Bot className="w-3.5 h-3.5 text-violet-400" />
      </div>
      <div className="bg-white/5 border border-white/8 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce"
              style={{ animationDelay: `${i * 150}ms`, animationDuration: "900ms" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Message }) {
  if (msg.type === "user") {
    return (
      <div className="flex justify-end">
        <div className="flex items-end gap-2.5 max-w-[80%]">
          <div className="bg-violet-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm">
            {msg.text}
          </div>
          <div className="w-7 h-7 rounded-full bg-violet-500/30 border border-violet-500/40 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-violet-300" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2.5 max-w-[85%]">
      <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
        <Bot className="w-3.5 h-3.5 text-violet-400" />
      </div>
      <div className="bg-white/5 border border-white/8 rounded-2xl rounded-bl-sm px-4 py-3 space-y-1.5">
        {msg.searchType && (
          <div>
            <SearchBadge type={msg.searchType} />
          </div>
        )}
        <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">
          {renderText(msg.text)}
        </p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Session helpers ─────────────────────────────────────────────────────

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API}/chat/sessions`);
      const data: Session[] = await res.json();
      setSessions(data);
      return data;
    } catch {
      return [];
    }
  }, []);

  const createSession = useCallback(async () => {
    const res = await fetch(`${API}/chat/sessions`, { method: "POST" });
    const session: Session = await res.json();
    setSessions((prev) => [{ ...session, message_count: 0 }, ...prev]);
    setActiveSessionId(session.id);
    setMessages([WELCOME]);
    return session;
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setMessages([WELCOME]);
    try {
      const res = await fetch(`${API}/chat/sessions/${sessionId}/messages`);
      const rows: Array<{
        id: string;
        role: string;
        content: string;
        type: string | null;
      }> = await res.json();

      if (rows.length === 0) return;

      const loaded: Message[] = rows.map((r) => ({
        id: r.id,
        type: r.role === "user" ? "user" : "ai",
        text: r.content,
        searchType: (r.type as "SQL" | "RAG") ?? undefined,
      }));
      setMessages([WELCOME, ...loaded]);
    } catch {
      // keep welcome message
    }
  }, []);

  const deleteSession = useCallback(
    async (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await fetch(`${API}/chat/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([WELCOME]);
      }
    },
    [activeSessionId]
  );

  // ── On mount: load sessions and open the most recent one ────────────────

  useEffect(() => {
    (async () => {
      setSessionsLoading(true);
      const data = await fetchSessions();
      setSessionsLoading(false);
      if (data.length > 0) {
        await loadSession(data[0].id);
      }
      inputRef.current?.focus();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Send ────────────────────────────────────────────────────────────────

  async function send(question: string) {
    const q = question.trim();
    if (!q || loading) return;

    // Create a session on first message if none is active
    let sessionId = activeSessionId;
    if (!sessionId) {
      const session = await createSession();
      sessionId = session.id;
    }

    setMessages((prev) => [
      ...prev,
      { id: ++localId, type: "user", text: q },
    ]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, session_id: sessionId }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: ++localId,
          type: "ai",
          text: data.answer ?? "Não foi possível obter uma resposta.",
          searchType: data.type,
        },
      ]);

      // Refresh session list so the title and count update
      const updated = await fetchSessions();
      if (sessionId) {
        const session = updated.find((s) => s.id === sessionId);
        if (session) {
          setSessions((prev) =>
            prev.map((s) => (s.id === sessionId ? session : s))
          );
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: ++localId,
          type: "ai",
          text: "Erro ao contactar o servidor. Verifique se o backend está a correr.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const showExamples = messages.length === 1;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex -m-8 h-screen overflow-hidden bg-[#0F1117]">
      {/* ── Session sidebar ─────────────────────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col border-r border-white/5 bg-[#131720]">
        {/* Header */}
        <div className="px-4 py-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            Conversas
          </span>
          <button
            onClick={createSession}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
          >
            <Plus className="w-3 h-3" />
            Novo chat
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto py-2">
          {sessionsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-4 h-4 text-white/20 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-white/20 text-center py-8 px-4">
              Nenhuma conversa ainda.
            </p>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <button
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 mx-1 rounded-lg group flex items-start gap-2.5 transition-all duration-100",
                    "hover:bg-white/5",
                    isActive && "bg-violet-500/10 border border-violet-500/20"
                  )}
                  style={{ width: "calc(100% - 8px)" }}
                >
                  <MessageSquare
                    className={cn(
                      "w-3.5 h-3.5 mt-0.5 shrink-0",
                      isActive ? "text-violet-400" : "text-white/25"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-xs font-medium truncate leading-snug",
                        isActive ? "text-violet-200" : "text-white/60"
                      )}
                    >
                      {session.titulo ?? "Nova conversa"}
                    </p>
                    <p className="text-[10px] text-white/25 mt-0.5">
                      {formatDate(session.updated_at)} ·{" "}
                      {session.message_count}{" "}
                      {session.message_count === 1 ? "msg" : "msgs"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-white/30 hover:text-rose-400 transition-all shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 bg-[#131720] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-teal-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">
                {activeSessionId
                  ? (sessions.find((s) => s.id === activeSessionId)?.titulo ??
                    "Nova conversa")
                  : "TalentRadar Chat"}
              </h1>
              <p className="text-xs text-white/40">
                Pesquisa inteligente de colaboradores
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.map((msg) => (
            <Bubble key={msg.id} msg={msg} />
          ))}

          {loading && <TypingIndicator />}

          {showExamples && !loading && (
            <div className="flex flex-col gap-2 pt-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => send(ex)}
                  className="text-left text-sm text-white/60 hover:text-white/90 bg-white/4 hover:bg-white/8 border border-white/8 hover:border-white/15 rounded-xl px-4 py-2.5 transition-all duration-150"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-6 py-4 border-t border-white/5 bg-[#131720]">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Faça uma pergunta sobre a equipa..."
              rows={1}
              className={cn(
                "flex-1 resize-none rounded-xl px-4 py-3 text-sm",
                "bg-white/5 border border-white/10 text-white placeholder:text-white/30",
                "focus:outline-none focus:border-violet-500/50 focus:bg-white/7",
                "transition-all duration-150 leading-relaxed max-h-32 overflow-y-auto"
              )}
              style={{ fieldSizing: "content" } as React.CSSProperties}
              disabled={loading}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150",
                input.trim() && !loading
                  ? "bg-violet-600 hover:bg-violet-500 text-white shadow-sm"
                  : "bg-white/5 text-white/20 cursor-not-allowed"
              )}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-white/20 mt-2 pl-1">
            Enter para enviar · Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </div>
  );
}
