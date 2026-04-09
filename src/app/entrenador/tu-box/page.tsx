"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Clock,
  CalendarDays,
  Users,
  Plus,
  ChevronRight,
  CalendarOff,
  BarChart3,
  Ticket,
  Palette,
} from "lucide-react";
import type { BoxScheduleSlot, Plan, Booking } from "@/types";

const DAY_LABELS: Record<number, string> = {
  1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves",
  5: "Viernes", 6: "Sábado", 7: "Domingo",
};

export default function TuBoxPage() {
  const [slots, setSlots] = useState<BoxScheduleSlot[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [slotsRes, plansRes, bookingsRes] = await Promise.all([
      supabase.from("box_schedule_slots")
        .select("*")
        
        .eq("active", true)
        .order("day_of_week")
        .order("start_time"),
      supabase.from("plans")
        .select("*")
        
        .eq("active", true),
      supabase.from("bookings")
        .select("*, users!bookings_student_id_fkey(full_name, email), box_schedule_slots(label, start_time, end_time)")
        .eq("booking_date", new Date().toISOString().split("T")[0])
        .eq("status", "confirmada"),
    ]);

    setSlots((slotsRes.data || []) as BoxScheduleSlot[]);
    setPlans((plansRes.data || []) as Plan[]);
    setTodayBookings((bookingsRes.data || []) as Booking[]);
    setLoading(false);
  }

  // Agrupar slots por día
  const slotsByDay = slots.reduce((acc, slot) => {
    const day = slot.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {} as Record<number, BoxScheduleSlot[]>);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tu Box</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestioná horarios, planes y turnos de tu gimnasio
          </p>
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/entrenador/tu-box/horarios"
          className="bg-white rounded-2xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-50 p-2.5 rounded-xl">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{slots.length}</p>
          <p className="text-sm text-muted-foreground mt-0.5">Horarios activos</p>
        </Link>

        <Link
          href="/entrenador/tu-box/planes"
          className="bg-white rounded-2xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="bg-purple-50 p-2.5 rounded-xl">
              <Ticket className="w-5 h-5 text-purple-600" />
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{plans.length}</p>
          <p className="text-sm text-muted-foreground mt-0.5">Planes activos</p>
        </Link>

        <Link
          href="/entrenador/tu-box/calendario"
          className="bg-white rounded-2xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="bg-green-50 p-2.5 rounded-xl">
              <CalendarDays className="w-5 h-5 text-green-600" />
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{todayBookings.length}</p>
          <p className="text-sm text-muted-foreground mt-0.5">Turnos hoy</p>
        </Link>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-orange-50 p-2.5 rounded-xl">
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {slots.reduce((sum, s) => sum + s.max_capacity, 0)}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">Cupos totales/semana</p>
        </div>

        <Link
          href="/entrenador/tu-box/actividades"
          className="bg-white rounded-2xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="bg-pink-50 p-2.5 rounded-xl">
              <Palette className="w-5 h-5 text-pink-600" />
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-lg font-bold text-foreground">Actividades</p>
          <p className="text-sm text-muted-foreground mt-0.5">Tipos de clase</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gestionar Horarios — botón grande */}
        <Link href="/entrenador/tu-box/horarios"
          className="bg-white rounded-2xl p-6 shadow-sm border border-border hover:shadow-md hover:border-primary/30 transition-all flex flex-col items-center justify-center text-center gap-3 cursor-pointer">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Clock className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-lg">Gestionar horarios</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {slots.length} {slots.length === 1 ? "turno activo" : "turnos activos"} en la semana
            </p>
          </div>
          <span className="text-sm text-primary font-medium flex items-center gap-1">
            Abrir editor <ChevronRight className="w-4 h-4" />
          </span>
        </Link>

        {/* Turnos de Hoy */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Turnos de hoy</h2>
            <Link
              href="/entrenador/tu-box/calendario"
              className="text-sm text-primary hover:underline font-medium"
            >
              Ver calendario
            </Link>
          </div>

          {todayBookings.length > 0 ? (
            <div className="space-y-2">
              {todayBookings.map((booking: any) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {booking.users?.full_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {booking.users?.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {booking.box_schedule_slots?.start_time?.slice(0, 5)} - {booking.box_schedule_slots?.end_time?.slice(0, 5)} · {booking.box_schedule_slots?.label}
                    </p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    Confirmado
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No hay turnos reservados para hoy.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Planes activos */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Planes activos</h2>
          <Link
            href="/entrenador/tu-box/planes"
            className="text-sm text-primary hover:underline font-medium"
          >
            Gestionar
          </Link>
        </div>

        {plans.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="p-4 rounded-xl border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    plan.modality === "presencial"
                      ? "bg-blue-100 text-blue-700"
                      : plan.modality === "a_distancia"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-purple-100 text-purple-700"
                  }`}>
                    {plan.modality === "presencial" ? "Presencial" : plan.modality === "a_distancia" ? "A distancia" : "Mixto"}
                  </span>
                </div>
                <p className="font-semibold text-foreground text-sm">{plan.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {plan.sessions_per_week}x/sem · {plan.total_credits} créditos · ${plan.price}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Ticket className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No hay planes creados.</p>
            <Link
              href="/entrenador/tu-box/planes/nuevo"
              className="text-sm text-primary hover:underline mt-1 inline-block"
            >
              Crear primer plan →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
