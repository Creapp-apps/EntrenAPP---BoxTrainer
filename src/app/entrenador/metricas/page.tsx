"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Users, TrendingUp, TrendingDown, CreditCard, BarChart3, Flame,
  Dumbbell, AlertTriangle, ChevronRight, Target, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts";

type DashboardStats = {
  active_students: number;
  inactive_students: number;
  cycles_strength: number;
  cycles_crossfit: number;
  payments_paid: number;
  payments_pending: number;
  payments_overdue: number;
  adherence_pct: number;
};

type StudentAdherence = {
  student_id: string;
  student_name: string;
  planned_days: number;
  completed_days: number;
  adherence_pct: number;
  cycle_type: string;
};

type AdherenceByType = {
  cycle_type: string;
  planned_days: number;
  completed_days: number;
  adherence_pct: number;
};

export default function MetricasPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [students, setStudents] = useState<StudentAdherence[]>([]);
  const [byType, setByType] = useState<AdherenceByType[]>([]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Dashboard stats
    const { data: dashData } = await supabase.rpc("trainer_dashboard_stats", { p_trainer_id: user.id });
    if (dashData) setStats(dashData as unknown as DashboardStats);

    // Student adherence
    const { data: adhData } = await supabase.rpc("student_adherence_list", {
      p_trainer_id: user.id,
      p_days: 30,
    });
    if (adhData) setStudents(adhData as unknown as StudentAdherence[]);

    // Adherence by type
    const { data: typeData } = await supabase
      .from("adherence_by_cycle_type")
      .select("*")
      .eq("trainer_id", user.id);
    if (typeData) setByType(typeData as unknown as AdherenceByType[]);

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold">No se pudieron cargar las métricas</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Asegurate de haber ejecutado la migración <code>015_metrics_views.sql</code> en Supabase.
        </p>
      </div>
    );
  }

  const topStudents = [...students].sort((a, b) => b.adherence_pct - a.adherence_pct).slice(0, 5);
  const lowStudents = students.filter(s => s.adherence_pct < 50 && s.planned_days > 0);

  // Adherence chart data
  const adherenceChartData = byType.map(t => ({
    name: t.cycle_type === "strength" ? "Fuerza" : t.cycle_type === "crossfit" ? "CrossFit" : t.cycle_type,
    value: Number(t.adherence_pct),
    color: t.cycle_type === "crossfit" ? "#f97316" : "#3b82f6",
  }));

  // Payment chart data
  const paymentChartData = [
    { name: "Cobrado", value: Number(stats.payments_paid), color: "#22c55e" },
    { name: "Pendiente", value: stats.payments_pending, color: "#f59e0b" },
    { name: "Vencido", value: stats.payments_overdue, color: "#ef4444" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Métricas
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Visión general de tu actividad — últimos 30 días
        </p>
      </div>

      {/* ─── 4 Summary Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Alumnos activos */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Alumnos activos</span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground mt-2">{stats.active_students}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.inactive_students} inactivos
          </p>
        </div>

        {/* Ciclos activos */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Ciclos activos</span>
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
              <Target className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground mt-2">{stats.cycles_strength + stats.cycles_crossfit}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Dumbbell className="w-3 h-3" /> {stats.cycles_strength} fuerza
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Flame className="w-3 h-3" /> {stats.cycles_crossfit} CF
            </span>
          </div>
        </div>

        {/* Pagos del mes */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Cobrado este mes</span>
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground mt-2">
            ${Number(stats.payments_paid).toLocaleString("es-AR")}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {stats.payments_pending > 0 && (
              <span className="text-xs text-amber-600 font-medium">{stats.payments_pending} pendientes</span>
            )}
            {stats.payments_overdue > 0 && (
              <span className="text-xs text-red-500 font-medium">{stats.payments_overdue} vencidos</span>
            )}
            {stats.payments_pending === 0 && stats.payments_overdue === 0 && (
              <span className="text-xs text-green-600 font-medium">Todo al día ✓</span>
            )}
          </div>
        </div>

        {/* Adherencia general */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Adherencia (30d)</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              stats.adherence_pct >= 70 ? "bg-green-100" : stats.adherence_pct >= 40 ? "bg-amber-100" : "bg-red-100"
            }`}>
              {stats.adherence_pct >= 70 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className={`w-4 h-4 ${stats.adherence_pct >= 40 ? "text-amber-600" : "text-red-500"}`} />
              )}
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground mt-2">{stats.adherence_pct}%</p>
          <p className="text-xs text-muted-foreground mt-1">sesiones completadas</p>
        </div>
      </div>

      {/* ─── Adherencia por tipo + Pagos ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Adherencia por tipo de planificación */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">Adherencia por tipo</h2>
          {adherenceChartData.length > 0 ? (
            <div className="space-y-4">
              {adherenceChartData.map(item => (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">{item.name}</span>
                    <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(item.value, 100)}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos aún</p>
          )}
        </div>

        {/* Estado de pagos */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">Estado de pagos — mes actual</h2>
          {paymentChartData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={paymentChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 13 }} />
                <Tooltip formatter={(value: number) => value.toLocaleString("es-AR")} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28}>
                  {paymentChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sin pagos registrados este mes</p>
          )}
        </div>
      </div>

      {/* ─── Top alumnos + Alertas ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top 5 adherencia */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            Top alumnos — adherencia
          </h2>
          {topStudents.length > 0 ? (
            <div className="space-y-3">
              {topStudents.map((s, i) => (
                <Link key={s.student_id} href={`/entrenador/metricas/alumno/${s.student_id}`}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors group">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    i === 0 ? "bg-amber-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-700" : "bg-muted-foreground"
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.student_name}</p>
                    <p className="text-xs text-muted-foreground">{s.completed_days}/{s.planned_days} días</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${Math.min(s.adherence_pct, 100)}%` }} />
                    </div>
                    <span className="text-sm font-bold text-green-600 w-12 text-right">{s.adherence_pct}%</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Sin datos de adherencia</p>
          )}
        </div>

        {/* Alertas — baja adherencia */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Alumnos con baja adherencia
          </h2>
          {lowStudents.length > 0 ? (
            <div className="space-y-3">
              {lowStudents.map(s => (
                <Link key={s.student_id} href={`/entrenador/metricas/alumno/${s.student_id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-red-50/50 border border-red-100 hover:bg-red-50 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.student_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.completed_days}/{s.planned_days} días completados
                    </p>
                  </div>
                  <span className="text-sm font-bold text-red-500">{s.adherence_pct}%</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-medium text-foreground">Todos al día 🎉</p>
              <p className="text-xs text-muted-foreground mt-1">Ningún alumno con adherencia menor al 50%</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Lista completa ───────────────────────────────────── */}
      {students.length > 5 && (
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">Todos los alumnos — adherencia</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Alumno</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">Tipo</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">Planificados</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">Completados</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Adherencia</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={`${s.student_id}-${s.cycle_type}`} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2.5">
                      <Link href={`/entrenador/metricas/alumno/${s.student_id}`} className="font-medium text-foreground hover:text-primary">
                        {s.student_name}
                      </Link>
                    </td>
                    <td className="text-center py-2.5">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        s.cycle_type === "crossfit" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {s.cycle_type === "crossfit" ? "CF" : "Fuerza"}
                      </span>
                    </td>
                    <td className="text-center py-2.5 text-muted-foreground">{s.planned_days}</td>
                    <td className="text-center py-2.5 text-muted-foreground">{s.completed_days}</td>
                    <td className="text-right py-2.5">
                      <span className={`font-bold ${
                        s.adherence_pct >= 70 ? "text-green-600" : s.adherence_pct >= 40 ? "text-amber-600" : "text-red-500"
                      }`}>{s.adherence_pct}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
