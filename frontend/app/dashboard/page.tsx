"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
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
} from "recharts";
import { Users, Cpu, Briefcase, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Constants ──────────────────────────────────────────────────────────────

const API = "http://localhost:8000/api";

const TECH_COLOR    = "#14B8A6";   // teal-500
const BIZ_COLOR     = "#8B5CF6";   // violet-500
const NEUTRAL_COLOR = "#64748b";

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

// ── MetricCard ─────────────────────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: "teal" | "violet" | "amber" | "rose" | "slate";
}

const ACCENT_CFG = {
  teal:   { strip: "bg-teal-500",   iconBg: "bg-teal-500/15",   iconColor: "text-teal-400"   },
  violet: { strip: "bg-violet-500", iconBg: "bg-violet-500/15", iconColor: "text-violet-400" },
  amber:  { strip: "bg-amber-500",  iconBg: "bg-amber-500/15",  iconColor: "text-amber-400"  },
  rose:   { strip: "bg-rose-500",   iconBg: "bg-rose-500/15",   iconColor: "text-rose-400"   },
  slate:  { strip: "bg-slate-500",  iconBg: "bg-slate-500/15",  iconColor: "text-slate-400"  },
} as const;

function MetricCard({ title, value, sub, icon: Icon, accent }: MetricCardProps) {
  const cfg = ACCENT_CFG[accent];
  return (
    <div className="relative bg-card rounded-xl border border-border overflow-hidden p-5 transition-shadow hover:shadow-lg hover:shadow-black/20">
      {/* Colored top strip */}
      <div className={`absolute top-0 inset-x-0 h-0.5 ${cfg.strip}`} />
      <div className="flex items-start justify-between gap-3 mt-1">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
          <p className="text-3xl font-bold text-foreground tabular-nums leading-none">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-2">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg shrink-0 ${cfg.iconBg}`}>
          <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
        </div>
      </div>
    </div>
  );
}

// ── ChartCard ──────────────────────────────────────────────────────────────

function ChartCard({ title, children, height = 300 }: { title: string; children: React.ReactNode; height?: number }) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-card-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>{children}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message = "Sem dados" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
      {message}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetch(`${API}/dashboard/stats`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setStats)
      .catch(() => setError("Não foi possível carregar os dados. Verifique se o backend está a correr."))
      .finally(() => setLoading(false));
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  // Recharts ignores CSS variables — use explicit hex values per theme
  const ch = {
    grid:         isDark ? "#1e2540" : "#e2e8f0",
    axisMinor:    isDark ? "#4a5568" : "#94a3b8",
    axisMajor:    isDark ? "#8892a4" : "#475569",
    cursor:       isDark ? "#1e2540" : "#f1f5f9",
    tooltipBg:    isDark ? "#16192a" : "#ffffff",
    tooltipBorder:isDark ? "#2a2f4a" : "#e2e8f0",
    tooltipText:  isDark ? "#e2e8f0" : "#1e293b",
    tooltipSub:   isDark ? "#64748b" : "#64748b",
  };

  const tipBox: React.CSSProperties = {
    backgroundColor: ch.tooltipBg,
    border: `1px solid ${ch.tooltipBorder}`,
    borderRadius: "0.5rem",
    padding: "8px 12px",
    fontSize: "0.875rem",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">A carregar dashboard...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400 max-w-lg">
        {error ?? "Erro desconhecido."}
      </div>
    );
  }

  // ── Data prep ──────────────────────────────────────────────────────

  const ramoDonut = [
    { name: "Tech",     value: stats.by_ramo.Tech },
    { name: "Business", value: stats.by_ramo.Business },
  ].filter((d) => d.value > 0);

  const seniorityData = stats.by_seniority.slice(0, 15);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Visão geral da equipa</p>
      </div>

      {/* ── Metric cards ─────────────────────────────────────────────── */}
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
          sub={stats.total_colaboradores
            ? `${Math.round((stats.by_ramo.Tech / stats.total_colaboradores) * 100)}% do total`
            : undefined}
          icon={Cpu}
          accent="teal"
        />
        <MetricCard
          title="Business"
          value={stats.by_ramo.Business}
          sub={stats.total_colaboradores
            ? `${Math.round((stats.by_ramo.Business / stats.total_colaboradores) * 100)}% do total`
            : undefined}
          icon={Briefcase}
          accent="violet"
        />
        <MetricCard
          title="Média de Experiência"
          value={`${stats.avg_anos_experiencia} anos`}
          sub="média da equipa"
          icon={TrendingUp}
          accent="amber"
        />
      </div>

      {/* ── Skills chart + Donut ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Skills bar — 2/3 width */}
        <div className="xl:col-span-2">
          <ChartCard title="Top 10 Skills" height={340}>
            {stats.top_skills.length === 0 ? (
              <EmptyState message="Nenhuma skill registada" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={stats.top_skills}
                  margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="skillGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%"   stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#14B8A6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={ch.grid} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: ch.axisMinor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="skill"
                    width={130}
                    tick={{ fontSize: 12, fill: ch.axisMajor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: ch.cursor }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div style={tipBox}>
                          <p style={{ fontWeight: 600, color: ch.tooltipText }}>{label}</p>
                          <p style={{ color: "#8B5CF6", fontWeight: 600 }}>
                            {payload[0].value} colaborador{(payload[0].value as number) !== 1 ? "es" : ""}
                          </p>
                        </div>
                      ) : null
                    }
                  />
                  <Bar
                    dataKey="count"
                    fill="url(#skillGradient)"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Donut — 1/3 width */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-card-foreground">
              Distribuição por Ramo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ramoDonut.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Nenhum colaborador com ramo definido
              </div>
            ) : (
              <>
                {/* Donut with center label overlay */}
                <div className="relative" style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ramoDonut}
                        cx="50%"
                        cy="50%"
                        innerRadius="48%"
                        outerRadius="70%"
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
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
                            <div style={tipBox}>
                              <p style={{ fontWeight: 600, color: ch.tooltipText }}>{payload[0].name}</p>
                              <p style={{ fontWeight: 600, color: RAMO_COLOR[payload[0].name as string] ?? NEUTRAL_COLOR }}>
                                {payload[0].value} colaborador{(payload[0].value as number) !== 1 ? "es" : ""}
                              </p>
                            </div>
                          ) : null
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {stats.total_colaboradores}
                      </p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </div>

                {/* Custom legend */}
                <div className="flex items-center justify-center gap-5 mt-1">
                  {ramoDonut.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: RAMO_COLOR[entry.name] ?? NEUTRAL_COLOR }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {entry.name}{" "}
                        <span className="font-semibold text-foreground tabular-nums">
                          {entry.value}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Seniority by ramo ─────────────────────────────────────────── */}
      <ChartCard
        title="Colaboradores por Função"
        height={Math.max(280, seniorityData.length * 36 + 40)}
      >
        {seniorityData.length === 0 ? (
          <EmptyState message="Nenhum colaborador com função definida" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={seniorityData}
              margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={ch.grid} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: ch.axisMinor }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="seniority"
                width={160}
                tick={{ fontSize: 12, fill: ch.axisMajor }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: ch.cursor }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const entry = payload[0]?.payload as { ramo?: string };
                  const n = payload[0].value as number;
                  return (
                    <div style={tipBox}>
                      <p style={{ fontWeight: 600, color: ch.tooltipText }}>{label}</p>
                      {entry.ramo && (
                        <p style={{ fontSize: "0.75rem", color: ch.tooltipSub }}>{entry.ramo}</p>
                      )}
                      <p style={{ fontWeight: 600, color: RAMO_COLOR[entry.ramo ?? ""] ?? NEUTRAL_COLOR }}>
                        {n} colaborador{n !== 1 ? "es" : ""}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {seniorityData.map((entry, i) => (
                  <Cell key={i} fill={RAMO_COLOR[entry.ramo] ?? NEUTRAL_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Idiomas + Certificações tables ───────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TableCard
          title="Idiomas"
          rows={stats.by_idioma.map(({ idioma, count }) => ({ name: idioma, count }))}
          total={stats.total_colaboradores}
          barColor="bg-teal-500"
        />
        <TableCard
          title="Certificações"
          rows={stats.by_certificacao.map(({ certificacao, count }) => ({ name: certificacao, count }))}
          total={stats.total_colaboradores}
          barColor="bg-violet-500"
        />
      </div>
    </div>
  );
}

// ── TableCard ──────────────────────────────────────────────────────────────

function TableCard({
  title,
  rows,
  total,
  barColor,
}: {
  title: string;
  rows: Array<{ name: string; count: number }>;
  total: number;
  barColor: string;
}) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-card-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sem dados</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {title.slice(0, -1) /* "Idiomas" → "Idioma" */}
                </th>
                <th className="text-right pb-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide pr-3">
                  Pessoas
                </th>
                <th className="text-right pb-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-24">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ name, count }) => {
                const pct = total ? Math.round((count / total) * 100) : 0;
                return (
                  <tr key={name} className="border-b border-border/40 last:border-0">
                    <td className="py-2.5 font-medium text-card-foreground">{name}</td>
                    <td className="py-2.5 text-right text-muted-foreground pr-3 tabular-nums">{count}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-14 bg-muted rounded-full h-1.5 overflow-hidden">
                          <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-7 text-right tabular-nums">{pct}%</span>
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
  );
}
