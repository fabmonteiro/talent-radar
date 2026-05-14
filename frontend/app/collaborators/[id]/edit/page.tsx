"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import ColaboradorForm, {
  ColaboradorFull,
  ColaboradorFormState,
  toFormState,
} from "@/components/ColaboradorForm";

const API = "http://localhost:8000/api";

async function apiFetch(path: string) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed`);
  return res.json();
}

async function apiPatch(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed`);
  return res.json();
}

async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed`);
  if (res.status === 204) return null;
  return res.json();
}

async function apiDelete(path: string) {
  const res = await fetch(`${API}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${path} failed`);
}

export default function EditColaboradorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [serverData, setServerData] = useState<ColaboradorFull | null>(null);
  const [formState, setFormState] = useState<ColaboradorFormState | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch(`/colaboradores/${id}`)
      .then((data: ColaboradorFull) => {
        setServerData(data);
        setFormState(toFormState(data));
      })
      .catch(() => setLoadError("Não foi possível carregar o colaborador."));
  }, [id]);

  async function handleSubmit(state: ColaboradorFormState) {
    if (!serverData) return;
    setSaving(true);
    try {
      // 1. Update basic fields
      await apiPatch(`/colaboradores/${id}`, {
        nome: state.nome,
        ...(state.idade ? { idade: parseInt(state.idade) } : { idade: null }),
        ...(state.seniority ? { seniority: state.seniority } : { seniority: null }),
        ...(state.anos_experiencia
          ? { anos_experiencia: parseInt(state.anos_experiencia) }
          : { anos_experiencia: null }),
        ...(state.bio ? { bio: state.bio } : { bio: null }),
      });

      // 2. Replace all skills (delete existing → add current)
      for (const s of serverData.colaborador_skills ?? []) {
        await apiDelete(`/colaboradores/${id}/skills/${s.skill_id}`);
      }
      for (const s of state.skills) {
        await apiPost(`/colaboradores/${id}/skills`, {
          skill_id: s.skill_id,
          nivel: s.nivel || undefined,
        });
      }

      // 3. Replace all idiomas
      for (const i of serverData.colaborador_idiomas ?? []) {
        await apiDelete(`/colaboradores/${id}/idiomas/${i.idioma_id}`);
      }
      for (const i of state.idiomas) {
        await apiPost(`/colaboradores/${id}/idiomas`, {
          idioma_id: i.idioma_id,
          nivel: i.nivel || undefined,
        });
      }

      // 4. Replace all certificações
      for (const c of serverData.colaborador_certificacoes ?? []) {
        await apiDelete(`/colaboradores/${id}/certificacoes/${c.cert_id}`);
      }
      for (const c of state.certificacoes) {
        await apiPost(`/colaboradores/${id}/certificacoes`, {
          cert_id: c.cert_id,
          ...(c.ano ? { ano: c.ano } : {}),
        });
      }

      // 5. Replace all experiências (handles content edits too)
      for (const e of serverData.experiencias ?? []) {
        await apiDelete(`/colaboradores/${id}/experiencias/${e.id}`);
      }
      for (const e of state.experiencias) {
        await apiPost(`/colaboradores/${id}/experiencias`, {
          ...(e.empresa ? { empresa: e.empresa } : {}),
          ...(e.role ? { role: e.role } : {}),
          ...(e.data_inicio ? { data_inicio: e.data_inicio } : {}),
          ...(e.data_fim ? { data_fim: e.data_fim } : {}),
          ...(e.descricao ? { descricao: e.descricao } : {}),
        });
      }

      // 6. Replace all projetos
      for (const p of serverData.projetos ?? []) {
        await apiDelete(`/colaboradores/${id}/projetos/${p.id}`);
      }
      for (const p of state.projetos) {
        await apiPost(`/colaboradores/${id}/projetos`, {
          ...(p.nome ? { nome: p.nome } : {}),
          ...(p.descricao ? { descricao: p.descricao } : {}),
          ...(p.tecnologias ? { tecnologias: p.tecnologias } : {}),
        });
      }

      router.push("/collaborators");
    } catch (err) {
      console.error(err);
      alert("Erro ao guardar. Verifique a consola para detalhes.");
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 max-w-lg">
        {loadError}
      </div>
    );
  }

  if (!formState) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-12">
        <Loader2 className="w-4 h-4 animate-spin" />
        A carregar colaborador...
      </div>
    );
  }

  return (
    <div>
      <ColaboradorForm
        heading={`Editar: ${serverData?.nome ?? ""}`}
        initial={formState}
        onSubmit={handleSubmit}
        saving={saving}
      />
    </div>
  );
}
