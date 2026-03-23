import { createClient } from "@/lib/supabase/server";
import { Calendar, Plus } from "lucide-react";
import Link from "next/link";
import { WEEK_TYPE_LABELS, WEEK_TYPE_COLORS, formatDate } from "@/lib/utils";

export default async function CiclosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: cycles } = await supabase
    .from("training_cycles")
    .select("*, users!training_cycles_student_id_fkey(full_name, email)")
    .eq("trainer_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ciclos de entrenamiento</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{cycles?.length ?? 0} ciclos creados</p>
        </div>
        <Link href="/entrenador/ciclos/nuevo"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition">
          <Plus className="w-4 h-4" />
          Nuevo ciclo
        </Link>
      </div>

      {cycles && cycles.length > 0 ? (
        <div className="space-y-3">
          {cycles.map((cycle) => {
            const student = cycle.users as Record<string, string> | null;
            const phases = (cycle.phase_structure as { week_number: number; type: string }[]) || [];
            return (
              <Link key={cycle.id} href={`/entrenador/ciclos/${cycle.id}`}
                className="block bg-white rounded-2xl p-5 shadow-sm border border-border hover:shadow-md hover:border-primary/30 transition-all">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="font-semibold text-foreground">{cycle.name}</p>
                    <p className="text-sm text-muted-foreground">{student?.full_name}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                    cycle.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {cycle.active ? "Activo" : "Finalizado"}
                  </span>
                </div>

                {/* Estructura del ciclo */}
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {phases.map((p) => (
                    <span key={p.week_number}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${WEEK_TYPE_COLORS[p.type]}`}>
                      S{p.week_number}: {WEEK_TYPE_LABELS[p.type]}
                    </span>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  Inicio: {formatDate(cycle.start_date)} · {cycle.total_weeks} semanas
                </p>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-border">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Sin ciclos todavía</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Creá el primer ciclo de entrenamiento para un alumno.
          </p>
          <Link href="/entrenador/ciclos/nuevo"
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition">
            <Plus className="w-4 h-4" />
            Crear ciclo
          </Link>
        </div>
      )}
    </div>
  );
}
