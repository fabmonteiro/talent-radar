"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ColaboradorForm, { ColaboradorFormState } from "@/components/ColaboradorForm";

const API = `${process.env.NEXT_PUBLIC_API_URL}/api`;

async function post(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`POST ${path} failed: ${msg}`);
  }
  // 204 No Content has no body
  if (res.status === 204) return null;
  return res.json();
}

export default function NewColaboradorPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(state: ColaboradorFormState) {
    setSaving(true);
    try {
      // 1. Create the core record
      const colab = await post("/colaboradores", {
        nome: state.nome,
        ...(state.idade ? { idade: parseInt(state.idade) } : {}),
        ...(state.ramo ? { ramo: state.ramo } : {}),
        ...(state.seniority ? { seniority: state.seniority } : {}),
        ...(state.anos_experiencia ? { anos_experiencia: parseInt(state.anos_experiencia) } : {}),
        ...(state.bio ? { bio: state.bio } : {}),
      });
      const id: string = colab.id;

      // 2. Relations — run sequentially to avoid Supabase rate limits
      for (const s of state.skills) {
        await post(`/colaboradores/${id}/skills`, { skill_id: s.skill_id, nivel: s.nivel || undefined });
      }
      for (const i of state.idiomas) {
        await post(`/colaboradores/${id}/idiomas`, { idioma_id: i.idioma_id, nivel: i.nivel || undefined });
      }
      for (const c of state.certificacoes) {
        await post(`/colaboradores/${id}/certificacoes`, {
          cert_id: c.cert_id,
          ...(c.ano ? { ano: c.ano } : {}),
        });
      }
      for (const e of state.experiencias) {
        await post(`/colaboradores/${id}/experiencias`, {
          ...(e.empresa ? { empresa: e.empresa } : {}),
          ...(e.role ? { role: e.role } : {}),
          ...(e.data_inicio ? { data_inicio: e.data_inicio } : {}),
          ...(e.data_fim ? { data_fim: e.data_fim } : {}),
          ...(e.descricao ? { descricao: e.descricao } : {}),
        });
      }
      for (const p of state.projetos) {
        await post(`/colaboradores/${id}/projetos`, {
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

  return (
    <div>
      <ColaboradorForm heading="Novo Colaborador" onSubmit={handleSubmit} saving={saving} />
    </div>
  );
}
