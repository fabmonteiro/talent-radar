"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import {
  Users,
  Cpu,
  Briefcase,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Constants ──────────────────────────────────────────────────────────────

const API = "http://localhost:8000/api";

const TECH_COLOR = "#0d9488";   // teal-600
const BIZ_COLOR  = "#7c3aed";   // violet-600
const NEUTRAL_COLOR = "#64748b"; // slate-500

const RAMO_COLOR: Record<string, string> = {
  Tech: TECH_COLOR,
  Business: BIZ_COLOR,
};

// ── Types ──────────────────────────────────────────────────────────────────

type DashboardStats = {
  total_colaboradores: number;
  by_ramo: { Business: number; Tech: number };
  by_seniority: Array<{ seniority: string; ramo: string; count: number }>;
  top_skills: Array<{ skill: string; count: number }>;
  by_idioma: Array<{ idioma: string; count: number }>;
  by_certificacao: Array<{ certificacao: string; count: number }>;
  avg_anos_experiencia: number;
};

// ── Sub-components ─────────────────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: "teal" | "violet" | "slate";
}

function MetricCard({ title, value, sub, icon: Icon, accent = "slate" }: MetricCardProps) {
  const iconBg = {
    teal:   "bg-teal-100 text-teal-600",
    violet: "bg-violet-100 text-violet-600",
    slate:  "bg-slate-100 text-slate-500",
  }[accent];

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{title}</p>
            <p className="text-3xl font-bold text-slate-800 leading-none">{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1.5">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-lg shrink-0 ${iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  height?: number;
}

function ChartCard({ title, children, height = 300 }: ChartCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>{children}</div>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message = "Sem dados" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
      {message}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/dashboard/stats`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch stats");
        return r.json();
      })
      .then(setStats)
      .catch(() => setError("Não foi possível carregar os dados. Verifique se o backend está a correr."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">A carregar dashboard...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 max-w-lg">
        {error ?? "Erro desconhecido."}
      </div>
    );
  }

  // ── Data prep ────────────────────────────────────────────────────────

  const ramoDonut = [
    { name: "Tech", value: stats.by_ramo.Tech },
    { name: "Business", value: stats.by_ramo.Business },
  ].filter((d) => d.value > 0);

  // For seniority chart: cap at top 15 by count
  const seniorityData = stats.by_seniority.slice(0, 15);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-sm text-slate-500 mt-0.5">Visão geral da equipa</p>
      </div>

      {/* ── Metric cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Total Colaboradores"
          value={stats.total_colaboradores}
          sub="na base de dados"
          icon={Users}
          accent="slate"
        />
        <MetricCard
          title="Tech"
          value={stats.by_ramo.Tech}
          sub={
            stats.total_colaboradores
              ? `${Math.round((stats.by_ramo.Tech / stats.total_colaboradores) * 100)}% do total`
              : undefined
          }
          icon={Cpu}
          accent="teal"
        />
        <MetricCard
          title="Business"
          value={stats.by_ramo.Business}
          sub={
            stats.total_colaboradores
              ? `${Math.round((stats.by_ramo.Business / stats.total_colaboradores) * 100)}% do total`
              : undefined
          }
          icon={Briefcase}
          accent="violet"
        />
        <MetricCard
          title="Média de Experiência"
          value={`${stats.avg_anos_experiencia} anos`}
          sub="média da equipa"
          icon={TrendingUp}
          accent="slate"
        />
      </div>

      {/* ── Skills + Ramo split ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Skills bar chart — takes 2/3 width on xl */}
        <div className="xl:col-span-2">
          <ChartCard title="Top 10 Skills" height={340}>
            {stats.top_skills.length === 0 ? (
              <EmptyChart message="Nenhuma skill registada" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={stats.top_skills}
                  margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="skill"
                    width={130}
                    tick={{ fontSize: 12, fill: "#475569" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-sm">
                          <p className="font-medium text-slate-700">{label}</p>
                          <p className="text-blue-600 font-semibold">
                            {payload[0].value} colaborador{(payload[0].value as number) !== 1 ? "es" : ""}
                          </p>
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Ramo donut — takes 1/3 width on xl */}
        <ChartCard title="Distribuição por Ramo" height={340}>
          {ramoDonut.length === 0 ? (
            <EmptyChart message="Nenhum colaborador com ramo definido" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ramoDonut}
                  cx="50%"
                  cy="45%"
                  innerRadius="45%"
                  outerRadius="68%"
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {ramoDonut.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={RAMO_COLOR[entry.name] ?? NEUTRAL_COLOR}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-sm">
                        <p className="font-medium text-slate-700">{payload[0].name}</p>
                        <p className="font-semibold" style={{ color: RAMO_COLOR[payload[0].name as string] }}>
                          {payload[0].value} colaborador{(payload[0].value as number) !== 1 ? "es" : ""}
                        </p>
                      </div>
                    ) : null
                  }
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-slate-600">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Seniority by ramo ──────────────────────────────────────────── */}
      <ChartCard
        title="Colaboradores por Função (colorido por Ramo)"
        height={Math.max(280, seniorityData.length * 36 + 40)}
      >
        {seniorityData.length === 0 ? (
          <EmptyChart message="Nenhum colaborador com função definida" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={seniorityData}
              margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="seniority"
                width={160}
                tick={{ fontSize: 12, fill: "#475569" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "#f1f5f9" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const entry = payload[0]?.payload as { ramo?: string };
                  const n = payload[0].value as number;
                  return (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-sm">
                      <p className="font-medium text-slate-700">{label}</p>
                      {entry.ramo && <p className="text-xs text-slate-500">{entry.ramo}</p>}
                      <p className="font-semibold" style={{ color: RAMO_COLOR[entry.ramo ?? ""] ?? NEUTRAL_COLOR }}>
                        {n} colaborador{n !== 1 ? "es" : ""}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {seniorityData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={RAMO_COLOR[entry.ramo] ?? NEUTRAL_COLOR}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Idiomas + Certificações tables ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Idiomas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Idiomas</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.by_idioma.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Sem dados</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left pb-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Idioma
                    </th>
                    <th className="text-right pb-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Colaboradores
                    </th>
                    <th className="text-right pb-2 text-xs font-medium text-slate-400 uppercase tracking-wide w-24">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_idioma.map(({ idioma, count }) => {
                    const pct = stats.total_colaboradores
                      ? Math.round((count / stats.total_colaboradores) * 100)
                      : 0;
                    return (
                      <tr key={idioma} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 font-medium text-slate-700">{idioma}</td>
                        <td className="py-2 text-right text-slate-600">{count}</td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-1.5 rounded-full bg-emerald-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Certificações */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Certificações</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.by_certificacao.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Sem dados</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left pb-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Certificação
                    </th>
                    <th className="text-right pb-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Colaboradores
                    </th>
                    <th className="text-right pb-2 text-xs font-medium text-slate-400 uppercase tracking-wide w-24">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_certificacao.map(({ certificacao, count }) => {
                    const pct = stats.total_colaboradores
                      ? Math.round((count / stats.total_colaboradores) * 100)
                      : 0;
                    return (
                      <tr key={certificacao} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 font-medium text-slate-700">{certificacao}</td>
                        <td className="py-2 text-right text-slate-600">{count}</td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-1.5 rounded-full bg-violet-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
