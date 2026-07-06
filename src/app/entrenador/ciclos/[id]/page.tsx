"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Loader2, ChevronDown, ChevronRight,
  Dumbbell, Trash2, GripVertical, Search, X, Check, Copy,
  MoreVertical, BookMarked, Link2, UserPlus, Users, Moon,
  ArrowRightLeft, UserMinus, Eye, Flame, Activity
} from "lucide-react";
import Link from "next/link";
import { DAY_NAMES, WEEK_TYPE_LABELS, WEEK_TYPE_COLORS, getInitials } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────
type Variant = { id: string; name: string };
type Exercise = { id: string; name: string; category: string; muscle_group: string; variants: Variant[] };
type TrainingExercise = {
  id: string; exercise_id: string; variant_id?: string; exercise?: Exercise;
  variant?: Variant; sets: number; reps: string; percentage_1rm?: number;
  weight_target?: number; rpe_target?: number; rest_seconds?: number;
  notes?: string; order: number;
  complex_id?: string; complex_order?: number;
};
type Block = { id: string; name: string; type: string; order: number; wod_type?: string; wod_config?: Record<string, unknown>; training_exercises: TrainingExercise[] };
type Day = { id: string; day_of_week: number; label: string; order: number; is_rest: boolean; blocks: Block[]; expanded: boolean };
type Week = { id: string; week_number: number; type: string; days: Day[]; expanded: boolean };
type Cycle = { id: string; name: string; total_weeks: number; student_id: string; student_name: string; is_template: boolean };
type Student = { id: string; full_name: string; activeCycle?: { id: string; name: string } };

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

// ─── Copy Week Modal ─────────────────────────────────────────
function CopyWeekModal({
  weeks, targetWeek, onCopy, onClose, copying,
}: {
  weeks: Week[]; targetWeek: Week;
  onCopy: (sourceWeekId: string, pctDelta: number) => void;
  onClose: () => void; copying: boolean;
}) {
  const [sourceWeekId, setSourceWeekId] = useState("");
  const [pctDelta, setPctDelta] = useState(0);
  const sourceWeeks = weeks.filter(w => w.id !== targetWeek.id);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Copiar a Semana {targetWeek.week_number}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Copiar contenido de:</label>
            <select value={sourceWeekId} onChange={e => setSourceWeekId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">— Seleccioná una semana —</option>
              {sourceWeeks.map(w => (
                <option key={w.id} value={w.id}>
                  Semana {w.week_number} — {WEEK_TYPE_LABELS[w.type]}
                  {" "}({w.days.length} día{w.days.length !== 1 ? "s" : ""})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Ajuste de porcentaje:
              <span className="ml-2 text-primary font-bold">
                {pctDelta > 0 ? `+${pctDelta}%` : pctDelta < 0 ? `${pctDelta}%` : "Sin cambio"}
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {[-10, -5, 0, 5, 10, 15].map(val => (
                <button key={val} type="button" onClick={() => setPctDelta(val)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                    pctDelta === val
                      ? "bg-primary text-white border-primary"
                      : "border-border text-foreground hover:border-primary/50"
                  }`}>
                  {val > 0 ? `+${val}%` : val === 0 ? "= mismo" : `${val}%`}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Se ajustan los % de 1RM de todos los ejercicios copiados.
            </p>
          </div>

          {targetWeek.days.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-xs text-orange-700 font-medium">
                ⚠️ La Semana {targetWeek.week_number} ya tiene {targetWeek.days.length} día{targetWeek.days.length !== 1 ? "s" : ""}. Se reemplazará todo su contenido.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button onClick={() => sourceWeekId && onCopy(sourceWeekId, pctDelta)}
            disabled={!sourceWeekId || copying}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {copying ? <><Loader2 className="w-4 h-4 animate-spin" />Copiando...</> : <><Copy className="w-4 h-4" />Copiar semana</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Exercise Picker Modal (single) ──────────────────────────
const CATEGORY_TABS = [
  { value: "all", label: "Todos" },
  { value: "olimpico", label: "Olímpicos" },
  { value: "fuerza", label: "Fuerza" },
  { value: "prep_fisica", label: "Prep. Física" },
  { value: "accesorio", label: "Accesorio" },
];

function ExercisePicker({
  exercises, onSelect, onClose, initialCategory = "all", loading = false,
}: {
  exercises: Exercise[];
  onSelect: (ex: Exercise, variant?: Variant) => void;
  onClose: () => void;
  initialCategory?: string;
  loading?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [selected, setSelected] = useState<Exercise | null>(null);

  const filtered = exercises.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === "all"
      ? true
      : category === "olimpico"
        ? e.muscle_group === "olimpico"
        : e.category === category && e.muscle_group !== "olimpico";
    return matchesSearch && matchesCat;
  });

  // Count per category for badges
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
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!selected ? (
          <>
            {/* Search */}
            <div className="px-3 pt-3 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar ejercicio..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            {/* Category tabs */}
            <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
              {CATEGORY_TABS.map(tab => {
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
                <p className="text-center text-sm text-muted-foreground py-8">Sin resultados</p>
              ) : filtered.map(ex => (
                <button key={ex.id} disabled={loading} onClick={() => ex.variants.length > 0 ? setSelected(ex) : onSelect(ex)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 disabled:opacity-50 transition-colors text-left border-b border-border/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{ex.name}</p>
                    {category === "all" && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ex.muscle_group === "olimpico" ? "Olímpico" : (CATEGORY_TABS.find(t => t.value === ex.category)?.label ?? ex.category)}
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

// ─── Set Reps Override Modal ──────────────────────────────────
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

// ─── Complex / Trepada Picker Modal ───────────────────────────
function ComplexPicker({
  exercises, onConfirm, onClose, initialCategory = "all", loading = false,
}: {
  exercises: Exercise[];
  onConfirm: (items: { ex: Exercise; variant?: Variant }[]) => void;
  onClose: () => void;
  initialCategory?: string;
  loading?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [selectedItems, setSelectedItems] = useState<{ ex: Exercise; variant?: Variant }[]>([]);
  const [pickingVariantFor, setPickingVariantFor] = useState<Exercise | null>(null);

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
    setSearch("");
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
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected preview */}
        {selectedItems.length > 0 && (
          <div className="p-3 border-b border-border bg-primary/5">
            <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">
              {label} ({selectedItems.length} ejercicio{selectedItems.length !== 1 ? "s" : ""}):
            </p>
            <div className="space-y-1.5">
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

        {/* Browse / Variant selection */}
        {!pickingVariantFor ? (
          <>
            <div className="px-3 pt-3 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input autoFocus={selectedItems.length === 0} value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar y agregar ejercicio..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
              {CATEGORY_TABS.map(tab => {
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
                <p className="text-center text-sm text-muted-foreground py-8">Sin resultados</p>
              ) : filtered.map(ex => (
                <button key={ex.id}
                  onClick={() => ex.variants.length > 0 ? setPickingVariantFor(ex) : addItem(ex)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0">
                  <Plus className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{ex.name}</p>
                    {category === "all" && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ex.muscle_group === "olimpico" ? "Olímpico" : (CATEGORY_TABS.find(t => t.value === ex.category)?.label ?? ex.category)}
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
              <button onClick={() => setPickingVariantFor(null)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
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

        {/* Footer */}
        <div className="p-3 border-t border-border flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
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

// ─── Complex / Trepada Card ───────────────────────────────────
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
  // Estado local para los inputs de % — auto-guardado 600ms después de escribir + onBlur
  const [pctInputs, setPctInputs] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    sets.forEach(s => { map[s.id] = s.percentage_1rm?.toString() ?? ""; });
    return map;
  });
  // Estado local para los inputs de Rondas
  const [roundsInputs, setRoundsInputs] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    sets.forEach(s => { map[s.id] = s.rounds?.toString() ?? "1"; });
    return map;
  });
  const [savedPct, setSavedPct] = useState<Record<string, boolean>>({});
  const saveTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Sincronizar cuando llegan nuevos sets (ej: al agregar serie)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevSetIds]);

  const savePct = (setId: string, raw: string, current: number | null) => {
    const pct = raw !== "" ? parseFloat(raw) : null;
    if (isNaN(pct ?? 0) && pct !== null) return; // valor inválido
    if ((pct ?? null) === (current ?? null)) return; // sin cambios
    onUpdateSetPercentage(setId, pct);
    setSavedPct(prev => ({ ...prev, [setId]: true }));
    setTimeout(() => setSavedPct(prev => ({ ...prev, [setId]: false })), 1500);
  };

  const handlePctChange = (setId: string, current: number | null, newVal: string) => {
    setPctInputs(prev => ({ ...prev, [setId]: newVal }));
    // Auto-save después de 600ms sin escribir
    if (saveTimers.current[setId]) clearTimeout(saveTimers.current[setId]);
    saveTimers.current[setId] = setTimeout(() => {
      savePct(setId, newVal, current);
    }, 600);
  };

  const saveRounds = (setId: string, raw: string, current: number) => {
    let r = raw !== "" ? parseInt(raw, 10) : 1;
    if (isNaN(r) || r < 1) r = 1;
    if (r === current) return; // sin cambios
    onUpdateSetRounds(setId, r);
  };

  const handleRoundsChange = (setId: string, newVal: string) => {
    if (newVal !== "" && !/^\d+$/.test(newVal)) return; // solo números
    setRoundsInputs(prev => ({ ...prev, [setId]: newVal }));
  };

  const sorted = [...exs].sort((a, b) => (a.complex_order ?? 0) - (b.complex_order ?? 0));
  const sortedSets = [...sets].sort((a, b) => a.set_number - b.set_number);
  const sharedRest = sorted[0]?.rest_seconds;
  const isComplex = sorted.length > 1;

  // 1RM for weight calculation comes from the FIRST exercise
  const firstExercise = sorted[0];
  const oneRMForCalc = firstExercise?.exercise_id ? studentOneRMs[firstExercise.exercise_id] : undefined;

  return (
    <div className="border-2 border-primary/25 rounded-xl overflow-hidden">
      {/* Header */}
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

      {/* Per-exercise rows — reps only, no % */}
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

      {/* Series breakdown — per-set % */}
      <div className="bg-white border-t border-primary/20 px-3 py-2.5 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Series — % 1RM {firstExercise?.exercise?.name ? `(${firstExercise.exercise.name})` : ""}
        </p>

        {sortedSets.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Sin series configuradas. Agregá una.</p>
        )}

        {sortedSets.map(s => {
          const pctVal = pctInputs[s.id] ?? "";
          const pctNum = pctVal !== "" ? parseFloat(pctVal) : null;
          const calcWeight = oneRMForCalc && pctNum
            ? Math.round((oneRMForCalc * pctNum / 100) / 2.5) * 2.5
            : null;
          const hasOverride = s.reps_overrides.length > 0;
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
              
              {/* Controles de la derecha (Rondas y Reps) alineados y con estilos similares */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Rondas Control */}
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

                {/* Reps override button */}
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

      {/* Rest */}
      <div className="px-3 py-2.5 bg-primary/10 border-t border-primary/20">
        <label className="text-xs text-muted-foreground font-medium">Descanso (seg)</label>
        <input type="number" min="0" value={sharedRest ?? ""}
          onChange={e => onUpdateRest(blockId, complexId, e.target.value ? parseInt(e.target.value) : null)}
          placeholder="180"
          className="w-full px-2 py-1.5 rounded-lg border border-border text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary bg-white mt-0.5" />
      </div>

      {/* Reps override modal */}
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

// ─── Prep. Física Block Component ─────────────────────────────
function PrepFisicaBlock({
  block,
  dayId,
  sets,
  onAddExercise,
  onDeleteExercise,
  onUpdateExerciseField,
  onAddSet,
  onRemoveSet,
  onUpdateSetRepsOverride,
  onUpdateRest,
}: {
  block: Block;
  dayId: string;
  sets: ComplexSet[];
  onAddExercise: () => void;
  onDeleteExercise: (blockId: string, exId: string) => void;
  onUpdateExerciseField: (blockId: string, exId: string, fieldOrFields: string | Record<string, any>, value?: unknown) => void;
  onAddSet: (complexId: string, dayId: string) => void;
  onRemoveSet: (setId: string) => void;
  onUpdateSetRepsOverride: (setId: string, overrides: any[]) => void;
  onUpdateRest: (blockId: string, complexId: string, value: number | null) => void;
}) {
  const sortedExs = [...block.training_exercises].sort((a, b) => (a.complex_order ?? 0) - (b.complex_order ?? 0));
  const sortedSets = [...sets].sort((a, b) => a.set_number - b.set_number);
  const sharedRest = sortedExs[0]?.rest_seconds;

  // Local inputs for cells and rounds to avoid lags when typing
  const [repsInputs, setRepsInputs] = useState<Record<string, string>>({});
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  const [pctInputs, setPctInputs] = useState<Record<string, string>>({});
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const nextReps: Record<string, string> = {};
    const nextWeight: Record<string, string> = {};
    const nextPct: Record<string, string> = {};

    sets.forEach(s => {
      sortedExs.forEach(te => {
        const key = `${s.id}-${te.id}`;
        const ov = s.reps_overrides?.find(o => o.training_exercise_id === te.id);
        nextReps[key] = ov?.reps ?? te.reps ?? "";
        nextWeight[key] = ov?.weight_target?.toString() ?? te.weight_target?.toString() ?? "";
        nextPct[key] = ov?.percentage_1rm?.toString() ?? te.percentage_1rm?.toString() ?? "";
      });
    });

    setRepsInputs(prev => ({ ...nextReps, ...prev }));
    setWeightInputs(prev => ({ ...nextWeight, ...prev }));
    setPctInputs(prev => ({ ...nextPct, ...prev }));
  }, [sets, block.training_exercises]);

  const handleRepsChange = (setId: string, teId: string, val: string) => {
    const key = `${setId}-${teId}`;
    setRepsInputs(prev => ({ ...prev, [key]: val }));
    setJustSaved(false);
  };

  const handleWeightChange = (setId: string, teId: string, val: string) => {
    const key = `${setId}-${teId}`;
    setWeightInputs(prev => ({ ...prev, [key]: val }));
    setJustSaved(false);
  };

  const handlePctChange = (setId: string, teId: string, val: string) => {
    const key = `${setId}-${teId}`;
    setPctInputs(prev => ({ ...prev, [key]: val }));
    setJustSaved(false);
  };

  const [saving, setSaving] = useState(false);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (const s of sets) {
        const overrides = [...(s.reps_overrides || [])];
        let hasChanges = false;

        for (const te of sortedExs) {
          const key = `${s.id}-${te.id}`;
          const repsVal = repsInputs[key] ?? te.reps ?? "";
          const wtVal = weightInputs[key] ?? "";
          const pctVal = pctInputs[key] ?? "";

          const isPctMode = te.percentage_1rm !== null;
          
          const idx = overrides.findIndex(o => o.training_exercise_id === te.id);
          let ov = idx >= 0 ? overrides[idx] : null;

          if (!ov) {
            ov = {
              training_exercise_id: te.id,
              reps: te.reps ?? "",
              weight_target: te.weight_target ?? null,
              percentage_1rm: te.percentage_1rm ?? null,
            };
            overrides.push(ov);
            hasChanges = true;
          }

          if (ov.reps !== repsVal) {
            ov.reps = repsVal;
            hasChanges = true;
          }

          if (isPctMode) {
            const pctNum = pctVal !== "" ? parseFloat(pctVal) : null;
            if (ov.percentage_1rm !== pctNum || ov.weight_target !== null) {
              ov.percentage_1rm = pctNum;
              ov.weight_target = null;
              hasChanges = true;
            }
          } else {
            const wtNum = wtVal !== "" ? parseFloat(wtVal) : null;
            if (ov.weight_target !== wtNum || ov.percentage_1rm !== null) {
              ov.weight_target = wtNum;
              ov.percentage_1rm = null;
              hasChanges = true;
            }
          }
        }

        if (hasChanges) {
          await onUpdateSetRepsOverride(s.id, overrides);
        }
      }
      toast.success("Circuito guardado correctamente");
      setJustSaved(true);
    } catch (err: any) {
      console.error("Error saving circuit:", err);
      toast.error("Error al guardar el circuito");
    } finally {
      setSaving(false);
    }
  };

  const saveCell = (
    setId: string,
    teId: string,
    field: "reps" | "weight_target" | "percentage_1rm",
    rawVal: string
  ) => {
    const currentSet = sets.find(s => s.id === setId);
    if (!currentSet) return;

    const overrides = [...(currentSet.reps_overrides || [])];
    const idx = overrides.findIndex(o => o.training_exercise_id === teId);

    const te = sortedExs.find(e => e.id === teId);
    const baseReps = te?.reps ?? "";
    const baseWeight = te?.weight_target ?? null;
    const basePct = te?.percentage_1rm ?? null;

    let ov = idx >= 0 ? overrides[idx] : null;
    if (!ov) {
      ov = {
        training_exercise_id: teId,
        reps: baseReps,
        weight_target: baseWeight,
        percentage_1rm: basePct,
      };
      overrides.push(ov);
    }

    if (field === "reps") {
      if (ov.reps === rawVal) return;
      ov.reps = rawVal;
    } else if (field === "weight_target") {
      const num = rawVal !== "" ? parseFloat(rawVal) : null;
      if (ov.weight_target === num) return;
      ov.weight_target = num;
      ov.percentage_1rm = null;
    } else if (field === "percentage_1rm") {
      const num = rawVal !== "" ? parseFloat(rawVal) : null;
      if (ov.percentage_1rm === num) return;
      ov.percentage_1rm = num;
      ov.weight_target = null;
    }

    onUpdateSetRepsOverride(setId, overrides);
  };

  return (
    <div className="border-2 border-emerald-500/35 rounded-2xl overflow-hidden bg-emerald-50/5">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border-b border-emerald-500/20">
        <Dumbbell className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide flex-1">
          Circuito de Preparación Física
        </span>
        <span className="text-[10px] bg-emerald-100 text-emerald-700 font-extrabold px-2 py-0.5 rounded-full uppercase">
          {sortedExs.length} Ejercicios · {sortedSets.length} Rondas
        </span>
      </div>

      {/* Ejercicios del circuito */}
      <div className="p-4 space-y-3 border-b border-emerald-500/10">
        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
          1. Ejercicios del Circuito
        </p>
        {sortedExs.length === 0 ? (
          <p className="text-xs text-muted-foreground italic pl-1">No hay ejercicios en este circuito. Agrega uno abajo.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedExs.map((te, index) => {
              const name = te.exercise?.name ?? "";
              const variantName = te.variant?.name ?? "";
              const displayName = variantName ? `${name} — ${variantName}` : name;
              return (
                <div key={te.id} className="flex items-start gap-2 bg-emerald-50/20 border border-emerald-500/10 rounded-xl p-3 relative group">
                  <span className="text-xs font-bold text-emerald-600/60 bg-emerald-50 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0 space-y-1.5 pr-6">
                    <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                    <input
                      type="text"
                      value={te.notes ?? ""}
                      onChange={e => {
                        onUpdateExerciseField(block.id, te.id, "notes", e.target.value);
                        setJustSaved(false);
                      }}
                      placeholder="Notas del ejercicio..."
                      className="w-full px-2 py-1 rounded-lg border border-border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                  <button
                    onClick={() => {
                      onDeleteExercise(block.id, te.id);
                      setJustSaved(false);
                    }}
                    className="absolute top-2 right-2 p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors md:opacity-0 md:group-hover:opacity-100"
                    title="Eliminar del circuito"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="pt-1">
          <button
            onClick={() => {
              onAddExercise();
              setJustSaved(false);
            }}
            className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar Ejercicio al Circuito
          </button>
        </div>
      </div>

      {/* Grilla de Rondas */}
      {sortedExs.length > 0 && (
        <div className="p-4 space-y-3">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
            2. Programación de Rondas
          </p>

          <div className="overflow-x-auto border border-emerald-500/15 rounded-xl bg-white shadow-sm">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-emerald-500/5 border-b border-emerald-500/10 text-xs font-bold text-emerald-800">
                  <th className="p-3 w-24">Ronda</th>
                  {sortedExs.map(te => {
                    const isPctMode = te.percentage_1rm !== null;
                    const name = te.exercise?.name ?? "";
                    return (
                      <th key={te.id} className="p-3 min-w-[140px] border-l border-emerald-500/10">
                        <div className="flex flex-col gap-0.5">
                          <span className="truncate max-w-[150px]" title={name}>{name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (isPctMode) {
                                onUpdateExerciseField(block.id, te.id, {
                                  percentage_1rm: null,
                                  weight_target: 0
                                });
                              } else {
                                onUpdateExerciseField(block.id, te.id, {
                                  weight_target: null,
                                  percentage_1rm: 0
                                });
                              }
                              setJustSaved(false);
                            }}
                            className="text-[9px] text-emerald-600 hover:underline text-left font-semibold uppercase tracking-wider"
                          >
                            {isPctMode ? "Usar peso (kg)" : "Usar % 1RM"}
                          </button>
                        </div>
                      </th>
                    );
                  })}
                  <th className="p-3 w-12 text-center border-l border-emerald-500/10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/10 text-sm">
                {sortedSets.map((s, sIdx) => (
                  <tr key={s.id} className="hover:bg-emerald-50/10">
                    <td className="p-3 font-bold text-emerald-700 font-mono">
                      Ronda {s.set_number || sIdx + 1}
                    </td>
                    {sortedExs.map(te => {
                      const isPctMode = te.percentage_1rm !== null;
                      const cellKey = `${s.id}-${te.id}`;
                      
                      const repsVal = repsInputs[cellKey] ?? "";
                      const wtVal = weightInputs[cellKey] ?? "";
                      const pctVal = pctInputs[cellKey] ?? "";

                      return (
                        <td key={te.id} className="p-3 border-l border-emerald-500/10">
                          <div className="flex items-center gap-1.5">
                            {/* Reps */}
                            <div className="flex-1 min-w-[50px]">
                              <input
                                type="text"
                                value={repsVal}
                                placeholder="Reps"
                                onChange={e => handleRepsChange(s.id, te.id, e.target.value)}
                                onBlur={() => saveCell(s.id, te.id, "reps", repsVal)}
                                onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                className="w-full px-1.5 py-1 rounded border border-border text-center text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground select-none">@</span>
                            {/* Load (Weight or % 1RM) */}
                            <div className="flex-1 min-w-[50px]">
                              <input
                                type="number"
                                value={isPctMode ? pctVal : wtVal}
                                placeholder={isPctMode ? "%" : "kg"}
                                onChange={e => isPctMode ? handlePctChange(s.id, te.id, e.target.value) : handleWeightChange(s.id, te.id, e.target.value)}
                                onBlur={() => saveCell(s.id, te.id, isPctMode ? "percentage_1rm" : "weight_target", isPctMode ? pctVal : wtVal)}
                                onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                className="w-full px-1.5 py-1 rounded border border-border text-center text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-3 text-center border-l border-emerald-500/10">
                      <button
                        onClick={() => {
                          onRemoveSet(s.id);
                          setJustSaved(false);
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Eliminar ronda"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-1 flex-wrap gap-3">
            <button
              onClick={() => {
                onAddSet(block.id, dayId);
                setJustSaved(false);
              }}
              className="flex items-center gap-1 text-xs text-emerald-600 font-bold hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar Ronda
            </button>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Descanso */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground font-semibold uppercase">Descanso Ronda (seg):</label>
                <input
                  type="number"
                  min="0"
                  value={sharedRest ?? ""}
                  onChange={e => {
                    onUpdateRest(block.id, block.id, e.target.value ? parseInt(e.target.value) : null);
                    setJustSaved(false);
                  }}
                  placeholder="90"
                  className="w-16 px-2 py-1 rounded-lg border border-border text-xs text-center font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Guardar Button */}
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className={`flex items-center gap-1.5 px-4 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 shrink-0 ${
                  justSaved
                    ? "bg-emerald-700 hover:bg-emerald-700"
                    : "bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400"
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...
                  </>
                ) : justSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Guardado
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Warm Up Block Component ───────────────────────────────────
function WarmUpBlock({
  block,
  onAddExercise,
  onDeleteExercise,
  onUpdateExerciseField,
}: {
  block: Block;
  onAddExercise: () => void;
  onDeleteExercise: (blockId: string, exId: string) => void;
  onUpdateExerciseField: (blockId: string, exId: string, fieldOrFields: string | Record<string, any>, value?: unknown) => void;
}) {
  const sortedExs = [...block.training_exercises].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const isMobility = block.type === "mobility";

  return (
    <div className={`border-2 rounded-2xl overflow-hidden ${isMobility ? "border-emerald-500/35 bg-emerald-50/5" : "border-orange-500/35 bg-orange-50/5"}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${isMobility ? "bg-emerald-500/10 border-emerald-500/20" : "bg-orange-500/10 border-orange-500/20"}`}>
        {isMobility ? (
          <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
        ) : (
          <Flame className="w-4 h-4 text-orange-600 shrink-0" />
        )}
        <span className={`text-xs font-bold uppercase tracking-wide flex-1 ${isMobility ? "text-emerald-700" : "text-orange-700"}`}>
          {isMobility ? "Movilidad" : "Entrada en Calor / Movilidad"}
        </span>
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${isMobility ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
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
            sortedExs.map((te, index) => {
              const name = te.exercise?.name ?? "";
              const variantName = te.variant?.name ?? "";
              const displayName = variantName ? `${name} — ${variantName}` : name;
              return (
                <div key={te.id} className="py-3 flex flex-col md:flex-row md:items-center gap-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isMobility ? "text-emerald-600/60 bg-emerald-50" : "text-orange-600/60 bg-orange-50"}`}>
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
                        initialValue={te.sets ?? 3}
                        onChange={val => onUpdateExerciseField(block.id, te.id, "sets", val)}
                        className="w-12 text-xs px-2 py-1.5"
                        focusRingColor={isMobility ? "focus:ring-2 focus:ring-emerald-500" : "focus:ring-2 focus:ring-orange-500"}
                      />
                    </div>

                    {/* Reps */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Reps</span>
                      <input
                        type="text"
                        value={te.reps || ""}
                        onChange={e => onUpdateExerciseField(block.id, te.id, "reps", e.target.value)}
                        placeholder={"10, 30\", 1'"}
                        className={`w-20 text-xs px-2.5 py-1.5 rounded-lg border border-border text-center focus:outline-none bg-white font-semibold ${isMobility ? "focus:ring-2 focus:ring-emerald-500" : "focus:ring-2 focus:ring-orange-500"}`}
                      />
                    </div>

                    {/* Notes */}
                    <div className="flex items-center gap-1.5 min-w-[200px] flex-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Notas</span>
                      <input
                        type="text"
                        defaultValue={te.notes || ""}
                        onBlur={e => onUpdateExerciseField(block.id, te.id, "notes", e.target.value)}
                        placeholder={isMobility ? "Ej. estiramiento, rotación..." : "Ej. ritmo lento, movilidad..."}
                        className={`w-full text-xs px-3 py-1.5 rounded-lg border border-border focus:outline-none bg-white ${isMobility ? "focus:ring-2 focus:ring-emerald-500" : "focus:ring-2 focus:ring-orange-500"}`}
                      />
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => onDeleteExercise(block.id, te.id)}
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

// ─── Exercise Row ─────────────────────────────────────────────
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

  const calculatedWeight = oneRM && ex.percentage_1rm
    ? Math.round((oneRM * ex.percentage_1rm / 100) / 2.5) * 2.5
    : null;

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

// ─── Main Page ────────────────────────────────────────────────
export default function CicloDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentOneRMs, setStudentOneRMs] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [complexSets, setComplexSets] = useState<Record<string, ComplexSet[]>>({});
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [pickerBlock, setPickerBlock] = useState<string | null>(null);
  const [complexPickerBlock, setComplexPickerBlock] = useState<string | null>(null);
  const [copyWeekTarget, setCopyWeekTarget] = useState<Week | null>(null);
  const [showStudents, setShowStudents] = useState(false);
  const [transferTarget, setTransferTarget] = useState<{ studentId: string; studentCycleId: string } | null>(null);
  const [allCycles, setAllCycles] = useState<{ id: string; name: string; is_template: boolean; training_cycle_enrollments?: { active: boolean; student_id: string }[] }[]>([]);
  const [weekMenuOpen, setWeekMenuOpen] = useState<string | null>(null);
  // tracks which blocks are EXPANDED (empty = all collapsed by default)
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [previewDay, setPreviewDay] = useState<Day | null>(null);

  const toggleBlock = (blockId: string) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  };

  const loadData = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const [{ data: cycleData }, { data: weeksData }, { data: exData }, { data: studentsData }] = await Promise.all([
      supabase.from("training_cycles")
        .select("*, training_cycle_enrollments(active, student_id, users(full_name))")
        .eq("id", id).single(),
      supabase.from("training_weeks")
        .select(`*, training_days(*, training_blocks(*, training_exercises(*, exercises(*, exercise_variants(*)), exercise_variants(*))))`)
        .eq("cycle_id", id).order("week_number"),
      supabase.from("exercises")
        .select("*, exercise_variants(*)")
        .eq("archived", false).order("name"),
      supabase.from("users")
        .select(`
          id, full_name, 
          training_cycle_enrollments(
            active, sync_mode, enrolled_at,
            training_cycles(id, name, is_template)
          )
        `)
        .eq("role", "student")
        
        .order("full_name"),
    ]);

    if (cycleData?.cycle_type === "crossfit") {
      router.replace(`/entrenador/crossfit/${id}`);
      return;
    }

    // Fetch the 1RMs scoped individually to the cycle student (use first active enrollment)
    const activeEnrollments = (cycleData?.training_cycle_enrollments || []) as any[];
    const firstActiveStudentId = activeEnrollments.find(e => e.active)?.student_id;
    if (firstActiveStudentId) {
      const { data: ormsData } = await supabase
        .from("student_one_rm")
        .select("*")
        .eq("student_id", firstActiveStudentId);
        
      if (ormsData) {
        const map: Record<string, number> = {};
        ormsData.forEach((r: { exercise_id: string; weight_kg: number }) => { map[r.exercise_id] = r.weight_kg; });
        setStudentOneRMs(map);
      }
    }

    if (cycleData) {
      const enrolls = (cycleData.training_cycle_enrollments || []) as any[];
      const activeEnrolls = enrolls.filter(e => e.active);
      const studentName = activeEnrolls.length === 0
        ? "Sin alumno"
        : activeEnrolls.length === 1
        ? activeEnrolls[0].users?.full_name || "Alumno"
        : `${activeEnrolls.length} alumnos`;
      setCycle({
        id: cycleData.id,
        name: cycleData.name,
        total_weeks: cycleData.total_weeks,
        student_id: activeEnrolls[0]?.student_id || "",
        student_name: studentName,
        is_template: cycleData.is_template || false,
      });
    }

    if (exData) {
      setExercises(exData.map(e => ({
        id: e.id, name: e.name, category: e.category, muscle_group: e.muscle_group,
        variants: (e.exercise_variants || []) as Variant[],
      })));
    }

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

    if (weeksData) {
      setWeeks(weeksData.map((w, wi) => ({
        id: w.id,
        week_number: w.week_number,
        type: w.type,
        expanded: wi === 0,
        days: ((w.training_days || []) as Record<string, unknown>[]).map((d: Record<string, unknown>) => ({
          id: d.id as string,
          day_of_week: d.day_of_week as number,
          label: d.label as string,
          order: d.order as number,
          is_rest: !!(d.is_rest as boolean),
          expanded: false,
          blocks: ((d.training_blocks || []) as Record<string, unknown>[])
            .sort((a, b) => (a.order as number) - (b.order as number))
            .map((b: Record<string, unknown>) => ({
              id: b.id as string,
              name: b.name as string,
              type: b.type as string,
              order: b.order as number,
              training_exercises: ((b.training_exercises || []) as Record<string, unknown>[])
                .sort((a, b) => (a.order as number) - (b.order as number))
              .map((te: Record<string, unknown>) => ({
                id: te.id as string,
                exercise_id: te.exercise_id as string,
                variant_id: te.variant_id as string | undefined,
                sets: te.sets as number,
                reps: te.reps as string,
                percentage_1rm: te.percentage_1rm as number | undefined,
                weight_target: te.weight_target as number | undefined,
                rpe_target: te.rpe_target as number | undefined,
                rest_seconds: te.rest_seconds as number | undefined,
                notes: te.notes as string | undefined,
                order: te.order as number,
                complex_id: te.complex_id as string | undefined,
                complex_order: te.complex_order as number | undefined,
                exercise: te.exercises as Exercise | undefined,
                variant: te.exercise_variants as Variant | undefined,
              })),
          })),
        })).sort((a, b) => a.day_of_week - b.day_of_week),
      })));
    }

    // ─── Cargar training_complex_sets para todos los días del ciclo ─
    if (weeksData) {
      const allDayIds: string[] = (weeksData as Record<string, unknown>[]).flatMap(w => {
        const days = (w.training_days || []) as Record<string, unknown>[];
        return days.map(d => d.id as string);
      });
      if (allDayIds.length > 0) {
        const { data: setsData } = await supabase
          .from("training_complex_sets")
          .select("*")
          .in("day_id", allDayIds)
          .order("set_number");
        if (setsData) {
          const grouped: Record<string, ComplexSet[]> = {};
          for (const s of setsData as ComplexSet[]) {
            if (!grouped[s.complex_id]) grouped[s.complex_id] = [];
            grouped[s.complex_id].push({
              id: s.id,
              complex_id: s.complex_id,
              day_id: s.day_id,
              set_number: s.set_number,
              percentage_1rm: s.percentage_1rm ?? null,
              reps_overrides: (s.reps_overrides as any[]) || [],
              rounds: s.rounds ?? 1,
            });
          }
          setComplexSets(grouped);
        }
      }
    }

    // Load all cycles for transfer feature
    const { data: allCyclesData } = await supabase
      .from("training_cycles")
      .select("id, name, is_template, training_cycle_enrollments(active, student_id)")
      
      .order("name");
    if (allCyclesData) setAllCycles(allCyclesData as any);

    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Students enrolled in this cycle
  const managedStudents = students
    .filter(s => s.activeCycle?.id === id)
    .map(s => ({ ...s, cycleId: s.activeCycle!.id, cycleName: s.activeCycle!.name }));

  // Deactivate student enrollment
  const deactivateStudentCycle = async (cycleId: string, studentId: string, studentName: string) => {
    if (!confirm(`¿Desactivar la suscripción de ${studentName}? El alumno ya no verá esta planificación.`)) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("training_cycle_enrollments")
      .update({ active: false })
      .eq("cycle_id", cycleId)
      .eq("student_id", studentId);
    if (error) { toast.error("Error al desactivar"); return; }
    toast.success(`Suscripción de ${studentName} desactivada`);
    loadData();
  };

  // Transfer student to a different cycle
  const transferStudent = async (studentId: string, oldCycleId: string, newCycleId: string) => {
    const supabase = createClient();
    // Enroll the student in the new cycle using the RPC
    const { error } = await supabase.rpc("enroll_student", {
      p_cycle_id: newCycleId,
      p_student_id: studentId,
      p_sync_mode: "SYNC",
      p_enrolled_at: new Date().toISOString()
    });
    if (error) { toast.error("Error al transferir: " + error.message); return; }
    toast.success("Alumno transferido correctamente");
    setTransferTarget(null);
    loadData();
  };

  // ─── Agregar día ──────────────────────────────────────────
  const addDay = async (weekId: string) => {
    if (mutating) return;
    const week = weeks.find(w => w.id === weekId);
    if (!week) return;
    const existingDays = week.days.map(d => d.day_of_week);
    const nextDay = [1, 2, 3, 4, 5, 6, 7].find(d => !existingDays.includes(d));
    if (!nextDay) return toast.error("Ya están todos los días de la semana");

    setMutating(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("training_days").insert({
        week_id: weekId,
        day_of_week: nextDay,
        label: `Entrenamiento ${DAY_NAMES[nextDay]}`,
        order: week.days.length,
      }).select().single();

      if (error) {
        toast.error("Error al agregar día");
        return;
      }

      setWeeks(weeks.map(w => w.id === weekId ? {
        ...w,
        days: [...w.days, { ...data, is_rest: false, blocks: [], expanded: true }].sort((a, b) => a.day_of_week - b.day_of_week),
      } : w));
    } finally {
      setMutating(false);
    }
  };

  // ─── Marcar/desmarcar día de descanso ─────────────────────
  const toggleRestDay = async (weekId: string, dayId: string, currentIsRest: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("training_days")
      .update({ is_rest: !currentIsRest })
      .eq("id", dayId);

    if (error) return toast.error("Error al actualizar el día");

    setWeeks(weeks.map(w => w.id === weekId ? {
      ...w,
      days: w.days.map(d => d.id === dayId ? { ...d, is_rest: !currentIsRest } : d),
    } : w));

    toast.success(!currentIsRest ? "Marcado como día de descanso" : "Día restaurado como entrenamiento");
  };

  // ─── Eliminar día ─────────────────────────────────────────
  const deleteDay = async (weekId: string, dayId: string) => {
    if (!confirm("¿Eliminar este día y todos sus ejercicios?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("training_days").delete().eq("id", dayId);
    if (error) return toast.error("Error al eliminar día");
    setWeeks(weeks.map(w => w.id === weekId
      ? { ...w, days: w.days.filter(d => d.id !== dayId) }
      : w
    ));
    toast.success("Día eliminado");
  };

  // ─── Agregar bloque ───────────────────────────────────────
  const addBlock = async (dayId: string, type: "fuerza" | "prep_fisica" | "warm_up" | "mobility") => {
    if (mutating) return;
    const day = weeks.flatMap(w => w.days).find(d => d.id === dayId);
    const name = type === "fuerza"
      ? "Bloque de Fuerza"
      : type === "warm_up"
        ? "Entrada en Calor"
        : type === "mobility"
          ? "Movilidad"
          : "Preparación Física";

    setMutating(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("training_blocks").insert({
        day_id: dayId, name, type, order: day?.blocks.length || 0, wod_config: {},
      }).select().single();

      if (error) {
        toast.error("Error al agregar bloque");
        return;
      }

      setWeeks(weeks.map(w => ({
        ...w,
        days: w.days.map(d => d.id === dayId ? {
          ...d, blocks: [...d.blocks, { ...data, training_exercises: [], wod_config: data.wod_config || {} }],
        } : d),
      })));
      setExpandedBlocks(prev => {
        const next = new Set(prev);
        next.add(data.id);
        return next;
      });
    } finally {
      setMutating(false);
    }
  };

  // ─── Eliminar bloque ──────────────────────────────────────
  const deleteBlock = async (dayId: string, blockId: string) => {
    if (!confirm("¿Eliminar este bloque y todos sus ejercicios?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("training_blocks").delete().eq("id", blockId);
    if (error) return toast.error("Error al eliminar bloque");
    setWeeks(weeks.map(w => ({
      ...w,
      days: w.days.map(d => d.id === dayId
        ? { ...d, blocks: d.blocks.filter(b => b.id !== blockId) }
        : d
      ),
    })));
    toast.success("Bloque eliminado");
  };

  // ─── Update WOD config ─────────────────────────────────────
  const updateWodConfig = async (weekId: string, dayId: string, blockId: string, config: Record<string, unknown>) => {
    const supabase = createClient();
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

  // ─── Copiar semana ────────────────────────────────────────
  const copyWeek = async (sourceWeekId: string, targetWeekId: string, pctDelta: number) => {
    const supabase = createClient();
    setCopying(true);

    const sourceWeek = weeks.find(w => w.id === sourceWeekId);
    if (!sourceWeek) { setCopying(false); return; }

    try {
      const targetWeek = weeks.find(w => w.id === targetWeekId);
      if (targetWeek && targetWeek.days.length > 0) {
        const { error: delError } = await supabase
          .from("training_days").delete().eq("week_id", targetWeekId);
        if (delError) throw new Error("Error al limpiar semana destino: " + delError.message);
      }

      const newDays: Day[] = [];

      for (const sourceDay of sourceWeek.days) {
        const { data: newDay, error: dayError } = await supabase
          .from("training_days").insert({
            week_id: targetWeekId,
            day_of_week: sourceDay.day_of_week,
            label: sourceDay.label,
            order: sourceDay.order,
          }).select().single();
        if (dayError) throw new Error("Error al copiar día: " + dayError.message);

        const newBlocks: Block[] = [];
        const dailyComplexIdMap = new Map<string, string>();
        const exerciseIdMap = new Map<string, string>(); // old training_exercise.id -> new training_exercise.id

        for (const sourceBlock of sourceDay.blocks) {
          const { data: newBlock, error: blockError } = await supabase
            .from("training_blocks").insert({
              day_id: newDay.id,
              name: sourceBlock.name,
              type: sourceBlock.type,
              order: sourceBlock.order,
            }).select().single();
          if (blockError) throw new Error("Error al copiar bloque: " + blockError.message);

          const exercisesToInsert = sourceBlock.training_exercises.map(te => {
            let newPct = te.percentage_1rm;
            if (newPct !== undefined && newPct !== null && pctDelta !== 0) {
              newPct = Math.min(110, Math.max(10, newPct + pctDelta));
            }
            let newComplexId: string | null = null;
            if (te.complex_id) {
              if (sourceBlock.type === "prep_fisica") {
                newComplexId = newBlock.id;
                dailyComplexIdMap.set(te.complex_id, newBlock.id);
              } else {
                if (!dailyComplexIdMap.has(te.complex_id)) {
                  dailyComplexIdMap.set(te.complex_id, crypto.randomUUID());
                }
                newComplexId = dailyComplexIdMap.get(te.complex_id)!;
              }
            }
            return {
              block_id: newBlock.id,
              exercise_id: te.exercise_id,
              variant_id: te.variant_id || null,
              sets: te.sets,
              reps: te.reps,
              percentage_1rm: newPct ?? null,
              weight_target: te.weight_target || null,
              rest_seconds: te.rest_seconds || null,
              notes: te.notes || null,
              order: te.order,
              complex_id: newComplexId,
              complex_order: te.complex_order ?? null,
            };
          });

          let newExercises: TrainingExercise[] = [];
          if (exercisesToInsert.length > 0) {
            const { data: insertedExs, error: exError } = await supabase
              .from("training_exercises").insert(exercisesToInsert).select();
            if (exError) throw new Error("Error al copiar ejercicios: " + exError.message);

            sourceBlock.training_exercises.forEach((oldTe, i) => {
              if (insertedExs && insertedExs[i]) {
                exerciseIdMap.set(oldTe.id, insertedExs[i].id);
              }
            });

            newExercises = (insertedExs || []).map((te, i) => ({
              ...te,
              exercise: sourceBlock.training_exercises[i]?.exercise,
              variant: sourceBlock.training_exercises[i]?.variant,
            }));
          }

          newBlocks.push({ ...newBlock, training_exercises: newExercises });
        }

        // Copy complex sets for the day
        const setsToInsert: any[] = [];
        for (const [oldComplexId, newComplexId] of dailyComplexIdMap.entries()) {
          const oldSets = complexSets[oldComplexId] || [];
          for (const oldSet of oldSets) {
            let newPct = oldSet.percentage_1rm;
            if (newPct !== undefined && newPct !== null && pctDelta !== 0) {
              newPct = Math.min(110, Math.max(10, newPct + pctDelta));
            }

            // Update reps_overrides
            const newOverrides = oldSet.reps_overrides.map(override => ({
              training_exercise_id: exerciseIdMap.get(override.training_exercise_id) || override.training_exercise_id,
              reps: override.reps,
              weight_target: override.weight_target ?? null,
              percentage_1rm: override.percentage_1rm ?? null,
            }));

            setsToInsert.push({
              complex_id: newComplexId,
              day_id: newDay.id,
              set_number: oldSet.set_number,
              percentage_1rm: newPct,
              reps_overrides: newOverrides,
              rounds: oldSet.rounds
            });
          }
        }

        if (setsToInsert.length > 0) {
          const { error: setsError } = await supabase.from("training_complex_sets").insert(setsToInsert);
          if (setsError) throw new Error("Error al copiar series del complex: " + setsError.message);
        }

        newDays.push({ ...newDay, blocks: newBlocks, expanded: false });
      }

      await loadData();
      const pctMsg = pctDelta !== 0 ? ` (porcentajes ${pctDelta > 0 ? "+" : ""}${pctDelta}%)` : "";
      toast.success(`Semana copiada correctamente${pctMsg}`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Error al copiar semana");
    } finally {
      setCopying(false);
      setCopyWeekTarget(null);
    }
  };

  // ─── Agregar ejercicio individual ─────────────────────────
  const handleExerciseSelect = async (ex: Exercise, variant?: Variant) => {
    if (!pickerBlock || mutating) return;
    const supabase = createClient();
    const block = weeks.flatMap(w => w.days).flatMap(d => d.blocks).find(b => b.id === pickerBlock);
    if (!block) return;

    setMutating(true);
    try {
      const isPrep = block.type === "prep_fisica";
      const complexId = isPrep ? block.id : null;
      const complexOrder = isPrep ? (block.training_exercises.length || 0) : null;

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
        exercise_id: ex.id,
        variant_id: variant?.id || null,
        sets: 3,
        reps: isPrep ? "10" : "5",
        percentage_1rm: null,
        order: block.training_exercises.length || 0,
        complex_id: complexId,
        complex_order: complexOrder,
      }).select().single();

      if (error) { toast.error("Error: " + error.message); return; }

      const existingSets = complexSets[block.id] || [];
      let newComplexSets = [...existingSets];
      if (isPrep && existingSets.length === 0) {
        // Check if sets already exist in the database first to prevent duplicate key violations
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
            // If it fails with duplicate key (concurrency), double-check one more time
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

      const newEx: TrainingExercise = { ...data, exercise: ex, variant };
      setWeeks(weeks.map(w => ({
        ...w,
        days: w.days.map(d => ({
          ...d,
          blocks: d.blocks.map(b => b.id === pickerBlock ? {
            ...b, training_exercises: [...b.training_exercises, newEx],
          } : b),
        })),
      })));

      if (isPrep) {
        setComplexSets(prev => ({ ...prev, [block.id]: newComplexSets }));
      }

      setExpandedBlocks(prev => {
        const next = new Set(prev);
        next.add(pickerBlock);
        return next;
      });
      setPickerBlock(null);
    } finally {
      setMutating(false);
    }
  };

  // ─── Crear complex / trepada ──────────────────────────────
  const handleComplexCreate = async (items: { ex: Exercise; variant?: Variant }[]) => {
    if (!complexPickerBlock || mutating) return;
    const supabase = createClient();

    // Encontrar day_id del bloque
    let dayId = "";
    for (const w of weeks) {
      for (const d of w.days) {
        if (d.blocks.some(b => b.id === complexPickerBlock)) { dayId = d.id; break; }
      }
      if (dayId) break;
    }

    const block = weeks.flatMap(w => w.days).flatMap(d => d.blocks).find(b => b.id === complexPickerBlock);
    const complexId = crypto.randomUUID();
    const baseOrder = block?.training_exercises.length ?? 0;

    const toInsert = items.map((item, i) => ({
      block_id: complexPickerBlock,
      exercise_id: item.ex.id,
      variant_id: item.variant?.id || null,
      sets: 3,
      reps: "1",
      percentage_1rm: null,
      order: baseOrder + i,
      complex_id: complexId,
      complex_order: i,
    }));

    setMutating(true);
    try {
      const { data, error } = await supabase.from("training_exercises").insert(toInsert).select("*");
      if (error) { toast.error("Error al crear complex: " + error.message); return; }

      // Crear 3 series por defecto en training_complex_sets
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
        exercise: items[i].ex,
        variant: items[i].variant,
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
            ...b, training_exercises: [...b.training_exercises, ...newExs],
          } : b),
        })),
      })));
      setComplexSets(prev => ({ ...prev, [complexId]: newComplexSets }));
      setComplexPickerBlock(null);
      const label = items.length === 1 ? "Trepada" : "Complex";
      toast.success(`${label} creado con ${items.length} ejercicio${items.length !== 1 ? "s" : ""}`);
    } finally {
      setMutating(false);
    }
  };

  // ─── Actualizar ejercicio ─────────────────────────────────
  const updateExercise = async (
    blockId: string,
    exId: string,
    fieldOrFields: string | Record<string, any>,
    value?: unknown
  ) => {
    const updates = typeof fieldOrFields === "string" ? { [fieldOrFields]: value } : fieldOrFields;

    setWeeks(prevWeeks => prevWeeks.map(w => ({
      ...w,
      days: w.days.map(d => ({
        ...d,
        blocks: d.blocks.map(b => b.id === blockId ? {
          ...b,
          training_exercises: b.training_exercises.map(te =>
            te.id === exId ? { ...te, ...updates } : te
          ),
        } : b),
      })),
    })));
    const supabase = createClient();
    await supabase.from("training_exercises").update(updates).eq("id", exId);
  };

  // ─── Actualizar descanso del complex (solo rest_seconds) ──
  const updateComplexRest = async (blockId: string, complexId: string, value: number | null) => {
    setWeeks(weeks.map(w => ({
      ...w,
      days: w.days.map(d => ({
        ...d,
        blocks: d.blocks.map(b => b.id === blockId ? {
          ...b,
          training_exercises: b.training_exercises.map(te =>
            te.complex_id === complexId ? { ...te, rest_seconds: value ?? undefined } : te
          ),
        } : b),
      })),
    })));
    const supabase = createClient();
    await supabase.from("training_exercises").update({ rest_seconds: value }).eq("complex_id", complexId);
  };

  // ─── Actualizar % de una serie ────────────────────────────
  const updateComplexSetPercentage = async (setId: string, pct: number | null) => {
    const supabase = createClient();
    const { error } = await supabase.from("training_complex_sets").update({ percentage_1rm: pct }).eq("id", setId);
    if (error) {
      toast.error("Error al guardar el porcentaje");
      console.error("updateComplexSetPercentage error:", error);
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

  // ─── Actualizar reps override de una serie ────────────────
  const updateComplexSetRepsOverride = async (
    setId: string,
    overrides: { training_exercise_id: string; reps: string }[]
  ) => {
    const supabase = createClient();
    await supabase.from("training_complex_sets").update({ reps_overrides: overrides }).eq("id", setId);
    setComplexSets(prev => {
      const next = { ...prev };
      for (const cid in next) {
        next[cid] = next[cid].map(s => s.id === setId ? { ...s, reps_overrides: overrides } : s);
      }
      return next;
    });
  };

  // ─── Actualizar rondas de una serie ───────────────────────
  const updateComplexSetRounds = async (setId: string, r: number) => {
    const supabase = createClient();
    await supabase.from("training_complex_sets").update({ rounds: r }).eq("id", setId);
    setComplexSets(prev => {
      const next = { ...prev };
      for (const cid in next) {
        next[cid] = next[cid].map(s => s.id === setId ? { ...s, rounds: r } : s);
      }
      return next;
    });
  };

  // ─── Agregar serie al complex ─────────────────────────────
  const addComplexSet = async (complexId: string, dayId: string) => {
    if (mutating) return;
    const currentSets = complexSets[complexId] || [];
    const nextNumber = currentSets.length > 0
      ? Math.max(...currentSets.map(s => s.set_number)) + 1
      : 1;
    const supabase = createClient();
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

  // ─── Eliminar serie del complex ───────────────────────────
  const removeComplexSet = async (setId: string) => {
    const supabase = createClient();
    await supabase.from("training_complex_sets").delete().eq("id", setId);
    setComplexSets(prev => {
      const next = { ...prev };
      for (const cid in next) {
        next[cid] = next[cid].filter(s => s.id !== setId);
      }
      return next;
    });
  };

  // ─── Desagrupar complex ───────────────────────────────────
  const ungroupComplex = async (blockId: string, complexId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("training_exercises")
      .update({ complex_id: null, complex_order: null })
      .eq("complex_id", complexId);

    if (error) return toast.error("Error al desagrupar");

    // También borrar los sets del complex
    await supabase.from("training_complex_sets").delete().eq("complex_id", complexId);

    setWeeks(weeks.map(w => ({
      ...w,
      days: w.days.map(d => ({
        ...d,
        blocks: d.blocks.map(b => b.id === blockId ? {
          ...b,
          training_exercises: b.training_exercises.map(te =>
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

  // ─── Eliminar ejercicio ───────────────────────────────────
  const deleteExercise = async (blockId: string, exId: string) => {
    const supabase = createClient();
    await supabase.from("training_exercises").delete().eq("id", exId);
    setWeeks(weeks.map(w => ({
      ...w,
      days: w.days.map(d => ({
        ...d,
        blocks: d.blocks.map(b => b.id === blockId ? {
          ...b, training_exercises: b.training_exercises.filter(te => te.id !== exId),
        } : b),
      })),
    })));
  };

  // ─── Asignar ciclo a alumnos ──────────────────────────────
  const assignToStudents = async (studentIds: string[], syncMode: string) => {
    if (!cycle) return;
    setAssigning(true);
    const supabase = createClient();

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
      loadData();
    }
    if (errors.length > 0) {
      toast.error(`Error al asignar a: ${errors.join(", ")}`);
    }
  };

  // ─── Guardar como plantilla ───────────────────────────────
  const saveAsTemplate = async () => {
    if (!cycle) return;
    const name = prompt("Nombre para la plantilla:", `Plantilla: ${cycle.name}`);
    if (!name) return;
    setSavingTemplate(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.rpc("copy_cycle", {
      p_source_cycle_id: cycle.id,
      p_trainer_id: user!.id,
      p_name: name.trim(),
      p_start_date: new Date().toISOString().split("T")[0],
      p_is_template: true,
    });
    setSavingTemplate(false);
    if (error) return toast.error("Error al guardar plantilla: " + error.message);
    toast.success(`Plantilla "${name}" guardada. Disponible en Ciclos → Plantillas.`);
  };

  const toggleWeek = (wId: string) =>
    setWeeks(weeks.map(w => w.id === wId ? { ...w, expanded: !w.expanded } : w));
  const toggleDay = (wId: string, dId: string) =>
    setWeeks(weeks.map(w => w.id === wId ? {
      ...w, days: w.days.map(d => d.id === dId ? { ...d, expanded: !d.expanded } : d),
    } : w));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-4xl" onClick={() => weekMenuOpen && setWeekMenuOpen(null)}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/entrenador/ciclos" className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground truncate">{cycle?.name}</h1>
            {cycle?.is_template && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-100 text-purple-700 shrink-0">
                Plantilla
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {cycle?.is_template ? "Plantilla reutilizable" : cycle?.student_name || "Sin alumno"} · {cycle?.total_weeks} semanas
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Asignar alumnos</span>
          </button>
          {!cycle?.is_template && (
            <button onClick={saveAsTemplate} disabled={savingTemplate}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors disabled:opacity-50">
              {savingTemplate
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <BookMarked className="w-4 h-4" />
              }
              <span className="hidden sm:inline">Como plantilla</span>
            </button>
          )}
        </div>
      </div>

      {/* Alumnos activos — collapsible */}
      {managedStudents.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <button
            onClick={() => setShowStudents(!showStudents)}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors text-left"
          >
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground flex-1">
              {managedStudents.length} alumno{managedStudents.length !== 1 ? "s" : ""} activo{managedStudents.length !== 1 ? "s" : ""}
            </span>
            {showStudents ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showStudents && (
            <div className="border-t border-border divide-y divide-border">
              {managedStudents.map(student => (
                <div key={student.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
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
                        className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary max-w-[160px]"
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

      {/* Semanas */}
      {weeks.map(week => (
        <div key={week.id} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          {/* Header semana */}
          <div className="flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors">
            <button onClick={() => toggleWeek(week.id)} className="flex items-center gap-3 flex-1 text-left">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${WEEK_TYPE_COLORS[week.type]}`}>
                S{week.week_number} — {WEEK_TYPE_LABELS[week.type]}
              </span>
              <span className="text-sm text-muted-foreground flex-1">
                {week.days.length} día{week.days.length !== 1 ? "s" : ""} configurado{week.days.length !== 1 ? "s" : ""}
              </span>
              {week.expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setWeekMenuOpen(weekMenuOpen === week.id ? null : week.id)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <MoreVertical className="w-4 h-4" />
              </button>
              {weekMenuOpen === week.id && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-border z-20 min-w-[180px] py-1">
                  <button onClick={() => { setCopyWeekTarget(week); setWeekMenuOpen(null); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted/50 text-left transition-colors">
                    <Copy className="w-4 h-4 text-primary" />
                    Copiar en esta semana
                  </button>
                </div>
              )}
            </div>
          </div>

          {week.expanded && (
            <div className="border-t border-border divide-y divide-border">
              {week.days.map(day => (
                <div key={day.id}>
                  <div className={`flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors ${day.is_rest ? "bg-blue-50/50" : ""}`}>
                    <button onClick={() => !day.is_rest && toggleDay(week.id, day.id)}
                      className="flex items-center gap-3 flex-1 text-left">
                      {day.is_rest
                        ? <Moon className="w-4 h-4 text-blue-400 shrink-0" />
                        : <Dumbbell className="w-4 h-4 text-primary shrink-0" />
                      }
                      <span className="font-medium text-foreground text-sm flex-1">
                        {DAY_NAMES[day.day_of_week]} — {day.label}
                      </span>
                      {day.is_rest
                        ? <span className="text-xs text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full font-medium">Descanso</span>
                        : <span className="text-xs text-muted-foreground">
                            {day.blocks.reduce((acc, b) => acc + b.training_exercises.length, 0)} ejercicios
                          </span>
                      }
                      {!day.is_rest && (day.expanded
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    {/* Vista previa de alumno */}
                    {!day.is_rest && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewDay(day);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                        title="Ver vista previa de alumno"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Toggle descanso */}
                    <button
                      onClick={() => toggleRestDay(week.id, day.id, day.is_rest)}
                      className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                        day.is_rest
                          ? "text-blue-500 bg-blue-100 hover:bg-blue-200"
                          : "text-muted-foreground hover:text-blue-500 hover:bg-blue-50"
                      }`}
                      title={day.is_rest ? "Restaurar como día de entrenamiento" : "Marcar como día de descanso"}
                    >
                      <Moon className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteDay(week.id, day.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Día de descanso — no muestra bloques */}
                  {day.is_rest && (
                    <div className="px-5 py-3 bg-blue-50/30 flex items-center gap-3">
                      <Moon className="w-4 h-4 text-blue-300 shrink-0" />
                      <p className="text-sm text-blue-400 italic">Día de descanso — sin entrenamiento programado.</p>
                      <button
                        onClick={() => toggleRestDay(week.id, day.id, true)}
                        className="ml-auto text-xs text-blue-500 hover:underline font-medium"
                      >
                        Convertir en día de entrenamiento
                      </button>
                    </div>
                  )}

                  {!day.is_rest && day.expanded && (
                    <div className="px-5 pb-4 space-y-4">
                      {day.blocks.map(block => {
                        const exerciseCount = block.training_exercises.length;
                        const isCollapsed = !expandedBlocks.has(block.id) && exerciseCount > 0;
                        return (
                        <div key={block.id} className={`rounded-xl border transition-all duration-200 ${
                          isCollapsed
                            ? "border-border/60 bg-muted/20 hover:bg-muted/30"
                            : "border-transparent bg-transparent"
                        }`}>
                          {/* Block header — always visible, clickable accordion */}
                          <button
                            onClick={() => exerciseCount > 0 && toggleBlock(block.id)}
                            className={`w-full flex items-center gap-2 text-left transition-colors ${
                              isCollapsed ? "px-4 py-3" : "py-1"
                            } ${exerciseCount > 0 ? "cursor-pointer" : "cursor-default"}`}
                          >
                            {exerciseCount > 0 && (
                              isCollapsed
                                ? <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}
                            <h4 className={`text-sm font-semibold flex-1 ${
                              isCollapsed ? "text-foreground" : "text-foreground"
                            }`}>{block.name}</h4>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize shrink-0">
                              {block.type === "fuerza" ? "Fuerza" : block.type === "warm_up" ? "Entrada en Calor" : block.type === "mobility" ? "Movilidad" : "Prep. Física"}
                            </span>
                            {isCollapsed && exerciseCount > 0 && (
                              <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium shrink-0">
                                <Check className="w-3 h-3" />
                                {exerciseCount} ej.
                              </span>
                            )}
                            {!isCollapsed && (
                              <span onClick={(e) => { e.stopPropagation(); deleteBlock(day.id, block.id); }}
                                className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                                <Trash2 className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </button>

                          {/* Block content — collapsible */}
                          {!isCollapsed && (
                            <div className="space-y-3 mt-1">
                              {block.type === "warm_up" || block.type === "mobility" ? (
                                <WarmUpBlock
                                  block={block}
                                  onAddExercise={() => setPickerBlock(block.id)}
                                  onDeleteExercise={deleteExercise}
                                  onUpdateExerciseField={updateExercise}
                                />
                              ) : block.type === "prep_fisica" ? (
                                <PrepFisicaBlock
                                  block={block}
                                  dayId={day.id}
                                  sets={complexSets[block.id] || []}
                                  onAddExercise={() => setPickerBlock(block.id)}
                                  onDeleteExercise={deleteExercise}
                                  onUpdateExerciseField={updateExercise}
                                  onAddSet={addComplexSet}
                                  onRemoveSet={removeComplexSet}
                                  onUpdateSetRepsOverride={updateComplexSetRepsOverride}
                                  onUpdateRest={updateComplexRest}
                                />
                              ) : (
                                <>
                                  {/* Render exercises (singles + complexes) */}
                                  <div className="space-y-2">
                                    {getBlockItems(block.training_exercises).map(item =>
                                      item.type === "single" ? (
                                        <ExerciseRow
                                          key={item.ex.id}
                                          ex={item.ex}
                                          blockId={block.id}
                                          onUpdate={updateExercise}
                                          onDelete={deleteExercise}
                                          oneRM={!cycle?.is_template && item.ex.exercise_id ? studentOneRMs[item.ex.exercise_id] : undefined}
                                        />
                                      ) : (
                                        <ComplexCard
                                          key={item.complexId}
                                          exs={item.exs}
                                          complexId={item.complexId}
                                          blockId={block.id}
                                          dayId={day.id}
                                          sets={complexSets[item.complexId] || []}
                                          onUpdateField={updateExercise}
                                          onUpdateSetPercentage={updateComplexSetPercentage}
                                          onUpdateSetRepsOverride={updateComplexSetRepsOverride}
                                          onUpdateSetRounds={updateComplexSetRounds}
                                          onAddSet={addComplexSet}
                                          onRemoveSet={removeComplexSet}
                                          onUpdateRest={updateComplexRest}
                                          onDelete={deleteExercise}
                                          onUngroup={ungroupComplex}
                                          studentOneRMs={cycle?.is_template ? {} : studentOneRMs}
                                        />
                                      )
                                    )}
                                  </div>

                                  {/* Add buttons */}
                                  <div className="flex gap-3 flex-wrap">
                                    <button onClick={() => setPickerBlock(block.id)}
                                      className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
                                      <Plus className="w-4 h-4" /> Agregar ejercicio
                                    </button>
                                    <button onClick={() => setComplexPickerBlock(block.id)}
                                      className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium hover:text-primary transition-colors">
                                      <Link2 className="w-4 h-4" /> Complex / Trepada
                                    </button>
                                  </div>
                                </>
                              )}

                              {/* Block Notes */}
                              <div className="pt-3 border-t border-border/50 mt-4">
                                <input
                                  type="text"
                                  defaultValue={block.wod_config?.notes ? String(block.wod_config.notes) : ""}
                                  onBlur={e => updateWodConfig(week.id, day.id, block.id, { ...block.wod_config, notes: e.target.value })}
                                  placeholder="📝 Agregar notas o instrucciones para el alumno sobre este bloque..."
                                  className="w-full text-xs px-2.5 py-1.5 rounded border border-border bg-white focus:border-indigo-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-muted-foreground/60 text-foreground"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                      })}

                      {day.blocks.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Sin bloques. Agregá uno:</p>
                      )}
                      <div className="flex gap-2 flex-wrap pt-1">
                        <button onClick={() => addBlock(day.id, "warm_up")}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                          <Plus className="w-3.5 h-3.5" /> Entrada en Calor
                        </button>
                        <button onClick={() => addBlock(day.id, "mobility")}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-emerald-500 hover:text-emerald-700 transition-colors">
                          <Plus className="w-3.5 h-3.5" /> Movilidad
                        </button>
                        <button onClick={() => addBlock(day.id, "fuerza")}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                          <Plus className="w-3.5 h-3.5" /> Bloque de Fuerza
                        </button>
                        <button onClick={() => addBlock(day.id, "prep_fisica")}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                          <Plus className="w-3.5 h-3.5" /> Preparación Física
                        </button>
                        <button onClick={() => toggleRestDay(week.id, day.id, false)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-blue-200 text-sm text-blue-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Moon className="w-3.5 h-3.5" /> Día de descanso
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="px-5 py-3">
                <button onClick={() => addDay(week.id)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary font-medium transition-colors">
                  <Plus className="w-4 h-4" /> Agregar día
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Modals */}
      {pickerBlock && (
        <ExercisePicker
          exercises={exercises}
          onSelect={handleExerciseSelect}
          onClose={() => setPickerBlock(null)}
          loading={mutating}
          initialCategory={(
            () => {
              const block = weeks.flatMap(w => w.days).flatMap(d => d.blocks).find(b => b.id === pickerBlock);
              if (block?.type === "fuerza") return "fuerza";
              if (block?.type === "prep_fisica") return "prep_fisica";
              return "all";
            }
          )()}
        />
      )}

      {complexPickerBlock && (
        <ComplexPicker
          exercises={exercises}
          onConfirm={handleComplexCreate}
          onClose={() => setComplexPickerBlock(null)}
          loading={mutating}
          initialCategory={(
            () => {
              const block = weeks.flatMap(w => w.days).flatMap(d => d.blocks).find(b => b.id === complexPickerBlock);
              if (block?.type === "fuerza") return "fuerza";
              if (block?.type === "prep_fisica") return "prep_fisica";
              return "all";
            }
          )()}
        />
      )}

      {copyWeekTarget && (
        <CopyWeekModal
          weeks={weeks}
          targetWeek={copyWeekTarget}
          onCopy={(srcId, delta) => copyWeek(srcId, copyWeekTarget.id, delta)}
          onClose={() => setCopyWeekTarget(null)}
          copying={copying}
        />
      )}

      {showAssignModal && cycle && (
        <AssignStudentsModal
          students={students}
          cycleName={cycle.name}
          onAssign={assignToStudents}
          onClose={() => setShowAssignModal(false)}
          assigning={assigning}
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
    </div>
  );
}

// ─── Day Preview Modal (Blackboard style) ──────────────────────
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
      {/* Container simulating a mobile device or a premium preview card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header bar simulating a mobile phone screen header or blackboard */}
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

        {/* WOD Content area ( chalkboard theme ) */}
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
              const blockItems = getBlockItems(block.training_exercises);
              if (blockItems.length === 0) return null;

              return (
                <div key={block.id} className="space-y-4">
                  <h3 className="text-lg font-black text-[#ff5252] uppercase tracking-widest border-b border-zinc-900 pb-1">
                    {block.name}
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
                        const isPrep = block.type === "prep_fisica";

                        if (isPrep) {
                          return (
                            <div
                              key={item.complexId}
                              className="p-4 rounded-xl bg-zinc-900/50 border border-emerald-800/30 space-y-3 hover:border-emerald-800/50 transition-colors"
                            >
                              <div className="space-y-1">
                                <h4 className="text-white font-extrabold text-base leading-tight flex items-center gap-1.5">
                                  <Dumbbell className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                                  <span>Circuito de Preparación Física</span>
                                </h4>
                                <div className="flex items-center gap-2 text-[10px] font-semibold text-zinc-400">
                                  <span className="px-2 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 rounded">
                                    {cSets.length} Rondas
                                  </span>
                                  {item.exs[0]?.rest_seconds && (
                                    <span className="text-zinc-500 font-normal">
                                      Descanso: {item.exs[0].rest_seconds}s
                                    </span>
                                  )}
                                </div>
                              </div>

                              {item.exs.some(te => te.notes) && (
                                <div className="space-y-1 border-l border-emerald-900 pl-2">
                                  {item.exs.filter(te => te.notes).map(te => (
                                    <p key={te.id} className="text-zinc-500 text-[10px] italic">
                                      * {te.exercise?.name}: {te.notes}
                                    </p>
                                  ))}
                                </div>
                              )}

                              {/* Desglose de rondas */}
                              <div className="space-y-3 pt-1">
                                {cSets.map((s, sIdx) => (
                                  <div key={s.id} className="space-y-1 border-t border-zinc-800/40 pt-1.5 first:border-t-0 first:pt-0">
                                    <span className="text-emerald-500 font-bold text-xs">Ronda {s.set_number || sIdx + 1}:</span>
                                    <div className="space-y-0.5 pl-2">
                                      {item.exs.map(te => {
                                        const ov = s.reps_overrides.find(o => o.training_exercise_id === te.id);
                                        const r = ov?.reps ?? te.reps;
                                        
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

                                        const loadText = pct !== null ? `@ ${pct}% 1RM` : wt !== null ? `@ ${wt} kg` : "";

                                        return (
                                          <div key={te.id} className="text-xs text-zinc-300 flex justify-between">
                                            <span className="truncate max-w-[200px]">{te.exercise?.name}</span>
                                            <span className="font-mono text-zinc-400">{r} reps {loadText}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }

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
                                  {item.exs.length > 1 ? "Complex" : "Trepada"} ({cSets.length} series)
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

                            {/* Desglose de series */}
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
                                    <span className="text-[#ff5252] font-bold">S{s.set_number}:</span>
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
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
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
