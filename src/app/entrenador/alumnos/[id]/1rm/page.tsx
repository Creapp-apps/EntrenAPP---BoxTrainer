"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Search, Dumbbell, Check, Loader2, Edit2, X } from "lucide-react";
import Link from "next/link";

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
  prep_fisica: "Preparación Física",
  accesorio: "Accesorio",
};

export default function StudentOneRMPage() {
  const params = useParams();
  const studentId = params.id as string;

  const [studentName, setStudentName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [oneRMs, setOneRMs] = useState<Record<string, OneRM>>({});
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [{ data: student }, { data: exs }, { data: rms }] = await Promise.all([
        supabase.from("users").select("full_name").eq("id", studentId).single(),
        supabase.from("exercises").select("id, name, category, muscle_group")
          .eq("archived", false).order("name"),
        supabase.from("student_one_rm").select("*").eq("student_id", studentId),
      ]);

      setStudentName(student?.full_name || "");
      setExercises(exs || []);

      if (rms) {
        const map: Record<string, OneRM> = {};
        rms.forEach(r => { map[r.exercise_id] = r; });
        setOneRMs(map);
      }
      setLoading(false);
    };
    load();
  }, [studentId]);

  const startEdit = (exerciseId: string) => {
    setEditingId(exerciseId);
    setEditValue(oneRMs[exerciseId]?.weight_kg?.toString() || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveOneRM = async (exerciseId: string) => {
    const kg = parseFloat(editValue);
    if (isNaN(kg) || kg <= 0) return toast.error("Ingresá un peso válido");

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from("student_one_rm").upsert({
      student_id: studentId,
      exercise_id: exerciseId,
      weight_kg: kg,
      recorded_at: new Date().toISOString().split("T")[0],
    }, { onConflict: "student_id,exercise_id" });

    if (error) {
      toast.error("Error al guardar: " + error.message);
    } else {
      setOneRMs(prev => ({
        ...prev,
        [exerciseId]: { exercise_id: exerciseId, weight_kg: kg },
      }));
      toast.success("1RM actualizado");
      setEditingId(null);
    }
    setSaving(false);
  };

  const removeOneRM = async (exerciseId: string) => {
    const supabase = createClient();
    await supabase.from("student_one_rm")
      .delete()
      .eq("student_id", studentId)
      .eq("exercise_id", exerciseId);

    setOneRMs(prev => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
    toast.success("1RM eliminado");
  };

  // Filter
  const filtered = exercises.filter(ex =>
    ex.name.toLowerCase().includes(search.toLowerCase()) ||
    CATEGORY_LABELS[ex.category]?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const grouped = filtered.reduce((acc, ex) => {
    const cat = ex.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>);

  const loadedCount = Object.keys(oneRMs).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/entrenador/alumnos/${studentId}`}
          className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">1RM — {studentName}</h1>
          <p className="text-sm text-muted-foreground">
            {loadedCount} ejercicio{loadedCount !== 1 ? "s" : ""} cargado{loadedCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar ejercicio..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Exercises by category */}
      {Object.entries(grouped).map(([cat, exs]) => (
        <div key={cat} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {CATEGORY_LABELS[cat] || cat}
            </h3>
          </div>
          <div className="divide-y divide-border">
            {exs.map(ex => {
              const rm = oneRMs[ex.id];
              const isEditing = editingId === ex.id;

              return (
                <div key={ex.id} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    rm ? "bg-primary/10" : "bg-muted"
                  }`}>
                    {rm
                      ? <Check className="w-4 h-4 text-primary" />
                      : <Dumbbell className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ex.name}</p>
                    {!isEditing && (
                      <p className={`text-xs mt-0.5 ${rm ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        {rm ? `${rm.weight_kg} kg` : "Sin 1RM cargado"}
                      </p>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") saveOneRM(ex.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          placeholder="kg"
                          className="w-20 px-2 py-1.5 rounded-lg border border-primary text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <span className="text-xs text-muted-foreground">kg</span>
                      </div>
                      <button onClick={() => saveOneRM(ex.id)} disabled={saving}
                        className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={cancelEdit}
                        className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(ex.id)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {rm && (
                        <button onClick={() => removeOneRM(ex.id)}
                          className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                          <X className="w-3.5 h-3.5" />
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

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No se encontraron ejercicios</p>
        </div>
      )}
    </div>
  );
}
