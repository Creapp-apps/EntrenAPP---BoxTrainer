"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Check, Dumbbell, Loader2,
  Send, StickyNote, X, Video, Link2, Layers,
  ChevronDown, ChevronUp, Pencil,
} from "lucide-react";
import Link from "next/link";
import { calculateWeight } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────
type ExerciseData = { id: string; name: string; video_url?: string; category: string };
type TrainingExercise = {
  id: string;
  exercise_id: string;
  variant_id?: string;
  sets: number;
  reps: string;
  percentage_1rm?: number;
  weight_target?: number;
  rest_seconds?: number;
  notes?: string;
  order: number;
  complex_id?: string;
  complex_order?: number;
  exercises: ExerciseData;
  exercise_variants?: { id: string; name: string; video_url?: string | null };
};
type Block = { id: string; name: string; type: string; order: number; training_exercises: TrainingExercise[] };
type DayInfo = { cycle_id: string; cycle_name: string; week_number: number };

type ExerciseLog = {
  training_exercise_id: string;
  exercise_id: string;
  variant_id?: string;
  weight_used_kg?: number;
  used_suggested: boolean;
  suggested_kg?: number;
  sets_completed: number;
  reps_completed: string;
  set_weights?: number[];
};

type Phase = "training" | "summary" | "done";
type ComplexSet = {
  id: string;
  complex_id: string;
  set_number: number;
  percentage_1rm: number | null;
  reps_overrides: { training_exercise_id: string; reps: string }[];
};

// ─── Inline Weight Edit ──────────────────────────────────────
function InlineWeightEdit({
  currentKg,
  onSave,
  onCancel,
}: {
  currentKg?: number;
  onSave: (kg: number | undefined) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(currentKg?.toString() || "");
  return (
    <div className="flex items-center gap-2 mt-2 animate-in slide-in-from-top-2">
      <input
        type="number"
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder="kg"
        className="w-20 px-2 py-1.5 rounded-lg border border-primary text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary"
        onKeyDown={e => { if (e.key === "Enter") { const n = parseFloat(val); onSave(isNaN(n) ? undefined : n); } }}
      />
      <span className="text-xs text-muted-foreground">kg</span>
      <button onClick={() => { const n = parseFloat(val); onSave(isNaN(n) ? undefined : n); }}
        className="p-1 rounded-md bg-primary text-white"><Check className="w-3 h-3" /></button>
      <button onClick={onCancel} className="p-1 rounded-md bg-muted text-muted-foreground"><X className="w-3 h-3" /></button>
    </div>
  );
}

// ─── Weight Prompt Modal (for single exercises) ──────────────
function WeightPrompt({
  exerciseName,
  suggestedKg,
  sets,
  onConfirm,
  onClose,
}: {
  exerciseName: string;
  suggestedKg?: number;
  sets: number;
  onConfirm: (weightKg: number | undefined, usedSuggested: boolean, setWeights?: number[]) => void;
  onClose: () => void;
}) {
  const [customWeight, setCustomWeight] = useState("");
  const [mode, setMode] = useState<"suggested" | "custom" | "bodyweight">(
    suggestedKg ? "suggested" : "custom"
  );
  const [perSet, setPerSet] = useState(false);
  const [setWeightInputs, setSetWeightInputs] = useState<string[]>(() => Array(sets).fill(""));

  const getBaseWeight = () => {
    if (mode === "suggested") return suggestedKg?.toString() ?? "";
    return customWeight;
  };

  const handleTogglePerSet = () => {
    const newPerSet = !perSet;
    setPerSet(newPerSet);
    if (newPerSet) {
      const base = getBaseWeight();
      setSetWeightInputs(Array(sets).fill(base));
    }
  };

  const updateSetWeight = (idx: number, val: string) => {
    const updated = [...setWeightInputs];
    updated[idx] = val;
    setSetWeightInputs(updated);
  };

  const handleConfirm = () => {
    if (mode === "bodyweight") { onConfirm(undefined, false, undefined); return; }
    if (perSet) {
      const parsed = setWeightInputs.map(w => { const n = parseFloat(w); return isNaN(n) ? 0 : n; });
      const avg = parsed.reduce((a, b) => a + b, 0) / parsed.length;
      onConfirm(isNaN(avg) ? undefined : parseFloat(avg.toFixed(2)), false, parsed);
    } else {
      if (mode === "suggested" && suggestedKg) { onConfirm(suggestedKg, true); }
      else { const kg = parseFloat(customWeight); onConfirm(isNaN(kg) ? undefined : kg, false); }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">¿Con qué peso?</h3>
            <p className="text-sm text-muted-foreground">{exerciseName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        {!perSet && (
          <div className="space-y-3">
            {suggestedKg && (
              <button onClick={() => setMode("suggested")}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${mode === "suggested" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${mode === "suggested" ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                  {mode === "suggested" && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">Con el peso sugerido</p>
                  <p className="text-2xl font-bold text-primary">{suggestedKg} kg</p>
                </div>
              </button>
            )}
            <button onClick={() => setMode("custom")}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${mode === "custom" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${mode === "custom" ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                {mode === "custom" && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-foreground">Otro peso</p>
                {mode === "custom" && (
                  <div className="flex items-center gap-2 mt-2">
                    <input type="number" autoFocus value={customWeight} onChange={e => setCustomWeight(e.target.value)}
                      placeholder="Ej: 87.5"
                      className="w-28 px-3 py-1.5 rounded-lg border border-border text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary" />
                    <span className="text-muted-foreground font-medium">kg</span>
                  </div>
                )}
              </div>
            </button>
            <button onClick={() => setMode("bodyweight")}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${mode === "bodyweight" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${mode === "bodyweight" ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                {mode === "bodyweight" && <Check className="w-3 h-3 text-white" />}
              </div>
              <p className="font-semibold text-foreground">Con peso corporal / sin carga</p>
            </button>
          </div>
        )}
        {perSet && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Peso por serie ({sets} series)</p>
            {setWeightInputs.map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-8 text-sm font-bold text-muted-foreground text-right shrink-0">S{i + 1}</span>
                <input type="number" value={w} onChange={e => updateSetWeight(i, e.target.value)}
                  placeholder="kg"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-border text-base font-semibold text-center focus:outline-none focus:ring-2 focus:ring-primary" />
                <span className="text-sm text-muted-foreground shrink-0">kg</span>
              </div>
            ))}
          </div>
        )}
        {mode !== "bodyweight" && (
          <button onClick={handleTogglePerSet}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-sm font-medium ${perSet ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
            <Layers className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">{perSet ? "Cargar un solo peso para todas las series" : "Cargar por serie (peso distinto en cada una)"}</span>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${perSet ? "bg-primary" : "bg-muted-foreground/30"}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${perSet ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
          </button>
        )}
        <button onClick={handleConfirm}
          className="w-full bg-primary text-white font-semibold py-4 rounded-2xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
          <Check className="w-5 h-5" /> Confirmar
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function EntrenarPage() {
  const params = useParams();
  const router = useRouter();
  const dayId = params.dayId as string;

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [dayInfo, setDayInfo] = useState<DayInfo | null>(null);
  const [oneRMs, setOneRMs] = useState<Record<string, number>>({});
  const [complexSets, setComplexSets] = useState<Record<string, ComplexSet[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Training state
  const [phase, setPhase] = useState<Phase>("training");
  const [checkedExercises, setCheckedExercises] = useState<Set<string>>(new Set());
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLog>>({});
  const [pendingPrompt, setPendingPrompt] = useState<TrainingExercise | null>(null);
  // Complex: check por serie
  const [checkedSeries, setCheckedSeries] = useState<Set<string>>(new Set());
  const [seriesWeights, setSeriesWeights] = useState<Record<string, number | undefined>>({});
  const [editingSeriesWeight, setEditingSeriesWeight] = useState<string | null>(null);
  // Series confirmation modal state
  const [pendingSeriesConfirm, setPendingSeriesConfirm] = useState<{
    set: ComplexSet;
    items: TrainingExercise[];
    calcWeight: number | null;
  } | null>(null);
  const [customSeriesWeight, setCustomSeriesWeight] = useState("");

  // Summary state
  const [rpeOverall, setRpeOverall] = useState<number>(0);
  const [comments, setComments] = useState("");

  const allExercises = blocks.flatMap(b => b.training_exercises);
  const singleExercises = allExercises.filter(te => !te.complex_id);
  const totalSeries = Object.values(complexSets).reduce((n, sets) => n + sets.length, 0);
  const totalItems = singleExercises.length + totalSeries;
  const completedItems = checkedExercises.size + checkedSeries.size;
  const progressPct = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const [{ data: blocksData }, { data: dayData }, { data: ormsData }] = await Promise.all([
        supabase.from("training_blocks")
          .select(`*, training_exercises(*, exercises(id, name, category, video_url), exercise_variants(id, name, video_url))`)
          .eq("day_id", dayId).order("order"),
        supabase.from("training_days")
          .select(`*, training_weeks(week_number, type, training_cycles(id, name))`)
          .eq("id", dayId).single(),
        supabase.from("student_one_rm").select("exercise_id, weight_kg").eq("student_id", user!.id),
      ]);

      if (blocksData) {
        const sorted = (blocksData as unknown as Block[]).map(b => ({
          ...b,
          training_exercises: (b.training_exercises || []).sort((a, b) => a.order - b.order),
        }));
        setBlocks(sorted);

        const { data: setsData } = await supabase
          .from("training_complex_sets")
          .select("id, complex_id, set_number, percentage_1rm, reps_overrides")
          .eq("day_id", dayId)
          .order("set_number");
        if (setsData) {
          const grouped: Record<string, ComplexSet[]> = {};
          for (const s of setsData as ComplexSet[]) {
            if (!grouped[s.complex_id]) grouped[s.complex_id] = [];
            grouped[s.complex_id].push({
              id: s.id, complex_id: s.complex_id,
              set_number: s.set_number, percentage_1rm: s.percentage_1rm ?? null,
              reps_overrides: (s.reps_overrides as { training_exercise_id: string; reps: string }[]) || [],
            });
          }
          setComplexSets(grouped);
        }
      }

      if (dayData) {
        const week = (dayData as Record<string, unknown>).training_weeks as Record<string, unknown>;
        const cycle = week?.training_cycles as Record<string, unknown>;
        setDayInfo({
          cycle_id: cycle?.id as string,
          cycle_name: cycle?.name as string,
          week_number: week?.week_number as number,
        });
      }

      if (ormsData) {
        const map: Record<string, number> = {};
        ormsData.forEach(r => { map[r.exercise_id] = r.weight_kg; });
        setOneRMs(map);
      }

      setLoading(false);
    };
    load();
  }, [dayId]);

  // ─── Single exercise tap ───────────────────────────────
  const handleExerciseTap = (te: TrainingExercise) => {
    if (checkedExercises.has(te.id)) {
      const newChecked = new Set(checkedExercises);
      newChecked.delete(te.id);
      setCheckedExercises(newChecked);
      const newLogs = { ...exerciseLogs };
      delete newLogs[te.id];
      setExerciseLogs(newLogs);
      return;
    }
    setPendingPrompt(te);
  };

  const handleWeightConfirm = (weightKg: number | undefined, usedSuggested: boolean, setWeights?: number[]) => {
    if (!pendingPrompt) return;
    const te = pendingPrompt;
    const suggestedKg = te.percentage_1rm && oneRMs[te.exercise_id]
      ? calculateWeight(oneRMs[te.exercise_id], te.percentage_1rm)
      : te.weight_target || undefined;

    const newChecked = new Set(checkedExercises);
    newChecked.add(te.id);
    setExerciseLogs(prev => ({
      ...prev,
      [te.id]: {
        training_exercise_id: te.id,
        exercise_id: te.exercise_id,
        variant_id: te.variant_id,
        weight_used_kg: weightKg,
        used_suggested: usedSuggested,
        suggested_kg: suggestedKg,
        sets_completed: te.sets,
        reps_completed: te.reps,
        set_weights: setWeights,
      },
    }));
    setCheckedExercises(newChecked);
    setPendingPrompt(null);
  };

  // ─── Series tap (complex/trepada) — show confirmation ───
  const handleSeriesTap = (set: ComplexSet, items: TrainingExercise[]) => {
    if (checkedSeries.has(set.id)) {
      // Uncheck
      const next = new Set(checkedSeries);
      next.delete(set.id);
      setCheckedSeries(next);
      setSeriesWeights(prev => { const n = { ...prev }; delete n[set.id]; return n; });
      return;
    }
    // Calculate suggested weight
    const firstEx = items[0];
    const oneRM = firstEx ? oneRMs[firstEx.exercise_id] : undefined;
    const calcWeight = oneRM && set.percentage_1rm
      ? Math.round((oneRM * set.percentage_1rm / 100) / 2.5) * 2.5
      : null;
    // Open confirmation modal
    setPendingSeriesConfirm({ set, items, calcWeight });
    setCustomSeriesWeight("");
  };

  const confirmSeriesWithWeight = (weight: number | undefined) => {
    if (!pendingSeriesConfirm) return;
    const { set } = pendingSeriesConfirm;
    setCheckedSeries(prev => new Set([...prev, set.id]));
    setSeriesWeights(prev => ({ ...prev, [set.id]: weight }));
    setPendingSeriesConfirm(null);
  };

  // Tonnage
  const sessionTonnage = Object.values(exerciseLogs).reduce((total, log) => {
    if (!log.weight_used_kg) return total;
    const reps = parseFloat(log.reps_completed) || 1;
    if (log.set_weights && log.set_weights.length > 0) {
      return total + log.set_weights.reduce((s, w) => s + (w ?? 0) * reps, 0);
    }
    return total + log.weight_used_kg * log.sets_completed * reps;
  }, 0);

  // Submit session
  const handleFinish = async () => {
    if (phase === "training") { setPhase("summary"); return; }

    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const { data: session, error: sessionError } = await supabase
        .from("session_logs").insert({
          student_id: user!.id,
          training_day_id: dayId,
          day_id: dayId,
          cycle_id: dayInfo?.cycle_id,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          rpe_overall: rpeOverall || null,
          comments: comments.trim() || null,
        }).select().single();

      if (sessionError) throw sessionError;

      // Exercise logs (singles)
      const logs = Object.values(exerciseLogs).map(log => ({
        session_log_id: session.id,
        training_exercise_id: log.training_exercise_id,
        exercise_id: log.exercise_id,
        variant_id: log.variant_id || null,
        sets_completed: log.sets_completed,
        reps_completed: log.reps_completed,
        weight_used_kg: log.weight_used_kg || null,
        set_weights: log.set_weights || null,
      }));

      // Complex logs from per-series checks
      const complexLogs: typeof logs = [];
      const processedComplexIds = new Set<string>();
      for (const block of blocks) {
        const cMap = new Map<string, TrainingExercise[]>();
        for (const te of block.training_exercises) {
          if (te.complex_id) {
            if (!cMap.has(te.complex_id)) cMap.set(te.complex_id, []);
            cMap.get(te.complex_id)!.push(te);
          }
        }
        for (const [cId, tes] of cMap.entries()) {
          if (processedComplexIds.has(cId)) continue;
          processedComplexIds.add(cId);
          const cSetsSorted = (complexSets[cId] || [])
            .filter(s => checkedSeries.has(s.id))
            .sort((a, b) => a.set_number - b.set_number);
          if (cSetsSorted.length === 0) continue;
          const weights = cSetsSorted.map(s => seriesWeights[s.id]);
          tes.forEach((te, idx) => {
            const sw = idx === 0
              ? weights.map(w => w ?? 0)
              : undefined;
            const avgW = sw ? sw.reduce((a, b) => a + b, 0) / sw.length : undefined;
            complexLogs.push({
              session_log_id: session.id,
              training_exercise_id: te.id,
              exercise_id: te.exercise_id,
              variant_id: te.variant_id || null,
              sets_completed: cSetsSorted.length,
              reps_completed: te.reps,
              weight_used_kg: idx === 0 && avgW ? parseFloat(avgW.toFixed(2)) : null,
              set_weights: sw ?? null,
            });
          });
        }
      }

      const allLogs = [...logs, ...complexLogs];
      if (allLogs.length > 0) {
        await supabase.from("exercise_logs").insert(allLogs);
      }

      // Notification
      if (comments.trim() || rpeOverall) {
        const { data: profile } = await supabase.from("users").select("full_name, created_by").eq("id", user!.id).single();
        if (profile?.created_by) {
          await supabase.from("notifications").insert({
            user_id: profile.created_by,
            type: "session_completed",
            title: `${profile.full_name} completó su entrenamiento`,
            message: rpeOverall ? `RPE: ${rpeOverall}/10${comments ? ` · "${comments}"` : ""}` : comments,
            data: { student_id: user!.id, day_id: dayId, session_id: session.id },
            read: false,
          });
        }
      }

      setPhase("done");
    } catch (err: unknown) {
      toast.error("Error al guardar el entrenamiento");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  // ─── Done screen ───────────────────────────────────────────
  if (phase === "done") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Check className="w-12 h-12 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">¡Entrenamiento completado!</h1>
          <p className="text-muted-foreground mt-2">Completaste {completedItems} de {totalItems} ítems.</p>
          {rpeOverall > 0 && <p className="text-sm text-primary font-medium mt-1">RPE reportado: {rpeOverall}/10</p>}
          {sessionTonnage > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Carga total: <span className="font-semibold text-foreground">{Math.round(sessionTonnage).toLocaleString()} kg</span>
            </p>
          )}
        </div>
        <button onClick={() => router.push("/alumno")}
          className="w-full max-w-xs bg-primary text-white font-semibold py-4 rounded-2xl hover:bg-primary/90 transition-colors">
          Volver al inicio
        </button>
        <Link href="/alumno/historial" className="text-sm text-primary hover:underline font-medium">
          Ver mi historial →
        </Link>
      </div>
    );
  }

  // ─── Summary screen ────────────────────────────────────────
  if (phase === "summary") {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-sidebar text-white px-4 pt-12 pb-6">
          <button onClick={() => setPhase("training")} className="flex items-center gap-2 text-white/70 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" /> Volver al entrenamiento
          </button>
          <h1 className="text-xl font-bold">¿Cómo estuvo el entrenamiento?</h1>
          <p className="text-white/60 text-sm mt-1">{completedItems} de {totalItems} ítems completados</p>
          {sessionTonnage > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 bg-white/15 rounded-xl px-3 py-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-white/70" />
              <span className="text-sm font-semibold text-white">{Math.round(sessionTonnage).toLocaleString()} kg movidos hoy</span>
            </div>
          )}
        </div>
        <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
          {/* RPE */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">Esfuerzo percibido (RPE)</h3>
              <p className="text-sm text-muted-foreground mt-0.5">¿Qué tan difícil fue la sesión?</p>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                <button key={val} onClick={() => setRpeOverall(val)}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${rpeOverall === val ? "bg-primary text-white shadow-md scale-105" : "bg-muted text-foreground hover:bg-primary/10"}`}>
                  {val}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>Muy fácil</span><span>Máximo esfuerzo</span></div>
          </div>
          {/* Comments */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border space-y-3">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-primary" /> Mensaje para tu entrenador
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">Opcional — se lo enviamos directamente</p>
            </div>
            <textarea value={comments} onChange={e => setComments(e.target.value)}
              placeholder="¿Cómo te sentiste? ¿Algún dolor? ¿Algo que quieras destacar..."
              rows={4} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <button onClick={handleFinish} disabled={submitting}
            className="w-full bg-primary text-white font-semibold py-4 rounded-2xl hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-lg">
            {submitting ? <><Loader2 className="w-5 h-5 animate-spin" />Guardando...</> : <><Send className="w-5 h-5" />Enviar y finalizar</>}
          </button>
        </div>
      </div>
    );
  }

  // ─── Training screen ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-sidebar text-white px-4 pt-12 pb-6 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/alumno" className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <p className="text-white/60 text-xs">{dayInfo?.cycle_name} · Semana {dayInfo?.week_number}</p>
            <h1 className="font-bold">Entrenamiento de hoy</h1>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-white/60">
            <span>{completedItems} de {totalItems} ítems</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-32">
        {blocks.map(block => {
          // Group exercises: singles and complexes
          type BlockItem =
            | { type: "single"; te: TrainingExercise }
            | { type: "complex"; complexId: string; items: TrainingExercise[] };

          const complexMap = new Map<string, TrainingExercise[]>();
          const blockItems: BlockItem[] = [];

          for (const te of block.training_exercises) {
            if (!te.complex_id) {
              blockItems.push({ type: "single", te });
            } else {
              if (!complexMap.has(te.complex_id)) complexMap.set(te.complex_id, []);
              complexMap.get(te.complex_id)!.push(te);
            }
          }
          for (const [complexId, items] of complexMap.entries()) {
            blockItems.push({ type: "complex", complexId, items: items.sort((a, b) => (a.complex_order ?? 0) - (b.complex_order ?? 0)) });
          }
          blockItems.sort((a, b) => {
            const aOrd = a.type === "single" ? a.te.order : Math.min(...a.items.map(e => e.order));
            const bOrd = b.type === "single" ? b.te.order : Math.min(...b.items.map(e => e.order));
            return aOrd - bOrd;
          });

          // ─── Render a single exercise row ─────────
          const renderSingleExercise = (te: TrainingExercise) => {
            const done = checkedExercises.has(te.id);
            const log = exerciseLogs[te.id];
            const suggestedKg = te.percentage_1rm && oneRMs[te.exercise_id]
              ? calculateWeight(oneRMs[te.exercise_id], te.percentage_1rm)
              : te.weight_target || undefined;

            const videoUrl = te.exercise_variants?.video_url || te.exercises?.video_url;

            return (
              <button key={te.id} onClick={() => handleExerciseTap(te)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left border-b border-border last:border-0 ${done ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${done ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                  {done && <Check className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold truncate ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {te.exercises?.name}
                      {te.exercise_variants?.name && <span className="text-primary font-bold ml-1">— {te.exercise_variants.name}</span>}
                    </p>
                    {videoUrl && (
                      <a href={videoUrl} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors shrink-0">
                        <Video className="w-3 h-3" /><span>Video</span>
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {te.sets} series × {te.reps} reps
                    {suggestedKg ? <span className="text-primary font-semibold ml-1">· {te.percentage_1rm}% → {suggestedKg} kg</span> : null}
                    {te.percentage_1rm && !suggestedKg ? <span className="text-orange-500 ml-1">· {te.percentage_1rm}% (sin 1RM)</span> : null}
                  </p>
                  {te.notes && <p className="text-xs text-orange-600 font-medium mt-0.5 italic">{te.notes}</p>}
                </div>
                {done && log && (
                  <div className="text-right shrink-0 flex items-center gap-1">
                    {log.set_weights && log.set_weights.length > 0 ? (
                      <div className="space-y-0.5">
                        {log.set_weights.map((w, i) => (
                          <p key={i} className="text-xs text-muted-foreground leading-tight"><span className="font-bold text-primary">{w}</span>kg</p>
                        ))}
                      </div>
                    ) : log.weight_used_kg ? (
                      <p className="text-sm font-bold text-primary">{log.weight_used_kg} kg</p>
                    ) : null}
                    <button
                      onClick={(e) => { e.stopPropagation(); setPendingPrompt(te); }}
                      className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </button>
            );
          };

          // ─── Render a complex/trepada as the trainer sees it ────
          const renderComplex = (complexId: string, items: TrainingExercise[]) => {
            const cSets = (complexSets[complexId] || []).sort((a, b) => a.set_number - b.set_number);
            const isComplex = items.length > 1;
            const firstEx = items[0];
            const firstOneRM = firstEx?.exercise_id ? oneRMs[firstEx.exercise_id] : undefined;
            const allSeriesDone = cSets.length > 0 && cSets.every(s => checkedSeries.has(s.id));

            // Build the complex title: "Arranque C1 + Arranque C3"
            const complexTitle = items.map(te => {
              const v = te.exercise_variants?.name ?? "";
              return v ? `${te.exercises?.name} ${v}` : te.exercises?.name;
            }).join(" + ");

            // Video url from any exercise in the complex
            const videoUrl = items.find(te => te.exercise_variants?.video_url || te.exercises?.video_url);
            const videoLink = videoUrl
              ? videoUrl.exercise_variants?.video_url || videoUrl.exercises?.video_url
              : null;

            return (
              <div key={complexId} className="border-b border-border last:border-0">
                {/* Complex header */}
                <div className={`px-4 py-3.5 ${allSeriesDone ? "bg-primary/5" : ""}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className={`text-xs font-bold uppercase tracking-wide ${allSeriesDone ? "text-muted-foreground" : "text-primary"}`}>
                      {isComplex ? "Complex" : "Trepada"} · {cSets.length} series
                    </span>
                    {allSeriesDone && (
                      <span className="text-xs bg-primary/20 text-primary font-semibold px-2 py-0.5 rounded-full">✓ Completado</span>
                    )}
                    {firstEx?.rest_seconds && (
                      <span className="text-xs text-muted-foreground ml-auto">Desc: {firstEx.rest_seconds}s</span>
                    )}
                  </div>
                  <p className={`text-sm font-semibold ${allSeriesDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {complexTitle}
                  </p>
                  {videoLink && (
                    <a href={videoLink} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors mt-1.5">
                      <Video className="w-3 h-3" /><span>Ver video</span>
                    </a>
                  )}
                  {/* Notes from any exercise */}
                  {items.some(te => te.notes) && (
                    <div className="mt-1.5">
                      {items.filter(te => te.notes).map(te => (
                        <p key={te.id} className="text-xs text-orange-600 font-medium italic">{te.notes}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Series rows */}
                {cSets.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {cSets.map(s => {
                      const seriesDone = checkedSeries.has(s.id);
                      const calcWeight = firstOneRM && s.percentage_1rm
                        ? Math.round((firstOneRM * s.percentage_1rm / 100) / 2.5) * 2.5
                        : null;
                      const loggedWeight = seriesWeights[s.id];
                      const isEditing = editingSeriesWeight === s.id;

                      // Build reps line: "1× Arranque C1 + 1× Arranque C3"
                      const repsLine = items.map(te => {
                        const ov = s.reps_overrides.find(o => o.training_exercise_id === te.id);
                        const r = ov ? ov.reps : te.reps;
                        const v = te.exercise_variants?.name ?? "";
                        return `${r}× ${v || te.exercises?.name}`;
                      }).join(" + ");

                      return (
                        <div key={s.id} className={`px-4 py-3 ${seriesDone ? "bg-green-50/50" : ""}`}>
                          <div className="flex items-center gap-3">
                            {/* Check button */}
                            <button
                              onClick={() => handleSeriesTap(s, items)}
                              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                seriesDone ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary"
                              }`}
                            >
                              {seriesDone && <Check className="w-4 h-4 text-white" />}
                            </button>

                            {/* Series info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold ${seriesDone ? "text-muted-foreground" : "text-primary/70"}`}>
                                  Serie {s.set_number}
                                </span>
                                {s.percentage_1rm ? (
                                  <span className={`text-sm font-bold ${seriesDone ? "text-muted-foreground" : "text-foreground"}`}>
                                    {s.percentage_1rm}%
                                    {calcWeight && (
                                      <span className={`ml-1 ${seriesDone ? "text-muted-foreground" : "text-primary"}`}>
                                        → {calcWeight} kg
                                      </span>
                                    )}
                                    {!calcWeight && !firstOneRM && (
                                      <span className="text-xs text-orange-500 font-normal ml-1">(sin 1RM)</span>
                                    )}
                                  </span>
                                ) : null}
                              </div>
                              <p className={`text-xs mt-0.5 ${seriesDone ? "text-muted-foreground/70" : "text-muted-foreground"}`}>
                                {repsLine}
                              </p>
                            </div>

                            {/* Weight logged / edit */}
                            <div className="shrink-0 flex items-center gap-1">
                              {seriesDone && !isEditing && (
                                <>
                                  {loggedWeight !== undefined && (
                                    <span className="text-sm font-bold text-primary">{loggedWeight} kg</span>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingSeriesWeight(s.id); }}
                                    className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                    title="Editar peso"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Inline weight editor */}
                          {isEditing && (
                            <InlineWeightEdit
                              currentKg={loggedWeight}
                              onSave={(kg) => {
                                setSeriesWeights(prev => ({ ...prev, [s.id]: kg }));
                                setEditingSeriesWeight(null);
                              }}
                              onCancel={() => setEditingSeriesWeight(null)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-xs text-muted-foreground italic border-t border-border/50">
                    Sin series configuradas por el entrenador
                  </div>
                )}
              </div>
            );
          };

          return (
            <div key={block.id} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <h3 className="font-semibold text-sm text-foreground">{block.name}</h3>
              </div>
              <div>
                {blockItems.map(item =>
                  item.type === "single"
                    ? renderSingleExercise(item.te)
                    : renderComplex(item.complexId, item.items)
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom action */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-background/95 backdrop-blur border-t border-border">
        <button onClick={handleFinish}
          className={`w-full font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-lg ${
            completedItems === totalItems && totalItems > 0
              ? "bg-primary text-white hover:bg-primary/90"
              : "bg-muted text-foreground hover:bg-muted/80"
          }`}>
          <Dumbbell className="w-5 h-5" />
          {completedItems === totalItems && totalItems > 0
            ? "¡Finalizar entrenamiento!"
            : `Finalizar (${completedItems}/${totalItems})`
          }
        </button>
      </div>

      {/* Weight prompt — single exercise */}
      {pendingPrompt && (
        <WeightPrompt
          exerciseName={`${pendingPrompt.exercises?.name}${pendingPrompt.exercise_variants?.name ? ` — ${pendingPrompt.exercise_variants.name}` : ""}`}
          suggestedKg={
            pendingPrompt.percentage_1rm && oneRMs[pendingPrompt.exercise_id]
              ? calculateWeight(oneRMs[pendingPrompt.exercise_id], pendingPrompt.percentage_1rm)
              : pendingPrompt.weight_target || undefined
          }
          sets={pendingPrompt.sets}
          onConfirm={handleWeightConfirm}
          onClose={() => setPendingPrompt(null)}
        />
      )}

      {/* Series confirmation modal */}
      {pendingSeriesConfirm && (() => {
        const { set, items, calcWeight } = pendingSeriesConfirm;
        const repsLine = items.map(te => {
          const ov = set.reps_overrides.find(o => o.training_exercise_id === te.id);
          const r = ov ? ov.reps : te.reps;
          const v = te.exercise_variants?.name ?? "";
          return `${r}× ${v || te.exercises?.name}`;
        }).join(" + ");

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
            <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div>
                <h3 className="font-bold text-foreground text-lg">Serie {set.set_number} completada</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {set.percentage_1rm ? `${set.percentage_1rm}%` : ""}
                  {calcWeight ? ` → ${calcWeight} kg` : ""}
                  {" · "}{repsLine}
                </p>
              </div>

              {calcWeight ? (
                <>
                  <p className="text-sm font-medium text-foreground">¿Hiciste esta serie con <span className="text-primary font-bold">{calcWeight} kg</span>?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => confirmSeriesWithWeight(calcWeight)}
                      className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Sí, con {calcWeight} kg
                    </button>
                    <button
                      onClick={() => {
                        const div = document.getElementById("series-custom-input");
                        if (div) div.classList.toggle("hidden");
                      }}
                      className="flex-1 py-3.5 rounded-2xl border-2 border-border font-semibold text-sm hover:border-primary/30 transition-colors"
                    >
                      No, otro peso
                    </button>
                  </div>
                  <div id="series-custom-input" className="hidden space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={customSeriesWeight}
                        onChange={e => setCustomSeriesWeight(e.target.value)}
                        placeholder="Ej: 52.5"
                        className="flex-1 px-4 py-3 rounded-xl border border-border text-base font-semibold text-center focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-muted-foreground font-medium">kg</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const n = parseFloat(customSeriesWeight);
                          confirmSeriesWithWeight(isNaN(n) ? undefined : n);
                        }}
                        className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold text-sm"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => confirmSeriesWithWeight(undefined)}
                        className="px-4 py-3 rounded-xl border border-border text-sm text-muted-foreground font-medium"
                      >
                        Omitir
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">¿Con qué peso hiciste esta serie? <span className="text-xs">(opcional)</span></p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={customSeriesWeight}
                      onChange={e => setCustomSeriesWeight(e.target.value)}
                      placeholder="Ej: 52.5"
                      className="flex-1 px-4 py-3 rounded-xl border border-border text-base font-semibold text-center focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-muted-foreground font-medium">kg</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const n = parseFloat(customSeriesWeight);
                        confirmSeriesWithWeight(isNaN(n) ? undefined : n);
                      }}
                      className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-semibold text-sm"
                    >
                      {customSeriesWeight ? "Guardar" : "Guardar sin peso"}
                    </button>
                  </div>
                </>
              )}

              <button
                onClick={() => setPendingSeriesConfirm(null)}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

