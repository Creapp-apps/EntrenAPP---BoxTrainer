import { createClient } from "@/lib/supabase/server";
import { DAY_NAMES, WEEK_TYPE_LABELS, WEEK_TYPE_COLORS, cn } from "@/lib/utils";
import { Dumbbell, AlertCircle, Moon, ChevronRight, CheckCircle2, Ticket, CalendarCheck, Megaphone, Pin, Sparkles } from "lucide-react";
import Link from "next/link";

const DAY_ABBR: Record<number, string> = {
  1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb", 7: "Dom",
};

export default async function StudentHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Perfil + Box Name
  const { data: profile } = await supabase
    .from("users")
    .select("*, boxes(name)")
    .eq("id", user!.id)
    .single();

  const boxName = (profile?.boxes as any)?.name || "EntrenAPP";

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

  const [{ data: pendingPayment }, subRes, nextBookingRes, announcementsRes] = await Promise.all([
    supabase.from("student_payments")
      .select("id")
      .eq("student_id", user!.id)
      .eq("status", "vencido")
      .limit(1)
      .single(),
    supabase.from("student_plan_subscriptions")
      .select("*, plans(name)")
      .eq("student_id", user!.id)
      .eq("status", "activo")
      .order("period_start", { ascending: false })
      .limit(1),
    supabase.from("bookings")
      .select("*, box_schedule_slots(label, start_time, end_time)")
      .eq("student_id", user!.id)
      .eq("status", "confirmada")
      .gte("booking_date", new Date().toISOString().split("T")[0])
      .order("booking_date")
      .limit(1),
    supabase.from("box_announcements")
      .select("*, users:author_id(full_name)")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const activeSub = subRes.data?.[0];
  const nextBooking = nextBookingRes.data?.[0];
  const announcements = announcementsRes.data || [];

  // ⏳ Calcular Alerta Temprana de Cobro (10 días o menos antes del cierre)
  let showExpirationWarning = false;
  let daysLeftForExpiration = 0;
  if (activeSub && activeSub.period_end) {
    const periodEnd = new Date(activeSub.period_end as string);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffMs = periodEnd.getTime() - today.getTime();
    daysLeftForExpiration = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    showExpirationWarning = daysLeftForExpiration >= 0 && daysLeftForExpiration <= 10;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-sidebar text-white px-4 pt-safe pb-8 relative overflow-hidden">
        <div className="pt-6 relative z-10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-white/60 text-sm font-bold uppercase tracking-wider">{boxName}</p>
            <p className="text-white/60 text-[11px]">{dateCapitalized}</p>
          </div>
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
      </div>

      <div className="px-4 -mt-4 space-y-4 pb-8 relative z-20">

        {/* Alerta de pago vencido */}
        {pendingPayment ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 animate-in slide-in-from-top duration-300">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800">Pago Vencido</p>
              <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
                Tienes un recibo pendiente. Por favor, ponte al día para no perder tus próximas reservas.
              </p>
              <Link href="/alumno/pagos" className="inline-block text-xs font-bold text-red-700 mt-2 hover:underline">Ver deuda pendiente →</Link>
            </div>
          </div>
        ) : showExpirationWarning ? (
          /* ⏳ Banner de Alerta Temprana de Cobro */
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-in slide-in-from-top duration-300">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">Tu abono vence pronto</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Faltan {daysLeftForExpiration === 0 ? "menos de 24 horas" : `exactamente ${daysLeftForExpiration} ${daysLeftForExpiration === 1 ? 'día' : 'días'}`} para el cierre de tu ciclo actual.
              </p>
              <Link href="/alumno/pagos" className="inline-block text-xs font-bold text-amber-900 mt-2 underline">Pagar ahora →</Link>
            </div>
          </div>
        ) : null}

        {/* 📢 Feed de Anuncios / Notas del Día */}
        {announcements.length > 0 && (
          <div className="space-y-3.5">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2 px-1 pt-1">
              <Megaphone className="w-4 h-4 text-primary" /> Notas de la Comunidad
            </h2>
            <div className="flex flex-col gap-3">
              {announcements.map((note: any) => {
                const isTargeted = note.scope === "targeted";
                return (
                  <div
                    key={note.id}
                    className={cn(
                      "rounded-2xl p-5 border transition-all shadow-sm relative overflow-hidden",
                      isTargeted 
                        ? "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 shadow-indigo-100/20" 
                        : note.pinned 
                        ? "bg-orange-50/60 border-orange-200 shadow-orange-100/20" 
                        : "bg-white border-border"
                    )}
                  >
                    {isTargeted && (
                      <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-widest">
                        Nota Personal
                      </div>
                    )}
                    {note.pinned && !isTargeted && (
                      <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-widest flex items-center gap-1">
                        <Pin className="w-2.5 h-2.5" /> Destacado
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-inner",
                        isTargeted ? "bg-indigo-100 text-indigo-600" : "bg-primary/10 text-primary"
                      )}>
                        {isTargeted ? <Sparkles className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <h3 className={cn("font-bold leading-snug text-base", isTargeted ? "text-indigo-950" : "text-foreground")}>
                          {note.title}
                        </h3>
                        <p className={cn("text-sm mt-1.5 leading-relaxed whitespace-pre-wrap", isTargeted ? "text-indigo-800/90" : "text-muted-foreground")}>
                          {note.content}
                        </p>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dashed border-black/5">
                          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600">
                            {note.users?.full_name?.charAt(0) || "C"}
                          </div>
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Por <span className="font-bold text-slate-700">{note.users?.full_name || "Coach"}</span> · {new Date(note.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Créditos + Próximo turno */}
        {(activeSub || nextBooking) && (
          <Link href="/alumno/turnos" className="bg-white rounded-2xl shadow-sm border border-border p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
            {activeSub && (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
                  <Ticket className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Créditos</p>
                  <p className="font-bold text-foreground">
                    {activeSub.credits_total - activeSub.credits_used}
                    <span className="text-sm font-normal text-muted-foreground">/{activeSub.credits_total}</span>
                  </p>
                </div>
              </div>
            )}
            {nextBooking && (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="bg-green-50 p-2.5 rounded-xl shrink-0">
                  <CalendarCheck className="w-5 h-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Próximo turno</p>
                  <p className="font-semibold text-foreground text-sm truncate">
                    {new Date(nextBooking.booking_date + "T00:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
                    <span className="font-normal text-muted-foreground"> · {nextBooking.box_schedule_slots?.start_time?.slice(0, 5)}</span>
                  </p>
                </div>
              </div>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>
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
