import { createClient } from "@/lib/supabase/server";
import { DAY_NAMES, WEEK_TYPE_LABELS, WEEK_TYPE_COLORS, cn } from "@/lib/utils";
import { Dumbbell, AlertCircle, Moon, ChevronRight, CheckCircle2, Ticket, CalendarCheck, Megaphone, Pin, Sparkles, ShoppingBag } from "lucide-react";
import Link from "next/link";

const DAY_ABBR: Record<number, string> = {
  1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb", 7: "Dom",
};

export default async function StudentHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 📡 1. Perfil puro sin joins riesgosos para el motor de RLS
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user!.id)
    .single();

  // 📡 2. Box condicional
  let boxName = "EntrenAPP";
  if (profile?.box_id) {
    const { data: boxData } = await supabase
      .from("boxes")
      .select("name")
      .eq("id", profile.box_id)
      .single();
    if (boxData?.name) boxName = boxData.name;
  }

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
    <div className="min-h-screen bg-slate-50/50">
      {/* Cabecera Premium Estilizada */}
      <div className="bg-gradient-to-b from-zinc-950 via-zinc-900 to-sidebar text-white px-5 pt-safe pb-16 relative overflow-hidden border-b border-white/5">
        {/* Glow ambiental del color del Box en la esquina superior derecha */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[60px] -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-64 h-24 bg-zinc-800/40 rounded-full blur-3xl pointer-events-none" />

        <div className="pt-6 relative z-10">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-primary font-black text-[10px] uppercase tracking-[0.15em] drop-shadow-sm">{boxName}</p>
            <p className="text-white/40 text-[10px] font-medium tracking-wider uppercase">{dateCapitalized}</p>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-0.5 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/80">
            ¡Hola, {profile?.full_name?.split(" ")[0]}!
          </h1>
          {currentWeek && (
            <div className="mt-3 flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-500">
              <span className={cn(
                "text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider shadow-sm border border-white/5",
                WEEK_TYPE_COLORS[(currentWeek.type as string)] ?? "bg-white/10 text-white"
              )}>
                {activeCycle?.name as string} · Sem {weekNumber} · {WEEK_TYPE_LABELS[(currentWeek.type as string)]}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Contenedor de contenido con solapamiento elegante y seguro */}
      <div className="px-4 -mt-10 space-y-5 pb-8 relative z-20">

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
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1 pt-2">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                <Megaphone className="w-3.5 h-3.5 text-primary opacity-80" /> Notas de la Comunidad
              </h2>
            </div>
            
            <div className="flex flex-col gap-4">
              {announcements.map((note: any) => {
                const isTargeted = note.scope === "targeted";
                return (
                  <div
                    key={note.id}
                    className={cn(
                      "rounded-3xl p-6 border transition-all duration-300 relative overflow-hidden",
                      isTargeted 
                        ? "bg-gradient-to-br from-indigo-500/[0.04] to-purple-500/[0.04] border-indigo-500/20 shadow-sm" 
                        : note.pinned 
                        ? "bg-primary/[0.03] border-primary/20 shadow-md shadow-primary/[0.02]" 
                        : "bg-white border-slate-100 shadow-sm hover:shadow-md"
                    )}
                  >
                    {/* Decoración sutil de fondo para notas destacadas */}
                    {note.pinned && !isTargeted && (
                      <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
                    )}

                    {isTargeted && (
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-600 to-purple-600 text-white text-[8px] font-black uppercase px-3.5 py-1.5 rounded-bl-2xl tracking-[0.15em] shadow-sm">
                        Nota Personal
                      </div>
                    )}
                    {note.pinned && !isTargeted && (
                      <div className="absolute top-0 right-0 bg-primary text-white text-[8px] font-black uppercase px-3.5 py-1.5 rounded-bl-2xl tracking-[0.15em] flex items-center gap-1 shadow-sm shadow-primary/10">
                        <Pin className="w-2.5 h-2.5" /> Destacado
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm border",
                        isTargeted 
                          ? "bg-indigo-50 border-indigo-100 text-indigo-600" 
                          : note.pinned
                          ? "bg-primary/10 border-primary/10 text-primary"
                          : "bg-slate-50 border-slate-100 text-slate-500"
                      )}>
                        {isTargeted ? <Sparkles className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={cn("font-black leading-snug text-base tracking-tight", isTargeted ? "text-indigo-950" : note.pinned ? "text-slate-900" : "text-slate-800")}>
                          {note.title}
                        </h3>
                        <p className={cn("text-sm mt-2 leading-relaxed whitespace-pre-wrap font-medium", isTargeted ? "text-indigo-800/80" : "text-slate-600")}>
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

        {/* Tienda del Box Banner */}
        <Link href="/alumno/tienda" className="group bg-white rounded-2xl shadow-sm border border-border p-4 flex items-center gap-4 hover:shadow-md hover:border-primary/20 transition-all relative overflow-hidden mt-2">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/[0.02] rounded-full blur-xl pointer-events-none group-hover:bg-primary/[0.05] transition-colors" />
          <div className="bg-primary/10 p-2.5 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-primary font-black uppercase tracking-wider">Tienda</p>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/10 text-[9px] font-black text-primary uppercase tracking-wide leading-none animate-pulse">
                Nuevo
              </span>
            </div>
            <p className="font-extrabold text-slate-900 text-sm mt-0.5">
              Vitrina de Suplementos & Ropa
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Mirá el stock de tu Box y comprá al instante.</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Sin ciclo activo */}
        {!activeCycle && (
          <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-slate-100 text-center mt-2 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-24 bg-slate-50 rounded-full blur-2xl -z-10 pointer-events-none" />
            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
              <Dumbbell className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="font-black text-slate-800 text-lg tracking-tight">Sin ciclo activo</h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-[260px] mx-auto font-medium">
              Tu entrenador pronto preparará tu próxima planificación personalizada.
            </p>
          </div>
        )}

        {/* HOY */}
        {todayDay && (
          <div className="space-y-4">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1 pt-2">Hoy</h2>

            {(todayDay.is_rest as boolean) ? (
              /* Día de descanso */
              <div className="bg-blue-500/[0.04] border border-blue-100 rounded-[2rem] p-6 flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 shadow-sm">
                  <Moon className="w-7 h-7 text-blue-500" />
                </div>
                <div>
                  <p className="font-black text-blue-950 tracking-tight text-base">Día de descanso</p>
                  <p className="text-sm text-blue-700/80 mt-1 font-medium">Hora de recuperar el cuerpo. Mañana volvemos con todo.</p>
                </div>
              </div>
            ) : countExercises(todayDay) === 0 ? (
              /* Día sin ejercicios cargados */
              <div className="bg-white border border-slate-100 rounded-[2rem] p-6 flex items-center gap-5 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  <Dumbbell className="w-7 h-7 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-800 text-base tracking-tight">{todayDay.label as string}</p>
                  <p className="text-sm text-slate-500 mt-1 font-medium">Tu entrenador aún no cargó los ejercicios de hoy.</p>
                </div>
              </div>
            ) : (
              /* Día con ejercicios */
              <Link
                href={`/alumno/entrenar/${todayDay.id as string}`}
                className="block relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 hover:to-primary rounded-[2rem] p-6 shadow-xl shadow-primary/10 border border-white/10 transition-all active:scale-[0.98] duration-200"
              >
                {/* Brillo ambiental del botón */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <p className="font-black text-white text-lg tracking-tight">{todayDay.label as string}</p>
                    <p className="text-white/80 text-xs font-medium mt-1 bg-white/10 inline-block px-3 py-1 rounded-full">
                      {(todayDay.training_blocks as unknown[])?.length ?? 0} bloque{((todayDay.training_blocks as unknown[])?.length ?? 0) !== 1 ? "s" : ""} · {countExercises(todayDay)} ejercicios
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/20 backdrop-blur-sm shadow-inner">
                    <Dumbbell className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-6 bg-white text-primary rounded-2xl py-3.5 text-center shadow-sm font-black text-xs uppercase tracking-widest transition-colors hover:bg-white/95">
                  Empezar entrenamiento
                </div>
              </Link>
            )}
          </div>
        )}

        {/* SEMANA COMPLETA */}
        {currentWeek && weekDays.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1 pt-2">
              Esta semana
            </h2>
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
              {weekDays.map(day => {
                const isToday = (day.day_of_week as number) === todayDow;
                const isRest = day.is_rest as boolean;
                const exCount = countExercises(day);
                const isEmpty = !isRest && exCount === 0;

                return (
                  <div key={day.id as string} className={cn("flex items-center gap-4 px-5 py-4 transition-colors", isToday && "bg-primary/[0.02]")}>
                    {/* Day abbr */}
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm tracking-wider border",
                      isToday 
                        ? "bg-gradient-to-br from-primary to-primary/90 border-primary text-white shadow-primary/10" 
                        : isRest 
                        ? "bg-blue-50 border-blue-100 text-blue-500" 
                        : isEmpty 
                        ? "bg-slate-50 border-slate-100 text-slate-400" 
                        : "bg-primary/10 border-primary/10 text-primary"
                    )}>
                      {isRest ? <Moon className="w-4.5 h-4.5" /> : DAY_ABBR[day.day_of_week as number]}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm font-black tracking-tight", isToday ? "text-primary" : "text-slate-800")}>
                          {day.label as string}
                        </p>
                        {isToday && (
                          <span className="text-[8px] font-black uppercase tracking-[0.15em] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            Hoy
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {isRest
                          ? "Día de descanso"
                          : isEmpty
                          ? "Sin ejercicios cargados"
                          : `${exCount} ejercicio${exCount !== 1 ? "s" : ""}`}
                      </p>
                    </div>

                    {/* Action */}
                    {!isRest && !isEmpty && (
                      <Link href={`/alumno/entrenar/${day.id as string}`}
                        className={cn(
                          "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3.5 py-2 rounded-xl transition-all duration-200 shrink-0 shadow-sm active:scale-[0.97]",
                          isToday
                            ? "bg-primary text-white hover:opacity-95 border border-primary shadow-primary/10"
                            : "bg-slate-50 text-slate-600 hover:bg-primary/10 hover:text-primary border border-slate-100"
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
