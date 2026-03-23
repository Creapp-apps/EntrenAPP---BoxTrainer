"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Trash2, Calendar } from "lucide-react";
import Link from "next/link";
import { DAY_NAMES, WEEK_TYPE_LABELS } from "@/lib/utils";

const WEEK_TYPES = ["carga", "descarga", "intensificacion", "acumulacion", "test"] as const;
const WEEK_TYPE_COLORS_BTN: Record<string, string> = {
  carga: "bg-blue-100 text-blue-700 border-blue-200",
  descarga: "bg-green-100 text-green-700 border-green-200",
  intensificacion: "bg-orange-100 text-orange-700 border-orange-200",
  acumulacion: "bg-purple-100 text-purple-700 border-purple-200",
  test: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

export default function NuevoCicloPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedStudent = searchParams.get("alumno");

  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [form, setForm] = useState({
    name: "",
    student_id: preselectedStudent || "",
    start_date: new Date().toISOString().split("T")[0],
    total_weeks: 4,
  });
  const [phases, setPhases] = useState([
    { week_number: 1, type: "carga" },
    { week_number: 2, type: "carga" },
    { week_number: 3, type: "carga" },
    { week_number: 4, type: "descarga" },
  ]);

  useEffect(() => {
    const fetchStudents = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from("users").select("id, full_name")
        .eq("role", "student").eq("created_by", user!.id).eq("active", true).order("full_name");
      setStudents(data || []);
    };
    fetchStudents();
  }, []);

  const updateWeeks = (newTotal: number) => {
    setForm({ ...form, total_weeks: newTotal });
    setPhases(Array.from({ length: newTotal }, (_, i) => ({
      week_number: i + 1,
      type: phases[i]?.type || (i === newTotal - 1 ? "descarga" : "carga"),
    })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student_id) return toast.error("Seleccioná un alumno");
    if (!form.name.trim()) return toast.error("Poné un nombre al ciclo");
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Crear ciclo
    const { data: cycle, error: cycleError } = await supabase.from("training_cycles").insert({
      trainer_id: user!.id,
      student_id: form.student_id,
      name: form.name.trim(),
      start_date: form.start_date,
      total_weeks: form.total_weeks,
      phase_structure: phases,
      active: true,
    }).select().single();

    if (cycleError || !cycle) {
      toast.error("Error al crear el ciclo: " + cycleError?.message);
      setLoading(false);
      return;
    }

    // Crear semanas
    const weeksToInsert = phases.map(p => ({
      cycle_id: cycle.id,
      week_number: p.week_number,
      type: p.type,
    }));
    const { error: weeksError } = await supabase.from("training_weeks").insert(weeksToInsert);

    if (weeksError) {
      toast.error("Error al crear las semanas");
      setLoading(false);
      return;
    }

    toast.success("Ciclo creado. Ahora agregá los días y ejercicios.");
    router.push(`/entrenador/ciclos/${cycle.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/entrenador/ciclos" className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nuevo ciclo</h1>
          <p className="text-sm text-muted-foreground">Definí la estructura del mesociclo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-5">
          {/* Alumno */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Alumno *</label>
            <select value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" required>
              <option value="">Seleccioná un alumno...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nombre del ciclo *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Ciclo Fuerza Q1 2026, Preparación Campeonato..."
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>

          {/* Fecha inicio */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Fecha de inicio *</label>
            <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>

          {/* Total semanas */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Total de semanas: <span className="text-primary font-bold">{form.total_weeks}</span>
            </label>
            <div className="flex gap-2">
              {[3, 4, 5, 6, 8, 10, 12].map(n => (
                <button key={n} type="button" onClick={() => updateWeeks(n)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                    form.total_weeks === n ? "bg-primary text-white border-primary" : "border-border hover:border-primary/50"
                  }`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Estructura de semanas */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">Estructura del ciclo</h2>
          <p className="text-sm text-muted-foreground mb-4">Definí el tipo de cada semana</p>
          <div className="space-y-3">
            {phases.map((phase, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground w-20 shrink-0">Semana {idx + 1}</span>
                <div className="flex gap-2 flex-wrap">
                  {WEEK_TYPES.map(type => (
                    <button key={type} type="button"
                      onClick={() => {
                        const newPhases = [...phases];
                        newPhases[idx] = { ...newPhases[idx], type };
                        setPhases(newPhases);
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        phase.type === type
                          ? WEEK_TYPE_COLORS_BTN[type] + " border-current"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}>
                      {WEEK_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/entrenador/ciclos"
            className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium text-center hover:bg-muted transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creando...</> : <><Calendar className="w-4 h-4" />Crear ciclo</>}
          </button>
        </div>
      </form>
    </div>
  );
}
