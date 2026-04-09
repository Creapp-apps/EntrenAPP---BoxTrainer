import { createClient } from "@/lib/supabase/server";
import { Calendar, Dumbbell, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function HistorialPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: sessions } = await supabase
    .from("session_logs")
    .select(`
      id, completed_at, rpe_overall, comments,
      training_days!training_day_id(label, day_of_week,
        training_weeks(week_number,
          training_cycles(name)
        )
      ),
      exercise_logs(id)
    `)
    .eq("student_id", user!.id)
    .order("completed_at", { ascending: false })
    .limit(30);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-sidebar text-white px-4 pt-12 pb-6">
        <h1 className="text-2xl font-bold">Mi historial</h1>
        <p className="text-white/60 text-sm mt-1">
          {sessions?.length || 0} sesión{sessions?.length !== 1 ? "es" : ""} registrada{sessions?.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="px-4 py-4 space-y-3 pb-24">
        {sessions && sessions.length > 0 ? (
          sessions.map((s) => {
            const day = (s as Record<string, unknown>).training_days as Record<string, unknown>;
            const week = day?.training_weeks as Record<string, unknown>;
            const cycle = week?.training_cycles as Record<string, string>;
            const date = new Date(s.completed_at);

            return (
              <Link key={s.id} href={`/alumno/historial/${s.id}`} className="block">
                <div className="bg-white rounded-2xl shadow-sm border border-border p-4 hover:border-primary/40 hover:shadow-md transition-all group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Dumbbell className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                        {(day?.label as string) || "Entrenamiento"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cycle?.name} · Semana {week?.week_number as number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs bg-muted px-2 py-1 rounded-full">
                          {(s.exercise_logs as unknown[])?.length || 0} ejercicios
                        </span>
                        {s.rpe_overall && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                            RPE {s.rpe_overall}/10
                          </span>
                        )}
                      </div>
                      {s.comments && (
                        <p className="text-xs text-muted-foreground mt-2 italic">"{s.comments}"</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-3" />
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-border">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">Sin historial todavía</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Tus sesiones completadas aparecerán acá.
            </p>
            <Link href="/alumno" className="inline-block mt-4 text-sm text-primary font-medium hover:underline">
              Ir al entrenamiento de hoy →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
