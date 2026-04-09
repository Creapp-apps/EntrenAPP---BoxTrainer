import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Dumbbell, Calendar, Target, Activity, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function DetalleHistorialPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return notFound();

  // Fetch session details with joined logs and exercise info
  const { data: session, error } = await supabase
    .from("session_logs")
    .select(`
      *,
      training_days!training_day_id (
        label, day_of_week,
        training_weeks (
          week_number,
          training_cycles (name)
        )
      ),
      exercise_logs (
        id,
        sets_completed,
        reps_completed,
        weight_used_kg,
        set_weights,
        exercises (name, category),
        exercise_variants (name)
      )
    `)
    .eq("id", params.id)
    .eq("student_id", user.id)
    .single();

  if (error) {
    console.error("Supabase Error:", error);
  }

  if (!session) {
    console.log("No session found for ID:", params.id, "User ID:", user.id);
    return notFound();
  }

  const day = session.training_days as Record<string, unknown>;
  const week = day?.training_weeks as Record<string, unknown>;
  const cycle = week?.training_cycles as Record<string, string>;
  const date = new Date(session.completed_at);

  const logs = (session.exercise_logs as any[]) || [];

  // Calculate total volume (tonnage)
  const totalTonnage = logs.reduce((total, log) => {
    if (!log.weight_used_kg) return total;
    const reps = parseFloat(log.reps_completed) || 1;
    if (log.set_weights && log.set_weights.length > 0) {
      return total + log.set_weights.reduce((s: number, w: number) => s + (w ?? 0) * reps, 0);
    }
    return total + (log.weight_used_kg * log.sets_completed * reps);
  }, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-sidebar text-white shadow-md relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent pointer-events-none" />
        <div className="px-4 pt-safe pb-6 relative z-10">
          <div className="pt-4">
          <Link href="/alumno/historial" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-5 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver al historial
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-white/70 text-xs font-semibold tracking-wider uppercase">
                Sesión Completada
              </p>
              <h1 className="text-2xl font-bold">
                {(day?.label as string) || "Entrenamiento"}
              </h1>
            </div>
          </div>
          <p className="text-white/80 text-sm mt-1 flex items-center gap-2">
            <Calendar className="w-4 h-4 opacity-70" />
            {date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <p className="text-primary-foreground/70 text-xs mt-1">
            {cycle?.name} · Semana {week?.week_number as number}
          </p>
          </div>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="px-4 -mt-4 relative z-20">
        <div className="bg-white rounded-2xl shadow-lg border border-border p-4 grid grid-cols-3 divide-x divide-border">
          <div className="text-center px-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Volumen</p>
            <p className="text-lg font-bold text-foreground">
              {totalTonnage > 0 ? `${Math.round(totalTonnage).toLocaleString()} kg` : "—"}
            </p>
          </div>
          <div className="text-center px-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Ejercicios</p>
            <p className="text-lg font-bold text-foreground">{logs.length}</p>
          </div>
          <div className="text-center px-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">RPE</p>
            <p className="text-lg font-bold text-primary">{session.rpe_overall ? `${session.rpe_overall}/10` : "—"}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-8 space-y-6">
        {/* Comments */}
        {session.comments && (
          <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-orange-500" />
              <h3 className="font-semibold text-orange-800 text-sm">Tus notas de sesión</h3>
            </div>
            <p className="text-sm text-orange-900/80 italic">"{session.comments}"</p>
          </div>
        )}

        {/* Exercises List */}
        <div>
          <h2 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" /> Detalles del trabajo
          </h2>
          
          <div className="space-y-3">
            {logs.length > 0 ? (
              logs.map((log, index) => {
                const exName = log.exercises?.name || "Ejercicio desconocido";
                const variantName = log.exercise_variants?.name;
                const displayName = variantName ? `${exName} — ${variantName}` : exName;
                const category = log.exercises?.category || "General";
                
                return (
                  <div key={log.id} className="bg-white rounded-2xl p-4 border border-border shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm">{displayName}</p>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground/70 mt-0.5">{category}</p>
                        
                        <div className="mt-3 flex items-center gap-4 flex-wrap">
                          <div className="bg-muted px-3 py-1.5 rounded-xl">
                            <p className="text-xs text-muted-foreground">Series x Reps</p>
                            <p className="text-sm font-bold text-foreground">
                              {log.sets_completed} × {log.reps_completed}
                            </p>
                          </div>
                          
                          {(log.weight_used_kg || (log.set_weights && log.set_weights.length > 0)) && (
                            <div className="bg-primary/5 border border-primary/10 px-3 py-1.5 rounded-xl">
                              <p className="text-xs text-primary/70 font-medium">Peso utilizado</p>
                              <div className="text-sm font-bold text-primary flex gap-1 flex-wrap">
                                {log.set_weights && log.set_weights.length > 0 ? (
                                  log.set_weights.map((w: number, i: number) => (
                                    <span key={i} className="bg-primary/10 px-1.5 rounded">
                                      {w}kg
                                    </span>
                                  ))
                                ) : (
                                  <span>{log.weight_used_kg} kg</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 bg-muted/30 rounded-2xl border border-border">
                <Dumbbell className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No se registraron ejercicios detallados en esta sesión.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
