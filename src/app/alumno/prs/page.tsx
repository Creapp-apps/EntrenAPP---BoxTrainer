"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Trophy,
  Sparkles,
  ArrowLeft,
  Search,
  Dumbbell,
  Check,
  Loader2,
  X,
  Plus,
  Trash2,
  Calculator,
  Percent,
  TrendingUp,
} from "lucide-react";

type Exercise = {
  id: string;
  name: string;
  category: string;
  muscle_group: string;
};

type OneRM = {
  exercise_id: string;
  weight_kg: number;
  recorded_at?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  fuerza: "Fuerza",
  olimpico: "Levantamientos Olímpicos",
  prep_fisica: "Preparación Física",
  accesorio: "Accesorio",
};

export default function StudentPRsPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [oneRMs, setOneRMs] = useState<Record<string, OneRM>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"records" | "calculator">("records");
  const [recordsFilter, setRecordsFilter] = useState<"all" | "only_rm">("only_rm");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Calculator state
  const [calcWeight, setCalcWeight] = useState("");
  const [calcReps, setCalcReps] = useState("1");
  const [calcExerciseId, setCalcExerciseId] = useState("");
  const [calculated1RM, setCalculated1RM] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: exs }, { data: rms }] = await Promise.all([
          supabase
            .from("exercises")
            .select("id, name, category, muscle_group")
            .eq("archived", false)
            .order("name"),
          supabase.from("student_one_rm").select("*").eq("student_id", user.id),
        ]);

        setExercises(exs || []);

        if (rms) {
          const map: Record<string, OneRM> = {};
          rms.forEach((r) => {
            map[r.exercise_id] = r;
          });
          setOneRMs(map);
        }
      } catch (err) {
        console.error("Error loading RMs:", err);
        toast.error("Error al cargar datos");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleStartEdit = (exerciseId: string) => {
    setEditingId(exerciseId);
    setEditValue(oneRMs[exerciseId]?.weight_kg?.toString() || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSaveOneRM = async (exerciseId: string, customWeight?: number) => {
    const weightVal = customWeight !== undefined ? customWeight : parseFloat(editValue);
    if (isNaN(weightVal) || weightVal <= 0) {
      return toast.error("Ingresá un peso válido");
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const recordDate = new Date().toISOString().split("T")[0];

      const { error } = await supabase.from("student_one_rm").upsert(
        {
          student_id: user.id,
          exercise_id: exerciseId,
          weight_kg: weightVal,
          recorded_at: recordDate,
        },
        { onConflict: "student_id,exercise_id" }
      );

      if (error) throw error;

      setOneRMs((prev) => ({
        ...prev,
        [exerciseId]: { exercise_id: exerciseId, weight_kg: weightVal, recorded_at: recordDate },
      }));

      toast.success("1RM guardado correctamente");
      setEditingId(null);
    } catch (err: any) {
      console.error("Error saving 1RM:", err);
      toast.error("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOneRM = async (exerciseId: string) => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("student_one_rm")
        .delete()
        .eq("student_id", user.id)
        .eq("exercise_id", exerciseId);

      if (error) throw error;

      setOneRMs((prev) => {
        const next = { ...prev };
        delete next[exerciseId];
        return next;
      });

      toast.success("1RM eliminado");
    } catch (err: any) {
      console.error("Error deleting 1RM:", err);
      toast.error("Error al eliminar: " + err.message);
    }
  };

  // Calculator calculation (Epley formula)
  useEffect(() => {
    const w = parseFloat(calcWeight);
    const r = parseInt(calcReps);
    if (!isNaN(w) && w > 0 && !isNaN(r) && r > 0) {
      if (r === 1) {
        setCalculated1RM(w);
      } else {
        const estimated = w * (1 + r / 30);
        setCalculated1RM(Math.round(estimated * 10) / 10);
      }
    } else {
      setCalculated1RM(null);
    }
  }, [calcWeight, calcReps]);

  const handleSaveCalculated = async () => {
    if (!calcExerciseId) return toast.error("Seleccioná un ejercicio primero");
    if (!calculated1RM) return toast.error("Ingresá peso y repeticiones válidos");
    await handleSaveOneRM(calcExerciseId, calculated1RM);
    toast.success("Récord estimado guardado en tu perfil");
  };

  // Filter exercises
  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      (ex.muscle_group === "olimpico" ? "olimpico" : ex.category) === selectedCategory;

    const hasRM = !!oneRMs[ex.id];
    const matchesRMFilter = recordsFilter === "all" || hasRM;

    return matchesSearch && matchesCategory && matchesRMFilter;
  });

  // Group by category (treat olimpico muscle_group as a category)
  const groupedExercises = filteredExercises.reduce((acc, ex) => {
    const cat = ex.muscle_group === "olimpico" ? "olimpico" : ex.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>);

  const totalLoaded = Object.keys(oneRMs).length;

  // Percentage list for 1RM calculator table
  const PERCENTAGES = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden select-none pb-24">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between border-b border-white/5 bg-slate-950/60 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/alumno"
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-slate-300" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Récords Personales</h1>
            <p className="text-xs text-slate-400">Tus estimaciones y marcas de 1RM</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-2xl">
          <Trophy className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-xs font-bold text-primary">{totalLoaded} marcas</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-lg mx-auto w-full px-5 py-6 space-y-6 z-10">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-900/80 border border-white/5 rounded-2xl">
          <button
            onClick={() => setActiveTab("records")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "records"
                ? "bg-slate-800 text-white shadow-lg border border-white/5"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            Mis Marcas
          </button>
          <button
            onClick={() => setActiveTab("calculator")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "calculator"
                ? "bg-slate-800 text-white shadow-lg border border-white/5"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Calculator className="w-4 h-4" />
            Calculador 1RM
          </button>
        </div>

        {activeTab === "records" ? (
          <div className="space-y-5">
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar ejercicio..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/5 bg-slate-900/60 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Category selector */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: "all", label: "Todos" },
                  { id: "fuerza", label: "Fuerza" },
                  { id: "olimpico", label: "Olímpicos" },
                  { id: "prep_fisica", label: "Física" },
                  { id: "accesorio", label: "Accesorios" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                      selectedCategory === cat.id
                        ? "bg-primary text-white border-primary"
                        : "bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Records Filter toggle (All vs Only loaded) */}
              <div className="flex items-center justify-between p-1 bg-slate-900/40 border border-white/5 rounded-xl">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 pl-2">
                  Mostrar marcas:
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setRecordsFilter("only_rm")}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      recordsFilter === "only_rm"
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Solo Registradas
                  </button>
                  <button
                    onClick={() => setRecordsFilter("all")}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      recordsFilter === "all"
                        ? "bg-slate-800 text-slate-200"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Todos
                  </button>
                </div>
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-xs text-slate-400">Cargando tus registros...</span>
              </div>
            ) : Object.keys(groupedExercises).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(groupedExercises).map(([cat, exs]) => (
                  <div
                    key={cat}
                    className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl shadow-xl"
                  >
                    {/* Category Title */}
                    <div className="px-5 py-3 border-b border-white/5 bg-slate-950/40">
                      <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {CATEGORY_LABELS[cat] || cat}
                      </h3>
                    </div>

                    {/* Exercises List */}
                    <div className="divide-y divide-white/5">
                      {exs.map((ex) => {
                        const rm = oneRMs[ex.id];
                        const isEditing = editingId === ex.id;

                        return (
                          <div
                            key={ex.id}
                            className="px-5 py-4.5 flex items-center justify-between gap-4 hover:bg-white/[0.01] transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                                  rm
                                    ? "bg-gradient-to-br from-primary/20 to-orange-500/10 border border-primary/30 shadow-inner"
                                    : "bg-slate-950 border border-white/5"
                                }`}
                              >
                                <Dumbbell
                                  className={`w-4 h-4 ${
                                    rm ? "text-primary" : "text-slate-500"
                                  }`}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-100 truncate">
                                  {ex.name}
                                </p>
                                {rm && rm.recorded_at && (
                                  <p className="text-[9px] text-slate-500 mt-0.5">
                                    Act. el {rm.recorded_at}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Actions / RM Weight Display */}
                            {isEditing ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="flex items-center bg-slate-950 border border-primary/50 rounded-xl px-2 py-1">
                                  <input
                                    type="number"
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveOneRM(ex.id);
                                      if (e.key === "Escape") handleCancelEdit();
                                    }}
                                    placeholder="kg"
                                    className="w-12 bg-transparent text-xs font-bold text-center text-primary focus:outline-none"
                                  />
                                  <span className="text-[10px] font-black text-slate-500 uppercase">
                                    kg
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleSaveOneRM(ex.id)}
                                  disabled={saving}
                                  className="p-2 rounded-xl bg-primary text-white hover:bg-primary/95 transition-all shadow-md shadow-primary/20"
                                >
                                  {saving ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 shrink-0">
                                <div
                                  onClick={() => handleStartEdit(ex.id)}
                                  className={`cursor-pointer px-3.5 py-1.5 rounded-xl border font-black text-xs transition-all ${
                                    rm
                                      ? "bg-gradient-to-r from-primary to-orange-500 text-white border-primary/20 shadow-md shadow-primary/10 hover:opacity-90 active:scale-95"
                                      : "bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10"
                                  }`}
                                >
                                  {rm ? `${rm.weight_kg} kg` : "Cargar RM"}
                                </div>

                                {rm && (
                                  <button
                                    onClick={() => handleDeleteOneRM(ex.id)}
                                    className="p-2 rounded-xl bg-red-500/5 hover:bg-red-500/15 border border-red-500/10 text-red-500 hover:text-red-400 transition-all active:scale-95"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-900/20 border border-white/5 rounded-3xl backdrop-blur-xl">
                <Dumbbell className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="font-bold text-slate-300 text-sm">Sin récords que mostrar</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  {recordsFilter === "only_rm"
                    ? "Aún no cargaste marcas. Cambiá el filtro a 'Todos' para empezar a cargar pesos."
                    : "No encontramos ejercicios que coincidan con la búsqueda."}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Calculator view */
          <div className="space-y-5">
            {/* Calculator Inputs Card */}
            <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-5 backdrop-blur-xl shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-primary" /> Estimador de Fuerza Máxima
              </h3>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wide">
                    Peso levantado
                  </label>
                  <div className="flex items-center bg-slate-950 border border-white/5 rounded-2xl px-3.5 py-3">
                    <input
                      type="number"
                      value={calcWeight}
                      onChange={(e) => setCalcWeight(e.target.value)}
                      placeholder="0"
                      className="w-full bg-transparent text-sm font-bold text-white focus:outline-none"
                    />
                    <span className="text-[10px] font-black text-slate-500 uppercase">kg</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wide">
                    Repeticiones hechas
                  </label>
                  <div className="bg-slate-950 border border-white/5 rounded-2xl px-3.5 py-3">
                    <select
                      value={calcReps}
                      onChange={(e) => setCalcReps(e.target.value)}
                      className="w-full bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num} className="bg-slate-950 text-white font-bold">
                          {num} rep{num !== 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Result Area */}
              {calculated1RM ? (
                <div className="p-4 bg-gradient-to-r from-primary/10 to-orange-500/5 border border-primary/20 rounded-2xl flex items-center justify-between animate-fadeIn">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-primary">
                      1RM Estimado (Epley)
                    </span>
                    <p className="text-2xl font-black text-white">{calculated1RM} kg</p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-primary animate-pulse" />
                </div>
              ) : (
                <div className="p-4 bg-slate-950/40 border border-white/5 border-dashed rounded-2xl text-center">
                  <p className="text-[10px] text-slate-500">
                    Ingresá el peso y las repeticiones para ver el cálculo
                  </p>
                </div>
              )}
            </div>

            {/* Save estimated RM Card */}
            {calculated1RM && (
              <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-5 backdrop-blur-xl shadow-xl space-y-4 animate-slideDown">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-primary" /> Guardar en Récords
                </h3>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wide">
                      Seleccionar Ejercicio
                    </label>
                    <div className="bg-slate-950 border border-white/5 rounded-2xl px-3.5 py-3">
                      <select
                        value={calcExerciseId}
                        onChange={(e) => setCalcExerciseId(e.target.value)}
                        className="w-full bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                      >
                        <option value="" className="bg-slate-950 text-slate-500">
                          Elegí un ejercicio...
                        </option>
                        {exercises.map((ex) => (
                          <option
                            key={ex.id}
                            value={ex.id}
                            className="bg-slate-950 text-white font-bold"
                          >
                            {ex.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveCalculated}
                    disabled={saving}
                    className="w-full py-3 bg-gradient-to-r from-primary to-orange-500 hover:opacity-95 text-white font-bold text-xs rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Guardar marca de {calculated1RM} kg
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Percentages Table */}
            {calculated1RM && (
              <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-5 backdrop-blur-xl shadow-xl space-y-3.5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-primary" /> Tabla de Porcentajes Relativos
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  {PERCENTAGES.map((pct) => {
                    const weightPct = Math.round((calculated1RM * pct) / 100);
                    return (
                      <div
                        key={pct}
                        className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-white/5 rounded-xl"
                      >
                        <span className="text-[10px] font-black text-slate-500">{pct}%</span>
                        <span className="text-xs font-black text-slate-200">{weightPct} kg</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="text-center pb-6 text-[10px] text-slate-600 flex items-center justify-center gap-1.5 z-10 mt-auto">
        <TrendingUp className="w-3.5 h-3.5" />
        <span>Tus marcas se sincronizan con las planificaciones de tus entrenadores</span>
      </div>
    </div>
  );
}
