"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Check, Dumbbell, Loader2,
  Send, StickyNote, X, Video, Link2, Layers
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
  training_exercise_id: string;  // training_exercises.id (para compatibilidad schema original)
  exercise_id: string;
  variant_id?: string;
  weight_used_kg?: number;
  used_suggested: boolean;
  suggested_kg?: number;
  sets_completed: number;
  reps_completed: string;
  set_weights?: number[];        // per-set weights array
};

type Phase = "training" | "summary" | "done";

// ─── Weight Prompt Modal ──────────────────────────────────────
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
      // Pre-fill all sets with the current base weight
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
    if (mode === "bodyweight") {
      onConfirm(undefined, false, undefined);
      return;
    }

    if (perSet) {
      const parsed = setWeightInputs.map(w => {
        const n = parseFloat(w);
        return isNaN(n) ? 0 : n;
      });
      // Average for weight_used_kg (used as summary value)
      const avg = parsed.reduce((a, b) => a + b, 0) / parsed.length;
      onConfirm(isNaN(avg) ? undefined : parseFloat(avg.toFixed(2)), false, parsed);
    } else {
      if (mode === "suggested" && suggestedKg) {
        onConfirm(suggestedKg, true);
      } else {
        const kg = parseFloat(customWeight);
        onConfirm(isNaN(kg) ? undefined : kg, false);
      }
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
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode selection — hidden when perSet is active */}
        {!perSet && (
          <div className="space-y-3">
            {suggestedKg && (
              <button onClick={() => setMode("suggested")}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                  mode === "suggested" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                }`}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  mode === "suggested" ? "border-primary bg-primary" : "border-muted-foreground"
                }`}>
                  {mode === "suggested" && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">Con el peso sugerido</p>
                  <p className="text-2xl font-bold text-primary">{suggestedKg} kg</p>
                </div>
              </button>
            )}

            <button onClick={() => setMode("custom")}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                mode === "custom" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              }`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                mode === "custom" ? "border-primary bg-primary" : "border-muted-foreground"
              }`}>
                {mode === "custom" && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-foreground">Otro peso</p>
                {mode === "custom" && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      autoFocus
                      value={customWeight}
                      onChange={e => setCustomWeight(e.target.value)}
                      placeholder="Ej: 87.5"
                      className="w-28 px-3 py-1.5 rounded-lg border border-border text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-muted-foreground font-medium">kg</span>
                  </div>
                )}
              </div>
            </button>

            <button onClick={() => setMode("bodyweight")}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                mode === "bodyweight" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              }`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                mode === "bodyweight" ? "border-primary bg-primary" : "border-muted-foreground"
              }`}>
                {mode === "bodyweight" && <Check className="w-3 h-3 text-white" />}
              </div>
              <p className="font-semibold text-foreground">Con peso corporal / sin carga</p>
            </button>
          </div>
        )}

        {/* Per-set inputs */}
        {perSet && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Peso por serie ({sets} series)</p>
            {setWeightInputs.map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-8 text-sm font-bold text-muted-foreground text-right shrink-0">S{i + 1}</span>
                <input
                  type="number"
                  value={w}
                  onChange={e => updateSetWeight(i, e.target.value)}
                  placeholder="kg"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-border text-base font-semibold text-center focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground shrink-0">kg</span>
              </div>
            ))}
          </div>
        )}

        {/* Cargar por serie toggle — only when mode != bodyweight */}
        {mode !== "bodyweight" && (
          <button
            onClick={handleTogglePerSet}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
              perSet
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">
              {perSet ? "Cargar un solo peso para todas las series" : "Cargar por serie (peso distinto en cada una)"}
            </span>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${perSet ? "bg-primary" : "bg-muted-foreground/30"}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${perSet ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
          </button>
        )}

        <button onClick={handleConfirm}
          className="w-full bg-primary text-white font-semibold py-4 rounded-2xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
          <Check className="w-5 h-5" />
          Confirmar
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Training state
  const [phase, setPhase] = useState<Phase>("training");
  const [checkedExercises, setCheckedExercises] = useState<Set<string>>(new Set());
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLog>>({});
  const [pendingPrompt, setPendingPrompt] = useState<TrainingExercise | null>(null);

  // Summary state
  const [rpeOverall, setRpeOverall] = useState<number>(0);
  const [comments, setComments] = useState("");

  const allExercises = blocks.flatMap(b => b.training_exercises);
  const totalExercises = allExercises.length;
  const completedCount = checkedExercises.size;
  const progressPct = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

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

  // Handle exercise tap
  const handleExerciseTap = (te: TrainingExercise) => {
    if (checkedExercises.has(te.id)) {
      // Uncheck
      const newChecked = new Set(checkedExercises);
      newChecked.delete(te.id);
      setCheckedExercises(newChecked);
      const newLogs = { ...exerciseLogs };
      delete newLogs[te.id];
      setExerciseLogs(newLogs);
      return;
    }
    // Check — show weight prompt
    setPendingPrompt(te);
  };

  const handleWeightConfirm = (
    weightKg: number | undefined,
    usedSuggested: boolean,
    setWeights?: number[]
  ) => {
    if (!pendingPrompt) return;
    const te = pendingPrompt;
    const suggestedKg = te.percentage_1rm && oneRMs[te.exercise_id]
      ? calculateWeight(oneRMs[te.exercise_id], te.percentage_1rm)
      : te.weight_target || undefined;

    const newChecked = new Set(checkedExercises);
    newChecked.add(te.id);
    setCheckedExercises(newChecked);

    setExerciseLogs({
      ...exerciseLogs,
      [te.id]: {
        training_exercise_id: te.id,   // training_exercises.id
        exercise_id: te.exercise_id,
        variant_id: te.variant_id,
        weight_used_kg: weightKg,
        used_suggested: usedSuggested,
        suggested_kg: suggestedKg,
        sets_completed: te.sets,
        reps_completed: te.reps,
        set_weights: setWeights,
      },
    });
    setPendingPrompt(null);
  };

  // Tonnage for current session (preview in summary)
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
    if (phase === "training") {
      setPhase("summary");
      return;
    }

    // Submit
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
      // 1. Create session log
      const { data: session, error: sessionError } = await supabase
        .from("session_logs").insert({
          student_id: user!.id,
          training_day_id: dayId,   // columna original (NOT NULL en schema v1)
          day_id: dayId,             // columna nueva (migration 002)
          cycle_id: dayInfo?.cycle_id,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          rpe_overall: rpeOverall || null,
          comments: comments.trim() || null,
        }).select().single();

      if (sessionError) throw sessionError;

      // 2. Create exercise logs (with per-set weights)
      const logs = Object.values(exerciseLogs).map(log => ({
        session_log_id: session.id,
        training_exercise_id: log.training_exercise_id,  // columna original (NOT NULL en schema v1)
        exercise_id: log.exercise_id,
        variant_id: log.variant_id || null,
        sets_completed: log.sets_completed,
        reps_completed: log.reps_completed,
        weight_used_kg: log.weight_used_kg || null,
        set_weights: log.set_weights || null,
      }));

      if (logs.length > 0) {
        await supabase.from("exercise_logs").insert(logs);
      }

      // 3. Send notification to trainer
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
          <p className="text-muted-foreground mt-2">
            Completaste {completedCount} de {totalExercises} ejercicio{totalExercises !== 1 ? "s" : ""}.
          </p>
          {rpeOverall > 0 && (
            <p className="text-sm text-primary font-medium mt-1">RPE reportado: {rpeOverall}/10</p>
          )}
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
          <p className="text-white/60 text-sm mt-1">
            {completedCount} de {totalExercises} ejercicios completados
          </p>
          {sessionTonnage > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 bg-white/15 rounded-xl px-3 py-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-white/70" />
              <span className="text-sm font-semibold text-white">
                {Math.round(sessionTonnage).toLocaleString()} kg movidos hoy
              </span>
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
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${
                    rpeOverall === val
                      ? "bg-primary text-white shadow-md scale-105"
                      : "bg-muted text-foreground hover:bg-primary/10"
                  }`}>
                  {val}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Muy fácil</span>
              <span>Máximo esfuerzo</span>
            </div>
          </div>

          {/* Comments */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border space-y-3">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-primary" />
                Mensaje para tu entrenador
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">Opcional — se lo enviamos directamente</p>
            </div>
            <textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="¿Cómo te sentiste? ¿Algún dolor? ¿Algo que quieras destacar..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Exercise summary */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border space-y-3">
            <h3 className="font-semibold text-foreground">Resumen de pesos usados</h3>
            <div className="space-y-2">
              {allExercises.map(te => {
                const log = exerciseLogs[te.id];
                const done = checkedExercises.has(te.id);
                return (
                  <div key={te.id} className={`flex items-start gap-3 py-2 ${!done ? "opacity-40" : ""}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      done ? "bg-primary" : "bg-muted border border-border"
                    }`}>
                      {done && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm flex-1 text-foreground truncate">{te.exercises?.name}</span>
                    {log && (
                      <div className="text-right shrink-0">
                        {log.set_weights && log.set_weights.length > 0 ? (
                          <div className="space-y-0.5">
                            {log.set_weights.map((w, i) => (
                              <p key={i} className="text-xs text-muted-foreground leading-tight">
                                S{i + 1}: <span className="font-semibold text-primary">{w} kg</span>
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm font-semibold text-primary">
                            {log.weight_used_kg ? `${log.weight_used_kg} kg` : "corporal"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={handleFinish} disabled={submitting}
            className="w-full bg-primary text-white font-semibold py-4 rounded-2xl hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-lg">
            {submitting
              ? <><Loader2 className="w-5 h-5 animate-spin" />Guardando...</>
              : <><Send className="w-5 h-5" />Enviar y finalizar</>
            }
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
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-white/60">
            <span>{completedCount} de {totalExercises} ejercicios</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
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

          const renderExerciseRow = (te: TrainingExercise, inComplex = false) => {
            const done = checkedExercises.has(te.id);
            const log = exerciseLogs[te.id];
            const suggestedKg = te.percentage_1rm && oneRMs[te.exercise_id]
              ? calculateWeight(oneRMs[te.exercise_id], te.percentage_1rm)
              : te.weight_target || undefined;

            return (
              <button key={te.id} onClick={() => handleExerciseTap(te)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left ${
                  done ? "bg-primary/5" : "hover:bg-muted/30"
                } ${inComplex ? "border-b border-primary/10 last:border-0" : "border-b border-border last:border-0"}`}>
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  done ? "bg-primary border-primary" : "border-muted-foreground/40"
                }`}>
                  {done && <Check className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold truncate ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {te.exercises?.name}
                      {te.exercise_variants?.name && (
                        <span className="text-primary font-bold ml-1">— {te.exercise_variants.name}</span>
                      )}
                    </p>
                    {(() => {
                      const videoUrl = te.exercise_variants?.video_url || te.exercises?.video_url;
                      return videoUrl ? (
                        <a href={videoUrl} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors shrink-0">
                          <Video className="w-3 h-3" />
                          <span>Ver video</span>
                        </a>
                      ) : null;
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {!inComplex && `${te.sets} series × `}{te.reps} reps
                    {suggestedKg ? (
                      <span className="text-primary font-semibold ml-1">
                        · {te.percentage_1rm}% → {suggestedKg} kg
                      </span>
                    ) : null}
                  </p>
                  {te.notes && (
                    <p className="text-xs text-orange-600 font-medium mt-0.5 italic">{te.notes}</p>
                  )}
                </div>
                {done && log && (
                  <div className="text-right shrink-0">
                    {log.set_weights && log.set_weights.length > 0 ? (
                      <div className="space-y-0.5">
                        {log.set_weights.map((w, i) => (
                          <p key={i} className="text-xs text-muted-foreground leading-tight">
                            <span className="font-bold text-primary">{w}</span>kg
                          </p>
                        ))}
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">
                          {log.weight_used_kg ? `${log.weight_used_kg} kg` : "corporal"}
                        </p>
                        {!log.used_suggested && log.suggested_kg && log.weight_used_kg && (
                          <p className="text-xs text-muted-foreground">
                            {log.weight_used_kg > log.suggested_kg ? "↑" : "↓"} sug.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          };

          return (
            <div key={block.id} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <h3 className="font-semibold text-sm text-foreground">{block.name}</h3>
              </div>
              <div>
                {blockItems.map((item) =>
                  item.type === "single" ? (
                    renderExerciseRow(item.te)
                  ) : (
                    <div key={item.complexId}
                      className="border-b border-border last:border-0">
                      {/* Complex header */}
                      <div className="flex items-center gap-2 px-4 py-2 bg-primary/8 border-b border-primary/15">
                        <Link2 className="w-3 h-3 text-primary" />
                        <span className="text-xs font-bold text-primary uppercase tracking-wide flex-1">
                          Complex · {item.items[0]?.sets ?? 3} series
                        </span>
                        {item.items[0]?.rest_seconds && (
                          <span className="text-xs text-muted-foreground">
                            {item.items[0].rest_seconds}s desc.
                          </span>
                        )}
                      </div>
                      {/* Each exercise in the complex */}
                      {item.items.map((te, i) => (
                        <div key={te.id} className="relative">
                          {renderExerciseRow(te, true)}
                          {i < item.items.length - 1 && (
                            <div className="flex items-center justify-center py-0.5 bg-primary/5">
                              <span className="text-xs font-bold text-primary/50">+</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
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
            completedCount === totalExercises && totalExercises > 0
              ? "bg-primary text-white hover:bg-primary/90"
              : "bg-muted text-foreground hover:bg-muted/80"
          }`}>
          <Dumbbell className="w-5 h-5" />
          {completedCount === totalExercises && totalExercises > 0
            ? "¡Finalizar entrenamiento!"
            : `Finalizar (${completedCount}/${totalExercises})`
          }
        </button>
      </div>

      {/* Weight prompt modal */}
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
    </div>
  );
}
