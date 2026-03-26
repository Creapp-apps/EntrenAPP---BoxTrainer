"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  CalendarCheck,
  Clock,
  Ticket,
  CalendarOff,
  X,
  AlertCircle,
  CheckCircle2,
  XCircle,
  History,
  PartyPopper,
} from "lucide-react";
import type { Booking, AvailableSlot, StudentPlanSubscription } from "@/types";

const DAY_LABELS_SHORT: Record<number, string> = {
  0: "Dom", 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  confirmada: { label: "Confirmado", color: "bg-blue-100 text-blue-700", icon: CalendarCheck },
  completada: { label: "Asistió", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  cancelada: { label: "Cancelado", color: "bg-gray-100 text-gray-500", icon: XCircle },
  no_show: { label: "No asistió", color: "bg-red-100 text-red-700", icon: XCircle },
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateISO(date: Date) {
  return date.toISOString().split("T")[0];
}

export default function TurnosAlumnoPage() {
  const [tab, setTab] = useState<"reservar" | "mis-turnos" | "historial">("reservar");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [pastBookings, setPastBookings] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<StudentPlanSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [justBooked, setJustBooked] = useState<any | null>(null); // confirmation state

  useEffect(() => { loadInitial(); }, []);
  useEffect(() => { if (trainerId) loadSlots(); }, [selectedDate, trainerId]);

  async function loadInitial() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("users")
      .select("created_by, modality")
      .eq("id", user.id)
      .single();

    if (!profile?.created_by) {
      setLoading(false);
      return;
    }

    setTrainerId(profile.created_by);

    const [subRes, bookingsRes, pastRes] = await Promise.all([
      supabase.from("student_plan_subscriptions")
        .select("*, plans(name, modality, sessions_per_week)")
        .eq("student_id", user.id)
        .eq("status", "activo")
        .order("period_start", { ascending: false })
        .limit(1),
      supabase.from("bookings")
        .select("*, box_schedule_slots(label, start_time, end_time, day_of_week)")
        .eq("student_id", user.id)
        .eq("status", "confirmada")
        .gte("booking_date", formatDateISO(new Date()))
        .order("booking_date"),
      supabase.from("bookings")
        .select("*, box_schedule_slots(label, start_time, end_time, day_of_week)")
        .eq("student_id", user.id)
        .or(`booking_date.lt.${formatDateISO(new Date())},status.neq.confirmada`)
        .order("booking_date", { ascending: false })
        .limit(30),
    ]);

    if (subRes.data && subRes.data.length > 0) {
      const sub = subRes.data[0];
      setSubscription({
        ...sub,
        credits_remaining: sub.credits_total - sub.credits_used,
      } as StudentPlanSubscription);
    }

    setMyBookings(bookingsRes.data || []);
    setPastBookings(pastRes.data || []);
    setLoading(false);
  }

  async function loadSlots() {
    if (!trainerId) return;
    const supabase = createClient();
    const dateStr = formatDateISO(selectedDate);
    const { data } = await supabase.rpc("get_available_slots", {
      p_trainer_id: trainerId,
      p_date: dateStr,
    });
    setAvailableSlots((data || []) as AvailableSlot[]);
  }

  async function makeBooking(slotId: string, slot: AvailableSlot) {
    if (!subscription || subscription.credits_remaining <= 0) {
      toast.error("No tenés créditos disponibles. Contactá a tu entrenador.");
      return;
    }

    setBooking(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.rpc("make_booking", {
      p_student_id: user.id,
      p_slot_id: slotId,
      p_date: formatDateISO(selectedDate),
    });

    if (error) {
      toast.error(error.message);
    } else {
      // Show confirmation overlay
      setJustBooked({
        date: selectedDate,
        slot,
      });
      loadInitial();
      loadSlots();
    }
    setBooking(false);
  }

  async function cancelBooking(bookingId: string) {
    if (!confirm("¿Cancelar este turno?")) return;
    const supabase = createClient();
    const { error } = await supabase.rpc("cancel_booking", {
      p_booking_id: bookingId,
      p_reason: "Cancelado por el alumno",
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Turno cancelado");
      loadInitial();
    }
  }

  // Generate next 14 days
  const today = new Date();
  const futureDays = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-32 bg-muted animate-pulse rounded-lg" />
        <div className="h-24 bg-white rounded-2xl animate-pulse border border-border" />
        <div className="h-48 bg-white rounded-2xl animate-pulse border border-border" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">

      {/* ═══ Booking confirmation overlay ═══ */}
      {justBooked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <PartyPopper className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">¡Turno reservado!</h2>
            <p className="text-muted-foreground text-sm mt-2">
              Tu lugar está confirmado para:
            </p>
            <div className="mt-4 bg-primary/5 rounded-xl p-4">
              <p className="font-bold text-foreground">
                {justBooked.date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <p className="text-sm text-primary font-medium mt-1">
                {justBooked.slot.start_time.slice(0, 5)} – {justBooked.slot.end_time.slice(0, 5)} · {justBooked.slot.label}
              </p>
            </div>
            {subscription && (
              <p className="text-xs text-muted-foreground mt-3">
                Te quedan <span className="font-bold text-foreground">{Math.max(0, subscription.credits_remaining - 1)}</span> créditos
              </p>
            )}
            <button
              onClick={() => {
                setJustBooked(null);
                setTab("mis-turnos");
              }}
              className="mt-6 w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition"
            >
              Ver mis turnos
            </button>
            <button
              onClick={() => setJustBooked(null)}
              className="mt-2 w-full text-muted-foreground text-sm py-2 hover:text-foreground transition"
            >
              Seguir reservando
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Turnos</h1>
        <p className="text-sm text-muted-foreground">Reservá y gestioná tus turnos</p>
      </div>

      {/* Credits card */}
      {subscription ? (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-4 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <Ticket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Créditos disponibles</p>
                <p className="text-2xl font-bold text-foreground">
                  {subscription.credits_remaining}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{subscription.credits_total}
                  </span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="text-sm font-medium text-foreground">
                {(subscription.plan as any)?.name || "—"}
              </p>
            </div>
          </div>
          <div className="mt-3 bg-white/50 rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${(subscription.credits_remaining / subscription.credits_total) * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Sin plan activo</p>
            <p className="text-xs text-amber-600">Contactá a tu entrenador para que te asigne un plan.</p>
          </div>
        </div>
      )}

      {/* Tab switcher — 3 tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        <button
          onClick={() => setTab("reservar")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            tab === "reservar" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Reservar
        </button>
        <button
          onClick={() => setTab("mis-turnos")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            tab === "mis-turnos" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Próximos
          {myBookings.length > 0 && (
            <span className="text-[10px] bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {myBookings.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("historial")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            tab === "historial" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Historial
        </button>
      </div>

      {/* ═══ TAB: Reservar ═══ */}
      {tab === "reservar" && (
        <div className="space-y-4">
          {/* Date picker horizontal */}
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-2 min-w-max">
              {futureDays.map(day => {
                const isSelected = formatDateISO(day) === formatDateISO(selectedDate);
                const isToday = formatDateISO(day) === formatDateISO(today);
                return (
                  <button
                    key={formatDateISO(day)}
                    onClick={() => setSelectedDate(day)}
                    className={`flex flex-col items-center w-14 py-2.5 rounded-xl transition-colors ${
                      isSelected
                        ? "bg-primary text-white"
                        : isToday
                        ? "bg-primary/10 text-primary"
                        : "bg-white border border-border text-foreground"
                    }`}
                  >
                    <span className="text-xs font-medium">
                      {DAY_LABELS_SHORT[day.getDay()]}
                    </span>
                    <span className="text-lg font-bold">{day.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Available slots */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">
              {selectedDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            </p>

            {availableSlots.length > 0 ? (
              <div className="space-y-2">
                {availableSlots.map(slot => {
                  const isFull = slot.spots_available <= 0;
                  return (
                    <div
                      key={slot.slot_id}
                      className={`bg-white rounded-2xl p-4 border transition-colors ${
                        isFull ? "border-border opacity-60" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-50 p-2 rounded-xl">
                            <Clock className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">
                              {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                            </p>
                            <p className="text-xs text-muted-foreground">{slot.label}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            isFull
                              ? "bg-red-100 text-red-700"
                              : slot.spots_available <= 2
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}>
                            {isFull ? "Completo" : `${slot.spots_available} lugares`}
                          </span>
                          {!isFull && subscription && subscription.credits_remaining > 0 && (
                            <button
                              onClick={() => makeBooking(slot.slot_id, slot)}
                              disabled={booking}
                              className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
                            >
                              {booking ? "..." : "Reservar"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-border">
                <CalendarOff className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No hay turnos disponibles para este día
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ TAB: Próximos turnos ═══ */}
      {tab === "mis-turnos" && (
        <div className="space-y-2">
          {myBookings.length > 0 ? (
            myBookings.map((b: any) => {
              const bookDate = new Date(b.booking_date + "T00:00:00");
              const isToday = formatDateISO(bookDate) === formatDateISO(new Date());
              const isTomorrow = formatDateISO(bookDate) === formatDateISO(addDays(new Date(), 1));

              return (
                <div
                  key={b.id}
                  className={`bg-white rounded-2xl p-4 border transition-colors ${
                    isToday ? "border-primary/30 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${isToday ? "bg-primary/10" : "bg-muted"}`}>
                        <CalendarCheck className={`w-4 h-4 ${isToday ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground text-sm">
                            {bookDate.toLocaleDateString("es-AR", {
                              weekday: "long",
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                          {isToday && (
                            <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-bold">
                              HOY
                            </span>
                          )}
                          {isTomorrow && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">
                              MAÑANA
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {b.box_schedule_slots?.start_time?.slice(0, 5)} – {b.box_schedule_slots?.end_time?.slice(0, 5)} · {b.box_schedule_slots?.label}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => cancelBooking(b.id)}
                      className="p-2 rounded-xl text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Cancelar turno"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Confirmed badge */}
                  <div className="mt-3 flex items-center gap-1.5 bg-green-50 rounded-lg px-2.5 py-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-[11px] font-medium text-green-700">Turno confirmado</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-border">
              <CalendarCheck className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Sin turnos reservados</p>
              <p className="text-xs text-muted-foreground mt-1">
                Andá a la pestaña "Reservar" para elegir un horario.
              </p>
              <button
                onClick={() => setTab("reservar")}
                className="mt-3 text-sm text-primary font-medium hover:underline"
              >
                Reservar turno →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: Historial ═══ */}
      {tab === "historial" && (
        <div className="space-y-2">
          {pastBookings.length > 0 ? (
            pastBookings.map((b: any) => {
              const config = STATUS_CONFIG[b.status] || STATUS_CONFIG.confirmada;
              const StatusIcon = config.icon;
              const bookDate = new Date(b.booking_date + "T00:00:00");

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl p-4 border border-border"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted p-2 rounded-xl">
                        <StatusIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {bookDate.toLocaleDateString("es-AR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: bookDate.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {b.box_schedule_slots?.start_time?.slice(0, 5)} – {b.box_schedule_slots?.end_time?.slice(0, 5)} · {b.box_schedule_slots?.label}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-border">
              <History className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Sin historial</p>
              <p className="text-xs text-muted-foreground mt-1">
                Acá vas a ver el registro de tus turnos anteriores.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
