import { createClient } from "@/lib/supabase/server";
import { DAY_NAMES, WEEK_TYPE_LABELS, WEEK_TYPE_COLORS, cn } from "@/lib/utils";
import { Calendar, CheckCircle2, Dumbbell, AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function StudentHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users").select("*").eq("id", user!.id).single();

  // Obtener el entrenamiento de hoy usando la función de Supabase
  const { data: todayTraining } = await supabase
    .rpc("get_today_training", { p_student_id: user!.id });

  const today = todayTraining?.[0];

  // Si hay entrenamiento hoy, obtener los bloques y ejercicios
  let blocks: Record<string, unknown>[] = [];
  if (today?.day_id) {
    const { data } = await supabase
      .from("training_blocks")
      .select(`
        *,
        training_exercises (
          *,
          exercises (name, category, muscle_group, video_url)
        )
      `)
      .eq("day_id", today.day_id)
      .order("order");
    blocks = (data as Record<string, unknown>[]) || [];
  }

  // Estado de pago
  const { data: pendingPayment } = await supabase
    .from("student_payments")
    .select("*")
    .eq("student_id", user!.id)
    .eq("status", "vencido")
    .limit(1)
    .single();

  const dayName = DAY_NAMES[new Date().getDay() === 0 ? 7 : new Date().getDay()];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-sidebar text-white px-4 pt-12 pb-6">
        <p className="text-white/60 text-sm">{dayName}, {new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long" })}</p>
        <h1 className="text-2xl font-bold mt-1">¡Hola, {profile?.full_name?.split(" ")[0]}!</h1>
        {today && (
          <div className="mt-3 flex items-center gap-2">
            <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", WEEK_TYPE_COLORS[today.week_type])}>
              Semana {today.week_number} — {WEEK_TYPE_LABELS[today.week_type]}
            </span>
          </div>
        )}
      </div>

      <div className="px-4 -mt-4 space-y-4 pb-4">
        {/* Alerta de pago vencido */}
        {pendingPayment && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Pago vencido</p>
              <p className="text-xs text-red-600 mt-0.5">Tenés un pago pendiente. <Link href="/alumno/pagos" className="underline font-medium">Ver detalles →</Link></p>
            </div>
          </div>
        )}

        {/* Entrenamiento de hoy */}
        {today ? (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-semibold text-foreground">{today.day_label}</h2>
                <span className="text-xs text-muted-foreground">{today.cycle_name}</span>
              </div>
              <p className="text-sm text-muted-foreground">{blocks.length} bloque{blocks.length !== 1 ? "s" : ""} · {blocks.reduce((acc: number, b: Record<string, unknown>) => acc + ((b.training_exercises as unknown[])?.length || 0), 0)} ejercicios</p>
            </div>

            {/* Bloques */}
            {blocks.map((block: Record<string, unknown>) => (
              <div key={block.id as string} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                  <h3 className="font-semibold text-sm text-foreground">{block.name as string}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{block.type as string}</p>
                </div>
                <div className="divide-y divide-border">
                  {((block.training_exercises as Record<string, unknown>[]) || []).map((ex: Record<string, unknown>, idx: number) => {
                    const exercise = ex.exercises as Record<string, string>;
                    return (
                      <div key={ex.id as string} className="px-4 py-3 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{exercise?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ex.sets as number} series × {ex.reps as string} reps
                            {ex.percentage_1rm
                              ? ` · ${ex.percentage_1rm}% 1RM`
                              : ex.weight_target
                              ? ` · ${ex.weight_target} kg`
                              : ""}
                            {ex.rest_seconds ? ` · ${ex.rest_seconds}s descanso` : ""}
                          </p>
                        </div>
                        {ex.video_url && (
                          <a href={ex.video_url as string} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary font-medium">
                            Video
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Botón de registrar sesión */}
            <Link href={`/alumno/entrenar/${today.day_id}`}
              className="block w-full bg-primary hover:bg-primary/90 text-white font-semibold py-4 rounded-2xl text-center transition shadow-lg">
              <div className="flex items-center justify-center gap-2">
                <Dumbbell className="w-5 h-5" />
                Registrar entrenamiento
              </div>
            </Link>
          </div>
        ) : (
          /* Sin entrenamiento hoy */
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-border text-center mt-4">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">Hoy es día de descanso</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No tenés entrenamiento programado para hoy. Aprovechá para recuperarte.
            </p>
            <Link href="/alumno/historial"
              className="inline-block mt-4 text-sm text-primary font-medium hover:underline">
              Ver historial →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
