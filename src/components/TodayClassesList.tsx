"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Users, PlayCircle, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Student {
  full_name: string;
  avatar_url: string | null;
}

interface Booking {
  id: string;
  status: "confirmada" | "completada" | "no_show" | string;
  student_id: string;
  users: Student | Student[];
  box_schedule_slots: {
    id: string;
    label: string;
    start_time: string;
    end_time: string;
    max_capacity: number;
    trainer_id: string;
  };
}

interface Slot {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  box_activities?: {
    name: string;
    color: string;
  };
}

interface TodayClassesListProps {
  slots: Slot[];
  bookings: Booking[];
}

// Función auxiliar para convertir "HH:MM:SS" a minutos desde la medianoche
const timeToMinutes = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export default function TodayClassesList({ slots, bookings }: TodayClassesListProps) {
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({});
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});
  const [localBookings, setLocalBookings] = useState(bookings);
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  
  // Guardamos los minutos actuales para calcular la "próxima clase"
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  useEffect(() => {
    // Actualizar los minutos cada minuto para mantener en tiempo real el cálculo de la próxima clase
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentMinutes(d.getHours() * 60 + d.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Filtrar solo reservas activas (no canceladas)
  const activeBookings = localBookings.filter(b => ["confirmada", "completada", "no_show"].includes(b.status));

  // Ordenar slots por hora de inicio
  const sortedSlots = [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time));

  const toggleSlot = (slotId: string) => {
    setExpandedSlots(prev => ({ ...prev, [slotId]: !prev[slotId] }));
  };

  const toggleActivity = (activity: string) => {
    setExpandedActivities(prev => ({ ...prev, [activity]: !prev[activity] }));
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      setLoadingIds(prev => ({ ...prev, [bookingId]: true }));
      
      const res = await fetch("/api/bookings/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar estado");

      // Actualizar estado local
      setLocalBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
      toast.success("Estado actualizado");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingIds(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  if (sortedSlots.length === 0) {
    return (
      <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground font-medium">No hay clases configuradas para hoy</p>
      </div>
    );
  }

  // Agrupar por actividad (usando box_activities.name si existe, sino label)
  const groupedSlots = sortedSlots.reduce((acc, slot) => {
    const label = slot.box_activities?.name || slot.label || "Actividad";
    if (!acc[label]) acc[label] = [];
    acc[label].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  // Determinar la clase activa/próxima de cada actividad
  const getUpcomingClass = (groupSlots: Slot[]) => {
    // Buscamos la primera clase que termina DESPUÉS de la hora actual
    const upcoming = groupSlots.find(s => {
      const endMins = timeToMinutes(s.end_time);
      return endMins > currentMinutes;
    });
    // Si no hay próximas (todas ya pasaron hoy), devolvemos null
    return upcoming || null;
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedSlots).map(([activity, slotsGroup]) => {
        const upcomingSlot = getUpcomingClass(slotsGroup);
        const isActivityExpanded = expandedActivities[activity];
        const activityColor = slotsGroup[0]?.box_activities?.color || "#3b82f6"; // default blue

        return (
          <div key={activity} className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col">
            {/* Cabecera / Tarjeta de Actividad (Resumen Próxima Clase) */}
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 bg-slate-50/30">
              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white font-bold text-lg"
                  style={{ backgroundColor: activityColor }}
                >
                  {activity.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">{activity}</h3>
                  {upcomingSlot ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <p className="text-sm font-medium text-emerald-700">
                        Próxima: {upcomingSlot.start_time.slice(0, 5)} - {upcomingSlot.end_time.slice(0, 5)}
                      </p>
                      <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full ml-1">
                        {activeBookings.filter(b => b.box_schedule_slots.id === upcomingSlot.id).length} alumnos
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 mt-1">
                      No hay más clases hoy.
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => toggleActivity(activity)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm w-full sm:w-auto"
              >
                {isActivityExpanded ? "Ocultar horarios" : "Ver todos los horarios"}
                {isActivityExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Acordeón de todos los horarios */}
            {isActivityExpanded && (
              <div className="p-4 bg-slate-50/50 space-y-3">
                {slotsGroup.map(slot => {
                  const slotBookings = activeBookings.filter(b => b.box_schedule_slots.id === slot.id);
                  const isExpanded = expandedSlots[slot.id];
                  const capacity = slot.max_capacity || 0;
                  const enrolledCount = slotBookings.length;
                  const isFull = capacity > 0 && enrolledCount >= capacity;
                  
                  // Verificar si es el upcoming slot
                  const isUpcoming = upcomingSlot?.id === slot.id;

                  return (
                    <div 
                      key={slot.id} 
                      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ${
                        isUpcoming 
                          ? `border-[2px] border-emerald-400 shadow-emerald-100 shadow-md ring-2 ring-emerald-50 ring-offset-2 relative` 
                          : 'border-border'
                      }`}
                    >
                      {/* Badge flotante si es la próxima */}
                      {isUpcoming && (
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-bl-xl z-10">
                          ACTUAL / PRÓXIMA
                        </div>
                      )}

                      {/* Cabecera del Slot */}
                      <div 
                        className={`p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${isUpcoming ? 'bg-emerald-50/20' : ''}`}
                        onClick={() => toggleSlot(slot.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${isUpcoming ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                            {isUpcoming ? <PlayCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">
                              {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                            </p>
                            <p className="text-xs text-muted-foreground">{enrolledCount} inscriptos</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isFull ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                            <Users className="w-3.5 h-3.5" />
                            {enrolledCount} {capacity > 0 ? `/ ${capacity}` : ''}
                          </div>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                        </div>
                      </div>

                      {/* Lista de Alumnos */}
                      {isExpanded && (
                        <div className="border-t border-border bg-slate-50/50">
                          {slotBookings.length > 0 ? (
                            <ul className="divide-y divide-border">
                              {slotBookings.map(b => {
                                const isComplete = b.status === "completada";
                                const isNoShow = b.status === "no_show";
                                const studentName = Array.isArray(b.users) ? b.users[0]?.full_name : b.users?.full_name;
                                const isLoading = loadingIds[b.id];

                                return (
                                  <li key={b.id} className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white transition-colors">
                                    <p className="font-medium text-sm text-foreground">
                                      {studentName || "Alumno"}
                                    </p>
                                    <div className="flex items-center gap-2 self-end sm:self-auto">
                                      {isComplete ? (
                                        <button 
                                          disabled={isLoading}
                                          onClick={() => updateBookingStatus(b.id, "confirmada")}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold border border-green-200 hover:bg-green-200 transition"
                                        >
                                          <CheckCircle2 className="w-4 h-4" /> Asistió
                                        </button>
                                      ) : isNoShow ? (
                                        <button 
                                          disabled={isLoading}
                                          onClick={() => updateBookingStatus(b.id, "confirmada")}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold border border-red-200 hover:bg-red-200 transition"
                                        >
                                          <XCircle className="w-4 h-4" /> Faltó
                                        </button>
                                      ) : (
                                        <>
                                          <button 
                                            disabled={isLoading}
                                            onClick={() => updateBookingStatus(b.id, "completada")}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-white text-slate-600 rounded-lg text-xs font-medium border border-border hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition disabled:opacity-50"
                                          >
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Presente
                                          </button>
                                          <button 
                                            disabled={isLoading}
                                            onClick={() => updateBookingStatus(b.id, "no_show")}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-white text-slate-600 rounded-lg text-xs font-medium border border-border hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition disabled:opacity-50"
                                          >
                                            <XCircle className="w-3.5 h-3.5" /> Ausente
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <div className="p-6 text-center">
                              <p className="text-sm text-muted-foreground">No hay alumnos anotados en este horario.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
