"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Loader2, UserRound } from "lucide-react";

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

const RAMO_STYLE: Record<string, string> = {
  Business: "bg-violet-100 text-violet-700",
  Tech: "bg-teal-100 text-teal-700",
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
          <h2 className="text-2xl font-bold text-slate-800">Colaboradores</h2>
          <p className="text-sm text-slate-500 mt-0.5">
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
        <div className="mb-4 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          A carregar colaboradores...
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && colaboradores.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <UserRound className="w-10 h-10 text-slate-300" />
          <p className="text-slate-500 text-sm">Ainda não há colaboradores.</p>
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

            return (
              <Card key={colab.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold text-slate-800 leading-snug">
                      {colab.nome}
                    </CardTitle>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-400 hover:text-slate-700"
                        title="Editar"
                        onClick={() => router.push(`/collaborators/${colab.id}/edit`)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-400 hover:text-red-600"
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
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          RAMO_STYLE[colab.ramo] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {colab.ramo}
                      </span>
                    )}
                    {colab.seniority && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {colab.seniority}
                      </span>
                    )}
                    {colab.anos_experiencia != null && (
                      <span className="text-xs text-slate-400">
                        {colab.anos_experiencia} anos exp.
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Bio */}
                  {colab.bio && (
                    <p className="text-xs text-slate-500 line-clamp-2">{colab.bio}</p>
                  )}

                  {/* Skills */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {visibleSkills.map((s) => (
                        <Badge
                          key={s.skill_id}
                          variant="secondary"
                          className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-100"
                        >
                          {s.skills_catalog.nome}
                        </Badge>
                      ))}
                      {extraCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-xs text-slate-400 border-slate-200"
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
