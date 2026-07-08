"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Check, Dumbbell, Loader2,
  Send, StickyNote, X, Video, Link2, Layers,
  ChevronDown, ChevronUp, ChevronRight, Repeat, Pencil,
  Table, Tv, Sparkles,
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
type CfBlockExercise = {
  id: string;
  exercise_id: string;
  variant_id?: string;
  order: number;
  reps?: string;
  unit_override?: string;
  notes?: string;
  sets?: number;
  cf_exercises?: { id: string; name: string; category: string; default_unit: string; video_url?: string };
  cf_exercise_variants?: { id: string; name: string; video_url?: string };
  cf_wod_levels?: { id: string; level: string; value: string; notes?: string }[];
};
type Block = {
  id: string;
  name: string;
  type: string;
  order: number;
  wod_type?: string;
  wod_config?: Record<string, unknown>;
  training_exercises: TrainingExercise[];
  cf_block_exercises?: CfBlockExercise[];
};
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
  set_weights?: (number | undefined)[];
};

type Phase = "training" | "summary" | "done";
type ComplexSet = {
  id: string;
  complex_id: string;
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

// ─── Arcade Weight Control ───────────────────────────────────
function ArcadeWeightControl({
  value,
  onChange,
  suggestedValue,
  placeholder = "0"
}: {
  value: number | undefined;
  onChange: (val: number | undefined) => void;
  suggestedValue?: number;
  placeholder?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState("");
  const clickTimeoutRef = useRef<any>(null);

  const handleIncrement = (amount: number) => {
    const base = value !== undefined ? value : (suggestedValue !== undefined ? suggestedValue : 0);
    const next = Math.max(0, base + amount);
    onChange(parseFloat(next.toFixed(2)));
  };

  const handleBtnClick = (amountSingle: number, amountDouble: number) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      handleIncrement(amountDouble);
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        handleIncrement(amountSingle);
        clickTimeoutRef.current = null;
      }, 250);
    }
  };

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  if (isEditing) {
    return (
      <div className="flex items-center justify-center gap-1 select-none">
        <input
          type="number"
          step="any"
          autoFocus
          value={tempVal}
          onChange={e => setTempVal(e.target.value)}
          className="w-16 h-8 text-center font-bold border border-emerald-500 rounded bg-zinc-950 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          onBlur={() => {
            setIsEditing(false);
            const n = parseFloat(tempVal);
            onChange(isNaN(n) ? undefined : n);
          }}
          onKeyDown={e => {
            if (e.key === "Enter") {
              setIsEditing(false);
              const n = parseFloat(tempVal);
              onChange(isNaN(n) ? undefined : n);
            } else if (e.key === "Escape") {
              setIsEditing(false);
            }
          }}
        />
        <span className="text-[10px] text-zinc-400 font-bold">kg</span>
      </div>
    );
  }

  const displayVal = value !== undefined ? `${value} kg` : (suggestedValue !== undefined ? `[${suggestedValue} kg]` : placeholder);

  return (
    <div className="inline-flex items-center gap-1 select-none">
      <button
        type="button"
        onClick={() => handleBtnClick(-2.5, -10)}
        className="w-7 h-7 rounded-full flex items-center justify-center bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white active:scale-90 transition-all text-xs font-black"
      >
        -
      </button>
      <div
        onClick={() => {
          setTempVal(value !== undefined ? value.toString() : "");
          setIsEditing(true);
        }}
        className="min-w-[4.2rem] px-1 py-1 rounded border border-dashed border-zinc-700 hover:border-zinc-500 text-center font-bold text-xs cursor-pointer text-white hover:bg-zinc-800/50 transition-colors"
      >
        {displayVal}
      </div>
      <button
        type="button"
        onClick={() => handleBtnClick(2.5, 10)}
        className="w-7 h-7 rounded-full flex items-center justify-center bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white active:scale-90 transition-all text-xs font-black"
      >
        +
      </button>
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

// ─── Dropset Types & Helpers ──────────────────────────────────
type DropsetItem = { reps: string; drop: string };

const parseNotesAndDropsets = (notesStr?: string): { dropsets: DropsetItem[]; actualNotes: string } => {
  if (!notesStr) return { dropsets: [], actualNotes: "" };
  const match = notesStr.match(/^__dropset__:(\[.*?\])__(.*)$/s);
  if (match) {
    try {
      const dropsets = JSON.parse(match[1]) as DropsetItem[];
      return { dropsets, actualNotes: match[2] || "" };
    } catch (e) {
      console.error("Error parsing dropset notes:", e);
    }
  }
  return { dropsets: [], actualNotes: notesStr };
};

const getDropsetText = (ds: DropsetItem, baseWeight?: number) => {
  if (!baseWeight) return `${ds.reps} reps @ ${ds.drop}`;
  const cleanDrop = ds.drop.trim();
  if (cleanDrop.endsWith("%")) {
    const pct = parseFloat(cleanDrop.replace("%", ""));
    if (!isNaN(pct)) {
      if (pct < 0) {
        const dropWeight = Math.round((baseWeight * (1 + pct / 100)) / 2.5) * 2.5;
        return `${ds.reps} reps @ ${dropWeight} kg (${cleanDrop})`;
      } else {
        const dropWeight = Math.round((baseWeight * pct / 100) / 2.5) * 2.5;
        return `${ds.reps} reps @ ${dropWeight} kg (${cleanDrop})`;
      }
    }
  } else if (cleanDrop.toLowerCase().endsWith("kg")) {
    const kg = parseFloat(cleanDrop.replace(/kg/i, ""));
    if (!isNaN(kg)) {
      if (kg < 0) {
        const dropWeight = baseWeight + kg;
        return `${ds.reps} reps @ ${dropWeight} kg (${cleanDrop})`;
      } else {
        return `${ds.reps} reps @ ${kg} kg`;
      }
    }
  } else {
    const val = parseFloat(cleanDrop);
    if (!isNaN(val)) {
      if (val < 0) {
        const dropWeight = baseWeight + val;
        return `${ds.reps} reps @ ${dropWeight} kg (${val > 0 ? "+" : ""}${val}kg)`;
      } else {
        return `${ds.reps} reps @ ${val} kg`;
      }
    }
  }
  return `${ds.reps} reps @ ${ds.drop}`;
};

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
  const [viewMode, setViewMode] = useState<"interactive" | "pizarra">("interactive");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("entrenapp_student_view_mode");
      if (saved === "pizarra" || saved === "interactive") {
        setViewMode(saved);
      } else {
        setViewMode("interactive");
      }
    }
  }, []);

  const handleViewModeChange = (mode: "interactive" | "pizarra") => {
    setViewMode(mode);
    localStorage.setItem("entrenapp_student_view_mode", mode);
  };

  // Training state
  const [phase, setPhase] = useState<Phase>("training");
  const [checkedExercises, setCheckedExercises] = useState<Set<string>>(new Set());
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLog>>({});
  const [pendingPrompt, setPendingPrompt] = useState<TrainingExercise | null>(null);
  // Complex: check por serie
  const [checkedSeries, setCheckedSeries] = useState<Set<string>>(new Set());
  const [seriesWeights, setSeriesWeights] = useState<Record<string, number | undefined>>({});
  const [editingSeriesWeight, setEditingSeriesWeight] = useState<string | null>(null);
  const [completedSingleSets, setCompletedSingleSets] = useState<Set<string>>(new Set());
  const [expandedSet, setExpandedSet] = useState<string | null>(null);
  // Series confirmation modal state
  const [pendingSeriesConfirm, setPendingSeriesConfirm] = useState<{
    set: ComplexSet;
    items: TrainingExercise[];
    calcWeight: number | null;
  } | null>(null);
  const [pendingSingleSetConfirm, setPendingSingleSetConfirm] = useState<{
    te: TrainingExercise;
    setIdx: number;
    calcWeight: number | null;
  } | null>(null);
  const [customSeriesWeight, setCustomSeriesWeight] = useState("");

  // Summary state
  const [rpeOverall, setRpeOverall] = useState<number>(0);
  const [comments, setComments] = useState("");

  const allExercises = blocks.flatMap(b => b.training_exercises);
  const singleExercises = blocks.flatMap(b => {
    if (b.type === "prep_fisica") return [];
    return b.training_exercises.filter(te => !te.complex_id);
  });
  const totalSeries = Object.values(complexSets).reduce((n, sets) => n + sets.length, 0);
  const totalItems = singleExercises.length + totalSeries;
  const completedItems = checkedExercises.size + checkedSeries.size;
  const progressPct = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<string, boolean>>({});

  const isBlockCompleted = (block: Block) => {
    const isCfBlock = dayInfo?.cycle_type === "crossfit" && block.type !== "fuerza" && block.type !== "prep_fisica";
    if (isCfBlock) {
      const exercises = block.cf_block_exercises || [];
      if (exercises.length === 0) return false;
      return exercises.every((ex) => checkedExercises.has(ex.id));
    } else {
      const singles = block.training_exercises.filter((te) => !te.complex_id);
      const complexes = block.training_exercises.filter((te) => te.complex_id);
      const singlesDone = singles.every((te) => checkedExercises.has(te.id));
      
      const complexIds = Array.from(new Set(complexes.map((te) => te.complex_id)));
      const complexesDone = complexIds.every((cId) => {
        const cSets = complexSets[cId] || [];
        if (cSets.length === 0) return true;
        return cSets.every((s) => checkedSeries.has(s.id));
      });
      
      return singlesDone && complexesDone;
    }
  };

  const toggleBlockCompleted = (block: Block) => {
    const isCompleted = isBlockCompleted(block);
    const isCfBlock = dayInfo?.cycle_type === "crossfit" && block.type !== "fuerza" && block.type !== "prep_fisica";
    
    if (isCfBlock) {
      const exercises = block.cf_block_exercises || [];
      setCheckedExercises(prev => {
        const next = new Set(prev);
        exercises.forEach((ex) => {
          if (isCompleted) {
            next.delete(ex.id);
          } else {
            next.add(ex.id);
          }
        });
        return next;
      });
    } else {
      const singles = block.training_exercises.filter((te) => !te.complex_id);
      const complexes = block.training_exercises.filter((te) => te.complex_id);
      
      setCheckedExercises(prev => {
        const next = new Set(prev);
        singles.forEach((te) => {
          if (isCompleted) {
            next.delete(te.id);
          } else {
            next.add(te.id);
          }
        });
        return next;
      });

      const complexIds = Array.from(new Set(complexes.map((te) => te.complex_id)));
      setCheckedSeries(prev => {
        const next = new Set(prev);
        complexIds.forEach((cId) => {
          const cSets = complexSets[cId] || [];
          cSets.forEach((s) => {
            if (isCompleted) {
              next.delete(s.id);
            } else {
              next.add(s.id);
            }
          });
        });
        return next;
      });
    }

    if (!isCompleted) {
      setCollapsedBlocks(prev => ({
        ...prev,
        [block.id]: true
      }));
    }
  };

  useEffect(() => {
    const load = async () => {
      // Usamos el API route server-side que usa el admin client
      // para bypassear el RLS que bloquea el join training_exercises → exercises
      // (el nombre del ejercicio aparecía como "undefined" para el alumno)
      const res = await fetch(`/api/training/${dayId}`);
      if (!res.ok) {
        console.error("[entrenar] Error al cargar el entrenamiento:", res.status);
        setLoading(false);
        return;
      }

      const json = await res.json();
      const { blocks: blocksData, complexSets: setsData, oneRMs: ormsData, dayInfo: di } = json;

      if (blocksData) {
        const sorted = (blocksData as unknown as Block[]).map(b => ({
          ...b,
          training_exercises: (b.training_exercises || []).sort((a, b) => a.order - b.order),
          cf_block_exercises: (b.cf_block_exercises || []).sort((a, b) => a.order - b.order),
        }));
        setBlocks(sorted);

        const hasCf = sorted.some(b => b.type !== "fuerza");
        if (hasCf) {
          setViewMode("pizarra");
        }

        if (setsData) {
          const grouped: Record<string, ComplexSet[]> = {};
          for (const s of setsData as ComplexSet[]) {
            if (!grouped[s.complex_id]) grouped[s.complex_id] = [];
            grouped[s.complex_id].push({
              id: s.id, complex_id: s.complex_id,
              set_number: s.set_number,
              percentage_1rm: s.percentage_1rm ?? null,
              weight_target: s.weight_target ?? null,
              reps_overrides: (s.reps_overrides as any[]) || [],
              rounds: s.rounds ?? 1,
            });
          }
          setComplexSets(grouped);
        }
      }

      if (di) {
        setDayInfo({
          cycle_id: di.cycle_id,
          cycle_name: di.cycle_name,
          week_number: di.week_number,
          cycle_type: di.cycle_type,
        });
      }

      if (ormsData) {
        const map: Record<string, number> = {};
        (ormsData as { exercise_id: string; weight_kg: number }[]).forEach(r => {
          map[r.exercise_id] = r.weight_kg;
        });
        setOneRMs(map);
      }

      // Cargar progreso previo de localStorage antes de marcar loading como false
      try {
        const saved = localStorage.getItem(`entrenapp_progress_${dayId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.checkedExercises) setCheckedExercises(new Set(parsed.checkedExercises));
          if (parsed.checkedSeries) setCheckedSeries(new Set(parsed.checkedSeries));
          if (parsed.exerciseLogs) setExerciseLogs(parsed.exerciseLogs);
          if (parsed.seriesWeights) setSeriesWeights(parsed.seriesWeights);
          if (parsed.completedSingleSets) {
            setCompletedSingleSets(new Set(parsed.completedSingleSets));
          } else if (parsed.exerciseLogs) {
            const initialCompleted = new Set<string>();
            Object.keys(parsed.exerciseLogs).forEach(teId => {
              const log = parsed.exerciseLogs[teId];
              if (log && log.set_weights) {
                log.set_weights.forEach((w: any, idx: number) => {
                  if (w !== undefined) initialCompleted.add(`${teId}-${idx}`);
                });
              }
            });
            setCompletedSingleSets(initialCompleted);
          }
        }
      } catch (e) {
        console.error("Error al cargar progreso guardado:", e);
      }

      setLoading(false);
    };
    load();
  }, [dayId]);

  // Sincronizar cambios en localStorage cuando cambie el estado del entrenamiento
  useEffect(() => {
    if (loading) return;
    try {
      const data = {
        checkedExercises: Array.from(checkedExercises),
        checkedSeries: Array.from(checkedSeries),
        exerciseLogs,
        seriesWeights,
        completedSingleSets: Array.from(completedSingleSets),
      };
      localStorage.setItem(`entrenapp_progress_${dayId}`, JSON.stringify(data));
    } catch (e) {
      console.error("Error al guardar progreso:", e);
    }
  }, [checkedExercises, checkedSeries, exerciseLogs, seriesWeights, completedSingleSets, loading, dayId]);




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

  const handleSingleSetWeightChange = (te: TrainingExercise, setIdx: number, weight: number | undefined) => {
    setExerciseLogs(prev => {
      const log = prev[te.id] || {
        training_exercise_id: te.id,
        exercise_id: te.exercise_id,
        variant_id: te.variant_id,
        weight_used_kg: undefined,
        used_suggested: false,
        suggested_kg: te.percentage_1rm && oneRMs[te.exercise_id]
          ? calculateWeight(oneRMs[te.exercise_id], te.percentage_1rm)
          : te.weight_target || undefined,
        sets_completed: 0,
        reps_completed: te.reps,
        set_weights: Array(te.sets).fill(undefined),
      };

      const newWeights = [...(log.set_weights || Array(te.sets).fill(undefined))];
      newWeights[setIdx] = weight;

      const completedWeights = newWeights.filter((w): w is number => w !== undefined);
      const avgWeight = completedWeights.length > 0
        ? parseFloat((completedWeights.reduce((a, b) => a + b, 0) / completedWeights.length).toFixed(2))
        : undefined;

      return {
        ...prev,
        [te.id]: {
          ...log,
          set_weights: newWeights,
          weight_used_kg: avgWeight,
        }
      };
    });
  };

  const handleSingleSetCompleteToggle = (te: TrainingExercise, setIdx: number) => {
    const setKey = `${te.id}-${setIdx}`;
    const isDone = completedSingleSets.has(setKey);
    const next = new Set(completedSingleSets);

    if (isDone) {
      next.delete(setKey);
    } else {
      next.add(setKey);
      const suggestedKg = te.percentage_1rm && oneRMs[te.exercise_id]
        ? calculateWeight(oneRMs[te.exercise_id], te.percentage_1rm)
        : te.weight_target || undefined;

      const log = exerciseLogs[te.id];
      const currentSetWeight = log?.set_weights?.[setIdx];
      if (currentSetWeight === undefined && suggestedKg !== undefined) {
        handleSingleSetWeightChange(te, setIdx, suggestedKg);
      }
    }

    setCompletedSingleSets(next);

    const completedCountForTe = Array.from({ length: te.sets }).filter((_, idx) =>
      next.has(`${te.id}-${idx}`)
    ).length;

    setCheckedExercises(prev => {
      const newChecked = new Set(prev);
      if (completedCountForTe === te.sets) {
        newChecked.add(te.id);
      } else {
        newChecked.delete(te.id);
      }
      return newChecked;
    });

    setExerciseLogs(prev => {
      const log = prev[te.id] || {
        training_exercise_id: te.id,
        exercise_id: te.exercise_id,
        variant_id: te.variant_id,
        weight_used_kg: undefined,
        used_suggested: false,
        suggested_kg: te.percentage_1rm && oneRMs[te.exercise_id]
          ? calculateWeight(oneRMs[te.exercise_id], te.percentage_1rm)
          : te.weight_target || undefined,
        sets_completed: 0,
        reps_completed: te.reps,
        set_weights: Array(te.sets).fill(undefined),
      };

      return {
        ...prev,
        [te.id]: {
          ...log,
          sets_completed: completedCountForTe,
        }
      };
    });
  };

  // ─── Complex tap (chalkboard) — toggle all sets inside a complex at once ───
  const handleComplexTap = (complexId: string, items: TrainingExercise[]) => {
    const cSets = complexSets[complexId] || [];
    const allDone = cSets.length > 0 && cSets.every(s => checkedSeries.has(s.id));
    
    setCheckedSeries(prev => {
      const next = new Set(prev);
      cSets.forEach(s => {
        if (allDone) {
          next.delete(s.id);
        } else {
          next.add(s.id);
        }
      });
      return next;
    });

    setSeriesWeights(prev => {
      const next = { ...prev };
      cSets.forEach(s => {
        if (allDone) {
          delete next[s.id];
        } else {
          if (next[s.id] === undefined) {
            const firstEx = items[0];
            const firstOneRM = firstEx?.exercise_id ? oneRMs[firstEx.exercise_id] : undefined;
            const calcWeight = firstOneRM && s.percentage_1rm
              ? Math.round((firstOneRM * s.percentage_1rm / 100) / 2.5) * 2.5
              : s.weight_target || undefined;
            next[s.id] = calcWeight;
          }
        }
      });
      return next;
    });
  };

  // Helper for Pizarra view complex/trepada aggregation
  const getComplexPizarraSummary = (items: TrainingExercise[], cSets: ComplexSet[]) => {
    if (cSets.length === 0) return { displayText: items.map(te => te.exercises?.name).join(" + "), weightsSummary: "" };

    const firstEx = items[0];
    const isSingleExercise = items.length === 1;

    // 1. Reps and exercise text
    let displayText = "";
    if (isSingleExercise) {
      const repsArray = cSets.map(s => {
        const ov = s.reps_overrides.find(o => o.training_exercise_id === firstEx.id);
        return ov ? ov.reps : firstEx.reps;
      });
      const allSame = repsArray.every(r => r === repsArray[0]);
      const repsText = allSame ? `${repsArray[0]} reps` : `${repsArray.join("-")} reps`;
      
      const v = firstEx.exercise_variants?.name ?? "";
      const nameText = v ? `${firstEx.exercises?.name} (${v})` : firstEx.exercises?.name;
      displayText = `${cSets.length} series: ${repsText} de ${nameText}`;
    } else {
      // Multi-exercise complex
      const exercisesRepsConstant = items.every(te => {
        const firstReps = cSets[0] ? (cSets[0].reps_overrides.find(o => o.training_exercise_id === te.id)?.reps ?? te.reps) : te.reps;
        return cSets.every(s => {
          const r = s.reps_overrides.find(o => o.training_exercise_id === te.id)?.reps ?? te.reps;
          return r === firstReps;
        });
      });

      if (exercisesRepsConstant) {
        const itemsText = items.map(te => {
          const r = cSets[0] ? (cSets[0].reps_overrides.find(o => o.training_exercise_id === te.id)?.reps ?? te.reps) : te.reps;
          const v = te.exercise_variants?.name ?? "";
          const displayName = v ? `${te.exercises?.name} (${v})` : te.exercises?.name;
          return `${r} ${displayName}`;
        }).join(" + ");
        displayText = `${cSets.length} series: ${itemsText}`;
      } else {
        const itemsText = items.map(te => {
          const repsArray = cSets.map(s => s.reps_overrides.find(o => o.training_exercise_id === te.id)?.reps ?? te.reps);
          const v = te.exercise_variants?.name ?? "";
          const displayName = v ? `${te.exercises?.name} (${v})` : te.exercises?.name;
          return `${repsArray.join("-")} ${displayName}`;
        }).join(" + ");
        displayText = `${cSets.length} series: ${itemsText}`;
      }
    }

    // 2. Weights summary
    let weightsSummary = "";
    const firstOneRM = firstEx?.exercise_id ? oneRMs[firstEx.exercise_id] : undefined;
    const weightsArray = cSets.map(s => {
      if (seriesWeights[s.id] !== undefined) return seriesWeights[s.id];
      const calcWeight = firstOneRM && s.percentage_1rm
        ? Math.round((firstOneRM * s.percentage_1rm / 100) / 2.5) * 2.5
        : s.percentage_1rm ? null : s.weight_target || undefined;
      return calcWeight;
    });

    const validWeights = weightsArray.filter((w): w is number => typeof w === "number");
    if (validWeights.length > 0) {
      const minW = Math.min(...validWeights);
      const maxW = Math.max(...validWeights);
      if (minW === maxW) {
        weightsSummary = `[Sug: ${minW} kg]`;
      } else {
        weightsSummary = `[Sug: ${minW} a ${maxW} kg]`;
      }
    }

    return { displayText, weightsSummary };
  };

  // Tonnage
  const sessionTonnage = Object.values(exerciseLogs).reduce((total, log) => {
    if (!log.weight_used_kg) return total;
    const reps = parseFloat(log.reps_completed) || 1;
    if (log.set_weights && log.set_weights.length > 0) {
      return total + log.set_weights.reduce<number>((acc, w) => acc + (w ?? 0) * reps, 0);
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
          completed: true,
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

      localStorage.removeItem(`entrenapp_progress_${dayId}`);
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
      <div className="bg-sidebar text-white px-4 pt-12 pb-6 sticky top-0 z-10 shadow-sm">
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

        {/* View Switcher */}
        {dayInfo?.cycle_type !== "crossfit" && (
          <div className="mt-4 flex gap-1 bg-white/10 p-1 rounded-xl text-xs">
            <button
              onClick={() => handleViewModeChange("interactive")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold transition-all ${
                viewMode === "interactive" ? "bg-white text-slate-900 shadow" : "text-white/80 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Interactiva
            </button>
            <button
              onClick={() => handleViewModeChange("pizarra")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold transition-all ${
                viewMode === "pizarra" ? "bg-white text-slate-900 shadow" : "text-white/80 hover:text-white"
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              Pizarra
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-4 max-w-4xl mx-auto pb-32">
        {/* VISTA INTERACTIVA */}
        {viewMode === "interactive" && (
          <div className="space-y-4">
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
            const cSets = [...(complexSets[complexId] || [])].sort((a, b) => a.set_number - b.set_number);
            const isPrep = block.type === "prep_fisica";
            const isComplex = items.length > 1;
            const firstEx = items[0];
            const firstOneRM = firstEx?.exercise_id ? oneRMs[firstEx.exercise_id] : undefined;
            const allSeriesDone = cSets.length > 0 && cSets.every(s => checkedSeries.has(s.id));

            // Build the complex title
            const complexTitle = isPrep
              ? "Circuito de Preparación Física"
              : items.map(te => {
                  const v = te.exercise_variants?.name ?? "";
                  return v ? `${te.exercises?.name} ${v}` : te.exercises?.name;
                }).join(" + ");

            // Video url from any exercise in the complex
            const videoUrl = items.find(te => te.exercise_variants?.video_url || te.exercises?.video_url);
            const videoLink = videoUrl
              ? videoUrl.exercise_variants?.video_url || videoUrl.exercises?.video_url
              : null;

            return (
              <div key={complexId} className={`border-b border-border last:border-0 ${isPrep ? "bg-emerald-50/[0.02]" : ""}`}>
                {/* Complex header */}
                <div className={`px-4 py-3.5 ${allSeriesDone ? "bg-primary/5" : isPrep ? "bg-emerald-500/[0.03]" : ""}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Link2 className={`w-3.5 h-3.5 shrink-0 ${isPrep ? "text-emerald-600" : "text-primary"}`} />
                    <span className={`text-xs font-bold uppercase tracking-wide ${
                      allSeriesDone 
                        ? "text-muted-foreground" 
                        : isPrep 
                          ? "text-emerald-600" 
                          : "text-primary"
                    }`}>
                      {isPrep ? "Circuito Prep. Física" : isComplex ? "Complex" : "Trepada"} · {cSets.length} series
                    </span>
                    {allSeriesDone && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPrep ? "bg-emerald-100 text-emerald-700" : "bg-primary/20 text-primary"}`}>✓ Completado</span>
                    )}
                    {firstEx?.rest_seconds && (
                      <span className="text-xs text-muted-foreground ml-auto">Desc: {firstEx.rest_seconds}s</span>
                    )}
                  </div>
                  <p className={`text-sm font-semibold ${allSeriesDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {complexTitle}
                  </p>
                  {isPrep && (
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      {items.map((te, idx) => (
                        <span key={te.id}>
                          {idx > 0 && " · "}{te.exercises?.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {videoLink && (
                    <a href={videoLink} target="_blank" rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors mt-1.5 ${
                        isPrep 
                          ? "text-emerald-700 bg-emerald-100 hover:bg-emerald-200" 
                          : "text-primary bg-primary/10 hover:bg-primary/20"
                      }`}>
                      <Video className="w-3 h-3" /><span>Ver video</span>
                    </a>
                  )}
                  {/* Notes from any exercise */}
                  {items.some(te => te.notes) && (
                    <div className="mt-1.5 space-y-0.5">
                      {items.filter(te => te.notes).map(te => (
                        <p key={te.id} className="text-xs text-orange-600 font-medium italic">
                          * {isPrep ? `${te.exercises?.name}: ` : ""}{te.notes}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Series rows */}
                {cSets.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {cSets.map(s => {
                      const seriesDone = checkedSeries.has(s.id);
                      const loggedWeight = seriesWeights[s.id];
                      const isEditing = editingSeriesWeight === s.id;

                      return (
                        <div key={s.id} className={`px-4 py-3 ${seriesDone ? "bg-green-50/50" : ""}`}>
                          <div className="flex items-start gap-3">
                            {/* Check button */}
                            <button
                              onClick={() => handleSeriesTap(s, items)}
                              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all mt-0.5 ${
                                seriesDone 
                                  ? isPrep 
                                    ? "bg-emerald-500 border-emerald-500" 
                                    : "bg-primary border-primary" 
                                  : "border-muted-foreground/40 hover:border-primary"
                              }`}
                            >
                              {seriesDone && <Check className="w-4 h-4 text-white" />}
                            </button>

                            {/* Series info */}
                            <div className="flex-1 min-w-0">
                              <span className={`text-xs font-bold ${seriesDone ? "text-muted-foreground" : isPrep ? "text-emerald-700" : "text-primary/70"}`}>
                                Ronda {s.set_number}
                              </span>

                              {isPrep ? (
                                <div className="space-y-1 mt-1 pl-2 border-l-2 border-emerald-500/20">
                                  {items.map(te => {
                                    const ov = s.reps_overrides.find(o => o.training_exercise_id === te.id);
                                    const r = ov ? ov.reps : te.reps;
                                    const ovPct = ov?.percentage_1rm;
                                    const ovWt = ov?.weight_target;
                                    const basePct = te.percentage_1rm;
                                    const baseWt = te.weight_target;

                                    let pct = null;
                                    let wt = null;

                                    if (ovPct !== undefined || ovWt !== undefined) {
                                      pct = ovPct ?? null;
                                      wt = ovWt ?? null;
                                    } else {
                                      pct = basePct ?? null;
                                      wt = baseWt ?? null;
                                    }

                                    const exOneRM = te.exercise_id ? oneRMs[te.exercise_id] : undefined;
                                    const calcExWeight = exOneRM && pct
                                      ? Math.round((exOneRM * pct / 100) / 2.5) * 2.5
                                      : wt || null;

                                    const v = te.exercise_variants?.name ?? "";
                                    const displayName = v ? `${te.exercises?.name} (${v})` : te.exercises?.name;

                                    return (
                                      <div key={te.id} className="text-xs flex justify-between gap-4 py-0.5">
                                        <span className={`${seriesDone ? "text-muted-foreground line-through" : "text-foreground font-medium"}`}>{displayName}</span>
                                        <span className={`font-mono text-[11px] font-bold shrink-0 ${seriesDone ? "text-muted-foreground" : "text-slate-600"}`}>
                                          {r} reps {calcExWeight ? `@ ${calcExWeight} kg` : pct ? `@ ${pct}%` : ""}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <>
                                  {s.rounds && s.rounds > 1 && (
                                    <span className="text-[10px] bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm animate-pulse shrink-0 ml-2">
                                      {s.rounds} Rondas
                                    </span>
                                  )}
                                  {s.percentage_1rm ? (
                                    <span className={`text-sm font-bold ml-2 ${seriesDone ? "text-muted-foreground" : "text-foreground"}`}>
                                      {s.percentage_1rm}%
                                      {firstOneRM && (
                                        <span className={`ml-1 ${seriesDone ? "text-muted-foreground" : "text-primary"}`}>
                                          → {Math.round((firstOneRM * s.percentage_1rm / 100) / 2.5) * 2.5} kg
                                        </span>
                                      )}
                                    </span>
                                  ) : null}
                                  <p className={`text-xs mt-0.5 ${seriesDone ? "text-muted-foreground/70" : "text-muted-foreground"}`}>
                                    {items.map(te => {
                                      const ov = s.reps_overrides.find(o => o.training_exercise_id === te.id);
                                      const r = ov ? ov.reps : te.reps;
                                      const v = te.exercise_variants?.name ?? "";
                                      const displayName = v ? `${te.exercises?.name} — ${v}` : te.exercises?.name;
                                      return `${r}× ${displayName}`;
                                    }).join(" + ")}
                                  </p>
                                </>
                              )}
                            </div>

                            {/* Weight logged / edit */}
                            <div className="shrink-0 flex items-center gap-1 self-start mt-0.5">
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
              {block.wod_config?.notes && (
                <div className="px-4 py-3 bg-zinc-50 border-t border-border text-xs text-zinc-500 italic">
                  * Notas: {block.wod_config.notes}
                </div>
              )}
            </div>
          );
        })}
          </div>
        )}

        {/* VISTA PIZARRA (ESTILO WOD PINTEREST - ACCESIBILIDAD MÁXIMA) */}
        {viewMode === "pizarra" && (
          <div className="space-y-8 my-2 font-sans relative">
            <div className="pb-4 border-b border-zinc-200 space-y-1">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#ff5252]">
                Pizarra de Entrenamiento
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight uppercase">
                {dayInfo?.cycle_name || "Planificación"}
              </h2>
              <p className="text-base text-zinc-500 font-semibold">
                Semana {dayInfo?.week_number}
              </p>
            </div>

            <div className="space-y-10">
              {blocks.map(block => {
                const isCfBlock = dayInfo?.cycle_type === "crossfit" && block.type !== "fuerza" && block.type !== "prep_fisica";

                if (isCfBlock) {
                  const exercises = block.cf_block_exercises || [];
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

                  const showWodConfig = block.type === "metcon" || block.type === "skill";
                  const wodTypeLabel = block.wod_type ? block.wod_type.toUpperCase() : "SERIES";

                  const isCollapsed = collapsedBlocks[block.id];
                  const isDone = isBlockCompleted(block);

                  return (
                    <div key={block.id} className="space-y-4 animate-in fade-in duration-300">
                      <div className="border-b border-zinc-200 pb-1 flex items-center justify-between select-none">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCollapsedBlocks(prev => ({ ...prev, [block.id]: !prev[block.id] }))}
                            className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors shrink-0"
                          >
                            {isCollapsed ? <ChevronRight className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                          </button>
                          <h3
                            onClick={() => setCollapsedBlocks(prev => ({ ...prev, [block.id]: !prev[block.id] }))}
                            className={`text-2xl font-black ${typeColor} uppercase tracking-widest pt-2 cursor-pointer flex-1`}
                          >
                            {block.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleBlockCompleted(block)}
                            className={`px-3 py-1 text-xs font-black rounded-xl border transition-all flex items-center gap-1.5 active:scale-95 ${
                              isDone
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                                : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:border-zinc-300"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>{isDone ? "Completo" : "Completar"}</span>
                          </button>

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
                      </div>

                      {!isCollapsed && (
                        <>
                          {showWodConfig && (
                            <div className="text-xs text-zinc-500 font-medium bg-zinc-50 border border-zinc-100 rounded-xl p-3 flex flex-wrap gap-x-4 gap-y-1">
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

                          {(() => {
                            const isWarmUpOrMobility = block.type === "warm_up" || block.type === "mobility";
                            const blockSets = block.wod_config?.sets 
                              ? Number(block.wod_config.sets) 
                              : (isWarmUpOrMobility 
                                ? (exercises.find(e => e.sets)?.sets || 3)
                                : (block.wod_type === "emom" && block.wod_config?.total_minutes && block.wod_config?.every_seconds
                                  ? Math.round(Number(block.wod_config.total_minutes) / (Number(block.wod_config.every_seconds) / 60))
                                  : undefined));

                            if (blockSets) {
                              return (
                                <div className="flex flex-col md:flex-row gap-4 items-stretch">
                                  {/* Left bracket indicating block sets */}
                                  <div className="flex flex-row md:flex-col justify-center items-center px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl md:min-w-[85px] shrink-0 text-center select-none shadow-sm gap-2 md:gap-0">
                                    <div className="flex flex-col items-center">
                                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Total</span>
                                      <span className="text-2xl font-black text-slate-900 leading-none">{blockSets}</span>
                                      <span className="text-xs font-bold text-[#ff5252] leading-none mt-1">Series</span>
                                    </div>
                                    
                                    {block.wod_config?.has_internal_loop && block.wod_config?.vueltas_por_serie && (
                                      <div className="md:mt-3 md:pt-2 md:border-t border-zinc-200 w-full flex flex-row md:flex-col items-center gap-1 md:gap-0 justify-center">
                                        <Repeat className="w-3.5 h-3.5 text-zinc-400 mb-0.5" />
                                        <span className="text-[9px] font-bold text-zinc-500 uppercase leading-tight hidden md:inline">Circuito</span>
                                        <span className="text-[10px] font-black text-emerald-600 leading-none">{block.wod_config.vueltas_por_serie} vueltas</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Exercises List */}
                                  <div className="flex-1 space-y-4">
                                    {exercises.map((cfEx) => {
                                      const hasLevels = cfEx.cf_wod_levels && cfEx.cf_wod_levels.some(l => l.value.trim() !== "");
                                      const videoUrl = cfEx.cf_exercise_variants?.video_url || cfEx.cf_exercises?.video_url;

                                      return (
                                        <div
                                          key={cfEx.id}
                                          className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-3 hover:border-zinc-300 transition-colors"
                                        >
                                          <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1 flex-1 min-w-0">
                                              <h4 className="text-slate-900 font-extrabold text-lg sm:text-xl leading-tight">
                                                {cfEx.cf_exercises?.name || "Ejercicio"}
                                                {cfEx.cf_exercise_variants?.name && (
                                                  <span className="text-emerald-600 font-bold ml-1.5">— {cfEx.cf_exercise_variants.name}</span>
                                                )}
                                              </h4>

                                              {!hasLevels ? (
                                                cfEx.reps && (() => {
                                                  const repsStr = cfEx.reps || "—";
                                                  const isGenderSplit = repsStr.includes("/");

                                                  return (
                                                    <div className="text-zinc-500 text-xs font-semibold flex flex-wrap items-center gap-2 mt-1">
                                                      <span className="px-2 py-0.5 bg-zinc-50 rounded-md border border-zinc-100 text-zinc-700 font-mono flex items-center gap-1">
                                                        {isGenderSplit ? (
                                                          (() => {
                                                            const [male, female] = repsStr.split("/");
                                                            return (
                                                              <span className="inline-flex items-center gap-1">
                                                                <span className="text-blue-500 font-black">♂</span>
                                                                <span className="text-zinc-700">{male || "—"}</span>
                                                                <span className="text-zinc-400">/</span>
                                                                <span className="text-rose-500 font-black">♀</span>
                                                                <span className="text-zinc-700">{female || "—"}</span>
                                                              </span>
                                                            );
                                                          })()
                                                        ) : (
                                                          repsStr
                                                        )}
                                                        {" "}{(() => {
                                                          const unit = cfEx.unit_override || cfEx.cf_exercises?.default_unit || "reps";
                                                          return unit === "reps" ? "repes" : unit;
                                                        })()}
                                                      </span>
                                                    </div>
                                                  );
                                                })()
                                              ) : (
                                                <div className="grid grid-cols-2 gap-2 text-xs font-semibold mt-1">
                                                  {cfEx.cf_wod_levels!.filter(l => l.value.trim() !== "").map(lvl => (
                                                    <div key={lvl.id} className="flex justify-between items-center bg-zinc-50 px-2.5 py-1 rounded border border-zinc-100">
                                                      <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                                                        {lvl.level}
                                                      </span>
                                                      <span className="font-mono text-zinc-700">
                                                        {lvl.value}
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>

                                            {videoUrl && (
                                              <a
                                                href={videoUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors shrink-0 self-start"
                                                title="Ver video"
                                              >
                                                <Video className="w-5 h-5" />
                                              </a>
                                            )}
                                          </div>

                                          {cfEx.notes && (
                                            <p className="text-zinc-500 text-xs italic font-medium leading-relaxed mt-1 border-l border-zinc-200 pl-3">
                                              * {cfEx.notes}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-4">
                                {exercises.map((cfEx) => {
                                  const hasLevels = cfEx.cf_wod_levels && cfEx.cf_wod_levels.some(l => l.value.trim() !== "");
                                  const videoUrl = cfEx.cf_exercise_variants?.video_url || cfEx.cf_exercises?.video_url;

                                  return (
                                    <div
                                      key={cfEx.id}
                                      className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-3 hover:border-zinc-300 transition-colors"
                                    >
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1 flex-1 min-w-0">
                                          <h4 className="text-slate-900 font-extrabold text-lg sm:text-xl leading-tight">
                                            {cfEx.cf_exercises?.name || "Ejercicio"}
                                            {cfEx.cf_exercise_variants?.name && (
                                              <span className="text-emerald-600 font-bold ml-1.5">— {cfEx.cf_exercise_variants.name}</span>
                                            )}
                                          </h4>

                                          {!hasLevels ? (
                                            (cfEx.reps || cfEx.sets) && (() => {
                                              const repsStr = cfEx.reps || "—";
                                              const isGenderSplit = repsStr.includes("/");
                                              const showSets = block.type === "warm_up" || block.type === "mobility" || !block.wod_type || block.wod_type === "series";

                                              return (
                                                <div className="text-zinc-500 text-xs font-semibold flex flex-wrap items-center gap-2 mt-1">
                                                  <span className="px-2 py-0.5 bg-zinc-50 rounded-md border border-zinc-100 text-zinc-700 font-mono flex items-center gap-1">
                                                    {showSets && cfEx.sets ? `${cfEx.sets} series × ` : ""}
                                                    {isGenderSplit ? (
                                                      (() => {
                                                        const [male, female] = repsStr.split("/");
                                                        return (
                                                          <span className="inline-flex items-center gap-1">
                                                            <span className="text-blue-500 font-black">♂</span>
                                                            <span className="text-zinc-700">{male || "—"}</span>
                                                            <span className="text-zinc-400">/</span>
                                                            <span className="text-rose-500 font-black">♀</span>
                                                            <span className="text-zinc-700">{female || "—"}</span>
                                                          </span>
                                                        );
                                                      })()
                                                    ) : (
                                                      repsStr
                                                    )}
                                                    {" "}{(() => {
                                                      const unit = cfEx.unit_override || cfEx.cf_exercises?.default_unit || "reps";
                                                      return unit === "reps" ? "repes" : unit;
                                                    })()}
                                                  </span>
                                                </div>
                                              );
                                            })()
                                          ) : (
                                            <div className="grid grid-cols-2 gap-2 text-xs font-semibold mt-1">
                                              {cfEx.cf_wod_levels!.filter(l => l.value.trim() !== "").map(lvl => (
                                                <div key={lvl.id} className="flex justify-between items-center bg-zinc-50 px-2.5 py-1 rounded border border-zinc-100">
                                                  <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                                                    {lvl.level}
                                                  </span>
                                                  <span className="font-mono text-zinc-700">
                                                    {lvl.value}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                        {videoUrl && (
                                          <a
                                            href={videoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors shrink-0 self-start"
                                            title="Ver video"
                                          >
                                            <Video className="w-5 h-5" />
                                          </a>
                                        )}
                                      </div>

                                      {cfEx.notes && (
                                        <p className="text-zinc-500 text-xs italic font-medium leading-relaxed mt-1 border-l border-zinc-200 pl-3">
                                          * {cfEx.notes}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {block.wod_config?.notes && (
                            <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs text-zinc-500 italic">
                              * Notas: {block.wod_config.notes}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                }

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

                const isCollapsed = collapsedBlocks[block.id];
                const isDone = isBlockCompleted(block);

                return (
                  <div key={block.id} className="space-y-4 animate-in fade-in duration-300">
                    {(() => {
                      const isWarmUp = block.type === "warm_up";
                      const isMobility = block.type === "mobility";
                      const isSkill = block.type === "skill";

                      const typeColor = isWarmUp 
                        ? "text-rose-500" 
                        : isMobility 
                        ? "text-emerald-500" 
                        : isSkill 
                        ? "text-blue-500" 
                        : "text-[#ff5252]";

                      return (
                        <div className="border-b border-zinc-200 pb-1 flex items-center justify-between select-none">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setCollapsedBlocks(prev => ({ ...prev, [block.id]: !prev[block.id] }))}
                              className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors shrink-0"
                            >
                              {isCollapsed ? <ChevronRight className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                            </button>
                            <h3
                              onClick={() => setCollapsedBlocks(prev => ({ ...prev, [block.id]: !prev[block.id] }))}
                              className={`text-2xl font-black ${typeColor} uppercase tracking-widest pt-2 cursor-pointer flex-1`}
                            >
                              {block.name}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleBlockCompleted(block)}
                            className={`px-3 py-1 text-xs font-black rounded-xl border transition-all flex items-center gap-1.5 active:scale-95 ${
                              isDone
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                                : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:border-zinc-300"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>{isDone ? "Completo" : "Completar"}</span>
                          </button>
                        </div>
                      );
                    })()}
                    
                    {!isCollapsed && (
                      <>
                        <div className="space-y-4">
                          {(() => {
                            const blockSets = (block.type === "warm_up" || block.type === "mobility") 
                              ? (block.wod_config?.sets ? Number(block.wod_config.sets) : (block.training_exercises.find(e => e.sets)?.sets || 3)) 
                              : (block.wod_config?.sets ? Number(block.wod_config.sets) : undefined);

                            if (blockSets) {
                              return (
                                <div className="flex flex-col md:flex-row gap-4 items-stretch">
                                  {/* Left bracket indicating block sets */}
                                  <div className="flex flex-row md:flex-col justify-center items-center px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl md:min-w-[85px] shrink-0 text-center select-none shadow-sm gap-2 md:gap-0">
                                    <div className="flex flex-col items-center">
                                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Total</span>
                                      <span className="text-2xl font-black text-slate-900 leading-none">{blockSets}</span>
                                      <span className="text-xs font-bold text-[#ff5252] leading-none mt-1">Series</span>
                                    </div>
                                    
                                    {block.wod_config?.has_internal_loop && block.wod_config?.vueltas_por_serie && (
                                      <div className="md:mt-3 md:pt-2 md:border-t border-zinc-200 w-full flex flex-row md:flex-col items-center gap-1 md:gap-0 justify-center">
                                        <Repeat className="w-3.5 h-3.5 text-zinc-400 mb-0.5" />
                                        <span className="text-[9px] font-bold text-zinc-500 uppercase leading-tight hidden md:inline">Circuito</span>
                                        <span className="text-[10px] font-black text-emerald-600 leading-none">{block.wod_config.vueltas_por_serie} vueltas</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Exercises List */}
                                  <div className="flex-1 space-y-4">
                                    {[...block.training_exercises].sort((a,b) => (a.order ?? 0) - (b.order ?? 0)).map((te) => {
                                      const suggestedKg = te.percentage_1rm && oneRMs[te.exercise_id]
                                        ? calculateWeight(oneRMs[te.exercise_id], te.percentage_1rm)
                                        : te.weight_target || undefined;

                                      const videoUrl = te.exercise_variants?.video_url || te.exercises?.video_url;
                                      const { dropsets, actualNotes } = parseNotesAndDropsets(te.notes);

                                      return (
                                        <div
                                          key={te.id}
                                          className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-3 hover:border-zinc-300 transition-colors"
                                        >
                                          <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1 flex-1 min-w-0">
                                              <h4 className="text-slate-900 font-extrabold text-lg sm:text-xl leading-tight">
                                                {te.exercises?.name}
                                                {te.exercise_variants?.name && (
                                                  <span className="text-emerald-600 font-bold ml-1.5">— {te.exercise_variants.name}</span>
                                                )}
                                              </h4>
                                              <div className="text-zinc-500 text-xs font-semibold flex flex-wrap items-center gap-2 mt-1">
                                                <span className="px-2 py-0.5 bg-zinc-50 rounded-md border border-zinc-100 text-zinc-700 font-mono">
                                                  {te.reps} reps
                                                </span>
                                                {suggestedKg && (
                                                  <span className="px-2 py-0.5 bg-zinc-50 rounded-md border border-zinc-100 text-red-500 font-bold">
                                                    Sug: {suggestedKg} kg
                                                  </span>
                                                )}
                                                {te.rpe_target !== null && te.rpe_target !== undefined && (
                                                  <span className="px-2 py-0.5 bg-zinc-50 rounded-md border border-zinc-100 text-zinc-700 font-bold">
                                                    {te.rpe_target > 0 ? `RPE ${te.rpe_target}` : `RIR ${Math.abs(te.rpe_target) === 0.1 ? 0 : Math.abs(te.rpe_target)}`}
                                                  </span>
                                                )}
                                                {dropsets.map((ds, idx) => (
                                                  <span key={idx} className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded-md border border-orange-100 font-bold text-[10px] flex items-center gap-1">
                                                    <Repeat className="w-3.5 h-3.5 text-orange-500 shrink-0" /> Drop: {getDropsetText(ds, suggestedKg)}
                                                  </span>
                                                ))}
                                                {videoUrl && (
                                                  <a
                                                    href={videoUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-500 font-bold ml-1"
                                                  >
                                                    <Video className="w-3.5 h-3.5" /> Video
                                                  </a>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          {actualNotes && (
                                            <p className="text-zinc-500 text-xs italic font-medium leading-relaxed mt-1 border-l border-zinc-200 pl-3">
                                              * {actualNotes}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }

                            return blockItems.map(item => {
                            if (item.type === "single") {
                              const te = item.te;
                              const suggestedKg = te.percentage_1rm && oneRMs[te.exercise_id]
                                ? calculateWeight(oneRMs[te.exercise_id], te.percentage_1rm)
                                : te.weight_target || undefined;

                              const videoUrl = te.exercise_variants?.video_url || te.exercises?.video_url;

                              return (
                                <div
                                  key={te.id}
                                  className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-4 hover:border-zinc-300 transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                      <h4 className="text-slate-900 font-extrabold text-lg sm:text-xl leading-tight">
                                        {te.exercises?.name}
                                        {te.exercise_variants?.name && (
                                          <span className="text-emerald-600 font-bold ml-1.5">— {te.exercise_variants.name}</span>
                                        )}
                                      </h4>
                                      <div className="text-zinc-500 text-xs font-semibold flex flex-wrap items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 bg-zinc-50 rounded-md border border-zinc-100 text-zinc-700">
                                          {te.sets} series × {te.reps} reps
                                        </span>
                                        {suggestedKg && (
                                          <span className="px-2 py-0.5 bg-zinc-50 rounded-md border border-zinc-100 text-red-500 font-bold">
                                            Sug: {suggestedKg} kg
                                          </span>
                                        )}
                                        {videoUrl && (
                                          <a
                                            href={videoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-500 font-bold"
                                          >
                                            <Video className="w-3.5 h-3.5" /> Video
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {te.notes && (
                                    <p className="text-zinc-500 text-xs italic font-medium leading-relaxed mt-1 border-l border-zinc-200 pl-3">
                                      * {te.notes}
                                    </p>
                                  )}
                              </div>
                          );
                        }
                      })})()}
                    </div>
                    {block.wod_config?.notes && (
                      <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs text-zinc-500 italic mt-4">
                        * Notas: {block.wod_config.notes}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom action */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 backdrop-blur border-t bg-background/95 border-border">
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

      {/* Single set weight confirmation modal */}
      {pendingSingleSetConfirm && (() => {
        const { te, setIdx, calcWeight } = pendingSingleSetConfirm;
        const suggestedKg = calcWeight;

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
            <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div>
                <h3 className="font-bold text-foreground text-lg">Serie {setIdx + 1} completada</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {te.exercises?.name} {te.exercise_variants?.name ? `(${te.exercise_variants.name})` : ""}
                  {" · "}{te.reps} reps
                </p>
              </div>

              {suggestedKg ? (
                <>
                  <p className="text-sm font-medium text-foreground">¿Hiciste esta serie con <span className="text-primary font-bold">{suggestedKg} kg</span>?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        handleSingleSetWeightChange(te, setIdx, suggestedKg);
                        const setKey = `${te.id}-${setIdx}`;
                        setCompletedSingleSets(prev => {
                          const next = new Set(prev);
                          next.add(setKey);
                          return next;
                        });
                        const completedCount = Array.from({ length: te.sets }).filter((_, idx) =>
                          idx === setIdx ? true : completedSingleSets.has(`${te.id}-${idx}`)
                        ).length;

                        setCheckedExercises(prev => {
                          const next = new Set(prev);
                          if (completedCount === te.sets) next.add(te.id);
                          else next.delete(te.id);
                          return next;
                        });

                        setExerciseLogs(prev => {
                          const log = prev[te.id] || {
                            training_exercise_id: te.id,
                            exercise_id: te.exercise_id,
                            variant_id: te.variant_id,
                            weight_used_kg: undefined,
                            used_suggested: false,
                            suggested_kg: suggestedKg,
                            sets_completed: 0,
                            reps_completed: te.reps,
                            set_weights: Array(te.sets).fill(undefined),
                          };
                          const newWeights = [...(log.set_weights || Array(te.sets).fill(undefined))];
                          newWeights[setIdx] = suggestedKg;
                          return {
                            ...prev,
                            [te.id]: {
                              ...log,
                              set_weights: newWeights,
                              sets_completed: completedCount,
                            }
                          };
                        });

                        setPendingSingleSetConfirm(null);
                      }}
                      className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Sí, con {suggestedKg} kg
                    </button>
                    <button
                      onClick={() => {
                        const div = document.getElementById("single-custom-input");
                        if (div) div.classList.toggle("hidden");
                      }}
                      className="flex-1 py-3.5 rounded-2xl border-2 border-border font-semibold text-sm hover:border-primary/30 transition-colors"
                    >
                      No, otro peso
                    </button>
                  </div>
                  <div id="single-custom-input" className="hidden space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        id="single-custom-weight-field"
                        placeholder="Ej: 52.5"
                        className="flex-1 px-4 py-3 rounded-xl border border-border text-base font-semibold text-center focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-muted-foreground font-medium">kg</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const input = document.getElementById("single-custom-weight-field") as HTMLInputElement;
                          const val = input ? parseFloat(input.value) : NaN;
                          const weight = isNaN(val) ? undefined : val;

                          handleSingleSetWeightChange(te, setIdx, weight);

                          const setKey = `${te.id}-${setIdx}`;
                          setCompletedSingleSets(prev => {
                            const next = new Set(prev);
                            next.add(setKey);
                            return next;
                          });

                          const completedCount = Array.from({ length: te.sets }).filter((_, idx) =>
                            idx === setIdx ? true : completedSingleSets.has(`${te.id}-${idx}`)
                          ).length;

                          setCheckedExercises(prev => {
                            const next = new Set(prev);
                            if (completedCount === te.sets) next.add(te.id);
                            else next.delete(te.id);
                            return next;
                          });

                          setExerciseLogs(prev => {
                            const log = prev[te.id] || {
                              training_exercise_id: te.id,
                              exercise_id: te.exercise_id,
                              variant_id: te.variant_id,
                              weight_used_kg: undefined,
                              used_suggested: false,
                              suggested_kg: suggestedKg,
                              sets_completed: 0,
                              reps_completed: te.reps,
                              set_weights: Array(te.sets).fill(undefined),
                            };
                            const newWeights = [...(log.set_weights || Array(te.sets).fill(undefined))];
                            newWeights[setIdx] = weight;
                            return {
                              ...prev,
                              [te.id]: {
                                ...log,
                                set_weights: newWeights,
                                sets_completed: completedCount,
                              }
                            };
                          });

                          setPendingSingleSetConfirm(null);
                        }}
                        className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold text-sm"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => {
                          handleSingleSetWeightChange(te, setIdx, undefined);
                          const setKey = `${te.id}-${setIdx}`;
                          setCompletedSingleSets(prev => {
                            const next = new Set(prev);
                            next.add(setKey);
                            return next;
                          });

                          const completedCount = Array.from({ length: te.sets }).filter((_, idx) =>
                            idx === setIdx ? true : completedSingleSets.has(`${te.id}-${idx}`)
                          ).length;

                          setCheckedExercises(prev => {
                            const next = new Set(prev);
                            if (completedCount === te.sets) next.add(te.id);
                            else next.delete(te.id);
                            return next;
                          });

                          setPendingSingleSetConfirm(null);
                        }}
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
                      id="single-custom-weight-field-no-suggested"
                      placeholder="Ej: 52.5"
                      className="flex-1 px-4 py-3 rounded-xl border border-border text-base font-semibold text-center focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-muted-foreground font-medium">kg</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const input = document.getElementById("single-custom-weight-field-no-suggested") as HTMLInputElement;
                        const val = input ? parseFloat(input.value) : NaN;
                        const weight = isNaN(val) ? undefined : val;

                        handleSingleSetWeightChange(te, setIdx, weight);

                        const setKey = `${te.id}-${setIdx}`;
                        setCompletedSingleSets(prev => {
                          const next = new Set(prev);
                          next.add(setKey);
                          return next;
                        });

                        const completedCount = Array.from({ length: te.sets }).filter((_, idx) =>
                          idx === setIdx ? true : completedSingleSets.has(`${te.id}-${idx}`)
                        ).length;

                        setCheckedExercises(prev => {
                          const next = new Set(prev);
                          if (completedCount === te.sets) next.add(te.id);
                          else next.delete(te.id);
                          return next;
                        });

                        setPendingSingleSetConfirm(null);
                      }}
                      className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-semibold text-sm"
                    >
                      Guardar
                    </button>
                  </div>
                </>
              )}

              <button
                onClick={() => setPendingSingleSetConfirm(null)}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        );
      })()}

      {/* Series confirmation modal */}
      {pendingSeriesConfirm && (() => {
        const { set, items, calcWeight } = pendingSeriesConfirm;
        let repsLine = items.map(te => {
          const ov = set.reps_overrides.find(o => o.training_exercise_id === te.id);
          const r = ov ? ov.reps : te.reps;
          const v = te.exercise_variants?.name ?? "";
          const displayName = v ? `${te.exercises?.name} — ${v}` : te.exercises?.name;
          return `${r}× ${displayName}`;
        }).join(" + ");

        if (set.rounds && set.rounds > 1) {
          repsLine = `${set.rounds} rondas de: ${repsLine}`;
        }

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

