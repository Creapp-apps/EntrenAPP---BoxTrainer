"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Loader2, ChevronDown, ChevronRight,
  Dumbbell, Trash2, GripVertical, Search, X, Check, Copy,
  MoreVertical, BookMarked, Link2, UserPlus, Users, Moon
} from "lucide-react";
import Link from "next/link";
import { DAY_NAMES, WEEK_TYPE_LABELS, WEEK_TYPE_COLORS } from "@/lib/utils";

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
type Block = { id: string; name: string; type: string; order: number; training_exercises: TrainingExercise[] };
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
  { value: "fuerza", label: "Fuerza" },
  { value: "prep_fisica", label: "Prep. Física" },
  { value: "accesorio", label: "Accesorio" },
];

function ExercisePicker({
  exercises, onSelect, onClose
}: {
  exercises: Exercise[];
  onSelect: (ex: Exercise, variant?: Variant) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Exercise | null>(null);

  const filtered = exercises.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === "all" || e.category === category;
    return matchesSearch && matchesCat;
  });

  // Count per category for badges
  const counts = exercises.reduce((acc: Record<string, number>, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
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
            <div className="px-3 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar ejercicio..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            {/* Category tabs */}
            <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
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
                <button key={ex.id} onClick={() => ex.variants.length > 0 ? setSelected(ex) : onSelect(ex)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{ex.name}</p>
                    {category === "all" && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {CATEGORY_TABS.find(t => t.value === ex.category)?.label ?? ex.category}
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
              <button onClick={() => onSelect(selected)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border">
                <span className="text-sm font-medium text-foreground">Sin variante (base)</span>
              </button>
              {selected.variants.map(v => (
                <button key={v.id} onClick={() => onSelect(selected, v)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0">
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

// ─── Complex Picker Modal (multi-select) ─────────────────────
function ComplexPicker({
  exercises, onConfirm, onClose,
}: {
  exercises: Exercise[];
  onConfirm: (items: { ex: Exercise; variant?: Variant }[]) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedItems, setSelectedItems] = useState<{ ex: Exercise; variant?: Variant }[]>([]);
  const [pickingVariantFor, setPickingVariantFor] = useState<Exercise | null>(null);

  const filtered = exercises.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === "all" || e.category === category;
    return matchesSearch && matchesCat;
  });

  const counts = exercises.reduce((acc: Record<string, number>, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" /> Crear complex
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Seleccioná 2 o más ejercicios</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected preview */}
        {selectedItems.length > 0 && (
          <div className="p-3 border-b border-border bg-primary/5">
            <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">
              Complex ({selectedItems.length} ejercicio{selectedItems.length !== 1 ? "s" : ""}):
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
            {/* Search */}
            <div className="px-3 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input autoFocus={selectedItems.length === 0} value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar y agregar ejercicio..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            {/* Category tabs */}
            <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
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
                        {CATEGORY_TABS.find(t => t.value === ex.category)?.label ?? ex.category}
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
          <button onClick={() => selectedItems.length >= 2 && onConfirm(selectedItems)}
            disabled={selectedItems.length < 2}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            <Link2 className="w-4 h-4" />
            Crear ({selectedItems.length})
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Complex Card ─────────────────────────────────────────────
function ComplexCard({
  exs, complexId, blockId,
  onUpdateField, onUpdateComplexShared, onDelete, onUngroup,
  studentOneRMs,
}: {
  exs: TrainingExercise[];
  complexId: string;
  blockId: string;
  onUpdateField: (blockId: string, exId: string, field: string, value: unknown) => void;
  onUpdateComplexShared: (blockId: string, complexId: string, field: string, value: unknown) => void;
  onDelete: (blockId: string, exId: string) => void;
  onUngroup: (blockId: string, complexId: string) => void;
  studentOneRMs: Record<string, number>;
}) {
  const sorted = [...exs].sort((a, b) => (a.complex_order ?? 0) - (b.complex_order ?? 0));
  const sharedSets = sorted[0]?.sets ?? 3;
  const sharedRest = sorted[0]?.rest_seconds;

  return (
    <div className="border-2 border-primary/25 rounded-xl overflow-hidden">
      {/* Complex header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border-b border-primary/20">
        <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs font-bold text-primary uppercase tracking-wide flex-1">
          Complex · {sorted.length} ejercicios
        </span>
        <button onClick={() => onUngroup(blockId, complexId)}
          className="text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-0.5 rounded border border-border/60 bg-white font-medium">
          Desagrupar
        </button>
      </div>

      {/* Per-exercise rows */}
      <div className="divide-y divide-primary/10 bg-primary/5">
        {sorted.map((te, i) => {
          const name = te.exercise?.name ?? "";
          const variantName = te.variant?.name ?? "";
          const displayName = variantName ? `${name} — ${variantName}` : name;
          const oneRM = te.exercise_id ? studentOneRMs[te.exercise_id] : undefined;
          const calculatedWeight = oneRM && te.percentage_1rm
            ? Math.round((oneRM * te.percentage_1rm / 100) / 2.5) * 2.5
            : null;

          return (
            <div key={te.id} className="flex items-start gap-2 px-3 py-2.5 group">
              <span className="text-xs font-bold text-primary/50 w-4 mt-2 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Reps</label>
                    <input type="text" value={te.reps}
                      onChange={e => onUpdateField(blockId, te.id, "reps", e.target.value)}
                      placeholder="1"
                      className="w-full px-2 py-1.5 rounded-lg border border-border text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-primary bg-white" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">% 1RM</label>
                    <input type="number" min="0" max="110" value={te.percentage_1rm ?? ""}
                      onChange={e => onUpdateField(blockId, te.id, "percentage_1rm", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="75"
                      className="w-full px-2 py-1.5 rounded-lg border border-border text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-primary bg-white" />
                    {calculatedWeight && (
                      <p className="text-xs text-primary font-medium mt-0.5 text-center">≈ {calculatedWeight} kg</p>
                    )}
                  </div>
                </div>
                <input type="text" value={te.notes ?? ""}
                  onChange={e => onUpdateField(blockId, te.id, "notes", e.target.value)}
                  placeholder="Notas (opcional)..."
                  className="w-full px-2 py-1 rounded-lg border border-border text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary bg-white" />
              </div>
              <button onClick={() => onDelete(blockId, te.id)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 mt-1 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Shared fields (sets + rest) */}
      <div className="px-3 py-2.5 bg-primary/10 border-t border-primary/20 grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground font-medium">Series (todas)</label>
          <input type="number" min="1" value={sharedSets}
            onChange={e => onUpdateComplexShared(blockId, complexId, "sets", parseInt(e.target.value) || 1)}
            className="w-full px-2 py-1.5 rounded-lg border border-border text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-primary bg-white mt-0.5" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium">Descanso (seg)</label>
          <input type="number" min="0" value={sharedRest ?? ""}
            onChange={e => onUpdateComplexShared(blockId, complexId, "rest_seconds", e.target.value ? parseInt(e.target.value) : null)}
            placeholder="180"
            className="w-full px-2 py-1.5 rounded-lg border border-border text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary bg-white mt-0.5" />
        </div>
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
            <input type="number" min="1" value={ex.sets}
              onChange={e => onUpdate(blockId, ex.id, "sets", parseInt(e.target.value) || 1)}
              className="w-full px-2 py-1.5 rounded-lg border border-border text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Reps</label>
            <input type="text" value={ex.reps}
              onChange={e => onUpdate(blockId, ex.id, "reps", e.target.value)}
              placeholder="5 / 3-5"
              className="w-full px-2 py-1.5 rounded-lg border border-border text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">% 1RM</label>
            <input type="number" min="0" max="110" value={ex.percentage_1rm ?? ""}
              onChange={e => onUpdate(blockId, ex.id, "percentage_1rm", e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="75"
              className="w-full px-2 py-1.5 rounded-lg border border-border text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-primary" />
            {calculatedWeight && (
              <p className="text-xs text-primary font-medium mt-0.5 text-center">≈ {calculatedWeight} kg</p>
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
        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 mt-1 shrink-0">
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
  onAssign: (studentIds: string[]) => void;
  onClose: () => void;
  assigning: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-2">
          {selected.size > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              Se creará una copia del ciclo para cada alumno seleccionado
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button
              onClick={() => selected.size > 0 && onAssign(Array.from(selected))}
              disabled={selected.size === 0 || assigning}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {assigning
                ? <><Loader2 className="w-4 h-4 animate-spin" />Asignando...</>
                : <><UserPlus className="w-4 h-4" />Asignar ({selected.size})</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function CicloDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentOneRMs, setStudentOneRMs] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [pickerBlock, setPickerBlock] = useState<string | null>(null);
  const [complexPickerBlock, setComplexPickerBlock] = useState<string | null>(null);
  const [copyWeekTarget, setCopyWeekTarget] = useState<Week | null>(null);
  const [weekMenuOpen, setWeekMenuOpen] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const [{ data: cycleData }, { data: weeksData }, { data: exData }, { data: ormsData }, { data: studentsData }] = await Promise.all([
      supabase.from("training_cycles")
        .select("*, users!training_cycles_student_id_fkey(full_name)")
        .eq("id", id).single(),
      supabase.from("training_weeks")
        .select(`*, training_days(*, training_blocks(*, training_exercises(*, exercises(*, exercise_variants(*)), exercise_variants(*))))`)
        .eq("cycle_id", id).order("week_number"),
      supabase.from("exercises")
        .select("*, exercise_variants(*)")
        .eq("archived", false).order("name"),
      supabase.from("student_one_rm").select("*"),
      supabase.from("users")
        .select("id, full_name, training_cycles!training_cycles_student_id_fkey(id, name, active, is_template)")
        .eq("role", "student")
        .eq("created_by", user!.id)
        .order("full_name"),
    ]);

    if (cycleData) {
      setCycle({
        id: cycleData.id,
        name: cycleData.name,
        total_weeks: cycleData.total_weeks,
        student_id: cycleData.student_id,
        student_name: (cycleData.users as { full_name: string })?.full_name || "",
        is_template: cycleData.is_template || false,
      });
    }

    if (exData) {
      setExercises(exData.map(e => ({
        id: e.id, name: e.name, category: e.category, muscle_group: e.muscle_group,
        variants: (e.exercise_variants || []) as Variant[],
      })));
    }

    if (ormsData) {
      const map: Record<string, number> = {};
      ormsData.forEach((r: { exercise_id: string; weight_kg: number }) => { map[r.exercise_id] = r.weight_kg; });
      setStudentOneRMs(map);
    }

    if (studentsData) {
      setStudents(studentsData.map((s: Record<string, unknown>) => {
        const cycles = (s.training_cycles as { id: string; name: string; active: boolean; is_template: boolean }[]) || [];
        const activeCycle = cycles.find(c => c.active && !c.is_template);
        return {
          id: s.id as string,
          full_name: s.full_name as string,
          activeCycle: activeCycle ? { id: activeCycle.id, name: activeCycle.name } : undefined,
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
          blocks: ((d.training_blocks || []) as Record<string, unknown>[]).map((b: Record<string, unknown>) => ({
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
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Agregar día ──────────────────────────────────────────
  const addDay = async (weekId: string) => {
    const week = weeks.find(w => w.id === weekId);
    if (!week) return;
    const existingDays = week.days.map(d => d.day_of_week);
    const nextDay = [1, 2, 3, 4, 5, 6, 7].find(d => !existingDays.includes(d));
    if (!nextDay) return toast.error("Ya están todos los días de la semana");

    const supabase = createClient();
    const { data, error } = await supabase.from("training_days").insert({
      week_id: weekId,
      day_of_week: nextDay,
      label: `Entrenamiento ${DAY_NAMES[nextDay]}`,
      order: week.days.length,
    }).select().single();

    if (error) return toast.error("Error al agregar día");

    setWeeks(weeks.map(w => w.id === weekId ? {
      ...w,
      days: [...w.days, { ...data, is_rest: false, blocks: [], expanded: true }].sort((a, b) => a.day_of_week - b.day_of_week),
    } : w));
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
  const addBlock = async (dayId: string, type: "fuerza" | "prep_fisica") => {
    const supabase = createClient();
    const day = weeks.flatMap(w => w.days).find(d => d.id === dayId);
    const name = type === "fuerza" ? "Bloque de Fuerza" : "Preparación Física";

    const { data, error } = await supabase.from("training_blocks").insert({
      day_id: dayId, name, type, order: day?.blocks.length || 0,
    }).select().single();

    if (error) return toast.error("Error al agregar bloque");

    setWeeks(weeks.map(w => ({
      ...w,
      days: w.days.map(d => d.id === dayId ? {
        ...d, blocks: [...d.blocks, { ...data, training_exercises: [] }],
      } : d),
    })));
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

        for (const sourceBlock of sourceDay.blocks) {
          const { data: newBlock, error: blockError } = await supabase
            .from("training_blocks").insert({
              day_id: newDay.id,
              name: sourceBlock.name,
              type: sourceBlock.type,
              order: sourceBlock.order,
            }).select().single();
          if (blockError) throw new Error("Error al copiar bloque: " + blockError.message);

          // Map old complex_id → new complex_id
          const complexIdMap = new Map<string, string>();

          const exercisesToInsert = sourceBlock.training_exercises.map(te => {
            let newPct = te.percentage_1rm;
            if (newPct !== undefined && newPct !== null && pctDelta !== 0) {
              newPct = Math.min(110, Math.max(10, newPct + pctDelta));
            }
            let newComplexId: string | null = null;
            if (te.complex_id) {
              if (!complexIdMap.has(te.complex_id)) {
                complexIdMap.set(te.complex_id, crypto.randomUUID());
              }
              newComplexId = complexIdMap.get(te.complex_id)!;
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

            newExercises = (insertedExs || []).map((te, i) => ({
              ...te,
              exercise: sourceBlock.training_exercises[i]?.exercise,
              variant: sourceBlock.training_exercises[i]?.variant,
            }));
          }

          newBlocks.push({ ...newBlock, training_exercises: newExercises });
        }

        newDays.push({ ...newDay, blocks: newBlocks, expanded: false });
      }

      setWeeks(prev => prev.map(w => w.id === targetWeekId
        ? { ...w, days: newDays.sort((a, b) => a.day_of_week - b.day_of_week) }
        : w
      ));

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
    if (!pickerBlock) return;
    const supabase = createClient();
    const block = weeks.flatMap(w => w.days).flatMap(d => d.blocks).find(b => b.id === pickerBlock);

    const { data, error } = await supabase.from("training_exercises").insert({
      block_id: pickerBlock,
      exercise_id: ex.id,
      variant_id: variant?.id || null,
      sets: 3,
      reps: "5",
      percentage_1rm: null,
      order: block?.training_exercises.length || 0,
    }).select().single();

    if (error) { toast.error("Error: " + error.message); return; }

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
    setPickerBlock(null);
  };

  // ─── Crear complex ────────────────────────────────────────
  const handleComplexCreate = async (items: { ex: Exercise; variant?: Variant }[]) => {
    if (!complexPickerBlock) return;
    const supabase = createClient();
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

    const { data, error } = await supabase.from("training_exercises").insert(toInsert).select("*");
    if (error) { toast.error("Error al crear complex: " + error.message); return; }

    const newExs: TrainingExercise[] = (data || []).map((te, i) => ({
      ...te,
      exercise: items[i].ex,
      variant: items[i].variant,
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
    setComplexPickerBlock(null);
    toast.success(`Complex creado con ${items.length} ejercicios`);
  };

  // ─── Actualizar ejercicio ─────────────────────────────────
  const updateExercise = async (blockId: string, exId: string, field: string, value: unknown) => {
    setWeeks(weeks.map(w => ({
      ...w,
      days: w.days.map(d => ({
        ...d,
        blocks: d.blocks.map(b => b.id === blockId ? {
          ...b,
          training_exercises: b.training_exercises.map(te =>
            te.id === exId ? { ...te, [field]: value } : te
          ),
        } : b),
      })),
    })));
    const supabase = createClient();
    await supabase.from("training_exercises").update({ [field]: value }).eq("id", exId);
  };

  // ─── Actualizar campos compartidos del complex ────────────
  const updateComplexShared = async (blockId: string, complexId: string, field: string, value: unknown) => {
    setWeeks(weeks.map(w => ({
      ...w,
      days: w.days.map(d => ({
        ...d,
        blocks: d.blocks.map(b => b.id === blockId ? {
          ...b,
          training_exercises: b.training_exercises.map(te =>
            te.complex_id === complexId ? { ...te, [field]: value } : te
          ),
        } : b),
      })),
    })));
    const supabase = createClient();
    await supabase.from("training_exercises").update({ [field]: value }).eq("complex_id", complexId);
  };

  // ─── Desagrupar complex ───────────────────────────────────
  const ungroupComplex = async (blockId: string, complexId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("training_exercises")
      .update({ complex_id: null, complex_order: null })
      .eq("complex_id", complexId);

    if (error) return toast.error("Error al desagrupar");

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
  const assignToStudents = async (studentIds: string[]) => {
    if (!cycle) return;
    setAssigning(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let successCount = 0;
    const errors: string[] = [];

    for (const studentId of studentIds) {
      const student = students.find(s => s.id === studentId);
      const cycleName = cycle.name;
      const { error } = await supabase.rpc("copy_cycle", {
        p_source_cycle_id: cycle.id,
        p_trainer_id: user!.id,
        p_name: cycleName,
        p_start_date: new Date().toISOString().split("T")[0],
        p_student_id: studentId,
        p_is_template: false,
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
      p_student_id: null,
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
                      {day.blocks.map(block => (
                        <div key={block.id} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-foreground flex-1">{block.name}</h4>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize">{block.type}</span>
                            <button onClick={() => deleteBlock(day.id, block.id)}
                              className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

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
                                  oneRM={item.ex.exercise_id ? studentOneRMs[item.ex.exercise_id] : undefined}
                                />
                              ) : (
                                <ComplexCard
                                  key={item.complexId}
                                  exs={item.exs}
                                  complexId={item.complexId}
                                  blockId={block.id}
                                  onUpdateField={updateExercise}
                                  onUpdateComplexShared={updateComplexShared}
                                  onDelete={deleteExercise}
                                  onUngroup={ungroupComplex}
                                  studentOneRMs={studentOneRMs}
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
                              <Link2 className="w-4 h-4" /> Agregar complex
                            </button>
                          </div>
                        </div>
                      ))}

                      {day.blocks.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Sin bloques. Agregá uno:</p>
                      )}
                      <div className="flex gap-2 flex-wrap pt-1">
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
        />
      )}

      {complexPickerBlock && (
        <ComplexPicker
          exercises={exercises}
          onConfirm={handleComplexCreate}
          onClose={() => setComplexPickerBlock(null)}
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
    </div>
  );
}
