"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trophy, TrendingUp, Plus, X, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

type PRRecord = {
  exercise_id: string;
  exercise_name: string;
  category: string;
  best: number;
  reps: number;
  date: string;
};

type Exercise = {
  id: string;
  name: string;
  category: string;
};

export default function PRsPage() {
  const supabase = createClient();
  const [records, setRecords] = useState<PRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedEx, setSelectedEx] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("1");
  const [saving, setSaving] = useState(false);
  const [exSearch, setExSearch] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get PRs
    const { data: prs } = await supabase
      .from("personal_records")
      .select("*, exercises(name, category)")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });

    // Group by exercise (best weight)
    const byEx: Record<string, PRRecord> = {};
    prs?.forEach((r: any) => {
      const ex = r.exercises as Record<string, string>;
      if (!byEx[r.exercise_id] || r.weight_kg > byEx[r.exercise_id].best) {
        byEx[r.exercise_id] = {
          exercise_id: r.exercise_id,
          exercise_name: ex?.name || "",
          category: ex?.category || "",
          best: r.weight_kg,
          reps: r.reps || 1,
          date: r.created_at,
        };
      }
    });
    setRecords(Object.values(byEx).sort((a, b) => b.best - a.best));

    // Check if this student can edit RMs
    const { data: student } = await supabase
      .from("users")
      .select("can_edit_own_rms")
      .eq("id", user.id)
      .single();
    setCanEdit(student?.can_edit_own_rms ?? false);

    setLoading(false);
  }

  async function openModal() {
    setShowModal(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load exercises from trainer
    const { data: student } = await supabase
      .from("users")
      .select("created_by")
      .eq("id", user.id)
      .single();

    if (student?.created_by) {
      const { data: exs } = await supabase
        .from("exercises")
        .select("id, name, category")
        .eq("trainer_id", student.created_by)
        .eq("archived", false)
        .order("name");
      setExercises(exs || []);
    }
  }

  async function saveRM() {
    if (!selectedEx || !weight) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("personal_records").insert({
      student_id: user!.id,
      exercise_id: selectedEx,
      weight_kg: parseFloat(weight),
      reps: parseInt(reps) || 1,
      verified_by_trainer: false,
    });

    if (error) {
      toast.error("Error al guardar el RM");
    } else {
      toast.success("RM registrado ✓");
      setShowModal(false);
      setSelectedEx("");
      setWeight("");
      setReps("1");
      loadData();
    }
    setSaving(false);
  }

  const filteredExercises = exercises.filter(e =>
    e.name.toLowerCase().includes(exSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-sidebar text-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mis récords</h1>
            <p className="text-white/60 text-sm mt-1">
              {records.length} ejercicio{records.length !== 1 ? "s" : ""} con PR registrado
            </p>
          </div>
          {canEdit && (
            <button onClick={openModal}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />
              Cargar RM
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 pb-24">
        {records.length > 0 ? (
          records.map(data => (
            <div key={data.exercise_id} className="bg-white rounded-2xl shadow-sm border border-border p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{data.exercise_name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {data.category} · {data.reps > 1 ? `${data.reps}RM` : "1RM"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-primary">{data.best}</p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-border">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">Sin récords todavía</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {canEdit
                ? "Cargá tu primer RM tocando el botón +"
                : "Tus PRs aparecerán acá cuando tu entrenador los registre."}
            </p>
            {canEdit && (
              <button onClick={openModal}
                className="mt-4 inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition">
                <Plus className="w-4 h-4" /> Cargar RM
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Modal: Cargar RM ─────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-5 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Cargar RM</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Exercise selector with search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ejercicio</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={exSearch} onChange={e => setExSearch(e.target.value)}
                  placeholder="Buscar ejercicio..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="max-h-40 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                {filteredExercises.map(ex => (
                  <button key={ex.id} type="button"
                    onClick={() => setSelectedEx(ex.id)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      selectedEx === ex.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50 text-foreground"
                    }`}>
                    {ex.name}
                    <span className="text-xs text-muted-foreground ml-2 capitalize">{ex.category}</span>
                  </button>
                ))}
                {filteredExercises.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin resultados</p>
                )}
              </div>
            </div>

            {/* Weight + Reps */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Peso (kg)</label>
                <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
                  placeholder="0" min="0" step="0.5"
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Reps</label>
                <input type="number" value={reps} onChange={e => setReps(e.target.value)}
                  placeholder="1" min="1"
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Tu entrenador verificará este RM. Hasta entonces aparecerá como pendiente de verificación.
            </p>

            <button onClick={saveRM}
              disabled={!selectedEx || !weight || saving}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
              Guardar RM
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
