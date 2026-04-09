"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Flame, Plus, Copy, Trash2, Loader2, Calendar } from "lucide-react";
import Link from "next/link";
import { WEEK_TYPE_LABELS, WEEK_TYPE_COLORS, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Cycle = {
  id: string;
  name: string;
  total_weeks: number;
  start_date: string;
  active: boolean;
  is_template: boolean;
  phase_structure: { week_number: number; type: string }[];
  users: { full_name: string } | null;
};

export default function CrossfitPage() {
  const [tab, setTab] = useState<"ciclos" | "plantillas" | "ejercicios">("ciclos");
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Cycle | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("training_cycles")
        .select("*, users!training_cycles_student_id_fkey(full_name)")
        
        .eq("cycle_type", "crossfit")
        .order("created_at", { ascending: false });
      setCycles((data as Cycle[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const deleteCycle = async () => {
    if (!confirmTarget) return;
    setDeletingId(confirmTarget.id);
    const supabase = createClient();
    const { error } = await supabase.from("training_cycles").delete().eq("id", confirmTarget.id);
    if (error) {
      toast.error(`Error al eliminar: ${error.message}`);
    } else {
      setCycles(prev => prev.filter(c => c.id !== confirmTarget.id));
      toast.success(confirmTarget.is_template ? "Plantilla eliminada" : "Ciclo eliminado");
    }
    setDeletingId(null);
    setConfirmTarget(null);
  };

  const regularCycles = cycles.filter(c => !c.is_template);
  const templates = cycles.filter(c => c.is_template);
  const shown = tab === "ciclos" ? regularCycles : templates;

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Cross / Funcional</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {regularCycles.length} ciclo{regularCycles.length !== 1 ? "s" : ""} · {templates.length} plantilla{templates.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
        <Link href="/entrenador/crossfit/nuevo"
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-700 transition shadow-sm">
          <Plus className="w-4 h-4" />
          Nuevo ciclo CF
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        <button onClick={() => setTab("ciclos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "ciclos" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}>
          <Flame className="w-4 h-4" />
          Mis ciclos
          {regularCycles.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              tab === "ciclos" ? "bg-orange-100 text-orange-700" : "bg-muted-foreground/20"
            }`}>{regularCycles.length}</span>
          )}
        </button>
        <button onClick={() => setTab("plantillas")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "plantillas" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}>
          <Copy className="w-4 h-4" />
          Plantillas
          {templates.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              tab === "plantillas" ? "bg-orange-100 text-orange-700" : "bg-muted-foreground/20"
            }`}>{templates.length}</span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      ) : shown.length > 0 ? (
        <div className="space-y-3">
          {shown.map(cycle => {
            const phases = cycle.phase_structure || [];
            const student = cycle.users;
            const isDeleting = deletingId === cycle.id;

            return (
              <div key={cycle.id}
                className="relative bg-white rounded-2xl shadow-sm border border-border hover:shadow-md hover:border-orange-300 transition-all group">
                <Link href={`/entrenador/crossfit/${cycle.id}`} className="block p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3">
                      {cycle.is_template && (
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Copy className="w-4 h-4 text-purple-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-foreground pr-10">{cycle.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {cycle.is_template
                            ? `Plantilla · ${cycle.total_weeks} semanas`
                            : student?.full_name || "Sin alumno"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {cycle.is_template ? (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-100 text-purple-700">
                          Plantilla
                        </span>
                      ) : (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          cycle.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {cycle.active ? "Activo" : "Finalizado"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {phases.map(p => (
                      <span key={p.week_number}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${WEEK_TYPE_COLORS[p.type]}`}>
                        S{p.week_number}: {WEEK_TYPE_LABELS[p.type]}
                      </span>
                    ))}
                  </div>

                  {!cycle.is_template && cycle.start_date && (
                    <p className="text-xs text-muted-foreground">
                      Inicio: {formatDate(cycle.start_date)} · {cycle.total_weeks} semanas
                    </p>
                  )}
                </Link>

                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmTarget(cycle); }}
                  disabled={isDeleting}
                  className="absolute bottom-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 z-10"
                  title="Eliminar">
                  {isDeleting
                    ? <span className="w-4 h-4 block animate-spin border-2 border-destructive border-t-transparent rounded-full" />
                    : <Trash2 className="w-4 h-4" />
                  }
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-border">
          {tab === "ciclos" ? (
            <>
              <Flame className="w-12 h-12 text-orange-300 mx-auto mb-3" />
              <h3 className="font-semibold text-foreground">Sin ciclos CrossFit todavía</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Creá el primer ciclo funcional para un alumno.
              </p>
              <Link href="/entrenador/crossfit/nuevo"
                className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-700 transition">
                <Plus className="w-4 h-4" /> Crear ciclo CF
              </Link>
            </>
          ) : (
            <>
              <Copy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-foreground">Sin plantillas todavía</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Guardá un ciclo CF como plantilla desde el editor.
              </p>
              <Link href="/entrenador/crossfit/nuevo"
                className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-700 transition">
                <Plus className="w-4 h-4" /> Crear plantilla
              </Link>
            </>
          )}
        </div>
      )}
    </div>

    <ConfirmDialog
      open={!!confirmTarget}
      title={`Eliminar ${confirmTarget?.is_template ? "plantilla" : "ciclo"}`}
      description={
        confirmTarget?.is_template
          ? `¿Eliminar la plantilla "${confirmTarget?.name}"? Esta acción no se puede deshacer.`
          : `¿Eliminar el ciclo "${confirmTarget?.name}"? Se borrarán todas las semanas, días y ejercicios.`
      }
      confirmLabel="Eliminar"
      loading={!!deletingId}
      onConfirm={deleteCycle}
      onCancel={() => setConfirmTarget(null)}
    />
    </>
  );
}
