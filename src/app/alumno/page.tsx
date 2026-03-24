import { createClient } from "@/lib/supabase/server";
import { DAY_NAMES, WEEK_TYPE_LABELS, WEEK_TYPE_COLORS, cn } from "@/lib/utils";
import { Dumbbell, AlertCircle, Moon, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const DAY_ABBR: Record<number, string> = {
  1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb", 7: "Dom",
};

export default async function StudentHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Perfil
  const { data: profile } = await supabase
    .from("users").select("*").eq("id", user!.id).single();

  // Ciclo activo
  const { data: activeCycle } = await supabase
    .from("training_cycles")
    .select("id, name, start_date, total_weeks")
    .eq("student_id", user!.id)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Calcular semana actual dentro del ciclo
  let currentWeek: Record<string, unknown> | null = null;
  let weekNumber = 1;

  if (activeCycle) {
    const startDate = new Date(activeCycle.start_date as string);
    const today = new Date();
    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    weekNumber = Math.max(1, Math.min(Math.floor(daysDiff / 7) + 1, activeCycle.total_weeks as number));

    const { data: week } = await supabase
      .from("training_weeks")
      .select(`
        id, week_number, type,
        training_days (
          id, day_of_week, label, is_rest,
          training_blocks (
            id,
            training_exercises ( id )
          )
        )
      `)
      .eq("cycle_id", activeCycle.id as string)
      .eq("week_number", weekNumber)
      .single();

    currentWeek = week as Record<string, unknown> | null;
  }

  // Día de hoy (1=Lun … 7=Dom)
  const todayDow = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const dateLabel = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const dateCapitalized = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  // Obtener el día de hoy dentro de la semana actual
  const weekDays = ((currentWeek?.training_days as Record<string, unknown>[]) || [])
    .sort((a, b) => (a.day_of_week as number) - (b.day_of_week as number));

  const todayDay = weekDays.find(d => d.day_of_week === todayDow);

  // Contar ejercicios por día
  function countExercises(day: Record<string, unknown>): number {
    return ((day.training_blocks as Record<string, unknown>[]) || [])
      .reduce((acc, b) => acc + (((b.training_exercises as unknown[]) || []).length), 0);
  }

  // Alerta de pago vencido
  const { data: pendingPayment } = await supabase
    .from("student_payments")
    .select("id")
    .eq("student_id", user!.id)
    .eq("status", "vencido")
    .limit(1)
    .single();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-sidebar text-white px-4 pt-12 pb-8">
        <p className="text-white/60 text-sm">{dateCapitalized}</p>
        <h1 className="text-2xl font-bold mt-1">¡Hola, {profile?.full_name?.split(" ")[0]}!</h1>
        {currentWeek && (
          <div className="mt-3 flex items-center gap-2">
            <span className={cn(
              "text-xs px-2.5 py-1 rounded-full font-medium",
              WEEK_TYPE_COLORS[(currentWeek.type as string)] ?? "bg-gray-100 text-gray-700"
            )}>
              {activeCycle?.name as string} · Semana {weekNumber} — {WEEK_TYPE_LABELS[(currentWeek.type as string)]}
            </span>
          </div>
        )}
      </div>

      <div className="px-4 -mt-4 space-y-4 pb-8">

        {/* Alerta de pago vencido */}
        {pendingPayment && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Pago vencido</p>
              <p className="text-xs text-red-600 mt-0.5">
                Tenés un pago pendiente.{" "}
                <Link href="/alumno/pagos" className="underline font-medium">Ver detalles →</Link>
              </p>
            </div>
          </div>
        )}

        {/* Sin ciclo activo */}
        {!activeCycle && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-border text-center mt-4">
            <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">Sin ciclo activo</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Tu entrenador aún no te asignó un ciclo de entrenamiento.
            </p>
          </div>
        )}

        {/* HOY */}
        {todayDay && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Hoy</h2>

            {(todayDay.is_rest as boolean) ? (
              /* Día de descanso */
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <Moon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-blue-800">Día de descanso</p>
                  <p className="text-sm text-blue-600 mt-0.5">Recuperate, mañana volvemos fuerte.</p>
                </div>
              </div>
            ) : countExercises(todayDay) === 0 ? (
              /* Día sin ejercicios cargados */
              <div className="bg-white border border-border rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Dumbbell className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{todayDay.label as string}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Tu entrenador aún no cargó los ejercicios de hoy.</p>
                </div>
              </div>
            ) : (
              /* Día con ejercicios */
              <Link
                href={`/alumno/entrenar/${todayDay.id as string}`}
                className="block bg-primary rounded-2xl p-5 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-base">{todayDay.label as string}</p>
                    <p className="text-white/70 text-sm mt-0.5">
                      {(todayDay.training_blocks as unknown[])?.length ?? 0} bloque{((todayDay.training_blocks as unknown[])?.length ?? 0) !== 1 ? "s" : ""} · {countExercises(todayDay)} ejercicios
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="mt-4 bg-white/20 rounded-xl py-2.5 text-center">
                  <p className="text-white font-semibold text-sm">Empezar entrenamiento →</p>
                </div>
              </Link>
            )}
          </div>
        )}

        {/* SEMANA COMPLETA */}
        {currentWeek && weekDays.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">
              Esta semana
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden divide-y divide-border">
              {weekDays.map(day => {
                const isToday = (day.day_of_week as number) === todayDow;
                const isRest = day.is_rest as boolean;
                const exCount = countExercises(day);
                const isEmpty = !isRest && exCount === 0;

                return (
                  <div key={day.id as string} className={cn("flex items-center gap-4 px-4 py-3.5", isToday && "bg-primary/5")}>
                    {/* Day abbr */}
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0",
                      isToday ? "bg-primary text-white" : isRest ? "bg-blue-100 text-blue-500" : isEmpty ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                    )}>
                      {isRest ? <Moon className="w-4 h-4" /> : DAY_ABBR[day.day_of_week as number]}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", isToday ? "text-primary" : "text-foreground")}>
                        {day.label as string}
                        {isToday && <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">Hoy</span>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isRest
                          ? "Descanso"
                          : isEmpty
                          ? "Sin ejercicios cargados"
                          : `${exCount} ejercicio${exCount !== 1 ? "s" : ""}`}
                      </p>
                    </div>

                    {/* Action */}
                    {!isRest && !isEmpty && (
                      <Link href={`/alumno/entrenar/${day.id as string}`}
                        className={cn(
                          "flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0",
                          isToday
                            ? "bg-primary text-white hover:bg-primary/90"
                            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        )}
                      >
                        {isToday ? "Empezar" : "Ver"}
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Semana sin días configurados */}
        {currentWeek && weekDays.length === 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border text-center">
            <p className="text-sm text-muted-foreground">Tu entrenador aún no configuró los días de esta semana.</p>
          </div>
        )}
      </div>
    </div>
  );
}
