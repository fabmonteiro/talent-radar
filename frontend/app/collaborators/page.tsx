"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Loader2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const API = "http://localhost:8000/api";

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

// Ramo accent colours — left border + badge
const RAMO_BORDER: Record<string, string> = {
  Tech:     "border-l-teal-500",
  Business: "border-l-violet-500",
};

const RAMO_BADGE: Record<string, string> = {
  Tech:     "bg-teal-500/15 text-teal-400 dark:bg-teal-500/15 dark:text-teal-400",
  Business: "bg-violet-500/15 text-violet-400 dark:bg-violet-500/15 dark:text-violet-400",
};

export default function CollaboratorsPage() {
  const router = useRouter();
  const [colaboradores, setColaboradores] = useState<ColaboradorCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

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
        <div className="mb-4 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          A carregar colaboradores...
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && colaboradores.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <UserRound className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">Ainda não há colaboradores.</p>
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
                  "hover:shadow-xl hover:shadow-black/20 transition-all duration-200 border-l-2",
                  ramoBorder
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold text-card-foreground leading-snug">
                      {colab.nome}
                    </CardTitle>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Editar"
                        onClick={() => router.push(`/collaborators/${colab.id}/edit`)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        title="Eliminar"
                        disabled={deleting === colab.id}
                        onClick={() => handleDelete(colab.id, colab.nome)}
                      >
                        {deleting === colab.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Ramo + Seniority + experience */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {colab.ramo && (
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        RAMO_BADGE[colab.ramo] ?? "bg-secondary text-secondary-foreground"
                      )}>
                        {colab.ramo}
                      </span>
                    )}
                    {colab.seniority && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
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
                    <p className="text-xs text-muted-foreground line-clamp-2">{colab.bio}</p>
                  )}

                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {visibleSkills.map((s) => (
                        <Badge
                          key={s.skill_id}
                          variant="secondary"
                          className="text-xs bg-secondary text-secondary-foreground hover:bg-secondary"
                        >
                          {s.skills_catalog.nome}
                        </Badge>
                      ))}
                      {extraCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-xs text-muted-foreground border-border"
                        >
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
    </div>
  );
}
