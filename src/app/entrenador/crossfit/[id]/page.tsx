"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Loader2, ChevronDown, ChevronRight,
  Trash2, Search, X, Check, Copy, Flame, Moon,
  Zap, Dumbbell, Heart, Timer, Video as VideoIcon
} from "lucide-react";
import Link from "next/link";
import { DAY_NAMES, WEEK_TYPE_LABELS, WEEK_TYPE_COLORS } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────
type CfExercise = { id: string; name: string; category: string; default_unit: string; video_url?: string };
type CfBlockExercise = {
  id: string; exercise_id: string; exercise?: CfExercise;
  order: number; reps?: string; unit_override?: string; notes?: string;
  levels: CfWodLevel[];
};
type CfWodLevel = { id: string; level: string; value: string; notes?: string };
type Block = {
  id: string; name: string; type: string; order: number;
  wod_type?: string; wod_config?: Record<string, unknown>;
  cf_exercises: CfBlockExercise[];
};
type Day = { id: string; day_of_week: number; label: string; order: number; is_rest: boolean; blocks: Block[]; expanded: boolean };
type Week = { id: string; week_number: number; type: string; days: Day[]; expanded: boolean };
type Cycle = { id: string; name: string; total_weeks: number; student_id: string; student_name: string; is_template: boolean };

const WOD_TYPES = [
  { value: "emom", label: "EMOM", icon: "⏱" },
  { value: "amrap", label: "AMRAP", icon: "🔁" },
  { value: "for_time", label: "For Time", icon: "⚡" },
  { value: "tabata", label: "Tabata", icon: "🔥" },
  { value: "death_by", label: "Death By", icon: "💀" },
  { value: "for_load", label: "For Load", icon: "🏋️" },
  { value: "chipper", label: "Chipper", icon: "📋" },
] as const;

const BLOCK_TYPES = [
  { value: "warm_up", label: "Warm Up", icon: Heart, color: "text-rose-600 bg-rose-100" },
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

  if (wodType === "emom") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Cada (seg)</label>
          <input type="number" value={(config.every_seconds as number) ?? 60}
            onChange={e => updateField("every_seconds", parseInt(e.target.value) || 60)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Duración total (min)</label>
          <input type="number" value={(config.total_minutes as number) ?? 12}
            onChange={e => updateField("total_minutes", parseInt(e.target.value) || 12)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
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

  // New exercise inline creation
  const [showNewEx, setShowNewEx] = useState(false);
  const [newExForm, setNewExForm] = useState({ name: "", category: "weightlifting", default_unit: "reps" });

  const supabase = createClient();

  // ─── Load data ──────────────────────────────────────────────
  const loadCycle = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: cycleData } = await supabase
      .from("training_cycles")
      .select("id, name, total_weeks, student_id, is_template, users!training_cycles_student_id_fkey(full_name)")
      .eq("id", cycleId)
      .single();

    if (!cycleData) { setLoading(false); return; }

    setCycle({
      id: cycleData.id,
      name: cycleData.name,
      total_weeks: cycleData.total_weeks,
      student_id: cycleData.student_id,
      student_name: (cycleData.users as Record<string, string>)?.full_name || "",
      is_template: cycleData.is_template,
    });

    // Load weeks with days
    const { data: weeksData } = await supabase
      .from("training_weeks")
      .select("id, week_number, type")
      .eq("cycle_id", cycleId)
      .order("week_number");

    if (!weeksData) { setLoading(false); return; }

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
          .in("type", ["warm_up", "skill", "metcon"])
          .order("order");

        const blocks: Block[] = [];
        for (const b of (blocksData || [])) {
          const { data: cfExData } = await supabase
            .from("cf_block_exercises")
            .select("id, exercise_id, \"order\", reps, unit_override, notes, cf_exercises(id, name, category, default_unit, video_url)")
            .eq("block_id", b.id)
            .order("order");

          const cfBlockExercises: CfBlockExercise[] = [];
          for (const cfe of (cfExData || [])) {
            const { data: levelsData } = await supabase
              .from("cf_wod_levels")
              .select("id, level, value, notes")
              .eq("block_exercise_id", cfe.id);

            cfBlockExercises.push({
              id: cfe.id,
              exercise_id: cfe.exercise_id,
              exercise: (cfe.cf_exercises as unknown as CfExercise) || undefined,
              order: cfe.order,
              reps: cfe.reps ?? undefined,
              unit_override: cfe.unit_override ?? undefined,
              notes: cfe.notes ?? undefined,
              levels: (levelsData || []) as CfWodLevel[],
            });
          }

          blocks.push({
            id: b.id,
            name: b.name,
            type: b.type,
            order: b.order,
            wod_type: b.wod_type ?? undefined,
            wod_config: (b.wod_config as Record<string, unknown>) ?? {},
            cf_exercises: cfBlockExercises,
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

    // Load CF exercises catalog
    const { data: cfExs } = await supabase
      .from("cf_exercises")
      .select("id, name, category, default_unit, video_url")
      .eq("trainer_id", user.id)
      .eq("archived", false)
      .order("name");
    setCfExercises(cfExs || []);

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

    const label = blockType === "warm_up" ? "Warm Up" : blockType === "skill" ? "Skill" : "Metcon";
    const { data, error } = await supabase.from("training_blocks").insert({
      day_id: dayId,
      name: label,
      type: blockType,
      order: day.blocks.length,
      wod_type: blockType === "metcon" ? "amrap" : null,
      wod_config: blockType === "metcon" ? { time_cap_minutes: 15 } : {},
    }).select().single();

    if (error) return toast.error(error.message);
    setWeeks(prev => prev.map(w =>
      w.id === weekId ? {
        ...w, days: w.days.map(d =>
          d.id === dayId ? { ...d, blocks: [...d.blocks, { ...data, cf_exercises: [], wod_config: data.wod_config || {} }] } : d
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
    await supabase.from("training_blocks").update({ wod_type: wodType, wod_config: config }).eq("id", blockId);
    setWeeks(prev => prev.map(w =>
      w.id === weekId ? {
        ...w, days: w.days.map(d =>
          d.id === dayId ? {
            ...d, blocks: d.blocks.map(b =>
              b.id === blockId ? { ...b, wod_type: wodType, wod_config: config } : b
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

  // ─── Update/create level ───────────────────────────────────
  const updateLevel = async (cfExId: string, level: string, value: string) => {
    const week = weeks.find(w => w.days.some(d => d.blocks.some(b => b.cf_exercises.some(e => e.id === cfExId))));
    if (!week) return;

    const existingLevel = weeks.flatMap(w => w.days).flatMap(d => d.blocks).flatMap(b => b.cf_exercises)
      .find(e => e.id === cfExId)?.levels.find(l => l.level === level);

    if (existingLevel) {
      if (!value.trim()) {
        await supabase.from("cf_wod_levels").delete().eq("id", existingLevel.id);
      } else {
        await supabase.from("cf_wod_levels").update({ value }).eq("id", existingLevel.id);
      }
    } else if (value.trim()) {
      await supabase.from("cf_wod_levels").insert({
        block_exercise_id: cfExId,
        level,
        value,
      });
    }

    // Reload to get fresh IDs
    await loadCycle();
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
        <Link href="/entrenador/crossfit" className="text-orange-600 text-sm font-medium mt-2 inline-block">← Volver</Link>
      </div>
    );
  }

  const filteredExercises = cfExercises.filter(e => {
    if (exCatFilter !== "all" && e.category !== exCatFilter) return false;
    if (exSearch && !e.name.toLowerCase().includes(exSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/entrenador/crossfit" className="p-2 rounded-xl hover:bg-muted transition-colors">
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
      </div>

      {/* Weeks */}
      <div className="space-y-4">
        {weeks.map(week => (
          <div key={week.id} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            {/* Week header */}
            <button onClick={() => toggleWeek(week.id)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors">
              {week.expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <span className="font-semibold text-foreground">Semana {week.week_number}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${WEEK_TYPE_COLORS[week.type]}`}>
                {WEEK_TYPE_LABELS[week.type]}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {week.days.length} día{week.days.length !== 1 ? "s" : ""}
              </span>
            </button>

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

                          return (
                            <div key={block.id} className="border border-border rounded-xl overflow-hidden">
                              {/* Block header */}
                              <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${blockMeta?.color || "bg-gray-100"}`}>
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-sm font-semibold text-foreground flex-1">{block.name}</span>

                                {/* WOD type selector for metcon */}
                                {block.type === "metcon" && (
                                  <select
                                    value={block.wod_type || ""}
                                    onChange={e => updateWodType(week.id, day.id, block.id, e.target.value)}
                                    className="text-xs px-2 py-1 rounded-lg border border-border bg-white font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none">
                                    {WOD_TYPES.map(wt => (
                                      <option key={wt.value} value={wt.value}>{wt.icon} {wt.label}</option>
                                    ))}
                                  </select>
                                )}

                                <button onClick={() => deleteBlock(week.id, day.id, block.id)}
                                  className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* WOD config fields */}
                              {block.type === "metcon" && block.wod_type && (
                                <div className="px-4 py-3 border-b border-border/50 bg-orange-50/50">
                                  <WodConfigFields
                                    wodType={block.wod_type}
                                    config={block.wod_config || {}}
                                    onChange={(config) => updateWodConfig(week.id, day.id, block.id, config)}
                                  />
                                </div>
                              )}

                              {/* Exercises */}
                              <div className="divide-y divide-border/50">
                                {block.cf_exercises.map(cfEx => (
                                  <div key={cfEx.id} className="px-4 py-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-foreground flex-1">
                                        {cfEx.exercise?.name || "Ejercicio"}
                                        <span className="text-xs text-muted-foreground ml-1">
                                          ({cfEx.exercise?.default_unit || "reps"})
                                        </span>
                                      </p>
                                      <input
                                        value={cfEx.reps || ""}
                                        onChange={e => updateExReps(cfEx.id, e.target.value)}
                                        placeholder="Reps"
                                        className="w-20 text-xs px-2 py-1.5 rounded-lg border border-border text-center focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                      />
                                      <button onClick={() => deleteBlockExercise(week.id, day.id, block.id, cfEx.id)}
                                        className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    {/* Levels grid */}
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
                                  </div>
                                ))}

                                {/* Add exercise button */}
                                <button
                                  onClick={() => setShowExPicker({ blockId: block.id, dayId: day.id })}
                                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors">
                                  <Plus className="w-4 h-4" />
                                  Agregar ejercicio
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Add block buttons */}
                        <div className="flex gap-2 flex-wrap">
                          {BLOCK_TYPES.map(bt => (
                            <button key={bt.value} onClick={() => addBlock(week.id, day.id, bt.value)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-border text-xs font-medium text-muted-foreground hover:border-orange-400 hover:text-orange-600 transition-colors">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center">
          <div className="bg-white rounded-t-3xl lg:rounded-2xl w-full max-w-lg max-h-[80vh] shadow-2xl flex flex-col">
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
                <button onClick={() => setShowNewEx(!showNewEx)}
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
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {cfExercises.length === 0
                    ? "No tenés ejercicios CF. Creá uno arriba ↑"
                    : "Sin resultados. Probá con otro filtro."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
