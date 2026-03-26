"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("super_admin_dashboard_stats");
      setStats(data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/5 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-white/5 animate-pulse rounded-2xl border border-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: "MRR",
      value: `$${(stats?.mrr || 0).toLocaleString()}`,
      sub: "Ingreso mensual recurrente",
      color: "from-green-500/20 to-emerald-500/20",
      text: "text-green-400",
      border: "border-green-500/10",
    },
    {
      label: "Boxes Activos",
      value: stats?.active_boxes || 0,
      sub: `${stats?.trial_boxes || 0} en trial`,
      color: "from-blue-500/20 to-cyan-500/20",
      text: "text-blue-400",
      border: "border-blue-500/10",
    },
    {
      label: "Total Alumnos",
      value: stats?.total_students || 0,
      sub: `${stats?.total_professors || 0} profesores`,
      color: "from-violet-500/20 to-purple-500/20",
      text: "text-violet-400",
      border: "border-violet-500/10",
    },
    {
      label: "Cuentas Morosas",
      value: stats?.past_due_boxes || 0,
      sub: stats?.past_due_amount > 0 ? `$${stats.past_due_amount.toLocaleString()} pendiente` : "Todo al día",
      color: stats?.past_due_boxes > 0 ? "from-red-500/20 to-orange-500/20" : "from-emerald-500/20 to-green-500/20",
      text: stats?.past_due_boxes > 0 ? "text-red-400" : "text-emerald-400",
      border: stats?.past_due_boxes > 0 ? "border-red-500/10" : "border-emerald-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-sm text-white/40 mt-1">Vista general de la plataforma</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label}
            className={`rounded-2xl border ${c.border} bg-gradient-to-br ${c.color} p-5 backdrop-blur-xl`}>
            <p className="text-xs font-medium text-white/50 uppercase tracking-wide">{c.label}</p>
            <p className={`text-3xl font-bold mt-2 ${c.text}`}>{c.value}</p>
            <p className="text-xs text-white/40 mt-1.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <h3 className="text-sm font-medium text-white/60 mb-4">Resumen</h3>
          <div className="space-y-3">
            {[
              { label: "Total Boxes", value: stats?.total_boxes || 0 },
              { label: "Activos", value: stats?.active_boxes || 0, color: "text-green-400" },
              { label: "En Trial", value: stats?.trial_boxes || 0, color: "text-blue-400" },
              { label: "Suspendidos", value: stats?.suspended_boxes || 0, color: "text-red-400" },
              { label: "Morosos", value: stats?.past_due_boxes || 0, color: "text-amber-400" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                <span className="text-sm text-white/50">{row.label}</span>
                <span className={`text-sm font-semibold ${row.color || "text-white/80"}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <Link href="/super-admin/boxes"
          className="rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] p-6 flex flex-col items-center justify-center text-center gap-4 transition-colors">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
            <span className="text-3xl">🏋️</span>
          </div>
          <div>
            <p className="text-lg font-semibold text-white">Gestionar Boxes</p>
            <p className="text-sm text-white/40 mt-0.5">Crear, suspender y administrar centros</p>
          </div>
          <span className="text-sm text-indigo-400 font-medium">
            Abrir gestión →
          </span>
        </Link>
      </div>
    </div>
  );
}
