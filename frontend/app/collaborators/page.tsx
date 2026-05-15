"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus, Pencil, Trash2, Loader2, UserRound,
  X, Briefcase, FolderOpen, Languages, Award, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = "http://localhost:8000/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type SkillBadge = {
  skill_id: string;
  nivel?: string;
  skills_catalog: { nome: string; categoria: string };
};

type ColaboradorCard = {
  id: string;
  nome: string;
  ramo?: string;
  seniority?: string;
  anos_experiencia?: number;
  bio?: string;
  colaborador_skills: SkillBadge[];
};

type Idioma = {
  idioma_id: string;
  nivel?: string;
  idiomas_catalog: { nome: string; codigo: string };
};

type Certificacao = {
  cert_id: string;
  ano?: string;
  certificacoes_catalog: { nome: string; emissor: string };
};

type Experiencia = {
  id: string;
  empresa?: string;
  role?: string;
  data_inicio?: string;
  data_fim?: string;
  descricao?: string;
};

type Projeto = {
  id: string;
  nome?: string;
  descricao?: string;
  tecnologias?: string | string[];
};

type ColaboradorDetail = {
  id: string;
  nome: string;
  ramo?: string;
  seniority?: string;
  anos_experiencia?: number;
  bio?: string;
  colaborador_skills: SkillBadge[];
  colaborador_idiomas: Idioma[];
  colaborador_certificacoes: Certificacao[];
  experiencias: Experiencia[];
  projetos: Projeto[];
};

// ── Colour maps ───────────────────────────────────────────────────────────────

const RAMO_BORDER: Record<string, string> = {
  Tech:     "border-l-teal-500",
  Business: "border-l-violet-500",
};

const RAMO_BADGE: Record<string, string> = {
  Tech:     "bg-teal-500/15 text-teal-400",
  Business: "bg-violet-500/15 text-violet-400",
};

const SKILL_NIVEL_CLS: Record<string, string> = {
  "Básico":     "bg-zinc-500/15 text-zinc-400",
  "Intermédio": "bg-blue-500/15 text-blue-400",
  "Avançado":   "bg-green-500/15 text-green-400",
};

const IDIOMA_NIVEL_CLS: Record<string, string> = {
  "Básico":     "bg-zinc-500/15 text-zinc-400",
  "Intermédio": "bg-blue-500/15 text-blue-400",
  "Fluente":    "bg-green-500/15 text-green-400",
  "Nativo":     "bg-teal-500/15 text-teal-400",
};

function NivelPill({ nivel, map }: { nivel?: string; map: Record<string, string> }) {
  if (!nivel) return null;
  return (
    <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-full", map[nivel] ?? "bg-secondary text-secondary-foreground")}>
      {nivel}
    </span>
  );
}

// ── Modal section heading ─────────────────────────────────────────────────────

function Section({ title, icon, children }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2.5">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

function ColaboradorModal({
  detail,
  loading,
  onClose,
}: {
  detail: ColaboradorDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Content */}
        {!loading && detail && (
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="pr-8">
              <h2 className="text-xl font-bold text-foreground mb-2">{detail.nome}</h2>
              <div className="flex flex-wrap items-center gap-1.5">
                {detail.ramo && (
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", RAMO_BADGE[detail.ramo] ?? "bg-secondary text-secondary-foreground")}>
                    {detail.ramo}
                  </span>
                )}
                {detail.seniority && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {detail.seniority}
                  </span>
                )}
                {detail.anos_experiencia != null && (
                  <span className="text-xs text-muted-foreground">
                    {detail.anos_experiencia} anos de experiência
                  </span>
                )}
              </div>
            </div>

            {/* Bio */}
            {detail.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
                {detail.bio}
              </p>
            )}

            {/* Skills */}
            {(detail.colaborador_skills ?? []).length > 0 && (
              <Section title="Skills" icon={<BookOpen className="w-3.5 h-3.5 text-muted-foreground" />}>
                <div className="flex flex-wrap gap-1.5">
                  {detail.colaborador_skills.map((s) => (
                    <span
                      key={s.skill_id}
                      className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                    >
                      {s.skills_catalog.nome}
                      <NivelPill nivel={s.nivel} map={SKILL_NIVEL_CLS} />
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* Idiomas */}
            {(detail.colaborador_idiomas ?? []).length > 0 && (
              <Section title="Idiomas" icon={<Languages className="w-3.5 h-3.5 text-muted-foreground" />}>
                <div className="flex flex-wrap gap-1.5">
                  {detail.colaborador_idiomas.map((i) => (
                    <span
                      key={i.idioma_id}
                      className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                    >
                      {i.idiomas_catalog.nome}
                      <NivelPill nivel={i.nivel} map={IDIOMA_NIVEL_CLS} />
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* Certificações */}
            {(detail.colaborador_certificacoes ?? []).length > 0 && (
              <Section title="Certificações" icon={<Award className="w-3.5 h-3.5 text-muted-foreground" />}>
                <div className="space-y-2">
                  {detail.colaborador_certificacoes.map((c) => (
                    <div key={c.cert_id} className="flex items-start justify-between gap-3 text-sm">
                      <div>
                        <span className="font-medium text-foreground">{c.certificacoes_catalog.nome}</span>
                        {c.certificacoes_catalog.emissor && (
                          <span className="ml-1.5 text-muted-foreground">· {c.certificacoes_catalog.emissor}</span>
                        )}
                      </div>
                      {c.ano && (
                        <span className="shrink-0 text-xs text-muted-foreground">{c.ano}</span>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Experiências */}
            {(detail.experiencias ?? []).length > 0 && (
              <Section title="Experiência Profissional" icon={<Briefcase className="w-3.5 h-3.5 text-muted-foreground" />}>
                <div className="space-y-3">
                  {detail.experiencias.map((exp) => (
                    <div key={exp.id} className="border-l-2 border-border pl-3">
                      {exp.role && (
                        <p className="text-sm font-medium text-foreground">{exp.role}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {exp.empresa}
                        {(exp.data_inicio || exp.data_fim) && (
                          <span className="ml-1.5">
                            · {exp.data_inicio ?? "?"} – {exp.data_fim ?? "presente"}
                          </span>
                        )}
                      </p>
                      {exp.descricao && (
                        <p className="mt-1 text-xs text-muted-foreground">{exp.descricao}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Projectos */}
            {(detail.projetos ?? []).length > 0 && (
              <Section title="Projectos" icon={<FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />}>
                <div className="space-y-3">
                  {detail.projetos.map((p) => {
                    const techs: string[] = Array.isArray(p.tecnologias)
                      ? p.tecnologias
                      : (p.tecnologias ?? "").split(",").map((t) => t.trim()).filter(Boolean);
                    return (
                      <div key={p.id} className="border-l-2 border-border pl-3">
                        {p.nome && (
                          <p className="text-sm font-medium text-foreground">{p.nome}</p>
                        )}
                        {p.descricao && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{p.descricao}</p>
                        )}
                        {techs.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {techs.map((t) => (
                              <span
                                key={t}
                                className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CollaboratorsPage() {
  const router = useRouter();
  const [colaboradores, setColaboradores] = useState<ColaboradorCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [modalOpen, setModalOpen]       = useState(false);
  const [detail, setDetail]             = useState<ColaboradorDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/colaboradores`);
      if (!res.ok) throw new Error("Failed to fetch");
      setColaboradores(await res.json());
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function openDetail(id: string) {
    setDetail(null);
    setLoadingDetail(true);
    setModalOpen(true);
    try {
      const res = await fetch(`${API}/colaboradores/${id}`);
      if (!res.ok) throw new Error();
      setDetail(await res.json());
    } catch {
      setModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  }

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setDetail(null);
  }, []);

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Eliminar "${nome}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(id);
    try {
      await fetch(`${API}/colaboradores/${id}`, { method: "DELETE" });
      setColaboradores((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Colaboradores</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {!loading && `${colaboradores.length} colaborador${colaboradores.length !== 1 ? "es" : ""}`}
          </p>
        </div>
        <Button asChild>
          <Link href="/collaborators/new">
            <Plus className="w-4 h-4 mr-2" />
            Novo Colaborador
          </Link>
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading list */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          A carregar colaboradores...
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && colaboradores.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <UserRound className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Ainda não há colaboradores.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/collaborators/new">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Adicionar o primeiro
            </Link>
          </Button>
        </div>
      )}

      {/* Grid */}
      {!loading && colaboradores.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {colaboradores.map((colab) => {
            const skills = colab.colaborador_skills ?? [];
            const visibleSkills = skills.slice(0, 4);
            const extraCount = skills.length - visibleSkills.length;
            const ramoBorder = RAMO_BORDER[colab.ramo ?? ""] ?? "border-l-border";

            return (
              <Card
                key={colab.id}
                className={cn(
                  "cursor-pointer border-l-2 transition-all duration-200",
                  "hover:shadow-xl hover:shadow-black/20",
                  ramoBorder
                )}
                onClick={() => openDetail(colab.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold leading-snug text-card-foreground">
                      {colab.nome}
                    </CardTitle>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Editar"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/collaborators/${colab.id}/edit`);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        title="Eliminar"
                        disabled={deleting === colab.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(colab.id, colab.nome);
                        }}
                      >
                        {deleting === colab.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {colab.ramo && (
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", RAMO_BADGE[colab.ramo] ?? "bg-secondary text-secondary-foreground")}>
                        {colab.ramo}
                      </span>
                    )}
                    {colab.seniority && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {colab.seniority}
                      </span>
                    )}
                    {colab.anos_experiencia != null && (
                      <span className="text-xs text-muted-foreground">
                        {colab.anos_experiencia} anos exp.
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {colab.bio && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{colab.bio}</p>
                  )}

                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {visibleSkills.map((s) => (
                        <Badge
                          key={s.skill_id}
                          variant="secondary"
                          className="bg-secondary text-xs text-secondary-foreground hover:bg-secondary"
                        >
                          {s.skills_catalog.nome}
                        </Badge>
                      ))}
                      {extraCount > 0 && (
                        <Badge variant="outline" className="border-border text-xs text-muted-foreground">
                          +{extraCount}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {modalOpen && (
        <ColaboradorModal
          detail={detail}
          loading={loadingDetail}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
