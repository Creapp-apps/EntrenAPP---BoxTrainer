"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Database, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [liveStats, setLiveStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      
      const [dbRes, liveRes] = await Promise.all([
        supabase.rpc("super_admin_dashboard_stats"),
        fetch("/api/super-admin/live-metrics").then(r => r.json())
      ]);
      
      setStats(dbRes.data);
      if (liveRes && !liveRes.error) {
        setLiveStats(liveRes);
      }
      setLoading(false);
    })();
  }, []);

  const handleDownloadBackup = async () => {
    setDownloading(true);
    try {
      const response = await fetch("/api/backup");
      if (!response.ok) {
        throw new Error("Fallo en la descarga del Backup.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const disposition = response.headers.get("content-disposition");
      let filename = "backup_global_total.json";
      if (disposition && disposition.indexOf("filename=") !== -1) {
        filename = disposition.split("filename=")[1].replace(/"/g, "");
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("¡Respaldo global de base de datos descargado!");
    } catch (err) {
      console.error(err);
      toast.error("Error generando la copia de seguridad del tenant.");
    } finally {
      setDownloading(false);
    }
  };

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
      icon: "💰",
      glow: "shadow-emerald-500/20",
      accent: "bg-emerald-500/10 text-emerald-400",
      text: "text-emerald-400",
    },
    {
      label: "Boxes Activos",
      value: stats?.active_boxes || 0,
      sub: `${stats?.trial_boxes || 0} en trial`,
      icon: "🏢",
      glow: "shadow-blue-500/20",
      accent: "bg-blue-500/10 text-blue-400",
      text: "text-white",
    },
    {
      label: "Total Alumnos",
      value: stats?.total_students || 0,
      sub: `${stats?.total_professors || 0} profesores`,
      icon: "👥",
      glow: "shadow-indigo-500/20",
      accent: "bg-indigo-500/10 text-indigo-400",
      text: "text-white",
    },
    {
      label: "Cuentas Morosas",
      value: stats?.past_due_boxes || 0,
      sub: stats?.past_due_amount > 0 ? `$${stats.past_due_amount.toLocaleString()} pendiente` : "Todo al día",
      icon: stats?.past_due_boxes > 0 ? "⚠️" : "✅",
      glow: stats?.past_due_boxes > 0 ? "shadow-red-500/20" : "shadow-emerald-500/20",
      accent: stats?.past_due_boxes > 0 ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400",
      text: stats?.past_due_boxes > 0 ? "text-red-400" : "text-white",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black text-white tracking-tight">Dashboard</h2>
        <p className="text-sm text-white/40 mt-1">Vista general de la plataforma</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map(c => (
          <div key={c.label}
            className={`group rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:shadow-2xl ${c.glow}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${c.accent}`}>
                {c.icon}
              </div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{c.label}</p>
            </div>
            <p className={`text-4xl font-black tracking-tight ${c.text}`}>{c.value}</p>
            <p className="text-xs text-white/40 mt-2 font-medium">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Live Activity Metrics */}
      {liveStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 hover:bg-white/[0.03] transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full blur-xl" />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <p className="text-xs font-bold text-white/40 uppercase">Usuarios Online</p>
            </div>
            <p className="text-3xl font-black text-white">{liveStats.loginsLastHour}</p>
            <p className="text-[10px] text-white/30 mt-1">Logins en la última hora</p>
          </div>
          
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 hover:bg-white/[0.03] transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-bl-full blur-xl" />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <p className="text-xs font-bold text-white/40 uppercase">Nuevas Reservas</p>
            </div>
            <p className="text-3xl font-black text-white">{liveStats.bookingsLastHour}</p>
            <p className="text-[10px] text-white/30 mt-1">Reservas en la última hora</p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 hover:bg-white/[0.03] transition-colors relative overflow-hidden">
            <p className="text-xs font-bold text-white/40 uppercase mb-2">Tráfico Diario (24hs)</p>
            <p className="text-2xl font-black text-white/80">{liveStats.loginsLastDay}</p>
            <p className="text-[10px] text-white/30 mt-1">Logins totales de hoy</p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 hover:bg-white/[0.03] transition-colors relative overflow-hidden">
            <p className="text-xs font-bold text-white/40 uppercase mb-2">Reservas Diarias (24hs)</p>
            <p className="text-2xl font-black text-white/80">{liveStats.bookingsLastDay}</p>
            <p className="text-[10px] text-white/30 mt-1">Turnos reservados hoy</p>
          </div>
        </div>
      )}

      {/* Quick stats & tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="rounded-3xl border border-white/5 bg-white/[0.01] p-8 backdrop-blur-xl hover:border-white/10 transition-colors">
          <h3 className="text-sm font-bold text-white/70 mb-6 uppercase tracking-widest">Resumen General</h3>
          <div className="space-y-4">
            {[
              { label: "Total Boxes", value: stats?.total_boxes || 0 },
              { label: "Activos", value: stats?.active_boxes || 0, color: "text-emerald-400", dot: "bg-emerald-500" },
              { label: "En Trial", value: stats?.trial_boxes || 0, color: "text-blue-400", dot: "bg-blue-500" },
              { label: "Suspendidos", value: stats?.suspended_boxes || 0, color: "text-red-400", dot: "bg-red-500" },
              { label: "Morosos", value: stats?.past_due_boxes || 0, color: "text-amber-400", dot: "bg-amber-500" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  {row.dot ? <div className={`w-1.5 h-1.5 rounded-full ${row.dot}`} /> : <div className="w-1.5 h-1.5" />}
                  <span className="text-sm text-white/60 font-medium">{row.label}</span>
                </div>
                <span className={`text-base font-bold ${row.color || "text-white"}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <Link href="/super-admin/boxes"
          className="group rounded-3xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-indigo-500/30 p-8 flex flex-col justify-between transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full blur-2xl group-hover:bg-indigo-500/20 transition-colors" />
          <div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/5">
              <span className="text-3xl">🏋️</span>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight mb-2">Gestionar Boxes</p>
            <p className="text-sm text-white/50 leading-relaxed">Crear, suspender y administrar centros de entrenamiento y configuraciones.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-indigo-400 font-bold uppercase tracking-wide mt-6">
            Abrir Gestión <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>

        <button
          onClick={handleDownloadBackup}
          disabled={downloading}
          className="group text-left rounded-3xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-orange-500/30 p-8 flex flex-col justify-between transition-all duration-300 disabled:opacity-50 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-bl-full blur-2xl group-hover:bg-orange-500/20 transition-colors" />
          <div>
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/5">
              {downloading ? (
                <Loader2 className="w-7 h-7 text-orange-400 animate-spin" />
              ) : (
                <Database className="w-7 h-7 text-orange-400" />
              )}
            </div>
            <p className="text-2xl font-bold text-white tracking-tight mb-2">Backup Global</p>
            <p className="text-sm text-white/50 leading-relaxed">Generar y descargar un respaldo completo JSON de toda la base de datos.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-orange-400 font-bold uppercase tracking-wide mt-6">
            {downloading ? "Preparando datos..." : "Descargar Respaldo"} <span className="group-hover:translate-y-1 transition-transform">↓</span>
          </div>
        </button>
      </div>
    </div>
  );
}
