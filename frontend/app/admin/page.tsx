"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Pencil, Plus, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const API = "http://localhost:8000/api";

// ── Types ──────────────────────────────────────────────────────────────────

type CatalogItem = {
  id: string;
  nome: string;
  ativo: boolean;
  [key: string]: string | boolean;
};

// ── API ────────────────────────────────────────────────────────────────────

async function apiFetch(path: string) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed`);
  return res.json();
}

async function apiPatch(path: string, id: string, data: Record<string, unknown>) {
  const res = await fetch(`${API}${path}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Update failed");
  return res.json();
}

async function apiPost(path: string, data: Record<string, unknown>) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Create failed");
  return res.json();
}

// ── CatalogSection ─────────────────────────────────────────────────────────

interface CatalogSectionProps {
  items: CatalogItem[];
  secondaryField: string;
  secondaryLabel: string;
  apiPath: string;
  onRefresh: () => void;
}

function CatalogSection({
  items,
  secondaryField,
  secondaryLabel,
  apiPath,
  onRefresh,
}: CatalogSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [addForm, setAddForm] = useState({ nome: "", [secondaryField]: "" });
  const [busy, setBusy] = useState(false);

  function startEdit(item: CatalogItem) {
    setEditingId(item.id);
    setEditForm({ nome: item.nome, [secondaryField]: String(item[secondaryField]) });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  async function saveEdit(id: string) {
    setBusy(true);
    try {
      await apiPatch(apiPath, id, editForm);
      setEditingId(null);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(item: CatalogItem) {
    setBusy(true);
    try {
      await apiPatch(apiPath, item.id, { ativo: !item.ativo });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function addItem() {
    if (!addForm.nome.trim() || !addForm[secondaryField].trim()) return;
    setBusy(true);
    try {
      await apiPost(apiPath, addForm);
      setAddForm({ nome: "", [secondaryField]: "" });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  const canAdd = addForm.nome.trim() !== "" && addForm[secondaryField].trim() !== "";

  return (
    <div className="space-y-1.5">
      {items.map((item) =>
        editingId === item.id ? (
          // ── Edit row ──────────────────────────────────────────────────
          <div
            key={item.id}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-300 bg-blue-50"
          >
            <Input
              className="h-8 text-sm flex-1"
              value={editForm.nome ?? ""}
              placeholder="Nome"
              onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))}
            />
            <Input
              className="h-8 text-sm w-40"
              value={editForm[secondaryField] ?? ""}
              placeholder={secondaryLabel}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, [secondaryField]: e.target.value }))
              }
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
              disabled={busy}
              onClick={() => saveEdit(item.id)}
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-slate-400 hover:text-slate-600"
              onClick={cancelEdit}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          // ── Display row ───────────────────────────────────────────────
          <div
            key={item.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            <div className="flex-1 min-w-0 flex items-baseline gap-2">
              <span
                className={cn(
                  "text-sm font-medium truncate",
                  !item.ativo && "text-slate-400 line-through"
                )}
              >
                {item.nome}
              </span>
              <span className="text-xs text-slate-400 shrink-0">
                {String(item[secondaryField])}
              </span>
            </div>

            <Badge
              variant={item.ativo ? "default" : "secondary"}
              className={cn(
                "text-xs px-2 shrink-0",
                item.ativo
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                  : "bg-slate-100 text-slate-500"
              )}
            >
              {item.ativo ? "Ativo" : "Inativo"}
            </Badge>

            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-slate-400 hover:text-slate-700 shrink-0"
              title="Editar"
              onClick={() => startEdit(item)}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-7 w-7 shrink-0",
                item.ativo
                  ? "text-slate-500 hover:text-slate-700"
                  : "text-slate-300 hover:text-slate-500"
              )}
              title={item.ativo ? "Desativar" : "Ativar"}
              disabled={busy}
              onClick={() => toggleActive(item)}
            >
              {item.ativo ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        )
      )}

      {items.length === 0 && (
        <p className="text-sm text-slate-400 py-4 text-center">
          Nenhum item. Adicione um abaixo.
        </p>
      )}

      {/* ── Add row ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 mt-3">
        <Input
          className="h-8 text-sm flex-1"
          placeholder="Nome"
          value={addForm.nome}
          onChange={(e) => setAddForm((f) => ({ ...f, nome: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && canAdd && addItem()}
        />
        <Input
          className="h-8 text-sm w-40"
          placeholder={secondaryLabel}
          value={addForm[secondaryField] ?? ""}
          onChange={(e) =>
            setAddForm((f) => ({ ...f, [secondaryField]: e.target.value }))
          }
          onKeyDown={(e) => e.key === "Enter" && canAdd && addItem()}
        />
        <Button
          size="sm"
          className="h-8 gap-1.5 shrink-0"
          disabled={busy || !canAdd}
          onClick={addItem}
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          Adicionar
        </Button>
      </div>
    </div>
  );
}

// ── AdminPage ──────────────────────────────────────────────────────────────

type Tab = "skills" | "idiomas" | "certificacoes";

const TABS: { key: Tab; label: string }[] = [
  { key: "skills", label: "Skills" },
  { key: "idiomas", label: "Idiomas" },
  { key: "certificacoes", label: "Certificações" },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("skills");
  const [skills, setSkills] = useState<CatalogItem[]>([]);
  const [idiomas, setIdiomas] = useState<CatalogItem[]>([]);
  const [certs, setCerts] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, i, c] = await Promise.all([
        apiFetch("/catalog/skills"),
        apiFetch("/catalog/idiomas"),
        apiFetch("/catalog/certificacoes"),
      ]);
      setSkills(s);
      setIdiomas(i);
      setCerts(c);
    } catch {
      setError("Não foi possível conectar ao servidor. Verifique se o backend está a correr.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Admin</h2>
      <p className="text-sm text-slate-500 mb-6">Gestão dos catálogos de skills, idiomas e certificações.</p>

      {/* Tab bar */}
      <div className="flex gap-0 mb-6 border-b border-slate-200">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "px-5 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors",
              tab === key
                ? "border-slate-800 text-slate-800"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          A carregar...
        </div>
      ) : (
        <>
          {tab === "skills" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Skills
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {skills.filter((s) => s.ativo).length} ativas · {skills.length} total
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CatalogSection
                  items={skills}
                  secondaryField="categoria"
                  secondaryLabel="Categoria"
                  apiPath="/catalog/skills"
                  onRefresh={loadAll}
                />
              </CardContent>
            </Card>
          )}

          {tab === "idiomas" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Idiomas
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {idiomas.filter((i) => i.ativo).length} ativos · {idiomas.length} total
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CatalogSection
                  items={idiomas}
                  secondaryField="codigo"
                  secondaryLabel="Código"
                  apiPath="/catalog/idiomas"
                  onRefresh={loadAll}
                />
              </CardContent>
            </Card>
          )}

          {tab === "certificacoes" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Certificações
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {certs.filter((c) => c.ativo).length} ativas · {certs.length} total
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CatalogSection
                  items={certs}
                  secondaryField="emissor"
                  secondaryLabel="Emissor"
                  apiPath="/catalog/certificacoes"
                  onRefresh={loadAll}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
