"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Plus,
  Trash2,
  Save,
  Power,
  ChevronDown,
  ChevronRight,
  Pencil,
  X,
  Check,
  Palette,
  Eye,
  Copy,
  Loader2,
} from "lucide-react";
import type { BoxScheduleSlot, DayOfWeek } from "@/types";

type Activity = { id: string; name: string; color: string };

const DAYS: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 1, label: "Lunes", short: "LUN" },
  { value: 2, label: "Martes", short: "MAR" },
  { value: 3, label: "Miércoles", short: "MIÉ" },
  { value: 4, label: "Jueves", short: "JUE" },
  { value: 5, label: "Viernes", short: "VIE" },
  { value: 6, label: "Sábado", short: "SÁB" },
  { value: 7, label: "Domingo", short: "DOM" },
];

interface EditingSlot {
  id?: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  label: string;
  activity_id: string;
}

const emptySlot: EditingSlot = {
  start_time: "08:00",
  end_time: "09:30",
  max_capacity: 8,
  label: "Turno",
  activity_id: "",
};

// ─── Helper: add minutes to "HH:MM" ─────────────────────────
function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMins = h * 60 + m + mins;
  const hh = Math.floor(totalMins / 60) % 24;
  const mm = totalMins % 60;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

// ─── Helper: diff in minutes between two "HH:MM" ────────────
function diffMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

// ─── Slot form component (reused in create & edit) ─────────
function SlotForm({
  form, setForm, onSave, onCancel, saving, isNew, activities, activeTab
}: {
  form: EditingSlot;
  setForm: (f: EditingSlot) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isNew: boolean;
  activities: { id: string; name: string }[];
  activeTab: string;
}) {
  // When start_time changes in a NEW form, auto-adjust end_time keeping same duration
  const handleStartChange = (newStart: string) => {
    if (isNew) {
      const currentDuration = diffMinutes(form.start_time, form.end_time);
      const duration = currentDuration > 0 ? currentDuration : 60;
      setForm({ ...form, start_time: newStart, end_time: addMinutes(newStart, duration) });
    } else {
      setForm({ ...form, start_time: newStart });
    }
  };

  return (
    <div className={`px-5 py-4 ${isNew ? "bg-green-50/50 border-t border-green-100" : "bg-primary/5"}`}>
      {isNew && (
        <p className="text-xs font-semibold text-green-700 mb-3 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Nuevo horario
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Inicio</label>
          <input type="time" value={form.start_time}
            onChange={e => handleStartChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Fin</label>
          <input type="time" value={form.end_time}
            onChange={e => setForm({ ...form, end_time: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Cupo</label>
          <input type="number" min="1" max="50" value={form.max_capacity}
            onChange={e => setForm({ ...form, max_capacity: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Etiqueta</label>
          <input type="text" value={form.label}
            onChange={e => setForm({ ...form, label: e.target.value })}
            placeholder="Ej: Turno Mañana"
            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
        </div>
        {activeTab === "calendar" && (
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Actividad</label>
            <select
              value={form.activity_id}
              onChange={e => setForm({ ...form, activity_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
            >
              <option value="" disabled>Seleccionar...</option>
              {activities.map(act => (
                <option key={act.id} value={act.id}>{act.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onSave} disabled={saving}
          className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-primary/90 transition disabled:opacity-50">
          {isNew ? <Save className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
          {saving ? "Guardando..." : "Guardar"}
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Copy Day Modal ─────────────────────────────────────────
function CopyDayModal({
  targetDay,
  days,
  slotsByDay,
  onCopy,
  onClose,
  copying,
}: {
  targetDay: number;
  days: typeof DAYS;
  slotsByDay: Record<number, BoxScheduleSlot[]>;
  onCopy: (sourceDay: number, replace: boolean) => void;
  onClose: () => void;
  copying: boolean;
}) {
  const [replaceExisting, setReplaceExisting] = useState(true);
  const targetLabel = days.find(d => d.value === targetDay)?.label || "";
  const sourceDays = days.filter(d => d.value !== targetDay && (slotsByDay[d.value]?.length || 0) > 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-border">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Copy className="w-5 h-5 text-primary" />
            Copiar horarios a {targetLabel}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Elegí un día para copiar todos sus turnos
          </p>
        </div>

        <div className="p-6">
          {sourceDays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay otros días con horarios cargados para copiar.
            </p>
          ) : (
            <div className="space-y-2">
              {sourceDays.map(d => {
                const count = slotsByDay[d.value]?.filter(s => s.active).length || 0;
                const firstSlot = slotsByDay[d.value]?.[0];
                const lastSlot = slotsByDay[d.value]?.[slotsByDay[d.value].length - 1];
                const timeRange = firstSlot && lastSlot
                  ? `${firstSlot.start_time.slice(0, 5)} – ${lastSlot.end_time.slice(0, 5)}`
                  : "";

                return (
                  <button
                    key={d.value}
                    disabled={copying}
                    onClick={() => onCopy(d.value, replaceExisting)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{d.short}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{d.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {count} {count === 1 ? "turno" : "turnos"} · {timeRange}
                      </p>
                    </div>
                    <Copy className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {sourceDays.length > 0 && (
            <label className="flex items-center gap-2 mt-4 px-1 cursor-pointer">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={e => setReplaceExisting(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-xs text-muted-foreground">
                Reemplazar horarios existentes de {targetLabel}
              </span>
            </label>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────
export default function HorariosPage() {
  const [slots, setSlots] = useState<BoxScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeTab, setActiveTab] = useState<string>("calendar"); // "calendar" or activity_id
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [addingToDay, setAddingToDay] = useState<number | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotForm, setSlotForm] = useState<EditingSlot>(emptySlot);
  const [saving, setSaving] = useState(false);
  const [copyDayTarget, setCopyDayTarget] = useState<number | null>(null);
  const [copying, setCopying] = useState(false);

  useEffect(() => { loadSlots(); }, []);

  async function loadSlots() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [slotsRes, actRes] = await Promise.all([
      supabase.from("box_schedule_slots").select("*")
        .order("day_of_week").order("start_time"),
      supabase.from("box_activities").select("id, name, color")
        .eq("active", true).order("name"),
    ]);
    setSlots((slotsRes.data || []) as BoxScheduleSlot[]);
    const acts = (actRes.data || []) as Activity[];
    setActivities(acts);

    // Auto-select first activity if no calendar slots exist yet
    if (acts.length > 0 && activeTab === "calendar") {
      setActiveTab(acts[0].id);
    }

    // Auto-expand days with slots
    const daysWithSlots = new Set((slotsRes.data || []).map((s: any) => s.day_of_week as number));
    setExpandedDays(daysWithSlots);
    setLoading(false);
  }

  // ─── Helpers ──────────────────────────────────────────────
  function toggleDay(day: number) {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  }

  function startAddingToDay(day: number) {
    setAddingToDay(day);
    setEditingSlotId(null);

    // Smart auto-fill: continue from last slot of this day
    const activityId = activeTab === "calendar" ? "" : activeTab;
    const daySlots = slots
      .filter(s => s.day_of_week === day && (activeTab === "calendar" || (s as any).activity_id === activeTab))
      .sort((a, b) => a.end_time.localeCompare(b.end_time));

    if (daySlots.length > 0) {
      const lastSlot = daySlots[daySlots.length - 1];
      const lastDuration = diffMinutes(lastSlot.start_time.slice(0, 5), lastSlot.end_time.slice(0, 5));
      const duration = lastDuration > 0 ? lastDuration : 60;
      const newStart = lastSlot.end_time.slice(0, 5);
      const newEnd = addMinutes(newStart, duration);

      setSlotForm({
        start_time: newStart,
        end_time: newEnd,
        max_capacity: lastSlot.max_capacity,
        label: lastSlot.label,
        activity_id: activityId,
      });
    } else {
      setSlotForm({ ...emptySlot, activity_id: activityId });
    }

    setExpandedDays(prev => new Set(prev).add(day));
  }

  function startEditing(slot: BoxScheduleSlot) {
    setEditingSlotId(slot.id);
    setAddingToDay(null);
    setSlotForm({
      id: slot.id,
      start_time: slot.start_time.slice(0, 5),
      end_time: slot.end_time.slice(0, 5),
      max_capacity: slot.max_capacity,
      label: slot.label,
      activity_id: (slot as any).activity_id || "",
    });
  }

  function cancelEditing() {
    setAddingToDay(null);
    setEditingSlotId(null);
    setSlotForm({ ...emptySlot });
  }

  async function saveSlot(dayOfWeek: number) {
    if (!slotForm.label.trim()) { toast.error("Ingresá una etiqueta"); return; }
    if (slotForm.start_time >= slotForm.end_time) { toast.error("Hora inicio debe ser anterior a fin"); return; }
    if (activeTab === "calendar" && !slotForm.activity_id) { toast.error("Seleccioná la actividad de este turno"); return; }

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const activityId = slotForm.activity_id || (activeTab !== "calendar" ? activeTab : null);

    if (editingSlotId) {
      const { error } = await supabase.from("box_schedule_slots").update({
        start_time: slotForm.start_time, end_time: slotForm.end_time,
        max_capacity: slotForm.max_capacity, label: slotForm.label,
        activity_id: activityId,
      }).eq("id", editingSlotId);
      if (error) toast.error("Error: " + error.message);
      else toast.success("Horario actualizado");
    } else {
      const { error } = await supabase.from("box_schedule_slots").insert({
        trainer_id: user.id, day_of_week: dayOfWeek,
        start_time: slotForm.start_time, end_time: slotForm.end_time,
        max_capacity: slotForm.max_capacity, label: slotForm.label,
        activity_id: activityId,
      });
      if (error) toast.error("Error: " + error.message);
      else toast.success("Horario creado");
    }

    // After saving, prepare form for next slot (smart continuation)
    const savedEnd = slotForm.end_time;
    const savedDuration = diffMinutes(slotForm.start_time, slotForm.end_time);
    const savedCapacity = slotForm.max_capacity;
    const savedLabel = slotForm.label;
    const savedActivityId = slotForm.activity_id;

    cancelEditing();
    await loadSlots();
    setSaving(false);

    // Auto-open form for next slot if we were adding (not editing)
    if (!editingSlotId) {
      setAddingToDay(dayOfWeek);
      setSlotForm({
        start_time: savedEnd,
        end_time: addMinutes(savedEnd, savedDuration > 0 ? savedDuration : 60),
        max_capacity: savedCapacity,
        label: savedLabel,
        activity_id: savedActivityId,
      });
      setExpandedDays(prev => new Set(prev).add(dayOfWeek));
    }
  }

  async function toggleSlot(id: string, active: boolean) {
    const supabase = createClient();
    await supabase.from("box_schedule_slots").update({ active: !active }).eq("id", id);
    toast.success(active ? "Horario desactivado" : "Horario activado");
    loadSlots();
  }

  async function deleteSlot(id: string) {
    if (!confirm("¿Eliminar este horario?")) return;
    const supabase = createClient();
    await supabase.from("box_schedule_slots").delete().eq("id", id);
    toast.success("Horario eliminado");
    loadSlots();
  }

  // ─── Copy day function ────────────────────────────────────
  async function copyDaySlots(sourceDay: number, targetDay: number, replace: boolean) {
    setCopying(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCopying(false); return; }

    try {
      // Get source day slots (filtered by current activity if not calendar view)
      const sourceSlots = slots.filter(s =>
        s.day_of_week === sourceDay &&
        (activeTab === "calendar" || (s as any).activity_id === activeTab)
      );

      if (sourceSlots.length === 0) {
        toast.error("No hay horarios para copiar");
        setCopying(false);
        return;
      }

      // Delete existing slots from target day if replacing
      if (replace) {
        const targetSlotIds = slots
          .filter(s =>
            s.day_of_week === targetDay &&
            (activeTab === "calendar" || (s as any).activity_id === activeTab)
          )
          .map(s => s.id);

        if (targetSlotIds.length > 0) {
          const { error } = await supabase
            .from("box_schedule_slots")
            .delete()
            .in("id", targetSlotIds);
          if (error) throw new Error(error.message);
        }
      }

      // Insert copies
      const toInsert = sourceSlots.map(s => ({
        trainer_id: user.id,
        day_of_week: targetDay,
        start_time: s.start_time,
        end_time: s.end_time,
        max_capacity: s.max_capacity,
        label: s.label,
        activity_id: (s as any).activity_id,
        active: true,
      }));

      const { error: insertError } = await supabase
        .from("box_schedule_slots")
        .insert(toInsert);

      if (insertError) throw new Error(insertError.message);

      const sourceLabel = DAYS.find(d => d.value === sourceDay)?.label || "";
      const targetLabel = DAYS.find(d => d.value === targetDay)?.label || "";
      toast.success(`${sourceSlots.length} horarios copiados de ${sourceLabel} a ${targetLabel}`);

      setCopyDayTarget(null);
      await loadSlots();
    } catch (err: any) {
      toast.error("Error al copiar: " + (err.message || ""));
    } finally {
      setCopying(false);
    }
  }

  // ─── Filter & group ──────────────────────────────────────
  const filteredSlots = activeTab === "calendar"
    ? slots
    : slots.filter(s => (s as any).activity_id === activeTab);

  const slotsByDay = filteredSlots.reduce((acc, slot) => {
    const d = slot.day_of_week as number;
    if (!acc[d]) acc[d] = [];
    acc[d].push(slot);
    return acc;
  }, {} as Record<number, BoxScheduleSlot[]>);

  // All slots by day (for copy modal)
  const allSlotsByDay = slots.reduce((acc, slot) => {
    const d = slot.day_of_week as number;
    if (!acc[d]) acc[d] = [];
    acc[d].push(slot);
    return acc;
  }, {} as Record<number, BoxScheduleSlot[]>);

  const currentActivity = activities.find(a => a.id === activeTab);

  // ─── Loading ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-white rounded-2xl animate-pulse border border-border" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Calendar view (all activities) ──────────────────────
  const renderCalendarView = () => {
    const allDaySlots: Record<number, BoxScheduleSlot[]> = {};
    slots.forEach(s => {
      const d = s.day_of_week as number;
      if (!allDaySlots[d]) allDaySlots[d] = [];
      allDaySlots[d].push(s);
    });

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {DAYS.map(({ value, label, short }) => {
          const daySlots = (allDaySlots[value] || []).filter(s => s.active);
          return (
            <div key={value} className="bg-white rounded-2xl border border-border p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">{label}</p>
              {daySlots.length > 0 ? (
                <div className="space-y-2">
                  {daySlots.map(s => {
                    const act = activities.find(a => a.id === (s as any).activity_id);
                    return (
                      <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                        <div className="w-1 h-6 rounded-full shrink-0" style={{ backgroundColor: act?.color || '#6b7280' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">
                            {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {act?.name || 'Sin actividad'} · {s.max_capacity} cupos
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">—</p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Activity schedule editor ────────────────────────────
  const renderActivityEditor = () => (
    <div className="space-y-3">
      {/* Day summary badges */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
        {DAYS.map(({ value, short }) => {
          const count = slotsByDay[value]?.filter(s => s.active).length || 0;
          return (
            <button key={value} onClick={() => {
              toggleDay(value);
              document.getElementById(`day-${value}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
              className={`flex flex-col items-center min-w-[3.5rem] px-2 py-2 rounded-xl border transition-all ${
                count > 0
                  ? "border-current/20 text-current"
                  : "bg-white border-border text-muted-foreground"
              }`}
              style={count > 0 && currentActivity ? { backgroundColor: currentActivity.color + '10', borderColor: currentActivity.color + '30', color: currentActivity.color } : {}}
            >
              <span className="text-[10px] font-bold">{short}</span>
              <span className="text-lg font-bold mt-0.5">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Day accordion */}
      {DAYS.map(({ value: dayValue, label: dayLabel }) => {
        const daySlots = slotsByDay[dayValue] || [];
        const isExpanded = expandedDays.has(dayValue);
        const activeSlots = daySlots.filter(s => s.active);

        return (
          <div key={dayValue} id={`day-${dayValue}`}
            className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            {/* Day header */}
            <button onClick={() => toggleDay(dayValue)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <span className="font-semibold text-foreground">{dayLabel}</span>
                {daySlots.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={currentActivity ? { backgroundColor: currentActivity.color + '15', color: currentActivity.color } : {}}>
                    {activeSlots.length} {activeSlots.length === 1 ? "turno" : "turnos"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                {/* Copy day button */}
                <button
                  onClick={() => setCopyDayTarget(dayValue)}
                  className="p-1.5 rounded-lg transition-colors text-muted-foreground hover:text-primary hover:bg-primary/10"
                  title={`Copiar horarios de otro día a ${dayLabel}`}
                >
                  <Copy className="w-4 h-4" />
                </button>
                {/* Add slot button */}
                <button onClick={() => startAddingToDay(dayValue)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-primary/10"
                  style={currentActivity ? { color: currentActivity.color } : { color: 'var(--primary)' }}
                  title={`Agregar horario al ${dayLabel}`}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </button>

            {/* Expanded */}
            {isExpanded && (
              <div className="border-t border-border">
                {daySlots.length > 0 ? (
                  <div className="divide-y divide-border">
                    {daySlots.map(slot => (
                      <div key={slot.id}>
                        {editingSlotId === slot.id ? (
                          <SlotForm form={slotForm} setForm={setSlotForm}
                            onSave={() => saveSlot(dayValue)} onCancel={cancelEditing}
                            saving={saving} isNew={false} activities={activities} activeTab={activeTab} />
                        ) : (
                          <div className={`flex items-center gap-4 px-5 py-3.5 group ${!slot.active ? "opacity-40" : ""}`}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-1.5 h-8 rounded-full"
                                style={{ backgroundColor: slot.active ? (currentActivity?.color || '#3b82f6') : '#d1d5db' }} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground text-sm">
                                    {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">·</span>
                                  <span className="text-xs text-muted-foreground truncate">{slot.label}</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-xs px-2 py-1 rounded-full font-medium shrink-0"
                              style={currentActivity ? { backgroundColor: currentActivity.color + '15', color: currentActivity.color } : { backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                              {slot.max_capacity} cupos
                            </span>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditing(slot)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => toggleSlot(slot.id, slot.active)}
                                className={`p-1.5 rounded-lg transition-colors ${slot.active ? "text-green-600 hover:bg-green-50" : "text-muted-foreground hover:bg-muted"}`}>
                                <Power className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteSlot(slot.id)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : addingToDay !== dayValue ? (
                  <div className="px-5 py-6 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Sin horarios para {dayLabel}</p>
                    <button onClick={() => startAddingToDay(dayValue)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                      style={{ color: currentActivity?.color || 'var(--primary)' }}>
                      <Plus className="w-3.5 h-3.5" /> Agregar horario
                    </button>
                  </div>
                ) : null}

                {addingToDay === dayValue && (
                  <SlotForm form={slotForm} setForm={setSlotForm}
                    onSave={() => saveSlot(dayValue)} onCancel={cancelEditing}
                    saving={saving} isNew={true} activities={activities} activeTab={activeTab} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/entrenador/tu-box" className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Horarios del Box</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestioná los turnos por actividad
          </p>
        </div>
      </div>

      {/* ─── Activity tabs ──────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 pb-1">
        {activities.map(act => {
          const actSlotCount = slots.filter(s => (s as any).activity_id === act.id && s.active).length;
          return (
            <button key={act.id} onClick={() => { setActiveTab(act.id); cancelEditing(); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                activeTab === act.id
                  ? "shadow-sm border-transparent"
                  : "bg-white border-border text-muted-foreground hover:border-current/20"
              }`}
              style={activeTab === act.id
                ? { backgroundColor: act.color + '15', color: act.color, borderColor: act.color + '30' }
                : {}
              }
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: act.color }} />
              {act.name}
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${activeTab === act.id ? "bg-white/60" : "bg-muted"}`}>
                {actSlotCount}
              </span>
            </button>
          );
        })}

        {/* Calendar view tab */}
        <button onClick={() => { setActiveTab("calendar"); cancelEditing(); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
            activeTab === "calendar"
              ? "bg-foreground text-white border-foreground shadow-sm"
              : "bg-white border-border text-muted-foreground hover:text-foreground"
          }`}>
          <Eye className="w-4 h-4" />
          Vista semanal
        </button>
      </div>

      {/* ─── Content ────────────────────────────────────────── */}
      {activeTab === "calendar" ? renderCalendarView() : renderActivityEditor()}

      {/* No activities warning */}
      {activities.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <Palette className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-amber-900">No tenés actividades creadas</p>
          <p className="text-sm text-amber-700 mt-1">
            Primero creá actividades en{" "}
            <Link href="/entrenador/tu-box/actividades" className="underline font-medium">Actividades</Link>
            {" "}para poder asignarles horarios.
          </p>
        </div>
      )}

      {/* Copy Day Modal */}
      {copyDayTarget !== null && (
        <CopyDayModal
          targetDay={copyDayTarget}
          days={DAYS}
          slotsByDay={activeTab === "calendar" ? allSlotsByDay : slotsByDay}
          onCopy={(sourceDay, replace) => copyDaySlots(sourceDay, copyDayTarget, replace)}
          onClose={() => setCopyDayTarget(null)}
          copying={copying}
        />
      )}
    </div>
  );
}
