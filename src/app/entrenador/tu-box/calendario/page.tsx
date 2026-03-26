"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  CalendarOff,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import type { Booking, AvailableSlot, BoxBlockedDate } from "@/types";

const DAY_LABELS: Record<number, string> = {
  0: "Domingo", 1: "Lunes", 2: "Martes", 3: "Miércoles",
  4: "Jueves", 5: "Viernes", 6: "Sábado",
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateISO(date: Date) {
  return date.toISOString().split("T")[0];
}

export default function CalendarioPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [blockedDates, setBlockedDates] = useState<BoxBlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockReason, setBlockReason] = useState("");
  const [showBlockForm, setShowBlockForm] = useState(false);

  useEffect(() => { loadDayData(); }, [selectedDate]);

  async function loadDayData() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dateStr = formatDateISO(selectedDate);

    const [bookingsRes, slotsRes, blockedRes] = await Promise.all([
      supabase.from("bookings")
        .select("*, users!bookings_student_id_fkey(full_name, email), box_schedule_slots(label, start_time, end_time)")
        .eq("booking_date", dateStr)
        .in("status", ["confirmada", "completada", "no_show"]),
      supabase.rpc("get_available_slots", { p_trainer_id: user.id, p_date: dateStr }),
      supabase.from("box_blocked_dates")
        .select("*")
        .eq("trainer_id", user.id)
        .eq("blocked_date", dateStr),
    ]);

    setBookings(bookingsRes.data || []);
    setAvailableSlots((slotsRes.data || []) as AvailableSlot[]);
    setBlockedDates((blockedRes.data || []) as BoxBlockedDate[]);
    setLoading(false);
  }

  async function markAttendance(bookingId: string, status: "completada" | "no_show") {
    const supabase = createClient();
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);

    if (error) {
      toast.error("Error al actualizar asistencia");
    } else {
      toast.success(status === "completada" ? "Asistencia registrada" : "Marcado como inasistencia");
      loadDayData();
    }
  }

  async function blockDate() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("box_blocked_dates").insert({
      trainer_id: user.id,
      blocked_date: formatDateISO(selectedDate),
      reason: blockReason || null,
    });

    if (error) {
      toast.error(error.message.includes("duplicate") ? "Esta fecha ya está bloqueada" : "Error: " + error.message);
    } else {
      toast.success("Fecha bloqueada");
      setShowBlockForm(false);
      setBlockReason("");
      loadDayData();
    }
  }

  async function unblockDate(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("box_blocked_dates").delete().eq("id", id);
    if (!error) {
      toast.success("Fecha desbloqueada");
      loadDayData();
    }
  }

  // Week navigation: generate 7 days from selectedDate's week
  const weekStart = new Date(selectedDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const isBlocked = blockedDates.length > 0;
  const isToday = formatDateISO(selectedDate) === formatDateISO(new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/entrenador/tu-box"
          className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendario del Box</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visualizá y gestioná los turnos por día
          </p>
        </div>
      </div>

      {/* Week selector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-border">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-sm font-semibold text-foreground">
            {selectedDate.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
          </p>
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => {
            const isSelected = formatDateISO(day) === formatDateISO(selectedDate);
            const dayIsToday = formatDateISO(day) === formatDateISO(new Date());
            return (
              <button
                key={formatDateISO(day)}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center p-2 rounded-xl transition-colors ${
                  isSelected
                    ? "bg-primary text-white"
                    : dayIsToday
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <span className="text-xs font-medium">
                  {day.toLocaleDateString("es-AR", { weekday: "short" }).slice(0, 3)}
                </span>
                <span className="text-lg font-bold mt-0.5">{day.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day content */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">
          {selectedDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
          {isToday && <span className="text-xs ml-2 text-primary font-medium">(Hoy)</span>}
        </h2>
        <div className="flex gap-2">
          {isBlocked ? (
            <button
              onClick={() => unblockDate(blockedDates[0].id)}
              className="text-xs px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 font-medium transition"
            >
              Desbloquear fecha
            </button>
          ) : (
            <button
              onClick={() => setShowBlockForm(!showBlockForm)}
              className="text-xs px-3 py-2 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 font-medium transition"
            >
              <CalendarOff className="w-3.5 h-3.5 inline mr-1" />
              Bloquear fecha
            </button>
          )}
        </div>
      </div>

      {/* Block form */}
      {showBlockForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-red-200">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              placeholder="Motivo (ej: Feriado, Vacaciones)"
              className="flex-1 px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            <button
              onClick={blockDate}
              className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition"
            >
              Bloquear
            </button>
            <button
              onClick={() => setShowBlockForm(false)}
              className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isBlocked && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">Fecha bloqueada</p>
            <p className="text-xs text-red-600">
              {blockedDates[0].reason || "Sin motivo especificado"} — No se permiten reservas este día.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-border" />
          ))}
        </div>
      ) : !isBlocked ? (
        <div className="space-y-4">
          {/* Slots con bookings */}
          {availableSlots.length > 0 ? (
            availableSlots.map(slot => {
              const slotBookings = bookings.filter((b: any) => b.slot_id === slot.slot_id);
              return (
                <div key={slot.slot_id} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
                  <div className="px-5 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-sm text-foreground">
                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      </span>
                      <span className="text-xs text-muted-foreground">— {slot.label}</span>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      slot.spots_available > 0
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {slot.spots_available}/{slot.max_capacity} disponibles
                    </span>
                  </div>

                  {slotBookings.length > 0 ? (
                    <div className="divide-y divide-border">
                      {slotBookings.map((booking: any) => (
                        <div key={booking.id} className="flex items-center gap-3 px-5 py-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {booking.users?.full_name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {booking.users?.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{booking.users?.email}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            booking.status === "confirmada" ? "bg-blue-100 text-blue-700" :
                            booking.status === "completada" ? "bg-green-100 text-green-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {booking.status === "confirmada" ? "Confirmado" : booking.status === "completada" ? "Asistió" : "No vino"}
                          </span>
                          {booking.status === "confirmada" && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => markAttendance(booking.id, "completada")}
                                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                                title="Asistió"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => markAttendance(booking.id, "no_show")}
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                title="No vino"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-5 py-4 text-center">
                      <p className="text-sm text-muted-foreground">Sin reservas aún</p>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-border">
              <CalendarOff className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-foreground">Sin horarios para este día</h3>
              <p className="text-sm text-muted-foreground mt-1">
                No hay turnos configurados para {DAY_LABELS[selectedDate.getDay()]}.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
