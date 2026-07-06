"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Loader2, ChevronDown, ChevronRight,
  Trash2, Search, X, Check, Copy, Flame, Moon,
  Zap, Dumbbell, Heart, Timer, Video as VideoIcon,
  Repeat, Clock, Skull, ClipboardList, Save, Link2, GripVertical,
  Activity, Eye, Users, UserPlus, ArrowRightLeft, UserMinus
} from "lucide-react";
import Link from "next/link";
import { DAY_NAMES, WEEK_TYPE_LABELS, WEEK_TYPE_COLORS } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────
type CfExercise = { id: string; name: string; category: string; default_unit: string; video_url?: string };
type CfBlockExercise = {
  id: string; exercise_id: string; exercise?: CfExercise;
  variant_id?: string; variant?: Variant;
  order: number; reps?: string; unit_override?: string; notes?: string;
  sets?: number;
  levels: CfWodLevel[];
};
type CfWodLevel = { id: string; level: string; value: string; notes?: string };

type Variant = { id: string; name: string };
type Exercise = { id: string; name: string; category: string; muscle_group: string; variants: Variant[] };
type TrainingExercise = {
  id: string; exercise_id: string; variant_id?: string; exercise?: Exercise;
  variant?: Variant; sets: number; reps: string; percentage_1rm?: number;
  weight_target?: number; rpe_target?: number; rest_seconds?: number;
  notes?: string; order: number;
  complex_id?: string; complex_order?: number;
};
type ComplexSet = {
  id: string;
  complex_id: string;
  day_id: string;
  set_number: number;
  percentage_1rm: number | null;
  weight_target?: number | null;
  reps_overrides: {
    training_exercise_id: string;
    reps: string;
    weight_target?: number | null;
    percentage_1rm?: number | null;
  }[];
  rounds?: number;
};

type Block = {
  id: string; name: string; type: string; order: number;
  wod_type?: string; wod_config?: Record<string, unknown>;
  cf_exercises: CfBlockExercise[];
  training_exercises?: TrainingExercise[];
};
type Day = { id: string; day_of_week: number; label: string; order: number; is_rest: boolean; blocks: Block[]; expanded: boolean };
type Week = { id: string; week_number: number; type: string; days: Day[]; expanded: boolean };
type Cycle = { id: string; name: string; total_weeks: number; student_id: string; student_name: string; is_template: boolean };
type Student = { id: string; full_name: string; activeCycle?: { id: string; name: string } };

type BlockItem =
  | { type: "single"; ex: TrainingExercise }
  | { type: "complex"; complexId: string; exs: TrainingExercise[] };

function getBlockItems(exercises: TrainingExercise[]): BlockItem[] {
  const complexMap = new Map<string, TrainingExercise[]>();
  const items: BlockItem[] = [];

  for (const te of exercises) {
    if (!te.complex_id) {
      items.push({ type: "single", ex: te });
    } else {
      if (!complexMap.has(te.complex_id)) complexMap.set(te.complex_id, []);
      complexMap.get(te.complex_id)!.push(te);
    }
  }
  for (const [complexId, exs] of complexMap.entries()) {
    items.push({ type: "complex", complexId, exs });
  }

  return items.sort((a, b) => {
    const aOrder = a.type === "single" ? a.ex.order : Math.min(...a.exs.map(e => e.order));
    const bOrder = b.type === "single" ? b.ex.order : Math.min(...b.exs.map(e => e.order));
    return aOrder - bOrder;
  });
}


const WOD_TYPES = [
  { value: "series", label: "Series clásicas", icon: Dumbbell },
  { value: "emom", label: "EMOM", icon: Timer },
  { value: "amrap", label: "AMRAP", icon: Repeat },
  { value: "for_time", label: "For Time", icon: Clock },
  { value: "tabata", label: "Tabata", icon: Flame },
  { value: "death_by", label: "Death By", icon: Skull },
  { value: "for_load", label: "For Load", icon: Dumbbell },
  { value: "chipper", label: "Chipper", icon: ClipboardList },
] as const;

const BLOCK_TYPES = [
  { value: "warm_up", label: "Warm Up", icon: Heart, color: "text-rose-600 bg-rose-100" },
  { value: "mobility", label: "Movilidad", icon: Activity, color: "text-emerald-600 bg-emerald-100" },
  { value: "fuerza", label: "Fuerza", icon: Dumbbell, color: "text-indigo-600 bg-indigo-100" },
  { value: "skill", label: "Skill", icon: Zap, color: "text-blue-600 bg-blue-100" },
  { value: "metcon", label: "Metcon", icon: Flame, color: "text-orange-600 bg-orange-100" },
] as const;

const CF_CATEGORIES = [
  { value: "gymnastics", label: "Gymnastics" },
  { value: "weightlifting", label: "Weightlifting" },
  { value: "monostructural", label: "Monostructural" },
  { value: "other", label: "Otro" },
];

const LEVELS = ["beginner", "scaled", "rx", "athlete"] as const;
const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  scaled: "Scaled",
  rx: "Rx",
  athlete: "Athlete",
};
const LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-700 border-green-300",
  scaled: "bg-blue-100 text-blue-700 border-blue-300",
  rx: "bg-orange-100 text-orange-700 border-orange-300",
  athlete: "bg-red-100 text-red-700 border-red-300",
};

// ─── WOD Config Fields Component ─────────────────────────────
function WodConfigFields({
  wodType, config, onChange,
}: {
  wodType: string;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const updateField = (key: string, value: unknown) => {
    onChange({ ...config, [key]: value });
  };

  const getEmomConfig = (cfg: Record<string, unknown>) => {
    const everySeconds = (cfg.every_seconds as number) ?? 60;
    const totalMinutes = (cfg.total_minutes as number) ?? 12;

    let everyValue = everySeconds;
    let everyUnit = "seconds";
    if (everySeconds % 60 === 0) {
      everyValue = everySeconds / 60;
      everyUnit = "minutes";
    }

    const rounds = Math.round(totalMinutes / (everySeconds / 60)) || 12;
    return { everyValue, everyUnit, rounds, totalMinutes };
  };

  const handleEmomChange = (everyValue: number, everyUnit: string, rounds: number) => {
    const everySeconds = everyUnit === "minutes" ? everyValue * 60 : everyValue;
    const totalMinutes = Math.round((everySeconds * rounds) / 60);
    onChange({
      ...config,
      every_seconds: everySeconds,
      total_minutes: totalMinutes,
    });
  };

  if (wodType === "series") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Series / Rondas</label>
          <input type="number" value={(config.sets as number) ?? 3}
            onChange={e => updateField("sets", parseInt(e.target.value) || 3)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Descanso (seg)</label>
          <input type="number" value={(config.rest_seconds as number) ?? 60}
            onChange={e => updateField("rest_seconds", parseInt(e.target.value) || 0)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
        </div>
      </div>
    );
  }

  if (wodType === "emom") {
    const { everyValue, everyUnit, rounds, totalMinutes } = getEmomConfig(config);

    return (
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Cada</label>
          <div className="flex gap-1 mt-1">
            <input type="number" value={everyValue}
              onChange={e => handleEmomChange(parseInt(e.target.value) || 1, everyUnit, rounds)}
              className="w-full px-2 py-1.5 rounded-lg border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white text-foreground" />
            <select value={everyUnit}
              onChange={e => handleEmomChange(everyValue, e.target.value, rounds)}
              className="px-1.5 py-1.5 rounded-lg border border-border text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white text-foreground shrink-0">
              <option value="minutes">min</option>
              <option value="seconds">seg</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Rondas / Vueltas</label>
          <input type="number" value={rounds}
            onChange={e => handleEmomChange(everyValue, everyUnit, parseInt(e.target.value) || 1)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white text-foreground" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Duración total</label>
          <div className="mt-3.5 text-sm font-bold text-foreground">
            {totalMinutes} min
          </div>
        </div>
      </div>
    );
  }
  if (wodType === "amrap") {
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground">Time Cap (min)</label>
        <input type="number" value={(config.time_cap_minutes as number) ?? 15}
          onChange={e => updateField("time_cap_minutes", parseInt(e.target.value) || 15)}
          className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
      </div>
    );
  }
  if (wodType === "for_time") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Time Cap (min)</label>
          <input type="number" value={(config.time_cap_minutes as number) ?? 20}
            onChange={e => updateField("time_cap_minutes", parseInt(e.target.value) || 20)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Esquema de reps</label>
          <input type="text" value={(config.rep_scheme as string) ?? "21-15-9"}
            onChange={e => updateField("rep_scheme", e.target.value)}
            placeholder="21-15-9"
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
        </div>
      </div>
    );
  }
  if (wodType === "tabata") {
    return (
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Trabajo (seg)</label>
          <input type="number" value={(config.work_seconds as number) ?? 20}
            onChange={e => updateField("work_seconds", parseInt(e.target.value) || 20)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Descanso (seg)</label>
          <input type="number" value={(config.rest_seconds as number) ?? 10}
            onChange={e => updateField("rest_seconds", parseInt(e.target.value) || 10)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Rondas</label>
          <input type="number" value={(config.rounds as number) ?? 8}
            onChange={e => updateField("rounds", parseInt(e.target.value) || 8)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
        </div>
      </div>
    );
  }
  if (wodType === "death_by") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Reps iniciales</label>
          <input type="number" value={(config.starting_reps as number) ?? 1}
            onChange={e => updateField("starting_reps", parseInt(e.target.value) || 1)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Sumar por ronda</label>
          <input type="number" value={(config.add_per_round as number) ?? 1}
            onChange={e => updateField("add_per_round", parseInt(e.target.value) || 1)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
        </div>
      </div>
    );
  }
  if (wodType === "for_load") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Series</label>
          <input type="number" value={(config.sets as number) ?? 5}
            onChange={e => updateField("sets", parseInt(e.target.value) || 5)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Reps por serie</label>
          <input type="number" value={(config.reps_per_set as number) ?? 3}
            onChange={e => updateField("reps_per_set", parseInt(e.target.value) || 3)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
        </div>
      </div>
    );
  }
  if (wodType === "chipper") {
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground">Time Cap (min)</label>
        <input type="number" value={(config.time_cap_minutes as number) ?? 30}
          onChange={e => updateField("time_cap_minutes", parseInt(e.target.value) || 30)}
          className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
      </div>
    );
  }
  return null;
}

// ─── Main Component ──────────────────────────────────────────
export default function CrossfitCycleEditorPage() {
  const { id: cycleId } = useParams<{ id: string }>();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [cfExercises, setCfExercises] = useState<CfExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Exercise picker
  const [showExPicker, setShowExPicker] = useState<{ blockId: string; dayId: string } | null>(null);
  const [exSearch, setExSearch] = useState("");
  const [exCatFilter, setExCatFilter] = useState("all");

  // Fuerza block modals
  const [pickerBlock, setPickerBlock] = useState<string | null>(null);
  const [complexPickerBlock, setComplexPickerBlock] = useState<string | null>(null);
  
  // UI States
  const [editingBlocks, setEditingBlocks] = useState<Record<string, boolean>>({});
  const [copying, setCopying] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [copyWeekTarget, setCopyWeekTarget] = useState<string | null>(null);
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());

  // Data States
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [complexSets, setComplexSets] = useState<Record<string, ComplexSet[]>>({});
  const [studentOneRMs, setStudentOneRMs] = useState<Record<string, number>>({});

  // New exercise inline creation
  const [showNewEx, setShowNewEx] = useState(false);
  const [newExForm, setNewExForm] = useState({ name: "", category: "weightlifting", default_unit: "reps" });
  const [enabledLevelsExIds, setEnabledLevelsExIds] = useState<Set<string>>(new Set());
  const [previewDay, setPreviewDay] = useState<Day | null>(null);
  const [enabledGenderExIds, setEnabledGenderExIds] = useState<Set<string>>(new Set());

  // Student assignments states
  const [students, setStudents] = useState<Student[]>([]);
  const [showStudents, setShowStudents] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [transferTarget, setTransferTarget] = useState<{ studentId: string; studentCycleId: string } | null>(null);
  const [allCycles, setAllCycles] = useState<{ id: string; name: string; is_template: boolean; training_cycle_enrollments?: { active: boolean; student_id: string }[] }[]>([]);

  // Deactivate student enrollment
  const deactivateStudentCycle = async (cycleId: string, studentId: string, studentName: string) => {
    if (!confirm(`¿Desactivar la suscripción de ${studentName}? El alumno ya no verá esta planificación.`)) return;
    const { error } = await supabase
      .from("training_cycle_enrollments")
      .update({ active: false })
      .eq("cycle_id", cycleId)
      .eq("student_id", studentId);
    if (error) { toast.error("Error al desactivar"); return; }
    toast.success(`Suscripción de ${studentName} desactivada`);
    loadCycle();
  };

  // Transfer student to a different cycle
  const transferStudent = async (studentId: string, oldCycleId: string, newCycleId: string) => {
    const { error } = await supabase.rpc("enroll_student", {
      p_cycle_id: newCycleId,
      p_student_id: studentId,
      p_sync_mode: "SYNC",
      p_enrolled_at: new Date().toISOString()
    });
    if (error) { toast.error("Error al transferir: " + error.message); return; }
    toast.success("Alumno transferido correctamente");
    setTransferTarget(null);
    loadCycle();
  };

  // Assign cycle to students
  const assignToStudents = async (studentIds: string[], syncMode: string) => {
    if (!cycle) return;
    setAssigning(true);

    let successCount = 0;
    const errors: string[] = [];

    for (const studentId of studentIds) {
      const student = students.find(s => s.id === studentId);
      const { error } = await supabase.rpc("enroll_student", {
        p_cycle_id: cycle.id,
        p_student_id: studentId,
        p_sync_mode: syncMode,
        p_enrolled_at: new Date().toISOString(),
      });
      if (error) {
        errors.push(student?.full_name || studentId);
      } else {
        successCount++;
      }
    }

    setAssigning(false);
    setShowAssignModal(false);

    if (successCount > 0) {
      toast.success(`Ciclo asignado a ${successCount} alumno${successCount !== 1 ? "s" : ""} correctamente`);
      loadCycle();
    }
    if (errors.length > 0) {
      toast.error(`Error al asignar a: ${errors.join(", ")}`);
    }
  };

  const managedStudents = students
    .filter(s => s.activeCycle?.id === cycleId)
    .map(s => ({ ...s, cycleId: s.activeCycle!.id, cycleName: s.activeCycle!.name }));

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const toggleBlock = (blockId: string) => {
    setCollapsedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  };

  const supabase = createClient();

  // ─── Load data ──────────────────────────────────────────────
  const loadCycle = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [cycleRes, weeksRes, studentsRes, allCyclesRes] = await Promise.all([
      supabase
        .from("training_cycles")
        .select("id, name, total_weeks, is_template, training_cycle_enrollments(active, student_id, users(full_name))")
        .eq("id", cycleId)
        .single(),
      supabase
        .from("training_weeks")
        .select("id, week_number, type")
        .eq("cycle_id", cycleId)
        .order("week_number"),
      supabase
        .from("users")
        .select(`
          id, full_name, 
          training_cycle_enrollments(
            active, sync_mode, enrolled_at,
            training_cycles(id, name, is_template)
          )
        `)
        .eq("role", "student")
        .order("full_name"),
      supabase
        .from("training_cycles")
        .select("id, name, is_template, training_cycle_enrollments(active, student_id)")
        .order("name"),
    ]);

    const cycleData = cycleRes.data;
    const weeksData = weeksRes.data;
    const studentsData = studentsRes.data;
    const allCyclesData = allCyclesRes.data;

    if (!cycleData) { setLoading(false); return; }

    const enrolls = (cycleData.training_cycle_enrollments || []) as any[];
    const activeEnrolls = enrolls.filter(e => e.active);
    const studentName = activeEnrolls.length === 0
      ? "Sin alumno"
      : activeEnrolls.length === 1
      ? activeEnrolls[0].users?.full_name || "Alumno"
      : `${activeEnrolls.length} alumnos`;

    const studentId = activeEnrolls[0]?.student_id || "";

    setCycle({
      id: cycleData.id,
      name: cycleData.name,
      total_weeks: cycleData.total_weeks,
      student_id: studentId,
      student_name: studentName,
      is_template: cycleData.is_template,
    });

    if (studentsData) {
      setStudents(studentsData.map((s: Record<string, any>) => {
        const enrollments = s.training_cycle_enrollments || [];
        const activeEnrollment = enrollments.find((e: any) => e.active && e.training_cycles && !e.training_cycles.is_template);
        return {
          id: s.id as string,
          full_name: s.full_name as string,
          activeCycle: activeEnrollment ? { 
            id: activeEnrollment.training_cycles.id, 
            name: activeEnrollment.training_cycles.name 
          } : undefined,
        };
      }));
    }

    if (allCyclesData) {
      setAllCycles(allCyclesData as any);
    }

    if (!weeksData) { setLoading(false); return; }

    // Get all day IDs for the cycle to load complex sets
    const { data: allDaysData } = await supabase
      .from("training_days")
      .select("id")
      .in("week_id", weeksData.map(w => w.id));
    const dayIds = (allDaysData || []).map(d => d.id);

    const { data: setsData } = await supabase
      .from("training_complex_sets")
      .select("id, complex_id, day_id, set_number, percentage_1rm, rounds, reps_overrides")
      .in("day_id", dayIds);

    const complexSetsMap: Record<string, ComplexSet[]> = {};
    if (setsData) {
      setsData.forEach(s => {
        if (!complexSetsMap[s.complex_id]) complexSetsMap[s.complex_id] = [];
        complexSetsMap[s.complex_id].push({
          id: s.id,
          complex_id: s.complex_id,
          day_id: s.day_id,
          set_number: s.set_number,
          percentage_1rm: s.percentage_1rm ?? null,
          rounds: s.rounds ?? 1,
          reps_overrides: (s.reps_overrides as any[]) || [],
        });
      });
    }
    setComplexSets(complexSetsMap);

    const weeksList: Week[] = [];
    for (const w of weeksData) {
      const { data: daysData } = await supabase
        .from("training_days")
        .select("id, day_of_week, label, \"order\", is_rest")
        .eq("week_id", w.id)
        .order("order");

      const days: Day[] = [];
      for (const d of (daysData || [])) {
        const { data: blocksData } = await supabase
          .from("training_blocks")
          .select("id, name, type, \"order\", wod_type, wod_config")
          .eq("day_id", d.id)
          .in("type", ["warm_up", "skill", "metcon", "fuerza", "mobility"])
          .order("order");

        const blocks: Block[] = [];
        for (const b of (blocksData || [])) {
          let cfBlockExercises: CfBlockExercise[] = [];
          let trainingExercises: TrainingExercise[] = [];

          if (b.type === "fuerza") {
            const { data: teData } = await supabase
              .from("training_exercises")
              .select("id, exercise_id, variant_id, sets, reps, percentage_1rm, weight_target, rpe_target, rest_seconds, notes, order, complex_id, complex_order, exercises(id, name, category, muscle_group), exercise_variants(id, name)")
              .eq("block_id", b.id)
              .order("order");

            trainingExercises = (teData || []).map(te => ({
              id: te.id,
              exercise_id: te.exercise_id,
              variant_id: te.variant_id ?? undefined,
              exercise: te.exercises ? {
                id: te.exercises.id,
                name: te.exercises.name,
                category: te.exercises.category,
                muscle_group: te.exercises.muscle_group || "",
                variants: [],
              } : undefined,
              variant: te.exercise_variants ? {
                id: te.exercise_variants.id,
                name: te.exercise_variants.name,
              } : undefined,
              sets: te.sets,
              reps: te.reps,
              percentage_1rm: te.percentage_1rm ?? undefined,
              weight_target: te.weight_target ?? undefined,
              rpe_target: te.rpe_target ?? undefined,
              rest_seconds: te.rest_seconds ?? undefined,
              notes: te.notes ?? undefined,
              order: te.order,
              complex_id: te.complex_id ?? undefined,
              complex_order: te.complex_order ?? undefined,
            }));
          } else {
            const { data: cfExData } = await supabase
              .from("cf_block_exercises")
              .select("id, exercise_id, variant_id, \"order\", reps, unit_override, notes, sets, cf_exercises(id, name, category, default_unit, video_url), cf_exercise_variants(id, name)")
              .eq("block_id", b.id)
              .order("order");

            for (const cfe of (cfExData || [])) {
              const { data: levelsData } = await supabase
                .from("cf_wod_levels")
                .select("id, level, value, notes")
                .eq("block_exercise_id", cfe.id);

              cfBlockExercises.push({
                id: cfe.id,
                exercise_id: cfe.exercise_id,
                variant_id: cfe.variant_id ?? undefined,
                exercise: (cfe.cf_exercises as unknown as CfExercise) || undefined,
                variant: cfe.cf_exercise_variants ? {
                  id: cfe.cf_exercise_variants.id,
                  name: cfe.cf_exercise_variants.name,
                } : undefined,
                order: cfe.order,
                reps: cfe.reps ?? undefined,
                unit_override: cfe.unit_override ?? undefined,
                notes: cfe.notes ?? undefined,
                sets: cfe.sets ?? 3,
                levels: (levelsData || []) as CfWodLevel[],
              });
            }
          }

          blocks.push({
            id: b.id,
            name: b.name,
            type: b.type,
            order: b.order,
            wod_type: b.wod_type ?? undefined,
            wod_config: (b.wod_config as Record<string, unknown>) ?? {},
            cf_exercises: cfBlockExercises,
            training_exercises: trainingExercises,
          });
        }

        days.push({
          id: d.id,
          day_of_week: d.day_of_week,
          label: d.label,
          order: d.order,
          is_rest: d.is_rest ?? false,
          blocks,
          expanded: false,
        });
      }

      weeksList.push({
        id: w.id,
        week_number: w.week_number,
        type: w.type,
        days,
        expanded: w.week_number === 1,
      });
    }

    setWeeks(weeksList);

    // Load CF exercises catalog with variants
    const { data: cfExs } = await supabase
      .from("cf_exercises")
      .select("id, name, category, default_unit, video_url, cf_exercise_variants(id, name)")
      .eq("archived", false)
      .order("name");

    setCfExercises((cfExs || []).map(cf => ({
      id: cf.id,
      name: cf.name,
      category: cf.category,
      default_unit: cf.default_unit,
      video_url: cf.video_url ?? undefined,
    })));

    // Load Strength exercises catalog
    const { data: stExs } = await supabase
      .from("exercises")
      .select("id, name, category, muscle_group, exercise_variants(id, name)")
      .eq("archived", false)
      .order("name");

    const cfMapped: Exercise[] = (cfExs || []).map(cf => ({
      id: cf.id,
      name: cf.name,
      category: "crossfit",
      muscle_group: "otro",
      variants: (cf.cf_exercise_variants as any[]) || [],
    }));

    const mergedExercises = [
      ...(stExs || []).map(e => ({
        id: e.id,
        name: e.name,
        category: e.category,
        muscle_group: e.muscle_group || "",
        variants: (e.exercise_variants as any[]) || [],
      })),
      ...cfMapped,
    ].sort((a, b) => a.name.localeCompare(b.name));
    setExercises(mergedExercises);

    setLoading(false);
  }, [cycleId]);

  useEffect(() => { loadCycle(); }, [loadCycle]);

  // ─── Toggle helpers ──────────────────────────────────────────
  const toggleWeek = (weekId: string) => {
    setWeeks(prev => prev.map(w => w.id === weekId ? { ...w, expanded: !w.expanded } : w));
  };
  const toggleDay = (weekId: string, dayId: string) => {
    setWeeks(prev => prev.map(w =>
      w.id === weekId ? { ...w, days: w.days.map(d => d.id === dayId ? { ...d, expanded: !d.expanded } : d) } : w
    ));
  };

  // ─── Add day to week ────────────────────────────────────────
  const addDay = async (weekId: string) => {
    const week = weeks.find(w => w.id === weekId);
    if (!week) return;
    const usedDays = new Set(week.days.map(d => d.day_of_week));
    const nextDay = [1, 2, 3, 4, 5, 6, 7].find(d => !usedDays.has(d));
    if (!nextDay) return toast.error("Ya hay un día para cada día de la semana");

    const { data, error } = await supabase.from("training_days").insert({
      week_id: weekId,
      day_of_week: nextDay,
      label: DAY_NAMES[nextDay] || "Día",
      order: week.days.length,
      is_rest: false,
    }).select().single();

    if (error) return toast.error(error.message);
    setWeeks(prev => prev.map(w =>
      w.id === weekId ? { ...w, days: [...w.days, { ...data, blocks: [], expanded: true }] } : w
    ));
    toast.success(`Día ${DAY_NAMES[nextDay]} agregado`);
  };

  // ─── Toggle rest day ────────────────────────────────────────
  const toggleRestDay = async (weekId: string, dayId: string) => {
    const week = weeks.find(w => w.id === weekId);
    const day = week?.days.find(d => d.id === dayId);
    if (!day) return;
    const newRest = !day.is_rest;
    await supabase.from("training_days").update({ is_rest: newRest }).eq("id", dayId);
    setWeeks(prev => prev.map(w =>
      w.id === weekId ? { ...w, days: w.days.map(d => d.id === dayId ? { ...d, is_rest: newRest } : d) } : w
    ));
  };

  // ─── Add block to day ───────────────────────────────────────
  const addBlock = async (weekId: string, dayId: string, blockType: string) => {
    const week = weeks.find(w => w.id === weekId);
    const day = week?.days.find(d => d.id === dayId);
    if (!day) return;

    let label = "Metcon";
    if (blockType === "warm_up") label = "Warm Up";
    else if (blockType === "mobility") label = "Movilidad";
    else if (blockType === "skill") label = "Skill";
    else if (blockType === "fuerza") label = "Bloque de Fuerza";

    const dbWodType = blockType === "metcon" ? "amrap" : null;
    const { data, error } = await supabase.from("training_blocks").insert({
      day_id: dayId,
      name: label,
      type: blockType,
      order: day.blocks.length,
      wod_type: dbWodType,
      wod_config: blockType === "metcon" ? { time_cap_minutes: 15 } : blockType === "skill" ? { sets: 3, rest_seconds: 60 } : {},
    }).select().single();

    if (error) return toast.error(error.message);
    setWeeks(prev => prev.map(w =>
      w.id === weekId ? {
        ...w, days: w.days.map(d =>
          d.id === dayId ? { ...d, blocks: [...d.blocks, { ...data, cf_exercises: [], training_exercises: [], wod_config: data.wod_config || {} }] } : d
        )
      } : w
    ));
    toast.success(`${label} agregado`);
  };

  // ─── Delete block ───────────────────────────────────────────
  const deleteBlock = async (weekId: string, dayId: string, blockId: string) => {
    await supabase.from("training_blocks").delete().eq("id", blockId);
    setWeeks(prev => prev.map(w =>
      w.id === weekId ? {
        ...w, days: w.days.map(d =>
          d.id === dayId ? { ...d, blocks: d.blocks.filter(b => b.id !== blockId) } : d
        )
      } : w
    ));
  };

  // ─── Update WOD type ───────────────────────────────────────
  const updateWodType = async (weekId: string, dayId: string, blockId: string, wodType: string) => {
    const defaults: Record<string, Record<string, unknown>> = {
      emom: { every_seconds: 60, total_minutes: 12 },
      amrap: { time_cap_minutes: 15 },
      for_time: { time_cap_minutes: 20, rep_scheme: "21-15-9" },
      tabata: { work_seconds: 20, rest_seconds: 10, rounds: 8 },
      death_by: { starting_reps: 1, add_per_round: 1 },
      for_load: { sets: 5, reps_per_set: 3 },
      chipper: { time_cap_minutes: 30 },
    };
    const config = defaults[wodType] || {};
    const dbWodType = wodType === "series" ? null : wodType;

    await supabase.from("training_blocks").update({ wod_type: dbWodType, wod_config: config }).eq("id", blockId);
    setWeeks(prev => prev.map(w =>
      w.id === weekId ? {
        ...w, days: w.days.map(d =>
          d.id === dayId ? {
            ...d, blocks: d.blocks.map(b =>
              b.id === blockId ? { ...b, wod_type: dbWodType, wod_config: config } : b
            )
          } : d
        )
      } : w
    ));
  };

  // ─── Update WOD config ─────────────────────────────────────
  const updateWodConfig = async (weekId: string, dayId: string, blockId: string, config: Record<string, unknown>) => {
    await supabase.from("training_blocks").update({ wod_config: config }).eq("id", blockId);
    setWeeks(prev => prev.map(w =>
      w.id === weekId ? {
        ...w, days: w.days.map(d =>
          d.id === dayId ? {
            ...d, blocks: d.blocks.map(b =>
              b.id === blockId ? { ...b, wod_config: config } : b
            )
          } : d
        )
      } : w
    ));
  };

  // ─── Add exercise to block ─────────────────────────────────
  const addExerciseToBlock = async (blockId: string, exercise: CfExercise) => {
    const week = weeks.find(w => w.days.some(d => d.blocks.some(b => b.id === blockId)));
    const day = week?.days.find(d => d.blocks.some(b => b.id === blockId));
    const block = day?.blocks.find(b => b.id === blockId);
    if (!block || !week || !day) return;

    const { data, error } = await supabase.from("cf_block_exercises").insert({
      block_id: blockId,
      exercise_id: exercise.id,
      order: block.cf_exercises.length,
    }).select().single();

    if (error) return toast.error(error.message);

    setWeeks(prev => prev.map(w =>
      w.id === week.id ? {
        ...w, days: w.days.map(d =>
          d.id === day.id ? {
            ...d, blocks: d.blocks.map(b =>
              b.id === blockId ? {
                ...b, cf_exercises: [...b.cf_exercises, {
                  id: data.id,
                  exercise_id: exercise.id,
                  exercise,
                  order: data.order,
                  levels: [],
                }]
              } : b
            )
          } : d
        )
      } : w
    ));
    setShowExPicker(null);
  };

  // ─── Create new CF exercise ────────────────────────────────
  const createCfExercise = async () => {
    if (!newExForm.name.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("cf_exercises").insert({
      trainer_id: user!.id,
      name: newExForm.name.trim(),
      category: newExForm.category,
      default_unit: newExForm.default_unit,
    }).select().single();

    if (error) return toast.error(error.message);
    setCfExercises(prev => [...prev, data as CfExercise].sort((a, b) => a.name.localeCompare(b.name)));
    setNewExForm({ name: "", category: "weightlifting", default_unit: "reps" });
    setShowNewEx(false);
    toast.success(`"${data.name}" creado`);

    // If picker is open, auto-add to block
    if (showExPicker) {
      addExerciseToBlock(showExPicker.blockId, data as CfExercise);
    }
  };

  // ─── Reorder exercises inside a block ────────────────────────
  const moveExercise = async (weekId: string, dayId: string, blockId: string, cfExId: string, direction: "up" | "down") => {
    const week = weeks.find(w => w.id === weekId);
    const day = week?.days.find(d => d.id === dayId);
    const block = day?.blocks.find(b => b.id === blockId);
    if (!block) return;

    const sortedExs = [...block.cf_exercises].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const idx = sortedExs.findIndex(e => e.id === cfExId);
    if (idx === -1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sortedExs.length) return;

    const currentEx = sortedExs[idx];
    const targetEx = sortedExs[swapIdx];

    const currentOrder = currentEx.order;
    const targetOrder = targetEx.order;

    const { error: err1 } = await supabase.from("cf_block_exercises").update({ order: targetOrder }).eq("id", currentEx.id);
    const { error: err2 } = await supabase.from("cf_block_exercises").update({ order: currentOrder }).eq("id", targetEx.id);

    if (err1 || err2) {
      toast.error("Error al reordenar los ejercicios");
      return;
    }

    setWeeks(prev => prev.map(w =>
      w.id === weekId ? {
        ...w, days: w.days.map(d =>
          d.id === dayId ? {
            ...d, blocks: d.blocks.map(b =>
              b.id === blockId ? {
                ...b, cf_exercises: b.cf_exercises.map(e => {
                  if (e.id === currentEx.id) return { ...e, order: targetOrder };
                  if (e.id === targetEx.id) return { ...e, order: currentOrder };
                  return e;
                }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              } : b
            )
          } : d
        )
      } : w
    ));
  };

  // ─── Delete exercise from block ────────────────────────────
  const deleteBlockExercise = async (weekId: string, dayId: string, blockId: string, cfExId: string) => {
    await supabase.from("cf_block_exercises").delete().eq("id", cfExId);
    setWeeks(prev => prev.map(w =>
      w.id === weekId ? {
        ...w, days: w.days.map(d =>
          d.id === dayId ? {
            ...d, blocks: d.blocks.map(b =>
              b.id === blockId ? { ...b, cf_exercises: b.cf_exercises.filter(e => e.id !== cfExId) } : b
            )
          } : d
        )
      } : w
    ));
  };

  // ─── Update exercise reps ──────────────────────────────────
  const updateExReps = async (cfExId: string, reps: string) => {
    await supabase.from("cf_block_exercises").update({ reps }).eq("id", cfExId);
    setWeeks(prev => prev.map(w => ({
      ...w, days: w.days.map(d => ({
        ...d, blocks: d.blocks.map(b => ({
          ...b, cf_exercises: b.cf_exercises.map(e =>
            e.id === cfExId ? { ...e, reps } : e
          )
        }))
      }))
    })));
  };

  // ─── Update exercise props (unit, notes) ───────────────────
  const updateExProps = async (cfExId: string, updates: Partial<CfBlockExercise>) => {
    await supabase.from("cf_block_exercises").update(updates).eq("id", cfExId);
    setWeeks(prev => prev.map(w => ({
      ...w, days: w.days.map(d => ({
        ...d, blocks: d.blocks.map(b => ({
          ...b, cf_exercises: b.cf_exercises.map(e =>
            e.id === cfExId ? { ...e, ...updates } : e
          )
        }))
      }))
    })));
  };

  const toggleLevelsSwitch = async (cfExId: string, currentLevels: CfWodLevel[]) => {
    const isCurrentlyEnabled = enabledLevelsExIds.has(cfExId) || currentLevels.some(l => l.value.trim() !== "");
    
    if (isCurrentlyEnabled) {
      setEnabledLevelsExIds(prev => {
        const next = new Set(prev);
        next.delete(cfExId);
        return next;
      });
      const levelIds = currentLevels.map(l => l.id);
      if (levelIds.length > 0) {
        await supabase.from("cf_wod_levels").delete().in("id", levelIds);
      }
      setWeeks(prev => prev.map(w => ({
        ...w, days: w.days.map(d => ({
          ...d, blocks: d.blocks.map(b => ({
            ...b, cf_exercises: b.cf_exercises.map(e =>
              e.id === cfExId ? { ...e, levels: [] } : e
            )
          }))
        }))
      })));
    } else {
      setEnabledLevelsExIds(prev => {
        const next = new Set(prev);
        next.add(cfExId);
        return next;
      });
    }
  };

  // ─── Update/create level ───────────────────────────────────
  const updateLevel = async (cfExId: string, level: string, value: string) => {
    const week = weeks.find(w => w.days.some(d => d.blocks.some(b => b.cf_exercises.some(e => e.id === cfExId))));
    if (!week) return;

    const existingLevel = weeks.flatMap(w => w.days).flatMap(d => d.blocks).flatMap(b => b.cf_exercises)
      .find(e => e.id === cfExId)?.levels.find(l => l.level === level);

    if (existingLevel) {
      if (existingLevel.value === value) return; // Skip if unchanged

      if (!value.trim()) {
        await supabase.from("cf_wod_levels").delete().eq("id", existingLevel.id);
        
        // Optimistic UI state update instead of loadCycle()
        setWeeks(prev => prev.map(w => ({
          ...w, days: w.days.map(d => ({
            ...d, blocks: d.blocks.map(b => ({
              ...b, cf_exercises: b.cf_exercises.map(e => 
                e.id === cfExId ? { ...e, levels: e.levels.filter(l => l.id !== existingLevel.id) } : e
              )
            }))
          }))
        })));
      } else {
        await supabase.from("cf_wod_levels").update({ value }).eq("id", existingLevel.id);
        
        // Optimistic UI state update
        setWeeks(prev => prev.map(w => ({
          ...w, days: w.days.map(d => ({
            ...d, blocks: d.blocks.map(b => ({
              ...b, cf_exercises: b.cf_exercises.map(e => 
                e.id === cfExId ? { ...e, levels: e.levels.map(l => l.id === existingLevel.id ? { ...l, value } : l) } : e
              )
            }))
          }))
        })));
      }
    } else if (value.trim()) {
      const { data: newLvl, error } = await supabase.from("cf_wod_levels").insert({
        block_exercise_id: cfExId,
        level,
        value,
      }).select().single();

      if (!error && newLvl) {
        // Optimistic UI state update
        setWeeks(prev => prev.map(w => ({
          ...w, days: w.days.map(d => ({
            ...d, blocks: d.blocks.map(b => ({
              ...b, cf_exercises: b.cf_exercises.map(e => 
                e.id === cfExId ? { ...e, levels: [...e.levels, newLvl as CfWodLevel] } : e
              )
            }))
          }))
        })));
      }
    }
  };

  // ─── Strength block handlers ──────────────────────────────
  const ensureExerciseInStrengthCatalog = async (ex: Exercise): Promise<Exercise> => {
    if (ex.category !== "crossfit") return ex;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const { data: existing } = await supabase
      .from("exercises")
      .select("id, name, category, muscle_group, exercise_variants(id, name)")
      .eq("name", ex.name)
      .eq("trainer_id", user.id)
      .eq("archived", false)
      .maybeSingle();

    if (existing) {
      return {
        id: existing.id,
        name: existing.name,
        category: existing.category,
        muscle_group: existing.muscle_group || "",
        variants: (existing.exercise_variants as any[]) || [],
      };
    }

    const { data: created, error } = await supabase
      .from("exercises")
      .insert({
        name: ex.name,
        category: "prep_fisica",
        muscle_group: "otro",
      })
      .select("id, name, category, muscle_group")
      .single();

    if (error || !created) {
      throw new Error("Error al registrar ejercicio de CrossFit en catálogo de Fuerza: " + error?.message);
    }

    const createdVariants: Variant[] = [];
    if (ex.variants && ex.variants.length > 0) {
      const varsToInsert = ex.variants.map(v => ({
        exercise_id: created.id,
        name: v.name,
      }));
      const { data: dbVars } = await supabase
        .from("exercise_variants")
        .insert(varsToInsert)
        .select("id, name");
      if (dbVars) {
        createdVariants.push(...dbVars);
      }
    }

    const newEx: Exercise = {
      id: created.id,
      name: created.name,
      category: created.category,
      muscle_group: created.muscle_group || "",
      variants: createdVariants,
    };

    setExercises(prev => [...prev, newEx].sort((a, b) => a.name.localeCompare(b.name)));
    return newEx;
  };

  const handleQuickCreateExercise = async (form: { name: string; category: string; variants: string[] }): Promise<Exercise> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const nameUpper = form.name.trim().toUpperCase();

    if (form.category === "crossfit") {
      const { data: created, error } = await supabase
        .from("cf_exercises")
        .insert({
          trainer_id: user.id,
          name: nameUpper,
          category: "weightlifting",
          default_unit: "reps"
        })
        .select()
        .single();

      if (error || !created) {
        throw new Error("Error al crear ejercicio de CrossFit: " + error?.message);
      }

      const createdVariants: Variant[] = [];
      if (form.variants && form.variants.length > 0) {
        const varsToInsert = form.variants.map(v => ({
          exercise_id: created.id,
          name: v.toUpperCase(),
        }));
        const { data: dbVars } = await supabase
          .from("cf_exercise_variants")
          .insert(varsToInsert)
          .select("id, name");
        if (dbVars) {
          createdVariants.push(...dbVars);
        }
      }

      const newEx: Exercise = {
        id: created.id,
        name: created.name,
        category: "crossfit",
        muscle_group: "otro",
        variants: createdVariants,
      };

      setCfExercises(prev => [...prev, {
        id: created.id,
        name: created.name,
        category: created.category,
        default_unit: created.default_unit,
        video_url: created.video_url || undefined,
      }].sort((a, b) => a.name.localeCompare(b.name)));

      setExercises(prev => [...prev, newEx].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(`Ejercicio CrossFit "${nameUpper}" creado con éxito`);
      return newEx;
    } else {
      const { data: created, error } = await supabase
        .from("exercises")
        .insert({
          name: nameUpper,
          category: form.category,
          muscle_group: "otro",
        })
        .select()
        .single();

      if (error || !created) {
        throw new Error("Error al crear ejercicio de Fuerza: " + error?.message);
      }

      const createdVariants: Variant[] = [];
      if (form.variants && form.variants.length > 0) {
        const varsToInsert = form.variants.map(v => ({
          exercise_id: created.id,
          name: v.toUpperCase(),
        }));
        const { data: dbVars } = await supabase
          .from("exercise_variants")
          .insert(varsToInsert)
          .select("id, name");
        if (dbVars) {
          createdVariants.push(...dbVars);
        }
      }

      const newEx: Exercise = {
        id: created.id,
        name: created.name,
        category: created.category,
        muscle_group: created.muscle_group || "",
        variants: createdVariants,
      };

      setExercises(prev => [...prev, newEx].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(`Ejercicio Fuerza "${nameUpper}" creado con éxito`);
      return newEx;
    }
  };

  const handleExerciseSelect = async (ex: Exercise, variant?: Variant) => {
    if (!pickerBlock || mutating) return;
    const block = weeks.flatMap(w => w.days).flatMap(d => d.blocks).find(b => b.id === pickerBlock);
    if (!block) return;

    setMutating(true);
    try {
      const strengthEx = await ensureExerciseInStrengthCatalog(ex);
      
      let targetVariantId: string | null = null;
      if (variant) {
        const matchingVar = strengthEx.variants.find(v => v.name === variant.name);
        if (matchingVar) {
          targetVariantId = matchingVar.id;
        } else {
          const { data: newVar } = await supabase
            .from("exercise_variants")
            .insert({ exercise_id: strengthEx.id, name: variant.name })
            .select("id, name")
            .single();
          if (newVar) {
            strengthEx.variants.push(newVar);
            targetVariantId = newVar.id;
          }
        }
      }

      const isPrep = block.type === "prep_fisica";
      const complexId = isPrep ? block.id : null;
      const complexOrder = isPrep ? (block.training_exercises?.length || 0) : null;

      let dayId = "";
      for (const w of weeks) {
        for (const d of w.days) {
          if (d.blocks.some(b => b.id === pickerBlock)) {
            dayId = d.id;
            break;
          }
        }
        if (dayId) break;
      }

      const { data, error } = await supabase.from("training_exercises").insert({
        block_id: pickerBlock,
        exercise_id: strengthEx.id,
        variant_id: targetVariantId,
        sets: 3,
        reps: isPrep ? "10" : "5",
        percentage_1rm: null,
        order: block.training_exercises?.length || 0,
        complex_id: complexId,
        complex_order: complexOrder,
      }).select().single();

      if (error) { toast.error("Error: " + error.message); return; }

      const existingSets = complexSets[block.id] || [];
      let newComplexSets = [...existingSets];
      if (isPrep && existingSets.length === 0) {
        const { data: dbSets } = await supabase
          .from("training_complex_sets")
          .select("*")
          .eq("complex_id", block.id);

        if (dbSets && dbSets.length > 0) {
          newComplexSets = dbSets.map(s => ({
            id: s.id,
            complex_id: s.complex_id,
            day_id: s.day_id,
            set_number: s.set_number,
            percentage_1rm: s.percentage_1rm ?? null,
            reps_overrides: s.reps_overrides || [],
            rounds: s.rounds ?? 1,
          }));
        } else {
          const defaultSets = [1, 2, 3].map(n => ({
            complex_id: block.id,
            day_id: dayId,
            set_number: n,
            percentage_1rm: null,
            reps_overrides: [],
            rounds: 1,
          }));
          const { data: setsData, error: setsError } = await supabase
            .from("training_complex_sets").insert(defaultSets).select("*");
          if (setsError) {
            const { data: retrySets } = await supabase
              .from("training_complex_sets")
              .select("*")
              .eq("complex_id", block.id);
            if (retrySets && retrySets.length > 0) {
              newComplexSets = retrySets.map(s => ({
                id: s.id,
                complex_id: s.complex_id,
                day_id: s.day_id,
                set_number: s.set_number,
                percentage_1rm: s.percentage_1rm ?? null,
                reps_overrides: s.reps_overrides || [],
                rounds: s.rounds ?? 1,
              }));
            } else {
              toast.error("Error al crear series: " + setsError.message);
            }
          } else if (setsData) {
            newComplexSets = setsData.map(s => ({
              id: s.id,
              complex_id: s.complex_id,
              day_id: s.day_id,
              set_number: s.set_number,
              percentage_1rm: s.percentage_1rm ?? null,
              reps_overrides: s.reps_overrides || [],
              rounds: s.rounds ?? 1,
            }));
          }
        }
      }

      const newEx: TrainingExercise = {
        ...data,
        exercise: strengthEx,
        variant: variant ? { id: targetVariantId!, name: variant.name } : undefined,
      };

      setWeeks(weeks.map(w => ({
        ...w,
        days: w.days.map(d => ({
          ...d,
          blocks: d.blocks.map(b => b.id === pickerBlock ? {
            ...b, training_exercises: [...(b.training_exercises || []), newEx],
          } : b),
        })),
      })));

      if (isPrep) {
        setComplexSets(prev => ({ ...prev, [block.id]: newComplexSets }));
      }

      setCollapsedBlocks(prev => {
        const next = new Set(prev);
        next.add(pickerBlock);
        return next;
      });
      setPickerBlock(null);
    } catch (err: any) {
      toast.error(err.message || "Error al agregar ejercicio");
    } finally {
      setMutating(false);
    }
  };

  const handleComplexCreate = async (items: { ex: Exercise; variant?: Variant }[]) => {
    if (!complexPickerBlock || mutating) return;

    let dayId = "";
    for (const w of weeks) {
      for (const d of w.days) {
        if (d.blocks.some(b => b.id === complexPickerBlock)) { dayId = d.id; break; }
      }
      if (dayId) break;
    }

    const block = weeks.flatMap(w => w.days).flatMap(d => d.blocks).find(b => b.id === complexPickerBlock);
    const complexId = crypto.randomUUID();
    const baseOrder = block?.training_exercises?.length ?? 0;

    setMutating(true);
    try {
      const strengthExercises: Exercise[] = [];
      const targetVariants: (Variant | undefined)[] = [];

      for (const item of items) {
        const strengthEx = await ensureExerciseInStrengthCatalog(item.ex);
        strengthExercises.push(strengthEx);

        let targetVar: Variant | undefined = undefined;
        if (item.variant) {
          const matchingVar = strengthEx.variants.find(v => v.name === item.variant!.name);
          if (matchingVar) {
            targetVar = matchingVar;
          } else {
            const { data: newVar } = await supabase
              .from("exercise_variants")
              .insert({ exercise_id: strengthEx.id, name: item.variant.name })
              .select("id, name")
              .single();
            if (newVar) {
              strengthEx.variants.push(newVar);
              targetVar = newVar;
            }
          }
        }
        targetVariants.push(targetVar);
      }

      const toInsert = strengthExercises.map((ex, i) => ({
        block_id: complexPickerBlock,
        exercise_id: ex.id,
        variant_id: targetVariants[i]?.id || null,
        sets: 3,
        reps: "1",
        percentage_1rm: null,
        order: baseOrder + i,
        complex_id: complexId,
        complex_order: i,
      }));

      const { data, error } = await supabase.from("training_exercises").insert(toInsert).select("*");
      if (error) { toast.error("Error al crear complex: " + error.message); return; }

      const defaultSets = [1, 2, 3].map(n => ({
        complex_id: complexId,
        day_id: dayId,
        set_number: n,
        percentage_1rm: null,
        reps_overrides: [],
        rounds: 1,
      }));
      const { data: setsData, error: setsError } = await supabase
        .from("training_complex_sets").insert(defaultSets).select("*");
      if (setsError) { toast.error("Error al crear series: " + setsError.message); return; }

      const newExs: TrainingExercise[] = (data || []).map((te, i) => ({
        ...te,
        exercise: strengthExercises[i],
        variant: targetVariants[i],
      }));

      const newComplexSets: ComplexSet[] = (setsData || []).map(s => ({
        id: s.id,
        complex_id: s.complex_id,
        day_id: s.day_id,
        set_number: s.set_number,
        percentage_1rm: s.percentage_1rm ?? null,
        reps_overrides: s.reps_overrides || [],
        rounds: s.rounds ?? 1,
      }));

      setWeeks(weeks.map(w => ({
        ...w,
        days: w.days.map(d => ({
          ...d,
          blocks: d.blocks.map(b => b.id === complexPickerBlock ? {
            ...b, training_exercises: [...(b.training_exercises || []), ...newExs],
          } : b),
        })),
      })));
      setComplexSets(prev => ({ ...prev, [complexId]: newComplexSets }));
      setComplexPickerBlock(null);
      const label = items.length === 1 ? "Trepada" : "Complex";
      toast.success(`${label} creado con ${items.length} ejercicio${items.length !== 1 ? "s" : ""}`);
    } catch (err: any) {
      toast.error(err.message || "Error al crear complex");
    } finally {
      setMutating(false);
    }
  };

  const updateExercise = async (blockId: string, exId: string, fieldOrFields: string | Record<string, any>, value?: unknown) => {
    const updates = typeof fieldOrFields === "string" ? { [fieldOrFields]: value } : fieldOrFields;
    setWeeks(prevWeeks => prevWeeks.map(w => ({
      ...w,
      days: w.days.map(d => ({
        ...d,
        blocks: d.blocks.map(b => b.id === blockId ? {
          ...b,
          training_exercises: (b.training_exercises || []).map(te =>
            te.id === exId ? { ...te, ...updates } : te
          ),
        } : b),
      })),
    })));
    await supabase.from("training_exercises").update(updates).eq("id", exId);
  };

  const updateComplexRest = async (blockId: string, complexId: string, value: number | null) => {
    setWeeks(weeks.map(w => ({
      ...w,
      days: w.days.map(d => ({
        ...d,
        blocks: d.blocks.map(b => b.id === blockId ? {
          ...b,
          training_exercises: (b.training_exercises || []).map(te =>
            te.complex_id === complexId ? { ...te, rest_seconds: value ?? undefined } : te
          ),
        } : b),
      })),
    })));
    await supabase.from("training_exercises").update({ rest_seconds: value }).eq("complex_id", complexId);
  };

  const updateComplexSetPercentage = async (setId: string, pct: number | null) => {
    const { error } = await supabase.from("training_complex_sets").update({ percentage_1rm: pct }).eq("id", setId);
    if (error) {
      toast.error("Error al guardar el porcentaje");
      return;
    }
    setComplexSets(prev => {
      const next = { ...prev };
      for (const cid in next) {
        next[cid] = next[cid].map(s => s.id === setId ? { ...s, percentage_1rm: pct } : s);
      }
      return next;
    });
  };

  const updateComplexSetRepsOverride = async (setId: string, overrides: { training_exercise_id: string; reps: string }[]) => {
    await supabase.from("training_complex_sets").update({ reps_overrides: overrides }).eq("id", setId);
    setComplexSets(prev => {
      const next = { ...prev };
      for (const cid in next) {
        next[cid] = next[cid].map(s => s.id === setId ? { ...s, reps_overrides: overrides } : s);
      }
      return next;
    });
  };

  const updateComplexSetRounds = async (setId: string, r: number) => {
    await supabase.from("training_complex_sets").update({ rounds: r }).eq("id", setId);
    setComplexSets(prev => {
      const next = { ...prev };
      for (const cid in next) {
        next[cid] = next[cid].map(s => s.id === setId ? { ...s, rounds: r } : s);
      }
      return next;
    });
  };

  const addComplexSet = async (complexId: string, dayId: string) => {
    if (mutating) return;
    const currentSets = complexSets[complexId] || [];
    const nextNumber = currentSets.length > 0
      ? Math.max(...currentSets.map(s => s.set_number)) + 1
      : 1;
    setMutating(true);
    try {
      const { data, error } = await supabase
        .from("training_complex_sets")
        .insert({ complex_id: complexId, day_id: dayId, set_number: nextNumber, percentage_1rm: null, reps_overrides: [], rounds: 1 })
        .select("*").single();
      if (error) { toast.error("Error al agregar serie"); return; }
      const newSet: ComplexSet = {
        id: data.id, complex_id: data.complex_id, day_id: data.day_id,
        set_number: data.set_number, percentage_1rm: data.percentage_1rm ?? null,
        reps_overrides: data.reps_overrides || [],
        rounds: data.rounds ?? 1,
      };
      setComplexSets(prev => ({ ...prev, [complexId]: [...(prev[complexId] || []), newSet] }));
    } finally {
      setMutating(false);
    }
  };

  const removeComplexSet = async (setId: string) => {
    await supabase.from("training_complex_sets").delete().eq("id", setId);
    setComplexSets(prev => {
      const next = { ...prev };
      for (const cid in next) {
        next[cid] = next[cid].filter(s => s.id !== setId);
      }
      return next;
    });
  };

  const ungroupComplex = async (blockId: string, complexId: string) => {
    const { error } = await supabase
      .from("training_exercises")
      .update({ complex_id: null, complex_order: null })
      .eq("complex_id", complexId);

    if (error) return toast.error("Error al desagrupar");
    await supabase.from("training_complex_sets").delete().eq("complex_id", complexId);

    setWeeks(weeks.map(w => ({
      ...w,
      days: w.days.map(d => ({
        ...d,
        blocks: d.blocks.map(b => b.id === blockId ? {
          ...b,
          training_exercises: (b.training_exercises || []).map(te =>
            te.complex_id === complexId
              ? { ...te, complex_id: undefined, complex_order: undefined }
              : te
          ),
        } : b),
      })),
    })));
    setComplexSets(prev => {
      const next = { ...prev };
      delete next[complexId];
      return next;
    });
    toast.success("Complex desagrupado");
  };

  const deleteStrengthExercise = async (blockId: string, exId: string) => {
    await supabase.from("training_exercises").delete().eq("id", exId);
    setWeeks(weeks.map(w => ({
      ...w,
      days: w.days.map(d => ({
        ...d,
        blocks: d.blocks.map(b => b.id === blockId ? {
          ...b, training_exercises: (b.training_exercises || []).filter(te => te.id !== exId),
        } : b),
      })),
    })));
  };

  // ─── Copiar semana ────────────────────────────────────────
  const copyWeek = async (sourceWeekId: string, targetWeekId: string) => {
    setCopying(true);
    const sourceWeek = weeks.find(w => w.id === sourceWeekId);
    if (!sourceWeek) { setCopying(false); return; }

    try {
      const targetWeek = weeks.find(w => w.id === targetWeekId);
      if (targetWeek && targetWeek.days.length > 0) {
        const { error: delError } = await supabase.from("training_days").delete().eq("week_id", targetWeekId);
        if (delError) throw new Error("Error al limpiar semana destino");
      }

      const newDays: Day[] = [];

      for (const sourceDay of sourceWeek.days) {
        const { data: newDay, error: dayError } = await supabase
          .from("training_days").insert({
            week_id: targetWeekId,
            day_of_week: sourceDay.day_of_week,
            label: sourceDay.label,
            order: sourceDay.order,
            is_rest: sourceDay.is_rest
          }).select().single();
        if (dayError) throw dayError;

        const newBlocks: Block[] = [];

        for (const sourceBlock of sourceDay.blocks) {
          const { data: newBlock, error: blockError } = await supabase
            .from("training_blocks").insert({
              day_id: newDay.id,
              name: sourceBlock.name,
              type: sourceBlock.type,
              order: sourceBlock.order,
              wod_type: sourceBlock.wod_type,
              wod_config: sourceBlock.wod_config,
            }).select().single();
          if (blockError) throw blockError;

          const newCfExercises: CfBlockExercise[] = [];

          for (const sourceEx of sourceBlock.cf_exercises) {
            const { data: newEx, error: exError } = await supabase
              .from("cf_block_exercises").insert({
                block_id: newBlock.id,
                exercise_id: sourceEx.exercise_id,
                order: sourceEx.order,
                reps: sourceEx.reps,
                unit_override: sourceEx.unit_override,
                notes: sourceEx.notes,
              }).select().single();
            if (exError) throw exError;

            const newLevels: CfWodLevel[] = [];
            if (sourceEx.levels && sourceEx.levels.length > 0) {
               const levelsToInsert = sourceEx.levels.map(l => ({
                 block_exercise_id: newEx.id,
                 level: l.level,
                 value: l.value,
                 notes: l.notes
               }));
               const { data: insertedLevels, error: lvlError } = await supabase
                 .from("cf_wod_levels").insert(levelsToInsert).select();
               if (lvlError) throw lvlError;
               newLevels.push(...(insertedLevels as CfWodLevel[]));
            }

            newCfExercises.push({
               id: newEx.id,
               exercise_id: newEx.exercise_id,
               exercise: sourceEx.exercise, // keep populated reference
               order: newEx.order,
               reps: newEx.reps ?? undefined,
               unit_override: newEx.unit_override ?? undefined,
               notes: newEx.notes ?? undefined,
               levels: newLevels
            });
          }
          newBlocks.push({ ...newBlock, cf_exercises: newCfExercises, wod_config: newBlock.wod_config || {} });
        }
        newDays.push({ ...newDay, blocks: newBlocks, expanded: false });
      }

      setWeeks(prev => prev.map(w => w.id === targetWeekId
        ? { ...w, days: newDays.sort((a, b) => a.day_of_week - b.day_of_week) }
        : w
      ));

      toast.success("Semana copiada correctamente");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Error copiando semana");
    } finally {
      setCopying(false);
      setCopyWeekTarget(null);
    }
  };

  // ─── Delete day ─────────────────────────────────────────────
  const deleteDay = async (weekId: string, dayId: string) => {
    await supabase.from("training_days").delete().eq("id", dayId);
    setWeeks(prev => prev.map(w =>
      w.id === weekId ? { ...w, days: w.days.filter(d => d.id !== dayId) } : w
    ));
    toast.success("Día eliminado");
  };

  // ─── Render ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Ciclo no encontrado</p>
        <Link href="/entrenador/ciclos" className="text-orange-600 text-sm font-medium mt-2 inline-block">← Volver</Link>
      </div>
    );
  }

  const filteredExercises = cfExercises.filter(e => {
    if (!exSearch && exCatFilter !== "all" && e.category !== exCatFilter) return false;
    if (exSearch && !e.name.toLowerCase().includes(exSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/entrenador/ciclos" className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-orange-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{cycle.name}</h1>
            <p className="text-sm text-muted-foreground">
              {cycle.is_template ? "Plantilla CF" : cycle.student_name || "Sin alumno"} · {cycle.total_weeks} semanas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-orange-600 hover:border-orange-500/50 transition-colors">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Asignar alumnos</span>
          </button>
        </div>
      </div>

      {/* Alumnos activos — collapsible */}
      {managedStudents.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <button
            onClick={() => setShowStudents(!showStudents)}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors text-left"
          >
            <Users className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-semibold text-foreground flex-1">
              {managedStudents.length} alumno{managedStudents.length !== 1 ? "s" : ""} activo{managedStudents.length !== 1 ? "s" : ""}
            </span>
            {showStudents ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showStudents && (
            <div className="border-t border-border divide-y divide-border">
              {managedStudents.map(student => (
                <div key={student.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-100/60 flex items-center justify-center text-orange-700 font-bold text-sm shrink-0">
                    {getInitials(student.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{student.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{student.cycleName}</p>
                  </div>

                  {/* Transfer button */}
                  {transferTarget?.studentId === student.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 max-w-[160px]"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            transferStudent(student.id, transferTarget.studentCycleId, e.target.value);
                          }
                        }}
                      >
                        <option value="" disabled>Elegir ciclo...</option>
                        {allCycles
                          .filter(c => c.id !== student.cycleId && (c.is_template || !(c.training_cycle_enrollments || []).some(e => e.active)))
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.name}{c.is_template ? " (plantilla)" : ""}</option>
                          ))}
                      </select>
                      <button
                        onClick={() => setTransferTarget(null)}
                        className="p-1 rounded-md text-muted-foreground hover:bg-muted"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setTransferTarget({ studentId: student.id, studentCycleId: student.cycleId })}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Transferir a otro ciclo"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deactivateStudentCycle(student.cycleId, student.id, student.full_name)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Desactivar ciclo del alumno"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weeks */}
      <div className="space-y-4">
        {weeks.map(week => (
          <div key={week.id} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            {/* Week header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/10 bg-muted/10">
              <button onClick={() => toggleWeek(week.id)} className="flex items-center gap-3 flex-1 text-left">
                {week.expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <span className="font-semibold text-foreground">Semana {week.week_number}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${WEEK_TYPE_COLORS[week.type]}`}>
                  {WEEK_TYPE_LABELS[week.type]}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {week.days.length} día{week.days.length !== 1 ? "s" : ""}
                </span>
              </button>

              <div className="flex items-center gap-2">
                {copyWeekTarget === week.id ? (
                  <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                    <span className="text-xs font-medium px-2 text-muted-foreground">Copiar a:</span>
                    <select
                      className="text-xs px-2 py-1 flex-1 rounded border border-border bg-white"
                      disabled={copying}
                      onChange={(e) => {
                        if (e.target.value) copyWeek(week.id, e.target.value);
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Seleccionar...</option>
                      {weeks.filter(w => w.id !== week.id).map(w => (
                        <option key={w.id} value={w.id}>
                          Semana {w.week_number} ({WEEK_TYPE_LABELS[w.type]})
                        </option>
                      ))}
                    </select>
                    <button onClick={() => setCopyWeekTarget(null)}
                      className="p-1 text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {copying && <Loader2 className="w-4 h-4 animate-spin text-orange-600" />}
                  </div>
                ) : (
                  <button onClick={() => setCopyWeekTarget(week.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-orange-600 hover:bg-orange-50 transition-colors flex items-center gap-1.5 text-xs font-medium">
                    <Copy className="w-4 h-4" />
                    Copiar semana
                  </button>
                )}
              </div>
            </div>

            {/* Days */}
            {week.expanded && (
              <div className="border-t border-border">
                {week.days.map(day => (
                  <div key={day.id} className="border-b border-border/50 last:border-b-0">
                    {/* Day header */}
                    <div className="flex items-center gap-2 px-5 py-3 bg-muted/20">
                      <button onClick={() => toggleDay(week.id, day.id)} className="flex items-center gap-2 flex-1 min-w-0">
                        {day.expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                        <span className={`text-sm font-semibold ${day.is_rest ? "text-muted-foreground" : "text-foreground"}`}>
                          {DAY_NAMES[day.day_of_week] || day.label}
                        </span>
                        {day.is_rest && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Descanso</span>}
                        <span className="text-xs text-muted-foreground">{day.blocks.length} bloques</span>
                      </button>
                      <button onClick={() => toggleRestDay(week.id, day.id)}
                        className={`p-1.5 rounded-lg transition-colors ${day.is_rest ? "bg-gray-200 text-gray-600" : "hover:bg-muted text-muted-foreground"}`}
                        title={day.is_rest ? "Quitar descanso" : "Marcar como descanso"}>
                        <Moon className="w-3.5 h-3.5" />
                      </button>
                      {!day.is_rest && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewDay(day);
                          }}
                          className="p-1.5 rounded-lg hover:bg-orange-50 text-muted-foreground hover:text-orange-600 transition-colors shrink-0"
                          title="Ver vista previa de alumno"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => deleteDay(week.id, day.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Eliminar día">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Day content */}
                    {day.expanded && !day.is_rest && (
                      <div className="px-5 py-4 space-y-4">
                        {/* Existing blocks */}
                        {day.blocks.map(block => {
                          const blockMeta = BLOCK_TYPES.find(bt => bt.value === block.type);
                          const Icon = blockMeta?.icon || Flame;

                          if (block.type === "fuerza") {
                            const isCollapsed = collapsedBlocks.has(block.id);
                            const items = getBlockItems(block.training_exercises || []);

                            return (
                              <div key={block.id} className="border border-indigo-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all group">
                                {/* Header */}
                                <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50/50">
                                  <button onClick={() => toggleBlock(block.id)} className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600 shrink-0">
                                      <Dumbbell className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-bold text-foreground truncate">{block.name}</span>
                                    <span className="text-xs text-muted-foreground font-normal">
                                      ({items.length} ejercicios/complex)
                                    </span>
                                  </button>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => setPickerBlock(block.id)}
                                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-2 py-1 rounded-lg border border-indigo-200/50 transition-colors">
                                      + Ejercicio
                                    </button>
                                    <button onClick={() => setComplexPickerBlock(block.id)}
                                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-2 py-1 rounded-lg border border-indigo-200/50 transition-colors">
                                      + Complex/Trepada
                                    </button>
                                    <button onClick={() => deleteBlock(week.id, day.id, block.id)}
                                      className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Body */}
                                {!isCollapsed && (
                                  <div className="p-4 space-y-3 bg-white">
                                    {items.length === 0 ? (
                                      <p className="text-xs text-muted-foreground italic text-center py-4">
                                        Sin ejercicios agregados. Elegí una de las opciones de arriba para empezar.
                                      </p>
                                    ) : (
                                      <div className="space-y-3">
                                        {items.map(item => {
                                          if (item.type === "single") {
                                            const oneRM = studentOneRMs[item.ex.exercise_id];
                                            return (
                                              <ExerciseRow
                                                key={item.ex.id}
                                                ex={item.ex}
                                                blockId={block.id}
                                                onUpdate={updateExercise}
                                                onDelete={deleteStrengthExercise}
                                                oneRM={oneRM}
                                              />
                                            );
                                          } else {
                                            const cSets = complexSets[item.complexId] || [];
                                            return (
                                              <ComplexCard
                                                key={item.complexId}
                                                exs={item.exs}
                                                complexId={item.complexId}
                                                blockId={block.id}
                                                dayId={day.id}
                                                sets={cSets}
                                                onUpdateField={updateExercise}
                                                onUpdateSetPercentage={updateComplexSetPercentage}
                                                onUpdateSetRepsOverride={updateComplexSetRepsOverride}
                                                onUpdateSetRounds={updateComplexSetRounds}
                                                onAddSet={addComplexSet}
                                                onRemoveSet={removeComplexSet}
                                                onUpdateRest={updateComplexRest}
                                                onDelete={deleteStrengthExercise}
                                                onUngroup={ungroupComplex}
                                                studentOneRMs={studentOneRMs}
                                              />
                                            );
                                          }
                                        })}
                                      </div>
                                    )}

                                    {/* Block Notes for Fuerza block */}
                                    <div className="pt-3 border-t border-border/50">
                                      <input
                                        type="text"
                                        defaultValue={block.wod_config?.notes ? String(block.wod_config.notes) : ""}
                                        onBlur={e => updateWodConfig(week.id, day.id, block.id, { ...block.wod_config, notes: e.target.value })}
                                        placeholder="📝 Agregar notas o instrucciones para el alumno sobre este bloque de fuerza..."
                                        className="w-full text-xs px-2.5 py-1.5 rounded border border-border bg-white focus:border-indigo-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-muted-foreground/60 text-foreground"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          if (block.type === "warm_up" || block.type === "mobility") {
                            const isCollapsed = collapsedBlocks.has(block.id);
                            const items = block.cf_exercises || [];
                            const isMobility = block.type === "mobility";

                            return (
                              <div key={block.id} className={`border rounded-xl overflow-hidden bg-white shadow-sm transition-all group ${
                                isMobility ? "border-emerald-200" : "border-rose-200"
                              }`}>
                                {/* Header */}
                                <div className={`flex items-center gap-2 px-4 py-3 ${
                                  isMobility ? "bg-emerald-50/50" : "bg-rose-50/50"
                                }`}>
                                  <button onClick={() => toggleBlock(block.id)} className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                      isMobility ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                                    }`}>
                                      {isMobility ? <Activity className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                                    </div>
                                    <span className="text-sm font-bold text-foreground truncate">{block.name}</span>
                                    <span className="text-xs text-muted-foreground font-normal">
                                      ({items.length} ejercicios)
                                    </span>
                                  </button>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => deleteBlock(week.id, day.id, block.id)}
                                      className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Body */}
                                {!isCollapsed && (
                                  <div className="p-4 space-y-3 bg-white">
                                    <CfWarmUpBlock
                                      block={block}
                                      onAddExercise={() => setShowExPicker({ blockId: block.id, dayId: day.id })}
                                      onDeleteExercise={(cfExId) => deleteBlockExercise(week.id, day.id, block.id, cfExId)}
                                      onUpdateExerciseField={updateExProps}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          }

                          const effectiveWodType = block.wod_type || "series";

                          return (
                            <div key={block.id} className="border border-border rounded-xl overflow-hidden bg-white shadow-sm transition-all group">
                              {/* Summary View */}
                              {editingBlocks[block.id] === false ? (
                                <div className="flex items-center justify-between px-4 py-3 hover:border-primary/30 hover:bg-muted/10">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${blockMeta?.color || "bg-gray-100"}`}>
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-foreground">{block.name}</span>
                                        {(block.type === "metcon" || block.type === "skill") && (
                                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 uppercase tracking-wide flex items-center gap-1.5">
                                            {(() => {
                                              const wtObj = WOD_TYPES.find(wt => wt.value === effectiveWodType);
                                              const WodIcon = wtObj?.icon || Timer;
                                              return <><WodIcon className="w-3 h-3" /> {wtObj?.label || effectiveWodType}</>;
                                            })()}
                                          </span>
                                        )}
                                        {Boolean(block.wod_config?.sets) && (
                                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                            {String(block.wod_config?.sets)} Series
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-0.5 max-w-[200px] sm:max-w-md">
                                        <div className="truncate">
                                          {block.cf_exercises.length === 0 
                                            ? "Sin ejercicios" 
                                            : block.cf_exercises.map(e => e.exercise?.name).join(" + ")}
                                        </div>
                                        {Boolean(block.wod_config?.notes) && (
                                          <div className="mt-0.5 text-xs text-orange-600/80 font-medium truncate flex items-center gap-1">
                                            <span>📝</span> {String(block.wod_config?.notes)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border border-border/50">
                                      {block.cf_exercises.length} ejercicios
                                    </span>
                                    <button onClick={() => setEditingBlocks(prev => ({ ...prev, [block.id]: true }))}
                                      className="text-xs font-medium text-primary hover:underline px-2 py-1 rounded-md transition-colors hover:bg-primary/5">
                                      Editar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Edit View */
                                <div className="flex flex-col">
                                  {/* Block header */}
                                  <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${blockMeta?.color || "bg-gray-100"}`}>
                                      <Icon className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-sm font-semibold text-foreground flex-1 flex items-center gap-2">
                                      {block.name}
                                      {block.type === "warm_up" && (
                                        <div className="flex items-center gap-1.5 px-2">
                                          <input 
                                            type="number" 
                                            min="1"
                                            className="w-12 text-xs px-1.5 py-0.5 rounded border border-border bg-white text-center focus:ring-1 focus:ring-orange-500 focus:outline-none"
                                            value={block.wod_config?.sets ? String(block.wod_config.sets) : ""}
                                            onChange={e => updateWodConfig(week.id, day.id, block.id, { ...block.wod_config, sets: e.target.value })}
                                            placeholder="Series"
                                          />
                                          <span className="text-xs text-muted-foreground font-normal">series</span>
                                        </div>
                                      )}
                                    </span>

                                    {/* WOD type selector for metcon and skill */}
                                    {(block.type === "metcon" || block.type === "skill") && (
                                      <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 text-foreground">
                                          {(() => {
                                            const WodIcon = WOD_TYPES.find(wt => wt.value === effectiveWodType)?.icon || Timer;
                                            return <WodIcon className="w-3.5 h-3.5" />;
                                          })()}
                                        </div>
                                        <select
                                          value={effectiveWodType}
                                          onChange={e => updateWodType(week.id, day.id, block.id, e.target.value)}
                                          className="text-xs pl-8 pr-7 py-1.5 rounded-lg border border-border bg-white font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none appearance-none cursor-pointer">
                                          {WOD_TYPES.map(wt => (
                                            <option key={wt.value} value={wt.value}>{wt.label}</option>
                                          ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-muted-foreground">
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        </div>
                                      </div>
                                    )}

                                    <button onClick={() => deleteBlock(week.id, day.id, block.id)}
                                      className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* WOD config fields */}
                                  {(block.type === "metcon" || block.type === "skill") && (
                                    <div className="px-4 py-3 border-b border-border/50 bg-orange-50/50">
                                      <WodConfigFields
                                        wodType={effectiveWodType}
                                        config={block.wod_config || {}}
                                        onChange={(config) => updateWodConfig(week.id, day.id, block.id, config)}
                                      />
                                    </div>
                                  )}

                                  {/* Exercises */}
                                  <div className="divide-y divide-border/50">
                                    {[...block.cf_exercises].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((cfEx, exIdx, exArr) => {
                                      const isLevelsEnabled = enabledLevelsExIds.has(cfEx.id) || cfEx.levels.some(l => l.value.trim() !== "");
                                      const isGenderEnabled = enabledGenderExIds.has(cfEx.id) || (cfEx.reps?.includes("/") && !isLevelsEnabled);
                                      const [maleVal, femaleVal] = (cfEx.reps || "").split("/");

                                      return (
                                        <div key={cfEx.id} className="px-4 py-3 space-y-2.5">
                                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-100/50 pb-2 md:pb-0 md:border-b-0">
                                            {/* Row 1: Name, Unit Select, Delete (on mobile) */}
                                            <div className="flex items-center justify-between w-full md:w-auto gap-2 min-w-0">
                                              <div className="text-sm font-bold text-foreground flex items-center gap-1.5 flex-wrap min-w-0">
                                                <span className="truncate max-w-[180px] sm:max-w-none">
                                                  {cfEx.exercise?.name || "Ejercicio"}
                                                </span>
                                                <select
                                                  value={cfEx.unit_override || ""}
                                                  onChange={e => updateExProps(cfEx.id, { unit_override: e.target.value })}
                                                  className="text-xs font-normal text-muted-foreground bg-zinc-50 border border-zinc-200 rounded px-1.5 py-0.5 cursor-pointer outline-none focus:ring-1 focus:ring-orange-500"
                                                >
                                                  <option value="">({cfEx.exercise?.default_unit || "reps"})</option>
                                                  <option value="kg">(kg)</option>
                                                  <option value="lb">(lb)</option>
                                                  <option value="%">(%)</option>
                                                  <option value="reps">(reps)</option>
                                                  <option value="cal">(cal)</option>
                                                  <option value="m">(m)</option>
                                                </select>
                                              </div>
                                              
                                              {/* Mobile Delete Button */}
                                              <button onClick={() => deleteBlockExercise(week.id, day.id, block.id, cfEx.id)}
                                                className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0 md:hidden">
                                                <X className="w-4 h-4" />
                                              </button>
                                            </div>

                                            {/* Row 2: Controls toolbar */}
                                            <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap md:flex-nowrap w-full md:w-auto">
                                              <div className="flex items-center gap-3">
                                                {/* Levels Switch Toggle */}
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                  <span className="text-[9px] font-black text-muted-foreground/75 uppercase tracking-wide">Niveles</span>
                                                  <button
                                                    type="button"
                                                    onClick={() => toggleLevelsSwitch(cfEx.id, cfEx.levels)}
                                                    className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                      isLevelsEnabled ? "bg-orange-600" : "bg-gray-200"
                                                    }`}
                                                  >
                                                    <span
                                                      className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                        isLevelsEnabled ? "translate-x-3.5" : "translate-x-0"
                                                      }`}
                                                    />
                                                  </button>
                                                </div>

                                                {/* Gender Switch Toggle */}
                                                {!isLevelsEnabled && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      if (isGenderEnabled) {
                                                        setEnabledGenderExIds(prev => {
                                                          const next = new Set(prev);
                                                          next.delete(cfEx.id);
                                                          return next;
                                                        });
                                                        const [male] = (cfEx.reps || "").split("/");
                                                        updateExReps(cfEx.id, male || "");
                                                      } else {
                                                        setEnabledGenderExIds(prev => {
                                                          const next = new Set(prev);
                                                          next.add(cfEx.id);
                                                          return next;
                                                        });
                                                        const currentReps = cfEx.reps || "";
                                                        if (!currentReps.includes("/")) {
                                                          updateExReps(cfEx.id, `${currentReps}/${currentReps}`);
                                                        }
                                                      }
                                                    }}
                                                    className={`p-1 rounded-lg border transition-all shrink-0 ${
                                                      isGenderEnabled 
                                                        ? "bg-orange-50 border-orange-200 text-orange-600 font-bold" 
                                                        : "border-border text-muted-foreground hover:bg-muted"
                                                    }`}
                                                    title="Dividir peso/reps por género (M/F)"
                                                  >
                                                    <div className="flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5">
                                                      <Mars className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                      <span className="text-muted-foreground/60">/</span>
                                                      <Venus className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                    </div>
                                                  </button>
                                                )}
                                              </div>

                                              <div className="flex items-center gap-3">
                                                {/* Reps / Gender Inputs */}
                                                {!isLevelsEnabled && (
                                                  isGenderEnabled ? (
                                                    <CfGenderRepsInput
                                                      initialReps={cfEx.reps || ""}
                                                      onSave={(newReps) => updateExReps(cfEx.id, newReps)}
                                                    />
                                                  ) : (
                                                    <CfRepsInput
                                                      initialValue={cfEx.reps || ""}
                                                      onSave={(newReps) => updateExReps(cfEx.id, newReps)}
                                                    />
                                                  )
                                                )}

                                                {/* Reorder Buttons */}
                                                <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-lg p-0.5 shrink-0">
                                                  <button
                                                    type="button"
                                                    disabled={exIdx === 0}
                                                    onClick={() => moveExercise(week.id, day.id, block.id, cfEx.id, "up")}
                                                    className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-20 transition-colors"
                                                    title="Subir"
                                                  >
                                                    <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                                                  </button>
                                                  <div className="w-px h-3 bg-zinc-200 self-center" />
                                                  <button
                                                    type="button"
                                                    disabled={exIdx === exArr.length - 1}
                                                    onClick={() => moveExercise(week.id, day.id, block.id, cfEx.id, "down")}
                                                    className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-20 transition-colors"
                                                    title="Bajar"
                                                  >
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>

                                                {/* Desktop Delete Button */}
                                                <button onClick={() => deleteBlockExercise(week.id, day.id, block.id, cfEx.id)}
                                                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0 hidden md:block"
                                                  title="Eliminar ejercicio">
                                                  <X className="w-4 h-4" />
                                                </button>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Levels grid (only shown if levels are enabled!) */}
                                          {isLevelsEnabled && (
                                            <div className="grid grid-cols-4 gap-1.5">
                                              {LEVELS.map(lvl => {
                                                const existing = cfEx.levels.find(l => l.level === lvl);
                                                return (
                                                  <div key={lvl}>
                                                    <label className={`text-[10px] font-bold uppercase tracking-wider ${LEVEL_COLORS[lvl].split(" ")[1]}`}>
                                                      {LEVEL_LABELS[lvl]}
                                                    </label>
                                                    <input
                                                      defaultValue={existing?.value || ""}
                                                      onBlur={e => updateLevel(cfEx.id, lvl, e.target.value)}
                                                      placeholder="—"
                                                      className={`w-full mt-0.5 text-xs px-2 py-1.5 rounded-lg border text-center focus:ring-2 focus:ring-orange-500 focus:outline-none ${LEVEL_COLORS[lvl]}`}
                                                    />
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}

                                          {/* Exercise-level note input */}
                                          <div className="mt-1">
                                            <input
                                              type="text"
                                              defaultValue={cfEx.notes || ""}
                                              onBlur={e => updateExProps(cfEx.id, { notes: e.target.value })}
                                              placeholder="Nota o indicación para este ejercicio (opcional)..."
                                              className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-muted/10 focus:bg-background focus:ring-2 focus:ring-orange-500 focus:outline-none text-muted-foreground placeholder:text-muted-foreground/60 transition-all"
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {/* Add exercise button */}
                                    <button
                                      onClick={() => setShowExPicker({ blockId: block.id, dayId: day.id })}
                                      className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors">
                                      <Plus className="w-4 h-4" />
                                      Agregar ejercicio
                                    </button>
                                  </div>

                                  {/* Block Notes */}
                                  <div className="px-4 py-3 bg-muted/5 border-t border-border/50">
                                    <input
                                      type="text"
                                      defaultValue={block.wod_config?.notes ? String(block.wod_config.notes) : ""}
                                      onBlur={e => updateWodConfig(week.id, day.id, block.id, { ...block.wod_config, notes: e.target.value })}
                                      placeholder="📝 Agregar notas o instrucciones para el alumno sobre este bloque..."
                                      className="w-full text-xs px-2.5 py-1.5 rounded border border-border bg-white focus:border-orange-300 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-muted-foreground/60"
                                    />
                                  </div>
                                  
                                  {/* Guardar bloque button */}
                                  <div className="px-4 py-2.5 bg-muted/10 border-t border-border/50 flex justify-end">
                                    <button onClick={() => setEditingBlocks(prev => ({ ...prev, [block.id]: false }))}
                                      className="px-4 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition-colors shadow-sm flex items-center gap-1.5">
                                      <Check className="w-3.5 h-3.5" /> Guardar bloque
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Add block buttons */}
                        <div className="flex gap-2 flex-wrap">
                          {BLOCK_TYPES.map(bt => (
                            <button key={bt.value} onClick={() => addBlock(week.id, day.id, bt.value)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-border text-xs font-medium text-muted-foreground transition-colors ${
                                bt.value === "fuerza"
                                  ? "hover:border-indigo-400 hover:text-indigo-600"
                                  : bt.value === "skill"
                                  ? "hover:border-blue-400 hover:text-blue-600"
                                  : "hover:border-orange-400 hover:text-orange-600"
                              }`}>
                              <bt.icon className="w-3.5 h-3.5" />
                              + {bt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add day button */}
                <button onClick={() => addDay(week.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors border-t border-border/50">
                  <Plus className="w-4 h-4" />
                  Agregar día
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Exercise Picker Modal */}
      {showExPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] shadow-2xl flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">Agregar ejercicio CF</h3>
              <button onClick={() => { setShowExPicker(null); setShowNewEx(false); }} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-3 space-y-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={exSearch} onChange={e => setExSearch(e.target.value)}
                    placeholder="Buscar ejercicio..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
                </div>
                <button onClick={() => {
                  setShowNewEx(!showNewEx);
                  if (!showNewEx) {
                    setNewExForm(f => ({ ...f, name: exSearch.trim().toUpperCase() }));
                  }
                }}
                  className={`p-2.5 rounded-xl border transition-colors ${showNewEx ? "bg-orange-100 border-orange-300 text-orange-600" : "border-border hover:border-orange-400"}`}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Category filter */}
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setExCatFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${exCatFilter === "all" ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"}`}>
                  Todos
                </button>
                {CF_CATEGORIES.map(cat => (
                  <button key={cat.value} onClick={() => setExCatFilter(cat.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${exCatFilter === cat.value ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"}`}>
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* New exercise form */}
              {showNewEx && (
                <div className="bg-orange-50 rounded-xl p-3 space-y-2 border border-orange-200">
                  <input value={newExForm.name} onChange={e => setNewExForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nombre del ejercicio..."
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
                  <div className="flex gap-2">
                    <select value={newExForm.category} onChange={e => setNewExForm(f => ({ ...f, category: e.target.value }))}
                      className="flex-1 px-2 py-1.5 rounded-lg border border-border text-xs focus:outline-none">
                      {CF_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <select value={newExForm.default_unit} onChange={e => setNewExForm(f => ({ ...f, default_unit: e.target.value }))}
                      className="flex-1 px-2 py-1.5 rounded-lg border border-border text-xs focus:outline-none">
                      {["reps", "cals", "meters", "kg", "lbs", "seconds"].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <button onClick={createCfExercise}
                      className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-medium hover:bg-orange-700">
                      Crear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Exercise list */}
            <div className="flex-1 overflow-y-auto">
              {filteredExercises.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {filteredExercises.map(ex => (
                    <button key={ex.id} onClick={() => addExerciseToBlock(showExPicker.blockId, ex)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-orange-50 transition-colors text-left">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{ex.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{ex.category} · {ex.default_unit}</p>
                      </div>
                      <Plus className="w-4 h-4 text-orange-600 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm space-y-4">
                  <p>
                    {cfExercises.length === 0
                      ? "No tenés ejercicios CF. Creá uno nuevo aquí ↓"
                      : "Sin resultados."}
                  </p>
                  {exSearch.trim() && (
                    <button
                      onClick={() => {
                        setShowNewEx(true);
                        setNewExForm(f => ({ ...f, name: exSearch.trim().toUpperCase() }));
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-orange-500/30 text-orange-600 text-xs font-bold bg-orange-50 hover:bg-orange-100 transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Crear "{exSearch.trim().toUpperCase()}" rápido
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fuerza Exercise Picker Modal */}
      {pickerBlock && (
        <ExercisePicker
          exercises={exercises}
          onCreateExercise={handleQuickCreateExercise}
          onSelect={handleExerciseSelect}
          onClose={() => setPickerBlock(null)}
          loading={mutating}
        />
      )}

      {/* Fuerza Complex Picker Modal */}
      {complexPickerBlock && (
        <ComplexPicker
          exercises={exercises}
          onCreateExercise={handleQuickCreateExercise}
          onConfirm={handleComplexCreate}
          onClose={() => setComplexPickerBlock(null)}
          loading={mutating}
        />
      )}

      {/* Modal de Vista Previa de Alumno */}
      {previewDay && (
        <DayPreviewModal
          day={previewDay}
          cycleName={cycle?.name || "Ciclo"}
          weekNumber={weeks.find(w => w.days.some(d => d.id === previewDay.id))?.week_number || 1}
          complexSets={complexSets}
          onClose={() => setPreviewDay(null)}
        />
      )}

      {/* Modal de Asignación de Alumnos */}
      {showAssignModal && cycle && (
        <AssignStudentsModal
          students={students}
          cycleName={cycle.name}
          onAssign={assignToStudents}
          onClose={() => setShowAssignModal(false)}
          assigning={assigning}
        />
      )}
    </div>
  );
}


// ─── Reps Input Wrappers to Avoid Key Lag ───────────────────────────────────
function CfRepsInput({
  initialValue,
  onSave,
  placeholder = "Reps",
  className = "w-20 text-xs px-2 py-1 rounded-lg border border-border text-center focus:ring-2 focus:ring-orange-500 focus:outline-none font-semibold bg-white text-foreground"
}: {
  initialValue: string;
  onSave: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [val, setVal] = useState(initialValue);

  useEffect(() => {
    setVal(initialValue);
  }, [initialValue]);

  return (
    <input
      type="text"
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => {
        if (val !== initialValue) {
          onSave(val);
        }
      }}
      onKeyDown={e => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}

function CfGenderRepsInput({
  initialReps,
  onSave,
}: {
  initialReps: string;
  onSave: (val: string) => void;
}) {
  const [male, setMale] = useState("");
  const [female, setFemale] = useState("");

  useEffect(() => {
    const [m, f] = (initialReps || "").split("/");
    setMale(m || "");
    setFemale(f || "");
  }, [initialReps]);

  const handleBlur = (newMale: string, newFemale: string) => {
    const joined = `${newMale}/${newFemale}`;
    if (joined !== initialReps) {
      onSave(joined);
    }
  };

  return (
    <div className="flex items-center gap-1 shrink-0">
      <div className="relative flex items-center">
        <span className="absolute left-2 text-[10px] font-black text-blue-500">♂</span>
        <input
          type="text"
          value={male}
          onChange={e => setMale(e.target.value)}
          onBlur={() => handleBlur(male, female)}
          onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
          placeholder="M"
          className="w-14 pl-4 pr-1 py-1 text-xs rounded-lg border border-border text-center focus:ring-2 focus:ring-orange-500 focus:outline-none font-semibold bg-white text-foreground"
        />
      </div>
      <span className="text-muted-foreground/50 text-xs font-bold">/</span>
      <div className="relative flex items-center">
        <span className="absolute left-2 text-[10px] font-black text-rose-500">♀</span>
        <input
          type="text"
          value={female}
          onChange={e => setFemale(e.target.value)}
          onBlur={() => handleBlur(male, female)}
          onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
          placeholder="F"
          className="w-14 pl-4 pr-1 py-1 text-xs rounded-lg border border-border text-center focus:ring-2 focus:ring-orange-500 focus:outline-none font-semibold bg-white text-foreground"
        />
      </div>
    </div>
  );
}

// ─── Inline Mars and Venus SVGs ─────────────────────────────────────────────
const Mars = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 3h5v5" />
    <path d="M21 3l-7.5 7.5" />
    <circle cx="10" cy="14" r="5" />
  </svg>
);

const Venus = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 15v7" />
    <path d="M9 19h6" />
    <circle cx="12" cy="9" r="6" />
  </svg>
);

// ─── Day Preview Modal (Blackboard style for CrossFit & Strength) ──────────
function DayPreviewModal({
  day,
  cycleName,
  weekNumber,
  complexSets,
  onClose,
}: {
  day: Day;
  cycleName: string;
  weekNumber: number;
  complexSets: Record<string, ComplexSet[]>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5252] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#ff5252] font-mono">
              Pizarra Alumno
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-zinc-100 font-sans selection:bg-[#ff5252]/30">
          <div className="space-y-1 pb-4 border-b border-zinc-800">
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">
              {cycleName}
            </h2>
            <p className="text-sm text-zinc-400 font-semibold">
              Semana {weekNumber} · {DAY_NAMES[day.day_of_week]} — {day.label}
            </p>
          </div>

          <div className="space-y-8">
            {day.blocks.map(block => {
              if (block.type === "fuerza") {
                const blockItems = getBlockItems(block.training_exercises || []);
                if (blockItems.length === 0) return null;

                return (
                  <div key={block.id} className="space-y-4">
                    <h3 className="text-lg font-black text-[#ff5252] uppercase tracking-widest border-b border-zinc-900 pb-1 flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-primary shrink-0" />
                      <span>{block.name}</span>
                    </h3>
                    
                    <div className="space-y-4">
                      {blockItems.map((item) => {
                        if (item.type === "single") {
                          const te = item.ex;
                          const hasPct = te.percentage_1rm !== undefined && te.percentage_1rm !== null;
                          const hasWt = te.weight_target !== undefined && te.weight_target !== null;
                          
                          return (
                            <div
                              key={te.id}
                              className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2 hover:border-zinc-800 transition-colors"
                            >
                              <h4 className="text-white font-extrabold text-base leading-tight">
                                {te.exercise?.name || "Ejercicio"}
                                {te.variant?.name && (
                                  <span className="text-primary font-bold ml-1.5">— {te.variant.name}</span>
                                )}
                              </h4>
                              
                              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-400">
                                <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300">
                                  {te.sets} series × {te.reps} reps
                                </span>
                                {hasPct && (
                                  <span className="px-2 py-0.5 bg-zinc-800 rounded text-primary font-bold">
                                    {te.percentage_1rm}% 1RM
                                  </span>
                                )}
                                {hasWt && (
                                  <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300 font-bold">
                                    {te.weight_target} kg
                                  </span>
                                )}
                                {te.rest_seconds && (
                                  <span className="text-zinc-500 font-normal">
                                    Descanso: {te.rest_seconds}s
                                  </span>
                                )}
                              </div>

                              {te.notes && (
                                <p className="text-zinc-500 text-xs italic font-medium mt-1 leading-relaxed border-l border-zinc-800 pl-2">
                                  * {te.notes}
                                </p>
                              )}
                            </div>
                          );
                        } else {
                          const cSets = (complexSets[item.complexId] || []).sort((a, b) => a.set_number - b.set_number);
                          const complexTitle = item.exs.map(te => {
                            return te.variant?.name ? `${te.exercise?.name} (${te.variant.name})` : te.exercise?.name;
                          }).join(" + ");

                          return (
                            <div
                              key={item.complexId}
                              className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-3 hover:border-zinc-800 transition-colors"
                            >
                              <div className="space-y-1">
                                <h4 className="text-white font-extrabold text-base leading-tight">
                                  {complexTitle}
                                </h4>
                                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
                                  <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300">
                                    Complex ({cSets.length} series)
                                  </span>
                                </div>
                              </div>

                              {item.exs.some(te => te.notes) && (
                                <div className="space-y-1 border-l border-zinc-800 pl-2">
                                  {item.exs.filter(te => te.notes).map(te => (
                                    <p key={te.id} className="text-zinc-500 text-xs italic font-medium">
                                      * {te.exercise?.name}: {te.notes}
                                    </p>
                                  ))}
                                </div>
                              )}

                              <div className="space-y-1.5 pt-1">
                                {cSets.map((s) => {
                                  const repsText = item.exs.map(te => {
                                    const ov = s.reps_overrides.find(o => o.training_exercise_id === te.id);
                                    return ov ? ov.reps : te.reps;
                                  }).join("+");

                                  const targetLoad = s.percentage_1rm 
                                    ? `@ ${s.percentage_1rm}%` 
                                    : s.weight_target 
                                      ? `@ ${s.weight_target} kg` 
                                      : "";
                                  const roundsText = s.rounds && s.rounds > 1 ? ` (${s.rounds} rondas)` : "";

                                  return (
                                    <div key={s.id} className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                                      <span className="text-[#ff5252] font-bold font-sans">S{s.set_number}:</span>
                                      <span>{repsText} {targetLoad}{roundsText}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                      })}
                    </div>

                    {block.wod_config?.notes && (
                      <div className="p-3 bg-zinc-900/30 border border-zinc-800/40 rounded-xl text-xs text-zinc-400 italic">
                        * Notas: {block.wod_config.notes}
                      </div>
                    )}
                  </div>
                );
              } else {
                const exercises = block.cf_exercises || [];
                if (exercises.length === 0) return null;

                const isWarmUp = block.type === "warm_up";
                const isMobility = block.type === "mobility";
                const isSkill = block.type === "skill";

                const typeColor = isWarmUp 
                  ? "text-rose-500" 
                  : isMobility 
                  ? "text-emerald-500" 
                  : isSkill 
                  ? "text-blue-500" 
                  : "text-orange-500";

                const TypeIcon = isWarmUp 
                  ? Heart 
                  : isMobility 
                  ? Activity 
                  : isSkill 
                  ? Zap 
                  : Flame;

                const showWodConfig = block.type === "metcon" || block.type === "skill";
                const wodTypeLabel = block.wod_type ? block.wod_type.toUpperCase() : "SERIES";

                return (
                  <div key={block.id} className="space-y-4">
                    <div className="border-b border-zinc-900 pb-1 flex items-center justify-between">
                                      <h3 className={`text-lg font-black ${typeColor} uppercase tracking-widest flex items-center gap-2`}>
                                        <TypeIcon className="w-4 h-4 shrink-0" />
                                        <span>{block.name}</span>
                                      </h3>
                                      {showWodConfig && (
                                        <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-md tracking-wider ${
                                          block.wod_type === "amrap" 
                                            ? "bg-rose-600 text-white animate-pulse" 
                                            : block.wod_type === "emom" 
                                            ? "bg-blue-600 text-white" 
                                            : block.wod_type === "for_time" 
                                            ? "bg-amber-600 text-white" 
                                            : "bg-zinc-800 text-zinc-300"
                                        }`}>
                                          {wodTypeLabel}
                                        </span>
                                      )}
                                    </div>

                                    {showWodConfig && (
                                      <div className="text-xs text-zinc-400 font-medium bg-zinc-900/40 border border-zinc-800/40 rounded-xl p-3 flex flex-wrap gap-x-4 gap-y-1">
                                        {block.wod_type === "amrap" && block.wod_config?.time_cap_minutes && (
                                          <span>Time Cap: {block.wod_config.time_cap_minutes} min</span>
                                        )}
                                        {block.wod_type === "emom" && (
                                          <>
                                            {block.wod_config?.every_seconds && (
                                              <span>
                                                Cada: {block.wod_config.every_seconds % 60 === 0 
                                                  ? `${block.wod_config.every_seconds / 60} min` 
                                                  : `${block.wod_config.every_seconds} seg`}
                                              </span>
                                            )}
                                            {block.wod_config?.every_seconds && block.wod_config?.total_minutes && (
                                              <span>
                                                Rondas: {Math.round((block.wod_config.total_minutes as number) / ((block.wod_config.every_seconds as number) / 60))}
                                              </span>
                                            )}
                                            {block.wod_config?.total_minutes && <span>Duración: {block.wod_config.total_minutes} min</span>}
                                          </>
                                        )}
                                        {block.wod_type === "for_time" && (
                                          <>
                                            {block.wod_config?.time_cap_minutes && <span>Time Cap: {block.wod_config.time_cap_minutes} min</span>}
                                            {block.wod_config?.rep_scheme && <span>Esquema: {block.wod_config.rep_scheme}</span>}
                                          </>
                                        )}
                                        {block.wod_type === "tabata" && (
                                          <>
                                            {block.wod_config?.work_seconds && <span>Trabajo: {block.wod_config.work_seconds}s</span>}
                                            {block.wod_config?.rest_seconds && <span>Descanso: {block.wod_config.rest_seconds}s</span>}
                                            {block.wod_config?.rounds && <span>Rondas: {block.wod_config.rounds}</span>}
                                          </>
                                        )}
                                        {block.wod_type === "death_by" && (
                                          <>
                                            {block.wod_config?.starting_reps && <span>Inicio: {block.wod_config.starting_reps} reps</span>}
                                            {block.wod_config?.add_per_round && <span>Sumar: +{block.wod_config.add_per_round} reps/rd</span>}
                                          </>
                                        )}
                                        {block.wod_type === "for_load" && (
                                          <>
                                            {block.wod_config?.sets && <span>Series: {block.wod_config.sets}</span>}
                                            {block.wod_config?.reps_per_set && <span>Reps/serie: {block.wod_config.reps_per_set}</span>}
                                          </>
                                        )}
                                        {block.wod_type === "chipper" && block.wod_config?.time_cap_minutes && (
                                          <span>Time Cap: {block.wod_config.time_cap_minutes} min</span>
                                        )}
                                        {(!block.wod_type || block.wod_type === "series") && block.wod_config?.sets && (
                                          <>
                                            <span>Series: {block.wod_config.sets}</span>
                                            {block.wod_config?.rest_seconds && <span>Descanso: {block.wod_config.rest_seconds}s</span>}
                                          </>
                                        )}
                                      </div>
                                    )}

                                    <div className="space-y-4">
                                      {exercises.map((cfEx) => {
                                        const hasLevels = cfEx.levels && cfEx.levels.some(l => l.value.trim() !== "");
                                        
                                        return (
                                          <div
                                            key={cfEx.id}
                                            className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2 hover:border-zinc-800 transition-colors"
                                          >
                                            <h4 className="text-white font-extrabold text-base leading-tight">
                                              {cfEx.exercise?.name || "Ejercicio"}
                                              {cfEx.variant?.name && (
                                                <span className="text-primary font-bold ml-1.5">— {cfEx.variant.name}</span>
                                              )}
                                            </h4>

                                            {!hasLevels ? (
                                              (cfEx.reps || cfEx.sets) && (() => {
                                                const repsStr = cfEx.reps || "—";
                                                const isGenderSplit = repsStr.includes("/");
                                                
                                                return (
                                                  <div className="text-xs font-semibold text-zinc-400 flex items-center gap-1">
                                                    <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300 font-mono flex items-center gap-1">
                                                      {(() => {
                                                        const showSets = block.type === "warm_up" || block.type === "mobility" || !block.wod_type || block.wod_type === "series";
                                                        return showSets && cfEx.sets ? `${cfEx.sets} series × ` : "";
                                                      })()}
                                                      {isGenderSplit ? (
                                                        (() => {
                                                          const [male, female] = repsStr.split("/");
                                                          return (
                                                            <span className="inline-flex items-center gap-1">
                                                              <span className="text-blue-400 font-black">♂</span>
                                                              <span className="text-zinc-200">{male || "—"}</span>
                                                              <span className="text-zinc-500">/</span>
                                                              <span className="text-rose-400 font-black">♀</span>
                                                              <span className="text-zinc-200">{female || "—"}</span>
                                                            </span>
                                                          );
                                                        })()
                                                      ) : (
                                                        repsStr
                                                      )}
                                                      {" "}{cfEx.unit_override || cfEx.exercise?.default_unit || "reps"}
                                                    </span>
                                                  </div>
                                                );
                                              })()
                                            ) : (
                                              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                                                {cfEx.levels.filter(l => l.value.trim() !== "").map(lvl => (
                                                  <div key={lvl.id} className="flex justify-between items-center bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800/60">
                                                    <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                                                      {lvl.level}
                                                    </span>
                                                    <span className="font-mono text-zinc-200">
                                                      {lvl.value}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}

                            {cfEx.notes && (
                              <p className="text-zinc-500 text-xs italic font-medium mt-1 leading-relaxed border-l border-zinc-800 pl-2">
                                * {cfEx.notes}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {block.wod_config?.notes && (
                      <div className="p-3 bg-zinc-900/30 border border-zinc-800/40 rounded-xl text-xs text-zinc-400 italic">
                        * Notas: {block.wod_config.notes}
                      </div>
                    )}
                  </div>
                );
              }
            })}
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-white transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Constants & Subcomponents for Strength Blocks ────────────
const STRENGTH_CATEGORY_TABS = [
  { value: "all", label: "Todos" },
  { value: "fuerza", label: "Fuerza" },
  { value: "prep_fisica", label: "Prep. Física" },
  { value: "accesorio", label: "Accesorio" },
  { value: "crossfit", label: "Cross/Funcional" },
];

function CfWarmUpBlock({
  block,
  onAddExercise,
  onDeleteExercise,
  onUpdateExerciseField,
}: {
  block: Block;
  onAddExercise: () => void;
  onDeleteExercise: (cfExId: string) => void;
  onUpdateExerciseField: (cfExId: string, fields: Partial<CfBlockExercise>) => void;
}) {
  const sortedExs = [...(block.cf_exercises || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const isMobility = block.type === "mobility";

  return (
    <div className={`border-2 rounded-2xl overflow-hidden ${isMobility ? "border-emerald-500/35 bg-emerald-50/5" : "border-orange-500/35 bg-orange-50/5"}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${isMobility ? "bg-emerald-500/10 border-emerald-500/20" : "bg-orange-500/10 border-orange-500/20"}`}>
        {isMobility ? (
          <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
        ) : (
          <Heart className="w-4 h-4 text-rose-600 shrink-0" />
        )}
        <span className={`text-xs font-bold uppercase tracking-wide flex-1 ${isMobility ? "text-emerald-700" : "text-orange-700"}`}>
          {isMobility ? "Movilidad" : "Entrada en Calor / Movilidad"}
        </span>
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${isMobility ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
          {sortedExs.length} Ejercicios
        </span>
      </div>

      <div className="p-4 space-y-4">
        <div className={`divide-y ${isMobility ? "divide-emerald-500/10" : "divide-orange-500/10"}`}>
          {sortedExs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              {isMobility ? "No hay ejercicios en movilidad. Agrega uno abajo." : "No hay ejercicios en la entrada en calor. Agrega uno abajo."}
            </p>
          ) : (
            sortedExs.map((cfEx, index) => {
              const name = cfEx.exercise?.name ?? "";
              const variantName = cfEx.variant?.name ?? "";
              const displayName = variantName ? `${name} — ${variantName}` : name;
              return (
                <div key={cfEx.id} className="py-3 flex flex-col md:flex-row md:items-center gap-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isMobility ? "text-emerald-600/60 bg-emerald-50" : "text-orange-600/60 bg-rose-50"}`}>
                      {index + 1}
                    </span>
                    <p className="text-sm font-semibold text-foreground truncate" title={displayName}>
                      {displayName}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
                    {/* Series */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Series</span>
                      <SetsInput
                        initialValue={cfEx.sets ?? 3}
                        onChange={val => onUpdateExerciseField(cfEx.id, { sets: val })}
                        className="w-12 text-xs px-2 py-1.5"
                        focusRingColor={isMobility ? "focus:ring-2 focus:ring-emerald-500" : "focus:ring-2 focus:ring-orange-500"}
                      />
                    </div>

                    {/* Reps */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Reps</span>
                      <input
                        type="text"
                        value={cfEx.reps || ""}
                        onChange={e => onUpdateExerciseField(cfEx.id, { reps: e.target.value })}
                        placeholder={"10, 30\", 1'"}
                        className={`w-20 text-xs px-2.5 py-1.5 rounded-lg border border-border text-center focus:outline-none bg-white font-semibold ${isMobility ? "focus:ring-2 focus:ring-emerald-500" : "focus:ring-2 focus:ring-orange-500"}`}
                      />
                    </div>

                    {/* Notes */}
                    <div className="flex items-center gap-1.5 min-w-[200px] flex-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Notas</span>
                      <input
                        type="text"
                        defaultValue={cfEx.notes || ""}
                        onBlur={e => onUpdateExerciseField(cfEx.id, { notes: e.target.value })}
                        placeholder={isMobility ? "Ej. estiramiento, rotación..." : "Ej. ritmo lento, movilidad..."}
                        className={`w-full text-xs px-3 py-1.5 rounded-lg border border-border focus:outline-none bg-white ${isMobility ? "focus:ring-2 focus:ring-emerald-500" : "focus:ring-2 focus:ring-orange-500"}`}
                      />
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => onDeleteExercise(cfEx.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Exercise button */}
        <button
          onClick={onAddExercise}
          className={`w-full py-2 border border-dashed rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${isMobility ? "border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-50/10 text-emerald-700" : "border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-50/10 text-orange-700"}`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar Ejercicio</span>
        </button>
      </div>
    </div>
  );
}

function SetsInput({
  initialValue,
  onChange,
  className = "w-12 text-xs px-2 py-1.5",
  focusRingColor = "focus:ring-orange-500 focus:ring-2"
}: {
  initialValue: number;
  onChange: (val: number) => void;
  className?: string;
  focusRingColor?: string;
}) {
  const [val, setVal] = useState<string>(String(initialValue));

  useEffect(() => {
    setVal(String(initialValue));
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setVal(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 1) {
      setVal(String(initialValue));
    }
  };

  return (
    <input
      type="number"
      min="1"
      value={val}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`${className} rounded-lg border border-border text-center focus:outline-none bg-white font-semibold ${focusRingColor}`}
    />
  );
}

function SetRepsOverrideModal({
  setNumber, exercises, currentOverrides, onSave, onClose,
}: {
  setNumber: number;
  exercises: TrainingExercise[];
  currentOverrides: { training_exercise_id: string; reps: string }[];
  onSave: (overrides: { training_exercise_id: string; reps: string }[]) => void;
  onClose: () => void;
}) {
  const [inputs, setInputs] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    exercises.forEach(te => {
      const existing = currentOverrides.find(o => o.training_exercise_id === te.id);
      map[te.id] = existing?.reps ?? te.reps ?? "";
    });
    return map;
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Serie {setNumber} — Reps por ejercicio</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Modificá las reps solo para esta serie</p>
        </div>
        <div className="p-4 space-y-3">
          {exercises.map((te, i) => {
            const name = te.exercise?.name ?? "";
            const variant = te.variant?.name ?? "";
            return (
              <div key={te.id} className="flex items-center gap-3">
                <span className="text-xs text-primary font-bold w-4 shrink-0">{i + 1}.</span>
                <span className="text-sm flex-1 truncate font-medium">
                  {name}{variant ? ` — ${variant}` : ""}
                </span>
                <input
                  type="text"
                  value={inputs[te.id] ?? ""}
                  onChange={e => setInputs(prev => ({ ...prev, [te.id]: e.target.value }))}
                  className="w-16 px-2 py-1.5 rounded-lg border border-border text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            );
          })}
        </div>
        <div className="p-3 border-t border-border flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => {
              const overrides = exercises
                .filter(te => inputs[te.id] !== undefined && inputs[te.id] !== te.reps)
                .map(te => ({ training_exercise_id: te.id, reps: inputs[te.id] }));
              onSave(overrides);
            }}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function ExerciseRow({
  ex, blockId, onUpdate, onDelete, oneRM
}: {
  ex: TrainingExercise;
  blockId: string;
  onUpdate: (blockId: string, id: string, field: string, value: unknown) => void;
  onDelete: (blockId: string, id: string) => void;
  oneRM?: number;
}) {
  const name = ex.exercise?.name ?? "";
  const variantName = ex.variant?.name ?? "";
  const displayName = variantName ? `${name} — ${variantName}` : name;

  const [chargeMode, setChargeMode] = useState<"percent" | "weight">(
    ex.weight_target !== null && ex.weight_target !== undefined ? "weight" : "percent"
  );

  return (
    <div className="flex items-start gap-2 p-3 bg-muted/20 rounded-xl group">
      <GripVertical className="w-4 h-4 text-muted-foreground mt-2 shrink-0 cursor-grab" />
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Series</label>
            <SetsInput
              initialValue={ex.sets}
              onChange={val => onUpdate(blockId, ex.id, "sets", val)}
              className="w-full px-2 py-1.5 text-sm"
              focusRingColor="focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Reps</label>
            <input type="text" value={ex.reps}
              onChange={e => onUpdate(blockId, ex.id, "reps", e.target.value)}
              placeholder="5 / 3-5"
              className="w-full px-2 py-1.5 rounded-lg border border-border text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-xs text-muted-foreground">
                {chargeMode === "percent" ? "% 1RM" : "Peso (kg)"}
              </label>
              <button
                type="button"
                onClick={() => {
                  const newMode = chargeMode === "percent" ? "weight" : "percent";
                  setChargeMode(newMode);
                  if (newMode === "percent") {
                    onUpdate(blockId, ex.id, "weight_target", null);
                  } else {
                    onUpdate(blockId, ex.id, "percentage_1rm", null);
                  }
                }}
                className="text-[9px] text-primary hover:underline font-bold"
              >
                {chargeMode === "percent" ? "usar kg" : "usar %"}
              </button>
            </div>
            {chargeMode === "percent" ? (
              <input type="number" min="0" max="110" value={ex.percentage_1rm ?? ""}
                onChange={e => onUpdate(blockId, ex.id, "percentage_1rm", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="75"
                className="w-full px-2 py-1.5 rounded-lg border border-border text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-primary" />
            ) : (
              <input type="number" min="0" value={ex.weight_target ?? ""}
                onChange={e => onUpdate(blockId, ex.id, "weight_target", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="kg"
                className="w-full px-2 py-1.5 rounded-lg border border-border text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-primary" />
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Descanso (seg)</label>
            <input type="number" min="0" value={ex.rest_seconds ?? ""}
              onChange={e => onUpdate(blockId, ex.id, "rest_seconds", e.target.value ? parseInt(e.target.value) : null)}
              placeholder="180"
              className="w-full px-2 py-1.5 rounded-lg border border-border text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
        <input type="text" value={ex.notes ?? ""}
          onChange={e => onUpdate(blockId, ex.id, "notes", e.target.value)}
          placeholder="Notas para el alumno (opcional)..."
          className="w-full px-2 py-1.5 rounded-lg border border-border text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <button onClick={() => onDelete(blockId, ex.id)}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors md:opacity-0 md:group-hover:opacity-100 mt-1 shrink-0"
        title="Eliminar ejercicio">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function ComplexCard({
  exs, complexId, blockId, dayId,
  sets, onUpdateField, onUpdateSetPercentage, onUpdateSetRepsOverride,
  onUpdateSetRounds,
  onAddSet, onRemoveSet, onUpdateRest, onDelete, onUngroup,
  studentOneRMs,
}: {
  exs: TrainingExercise[];
  complexId: string;
  blockId: string;
  dayId: string;
  sets: ComplexSet[];
  onUpdateField: (blockId: string, exId: string, field: string, value: unknown) => void;
  onUpdateSetPercentage: (setId: string, pct: number | null) => void;
  onUpdateSetRepsOverride: (setId: string, overrides: { training_exercise_id: string; reps: string }[]) => void;
  onUpdateSetRounds: (setId: string, r: number) => void;
  onAddSet: (complexId: string, dayId: string) => void;
  onRemoveSet: (setId: string) => void;
  onUpdateRest: (blockId: string, complexId: string, value: number | null) => void;
  onDelete: (blockId: string, exId: string) => void;
  onUngroup: (blockId: string, complexId: string) => void;
  studentOneRMs: Record<string, number>;
}) {
  const [overrideModalSet, setOverrideModalSet] = useState<ComplexSet | null>(null);
  const [pctInputs, setPctInputs] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    sets.forEach(s => { map[s.id] = s.percentage_1rm?.toString() ?? ""; });
    return map;
  });
  const [roundsInputs, setRoundsInputs] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    sets.forEach(s => { map[s.id] = s.rounds?.toString() ?? "1"; });
    return map;
  });
  const [savedPct, setSavedPct] = useState<Record<string, boolean>>({});
  const saveTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const prevSetIds = sets.map(s => s.id).join(",");
  useEffect(() => {
    setPctInputs(prev => {
      const next = { ...prev };
      sets.forEach(s => {
        if (!(s.id in next)) next[s.id] = s.percentage_1rm?.toString() ?? "";
      });
      return next;
    });
    setRoundsInputs(prev => {
      const next = { ...prev };
      sets.forEach(s => {
        if (!(s.id in next)) next[s.id] = s.rounds?.toString() ?? "1";
      });
      return next;
    });
  }, [prevSetIds]);

  const savePct = (setId: string, raw: string, current: number | null) => {
    const pct = raw !== "" ? parseFloat(raw) : null;
    if (isNaN(pct ?? 0) && pct !== null) return;
    if ((pct ?? null) === (current ?? null)) return;
    onUpdateSetPercentage(setId, pct);
    setSavedPct(prev => ({ ...prev, [setId]: true }));
    setTimeout(() => setSavedPct(prev => ({ ...prev, [setId]: false })), 1500);
  };

  const handlePctChange = (setId: string, current: number | null, newVal: string) => {
    setPctInputs(prev => ({ ...prev, [setId]: newVal }));
    if (saveTimers.current[setId]) clearTimeout(saveTimers.current[setId]);
    saveTimers.current[setId] = setTimeout(() => {
      savePct(setId, newVal, current);
    }, 600);
  };

  const saveRounds = (setId: string, raw: string, current: number) => {
    let r = raw !== "" ? parseInt(raw, 10) : 1;
    if (isNaN(r) || r < 1) r = 1;
    if (r === current) return;
    onUpdateSetRounds(setId, r);
  };

  const handleRoundsChange = (setId: string, newVal: string) => {
    if (newVal !== "" && !/^\d+$/.test(newVal)) return;
    setRoundsInputs(prev => ({ ...prev, [setId]: newVal }));
  };

  const sorted = [...exs].sort((a, b) => (a.complex_order ?? 0) - (b.complex_order ?? 0));
  const sortedSets = [...sets].sort((a, b) => a.set_number - b.set_number);
  const sharedRest = sorted[0]?.rest_seconds;
  const isComplex = sorted.length > 1;

  const firstExercise = sorted[0];
  const oneRMForCalc = firstExercise?.exercise_id ? studentOneRMs[firstExercise.exercise_id] : undefined;

  return (
    <div className="border-2 border-primary/25 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border-b border-primary/20">
        <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs font-bold text-primary uppercase tracking-wide flex-1">
          {isComplex ? `Complex · ${sorted.length} ejercicios` : "Trepada"}
        </span>
        <button onClick={() => onUngroup(blockId, complexId)}
          className="text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-0.5 rounded border border-border/60 bg-white font-medium">
          Desagrupar
        </button>
      </div>

      <div className="divide-y divide-primary/10 bg-primary/5">
        {sorted.map((te, i) => {
          const name = te.exercise?.name ?? "";
          const variantName = te.variant?.name ?? "";
          const displayName = variantName ? `${name} — ${variantName}` : name;

          return (
            <div key={te.id} className="flex items-center gap-2 px-3 py-2 group">
              <span className="text-xs font-bold text-primary/50 w-4 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div>
                  <label className="text-xs text-muted-foreground block text-center leading-none mb-0.5">Reps</label>
                  <input type="text" value={te.reps}
                    onChange={e => onUpdateField(blockId, te.id, "reps", e.target.value)}
                    placeholder="2"
                    className="w-16 px-2 py-1.5 rounded-lg border border-border text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-primary bg-white" />
                </div>
                <button onClick={() => onDelete(blockId, te.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors md:opacity-0 md:group-hover:opacity-100 shrink-0"
                  title="Eliminar ejercicio">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white border-t border-primary/20 px-3 py-2.5 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Series — % 1RM {firstExercise?.exercise?.name ? `(${firstExercise.exercise.name})` : ""}
        </p>

        {sortedSets.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Sin series configuradas. Agregá una.</p>
        )}

        {sortedSets.map(s => {
          const pctVal = pctInputs[s.id] ?? "";
          const hasOverride = s.reps_overrides?.length > 0;
          const justSaved = savedPct[s.id];

          return (
            <div key={s.id} className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary/60 w-14 shrink-0">Serie {s.set_number}</span>
              <div className="flex-1 flex items-center gap-2">
                <div className="relative flex items-center">
                  <input
                    type="number" min="0" max="200"
                    value={pctVal}
                    onChange={e => handlePctChange(s.id, s.percentage_1rm, e.target.value)}
                    onBlur={() => savePct(s.id, pctInputs[s.id] ?? "", s.percentage_1rm)}
                    onKeyDown={e => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); } }}
                    placeholder="%"
                    className="w-16 px-2 py-1.5 rounded-lg border border-border text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {justSaved && (
                    <span className="absolute left-full ml-1 text-xs text-green-600 font-semibold whitespace-nowrap">✓</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                <div 
                  className={`flex items-center gap-0.5 px-1.5 py-1 rounded-lg border transition-colors ${
                    s.rounds && s.rounds > 1
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary focus-within:border-primary focus-within:text-primary"
                  }`}
                  title="Cantidad de rondas de este complex"
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={roundsInputs[s.id] ?? "1"}
                    onChange={e => handleRoundsChange(s.id, e.target.value)}
                    onBlur={() => saveRounds(s.id, roundsInputs[s.id] ?? "1", s.rounds ?? 1)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-6 bg-transparent border-0 text-xs text-center font-bold focus:outline-none"
                  />
                  <span className="text-xs font-medium select-none cursor-default">
                    {s.rounds && s.rounds > 1 ? "Ron ✓" : "Ron"}
                  </span>
                </div>

                <button
                  onClick={() => setOverrideModalSet(s)}
                  title="Cambiar reps de esta serie"
                  className={`px-2 py-1 rounded-lg border text-xs font-medium transition-colors ${
                    hasOverride
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  {hasOverride ? "Rep ✓" : "Reps"}
                </button>
              </div>
              <button onClick={() => onRemoveSet(s.id)}
                className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        <button
          onClick={() => onAddSet(complexId, dayId)}
          className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline mt-1">
          <Plus className="w-3.5 h-3.5" /> Agregar serie
        </button>
      </div>

      <div className="px-3 py-2.5 bg-primary/10 border-t border-primary/20">
        <label className="text-xs text-muted-foreground font-medium">Descanso (seg)</label>
        <input type="number" min="0" value={sharedRest ?? ""}
          onChange={e => onUpdateRest(blockId, complexId, e.target.value ? parseInt(e.target.value) : null)}
          placeholder="180"
          className="w-full px-2 py-1.5 rounded-lg border border-border text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary bg-white mt-0.5" />
      </div>

      {overrideModalSet && (
        <SetRepsOverrideModal
          setNumber={overrideModalSet.set_number}
          exercises={sorted}
          currentOverrides={overrideModalSet.reps_overrides}
          onSave={overrides => {
            onUpdateSetRepsOverride(overrideModalSet.id, overrides);
            setOverrideModalSet(null);
          }}
          onClose={() => setOverrideModalSet(null)}
        />
      )}
    </div>
  );
}

function ExercisePicker({
  exercises, onSelect, onClose, onCreateExercise, initialCategory = "all", loading = false,
}: {
  exercises: Exercise[];
  onSelect: (ex: Exercise, variant?: Variant) => void;
  onClose: () => void;
  onCreateExercise?: (form: { name: string; category: string; variants: string[] }) => Promise<Exercise>;
  initialCategory?: string;
  loading?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [selected, setSelected] = useState<Exercise | null>(null);

  // Quick create inline form states
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState("fuerza");
  const [newVariantsText, setNewVariantsText] = useState("");
  const [creating, setCreating] = useState(false);

  const handleOpenCreate = () => {
    setNewName(search.toUpperCase());
    setShowQuickCreate(true);
  };

  const filtered = exercises.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === "all"
      ? true
      : category === "olimpico"
        ? e.muscle_group === "olimpico"
        : e.category === category && e.muscle_group !== "olimpico";
    return matchesSearch && matchesCat;
  });

  const counts = exercises.reduce((acc: Record<string, number>, e) => {
    if (e.muscle_group === "olimpico") {
      acc["olimpico"] = (acc["olimpico"] || 0) + 1;
    } else {
      acc[e.category] = (acc[e.category] || 0) + 1;
    }
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Agregar ejercicio</h3>
          <div className="flex items-center gap-2">
            {onCreateExercise && !showQuickCreate && (
              <button onClick={handleOpenCreate} className="p-1 rounded-lg border border-border text-primary hover:bg-primary/5 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showQuickCreate ? (
          <div className="p-4 space-y-3 overflow-y-auto">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-primary uppercase">Crear Ejercicio Rápido</span>
              <button onClick={() => setShowQuickCreate(false)} className="text-muted-foreground hover:text-foreground text-xs font-medium">Cancelar</button>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Nombre</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Ej: BENCH PRESS, OTM, etc."
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Categoría</label>
              <select value={newCat} onChange={e => setNewCat(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground">
                <option value="fuerza">Fuerza</option>
                <option value="prep_fisica">Prep. Física</option>
                <option value="accesorio">Accesorio</option>
                <option value="crossfit">Cross/Funcional</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                Variantes (separadas por coma)
              </label>
              <input value={newVariantsText} onChange={e => setNewVariantsText(e.target.value)}
                placeholder="Ej: S1, S2, Colgado..."
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground" />
            </div>
            <button disabled={creating || !newName.trim()} onClick={async () => {
              setCreating(true);
              try {
                const variants = newVariantsText.split(",").map(v => v.trim()).filter(Boolean);
                const created = await onCreateExercise!({ name: newName, category: newCat, variants });
                if (created.variants.length > 0) {
                  setSelected(created);
                } else {
                  onSelect(created);
                }
                setShowQuickCreate(false);
              } catch (err) {
                console.error(err);
              } finally {
                setCreating(false);
              }
            }}
              className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Crear y Seleccionar
            </button>
          </div>
        ) : !selected ? (
          <>
            <div className="px-3 pt-3 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar ejercicio..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
              {STRENGTH_CATEGORY_TABS.map(tab => {
                const count = tab.value === "all" ? exercises.length : (counts[tab.value] || 0);
                return (
                  <button
                    key={tab.value}
                    onClick={() => setCategory(tab.value)}
                    className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      category === tab.value
                        ? "bg-primary text-white shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                    <span className={`text-xs px-1 rounded-full ${category === tab.value ? "bg-white/20 text-white" : "bg-background text-muted-foreground"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="h-px bg-border mx-3" />

            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-muted-foreground">Sin resultados</p>
                  {onCreateExercise && (
                    <button onClick={handleOpenCreate}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-primary/30 text-primary text-xs font-semibold bg-primary/5 hover:bg-primary/10 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                      Crear "{search || 'ejercicio'}" rápido
                    </button>
                  )}
                </div>
              ) : filtered.map(ex => (
                <button key={ex.id} disabled={loading} onClick={() => ex.variants.length > 0 ? setSelected(ex) : onSelect(ex)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 disabled:opacity-50 transition-colors text-left border-b border-border/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{ex.name}</p>
                    {category === "all" && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ex.muscle_group === "olimpico" ? "Olímpico" : (STRENGTH_CATEGORY_TABS.find(t => t.value === ex.category)?.label ?? ex.category)}
                      </p>
                    )}
                  </div>
                  {ex.variants.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap justify-end max-w-[160px]">
                      {ex.variants.slice(0, 3).map(v => (
                        <span key={v.id} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">{v.name}</span>
                      ))}
                      {ex.variants.length > 3 && (
                        <span className="text-xs text-muted-foreground font-medium">+{ex.variants.length - 3}</span>
                      )}
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="p-3 border-b border-border">
              <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" /> Volver
              </button>
              <p className="font-semibold text-foreground mt-2">{selected.name}</p>
              <p className="text-sm text-muted-foreground">Elegí la variante:</p>
            </div>
            <div className="overflow-y-auto flex-1">
              <button disabled={loading} onClick={() => onSelect(selected)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 disabled:opacity-50 transition-colors text-left border-b border-border">
                <span className="text-sm font-medium text-foreground">Sin variante (base)</span>
              </button>
              {selected.variants.map(v => (
                <button key={v.id} disabled={loading} onClick={() => onSelect(selected, v)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 disabled:opacity-50 transition-colors text-left border-b border-border/50 last:border-0">
                  <span className="text-sm font-semibold text-primary w-20 shrink-0">{v.name}</span>
                  <span className="text-sm text-foreground">{selected.name} — {v.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ComplexPicker({
  exercises, onConfirm, onClose, onCreateExercise, initialCategory = "all", loading = false,
}: {
  exercises: Exercise[];
  onConfirm: (items: { ex: Exercise; variant?: Variant }[]) => void;
  onClose: () => void;
  onCreateExercise?: (form: { name: string; category: string; variants: string[] }) => Promise<Exercise>;
  initialCategory?: string;
  loading?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [selectedItems, setSelectedItems] = useState<{ ex: Exercise; variant?: Variant }[]>([]);
  const [pickingVariantFor, setPickingVariantFor] = useState<Exercise | null>(null);

  // Quick create inline form states
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState("fuerza");
  const [newVariantsText, setNewVariantsText] = useState("");
  const [creating, setCreating] = useState(false);

  const handleOpenCreate = () => {
    setNewName(search.toUpperCase());
    setShowQuickCreate(true);
  };

  const filtered = exercises.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === "all"
      ? true
      : category === "olimpico"
        ? e.muscle_group === "olimpico"
        : e.category === category && e.muscle_group !== "olimpico";
    return matchesSearch && matchesCat;
  });

  const counts = exercises.reduce((acc: Record<string, number>, e) => {
    if (e.muscle_group === "olimpico") {
      acc["olimpico"] = (acc["olimpico"] || 0) + 1;
    } else {
      acc[e.category] = (acc[e.category] || 0) + 1;
    }
    return acc;
  }, {});

  const addItem = (ex: Exercise, variant?: Variant) => {
    setSelectedItems(prev => [...prev, { ex, variant }]);
    setPickingVariantFor(null);
    setSearch(""); // Limpiar buscador para el siguiente ejercicio del complex
  };

  const removeItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  const label = selectedItems.length === 1 ? "Trepada" : "Complex / Trepada";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" /> Complex / Trepada
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              1 ejercicio = trepada · 2 o más = complex
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onCreateExercise && !showQuickCreate && (
              <button onClick={handleOpenCreate} className="p-1 rounded-lg border border-border text-primary hover:bg-primary/5 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selected preview */}
        {selectedItems.length > 0 && (
          <div className="p-3 border-b border-border bg-primary/5">
            <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">
              {label} ({selectedItems.length} ejercicio{selectedItems.length !== 1 ? "s" : ""}):
            </p>
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
              {selectedItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-border">
                  <span className="text-xs font-bold text-primary w-4 shrink-0">{i + 1}.</span>
                  <span className="text-sm font-medium flex-1 truncate">
                    {item.ex.name}{item.variant ? ` — ${item.variant.name}` : ""}
                  </span>
                  <button onClick={() => removeItem(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showQuickCreate ? (
          <div className="p-4 space-y-3 overflow-y-auto">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-primary uppercase">Crear Ejercicio Rápido</span>
              <button onClick={() => setShowQuickCreate(false)} className="text-muted-foreground hover:text-foreground text-xs font-medium">Cancelar</button>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Nombre</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Ej: BENCH PRESS, OTM, etc."
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Categoría</label>
              <select value={newCat} onChange={e => setNewCat(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground">
                <option value="fuerza">Fuerza</option>
                <option value="prep_fisica">Prep. Física</option>
                <option value="accesorio">Accesorio</option>
                <option value="crossfit">Cross/Funcional</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                Variantes (separadas por coma)
              </label>
              <input value={newVariantsText} onChange={e => setNewVariantsText(e.target.value)}
                placeholder="Ej: S1, S2, Colgado..."
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground" />
            </div>
            <button disabled={creating || !newName.trim()} onClick={async () => {
              setCreating(true);
              try {
                const variants = newVariantsText.split(",").map(v => v.trim()).filter(Boolean);
                const created = await onCreateExercise!({ name: newName, category: newCat, variants });
                if (created.variants.length > 0) {
                  setPickingVariantFor(created);
                } else {
                  addItem(created);
                }
                setShowQuickCreate(false);
              } catch (err) {
                console.error(err);
              } finally {
                setCreating(false);
              }
            }}
              className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Crear y Agregar
            </button>
          </div>
        ) : !pickingVariantFor ? (
          <>
            <div className="px-3 pt-3 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar ejercicio..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
              {STRENGTH_CATEGORY_TABS.map(tab => {
                const count = tab.value === "all" ? exercises.length : (counts[tab.value] || 0);
                return (
                  <button
                    key={tab.value}
                    onClick={() => setCategory(tab.value)}
                    className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      category === tab.value
                        ? "bg-primary text-white shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                    <span className={`text-xs px-1 rounded-full ${category === tab.value ? "bg-white/20 text-white" : "bg-background text-muted-foreground"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="h-px bg-border mx-3" />

            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-muted-foreground">Sin resultados</p>
                  {onCreateExercise && (
                    <button onClick={handleOpenCreate}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-primary/30 text-primary text-xs font-semibold bg-primary/5 hover:bg-primary/10 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                      Crear "{search || 'ejercicio'}" rápido
                    </button>
                  )}
                </div>
              ) : filtered.map(ex => (
                <button key={ex.id} onClick={() => ex.variants.length > 0 ? setPickingVariantFor(ex) : addItem(ex)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0">
                  <Plus className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{ex.name}</p>
                    {category === "all" && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ex.muscle_group === "olimpico" ? "Olímpico" : (STRENGTH_CATEGORY_TABS.find(t => t.value === ex.category)?.label ?? ex.category)}
                      </p>
                    )}
                  </div>
                  {ex.variants.length > 0 && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="p-3 border-b border-border">
              <button onClick={() => setPickingVariantFor(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" /> Volver
              </button>
              <p className="font-semibold text-foreground mt-2">{pickingVariantFor.name}</p>
              <p className="text-sm text-muted-foreground">Elegí la variante:</p>
            </div>
            <div className="overflow-y-auto flex-1">
              <button onClick={() => addItem(pickingVariantFor)}
                className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border">
                <span className="text-sm font-medium">Sin variante (base)</span>
              </button>
              {pickingVariantFor.variants.map(v => (
                <button key={v.id} onClick={() => addItem(pickingVariantFor, v)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                  <span className="text-sm font-semibold text-primary">{v.name}</span>
                  <span className="text-sm text-foreground">{pickingVariantFor.name} {v.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="p-3 border-t border-border flex gap-2 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-xs text-muted-foreground font-medium hover:bg-muted transition-colors leading-tight">
            La estructura de series y complex se creará automáticamente.
          </button>
          <button onClick={() => selectedItems.length >= 1 && onConfirm(selectedItems)}
            disabled={selectedItems.length < 1 || loading}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {loading ? "Creando..." : `Crear (${selectedItems.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Assign Students Modal ────────────────────────────────────
function AssignStudentsModal({
  students, cycleName, onAssign, onClose, assigning,
}: {
  students: Student[];
  cycleName: string;
  onAssign: (studentIds: string[], syncMode: string) => void;
  onClose: () => void;
  assigning: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncMode, setSyncMode] = useState<"SYNC" | "ASYNC">("SYNC");

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStudent = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(s => s.id)));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Asignar a alumnos
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[260px]">
              {cycleName}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar alumno..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Select all */}
        {filtered.length > 1 && (
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 px-4 py-2.5 border-b border-border hover:bg-muted/30 transition-colors text-left">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
              selected.size === filtered.length && filtered.length > 0
                ? "bg-primary border-primary"
                : selected.size > 0
                ? "border-primary bg-primary/20"
                : "border-border"
            }`}>
              {selected.size === filtered.length && filtered.length > 0
                ? <Check className="w-3 h-3 text-white" />
                : selected.size > 0
                ? <div className="w-2 h-0.5 bg-primary" />
                : null
              }
            </div>
            <span className="text-sm font-medium text-foreground">
              Seleccionar todos ({filtered.length})
            </span>
          </button>
        )}

        {/* Student list */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Sin resultados</p>
          ) : filtered.map(student => {
            const isSelected = selected.has(student.id);
            return (
              <button
                key={student.id}
                onClick={() => toggleStudent(student.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0 transition-colors text-left ${
                  isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                }`}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                  isSelected ? "bg-primary border-primary" : "border-border"
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{student.full_name}</p>
                  {student.activeCycle ? (
                    <p className="text-xs text-orange-600 font-medium mt-0.5 truncate">
                      ⚠ Ciclo activo: {student.activeCycle.name}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">Sin ciclo activo</p>
                  )}
                </div>
                {student.activeCycle && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                    Tiene ciclo
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modalidad */}
        <div className="p-4 border-b border-border bg-muted/20">
          <label className="block text-sm font-medium text-foreground mb-2">Modalidad de seguimiento</label>
          <div className="flex gap-3">
            <label className="flex-1 cursor-pointer">
              <input type="radio" name="syncMode" value="SYNC" className="peer sr-only" checked={syncMode === "SYNC"} onChange={() => setSyncMode("SYNC")} />
              <div className="p-3 rounded-xl border border-border bg-white peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary transition-all">
                <p className="text-sm font-semibold text-foreground">A la par</p>
                <p className="text-xs text-muted-foreground mt-0.5">Se suma a la semana en curso del ciclo.</p>
              </div>
            </label>
            <label className="flex-1 cursor-pointer">
              <input type="radio" name="syncMode" value="ASYNC" className="peer sr-only" checked={syncMode === "ASYNC"} onChange={() => setSyncMode("ASYNC")} />
              <div className="p-3 rounded-xl border border-border bg-white peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary transition-all">
                <p className="text-sm font-semibold text-foreground">Desde cero</p>
                <p className="text-xs text-muted-foreground mt-0.5">Empieza el ciclo desde la Semana 1.</p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => selected.size > 0 && onAssign(Array.from(selected), syncMode)}
            disabled={selected.size === 0 || assigning}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {assigning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Asignando...</>
            ) : (
              <><UserPlus className="w-4 h-4" /> Asignar a {selected.size}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
