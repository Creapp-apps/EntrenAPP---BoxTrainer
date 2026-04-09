"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Flame, Copy, Plus, Check } from "lucide-react";
import Link from "next/link";
import { WEEK_TYPE_LABELS, WEEK_TYPE_COLORS } from "@/lib/utils";

const WEEK_TYPES = ["carga", "descarga", "intensificacion", "acumulacion", "test"] as const;
const WEEK_TYPE_COLORS_BTN: Record<string, string> = {
  carga: "bg-blue-100 text-blue-700 border-blue-200",
  descarga: "bg-green-100 text-green-700 border-green-200",
  intensificacion: "bg-orange-100 text-orange-700 border-orange-200",
  acumulacion: "bg-purple-100 text-purple-700 border-purple-200",
  test: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

type Template = {
  id: string;
  name: string;
  total_weeks: number;
  phase_structure: { week_number: number; type: string }[];
};

type Mode = "pick" | "scratch" | "template";

export default function NuevoCicloCFPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedStudent = searchParams.get("alumno");

  const [mode, setMode] = useState<Mode>(preselectedStudent ? "scratch" : "pick");
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const [form, setForm] = useState({
    name: "",
    student_id: preselectedStudent || "",
    start_date: new Date().toISOString().split("T")[0],
    total_weeks: 4,
    is_template_only: false,
  });
  const [phases, setPhases] = useState([
    { week_number: 1, type: "carga" },
    { week_number: 2, type: "carga" },
    { week_number: 3, type: "carga" },
    { week_number: 4, type: "descarga" },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: studs }, { data: tmplts }] = await Promise.all([
        supabase.from("users").select("id, full_name")
          .eq("role", "student").eq("active", true).order("full_name"),
        supabase.from("training_cycles").select("id, name, total_weeks, phase_structure")
          .eq("trainer_id", user!.id).eq("is_template", true).eq("cycle_type", "crossfit").order("name"),
      ]);
      setStudents(studs || []);
      setTemplates((tmplts as Template[]) || []);
    };
    fetchData();
  }, []);

  const updateWeeks = (newTotal: number) => {
    setForm({ ...form, total_weeks: newTotal });
    setPhases(Array.from({ length: newTotal }, (_, i) => ({
      week_number: i + 1,
      type: phases[i]?.type || (i === newTotal - 1 ? "descarga" : "carga"),
    })));
  };

  const selectTemplate = (tmpl: Template) => {
    setSelectedTemplate(tmpl);
    setForm(f => ({
      ...f,
      name: f.name || tmpl.name,
      total_weeks: tmpl.total_weeks,
    }));
    setPhases(tmpl.phase_structure || []);
  };

  // Crear desde scratch
  const handleSubmitScratch = async (e: React.FormEvent) => {
    e.preventDefault();
    const isTemplate = form.is_template_only;
    if (!isTemplate && !form.student_id) return toast.error("Seleccioná un alumno");
    if (!form.name.trim()) return toast.error("Poné un nombre al ciclo");
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: cycle, error: cycleError } = await supabase.from("training_cycles").insert({
      trainer_id: user!.id,
      student_id: isTemplate ? null : form.student_id,
      name: form.name.trim(),
      start_date: form.start_date,
      total_weeks: form.total_weeks,
      phase_structure: phases,
      active: !isTemplate,
      is_template: isTemplate,
      cycle_type: "crossfit",
    }).select().single();

    if (cycleError || !cycle) {
      toast.error("Error al crear: " + cycleError?.message);
      setLoading(false);
      return;
    }

    const weeksToInsert = phases.map(p => ({
      cycle_id: cycle.id,
      week_number: p.week_number,
      type: p.type,
    }));
    await supabase.from("training_weeks").insert(weeksToInsert);

    toast.success(isTemplate ? "Plantilla CF creada. Ahora cargá los bloques." : "Ciclo CF creado. Ahora agregá los días y bloques.");
    router.push(`/entrenador/crossfit/${cycle.id}`);
  };

  // Crear desde plantilla
  const handleSubmitFromTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return toast.error("Seleccioná una plantilla");
    if (!form.student_id) return toast.error("Seleccioná un alumno");
    if (!form.name.trim()) return toast.error("Poné un nombre al ciclo");
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: newCycleId, error } = await supabase.rpc("copy_cycle", {
      p_source_cycle_id: selectedTemplate.id,
      p_trainer_id: user!.id,
      p_name: form.name.trim(),
      p_start_date: form.start_date,
      p_student_id: form.student_id,
      p_is_template: false,
    });

    if (error || !newCycleId) {
      toast.error("Error al crear desde plantilla: " + error?.message);
      setLoading(false);
      return;
    }

    toast.success("Ciclo CF creado desde plantilla. Podés ajustar los bloques.");
    router.push(`/entrenador/crossfit/${newCycleId}`);
  };

  // ─── Pantalla de selección de modo ─────────────────────────
  if (mode === "pick") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/entrenador/crossfit" className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Nuevo ciclo CrossFit</h1>
              <p className="text-sm text-muted-foreground">¿Cómo querés crearlo?</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {templates.length > 0 && (
            <button onClick={() => setMode("template")}
              className="bg-white rounded-2xl p-6 shadow-sm border-2 border-orange-200 hover:border-orange-500 hover:shadow-md transition-all text-left group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 group-hover:bg-orange-200 transition-colors">
                  <Copy className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-lg">Desde una plantilla</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Usá una de tus {templates.length} plantilla{templates.length !== 1 ? "s" : ""} CF guardadas como base.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {templates.slice(0, 3).map(t => (
                      <span key={t.id} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-lg font-medium">
                        {t.name}
                      </span>
                    ))}
                    {templates.length > 3 && (
                      <span className="text-xs text-muted-foreground px-2 py-1">+{templates.length - 3} más</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          )}

          <button onClick={() => setMode("scratch")}
            className="bg-white rounded-2xl p-6 shadow-sm border-2 border-border hover:border-orange-400 hover:shadow-md transition-all text-left group">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-orange-100 transition-colors">
                <Plus className="w-6 h-6 text-muted-foreground group-hover:text-orange-600 transition-colors" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg">Desde cero</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Creá un ciclo nuevo de CrossFit definiendo semanas y estructura. Ideal para planificaciones únicas.
                </p>
              </div>
            </div>
          </button>

          <button onClick={() => { setMode("scratch"); setForm(f => ({ ...f, is_template_only: true, student_id: "" })); }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-dashed border-border hover:border-orange-400 transition-all text-left group">
            <div className="flex items-center gap-3">
              <Copy className="w-5 h-5 text-muted-foreground group-hover:text-orange-600 transition-colors" />
              <div>
                <p className="font-medium text-foreground">Crear plantilla reutilizable</p>
                <p className="text-xs text-muted-foreground mt-0.5">Sin asignar a ningún alumno. La usás como base para futuros ciclos CF.</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ─── Formulario desde plantilla ──────────────────────────
  if (mode === "template") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setMode("pick")} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Desde plantilla CF</h1>
            <p className="text-sm text-muted-foreground">Elegí la base y configurá el ciclo</p>
          </div>
        </div>

        <form onSubmit={handleSubmitFromTemplate} className="space-y-5">
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-3">
            <h2 className="font-semibold text-foreground">1. Elegí la plantilla base</h2>
            <div className="space-y-2">
              {templates.map(tmpl => (
                <button key={tmpl.id} type="button" onClick={() => selectTemplate(tmpl)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    selectedTemplate?.id === tmpl.id
                      ? "border-orange-500 bg-orange-50"
                      : "border-border hover:border-orange-300"
                  }`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedTemplate?.id === tmpl.id ? "border-orange-500 bg-orange-500" : "border-muted-foreground/40"
                  }`}>
                    {selectedTemplate?.id === tmpl.id && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{tmpl.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(tmpl.phase_structure || []).map(p => (
                        <span key={p.week_number} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${WEEK_TYPE_COLORS[p.type]}`}>
                          S{p.week_number}: {WEEK_TYPE_LABELS[p.type]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{tmpl.total_weeks} sem.</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-5">
            <h2 className="font-semibold text-foreground">2. Configurá el ciclo</h2>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Alumno *</label>
              <select value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500" required>
                <option value="">Seleccioná un alumno...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nombre del ciclo *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: CrossFit Q2 — Juan"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Fecha de inicio *</label>
              <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500" required />
            </div>
            {selectedTemplate && (
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                <p className="text-sm font-medium text-orange-700">
                  ✓ Se copiará toda la estructura de &quot;{selectedTemplate.name}&quot;
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  {selectedTemplate.total_weeks} semanas con todos los bloques y ejercicios CF.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setMode("pick")}
              className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors">
              Volver
            </button>
            <button type="submit" disabled={loading || !selectedTemplate}
              className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Creando...</>
                : <><Copy className="w-4 h-4" />Crear desde plantilla</>
              }
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ─── Formulario desde cero ──────────────────────────────
  const isTemplateOnly = form.is_template_only;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => { setMode("pick"); setForm(f => ({ ...f, is_template_only: false })); }}
          className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isTemplateOnly ? "Nueva plantilla CF" : "Nuevo ciclo CrossFit"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isTemplateOnly ? "Se guardará como plantilla reutilizable" : "Definí la estructura del mesociclo"}
            </p>
          </div>
        </div>
      </div>

      {isTemplateOnly && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
          <Copy className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-700">Creando plantilla CrossFit</p>
            <p className="text-xs text-orange-600 mt-0.5">
              No se asigna a ningún alumno. Vas a poder usarla como base para crear ciclos CF en el futuro.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitScratch} className="space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-5">
          {!isTemplateOnly && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Alumno *</label>
              <select value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="">Seleccioná un alumno...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {isTemplateOnly ? "Nombre de la plantilla *" : "Nombre del ciclo *"}
            </label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder={isTemplateOnly ? "Ej: WOD Base 4 semanas, Funcional Principiantes..." : "Ej: CrossFit Q1 2026 — Pablo..."}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500" required />
          </div>

          {!isTemplateOnly && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Fecha de inicio *</label>
              <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500" required />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Total de semanas: <span className="text-orange-600 font-bold">{form.total_weeks}</span>
            </label>
            <div className="flex gap-2 flex-wrap items-center">
              {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                <button key={n} type="button" onClick={() => updateWeeks(n)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                    form.total_weeks === n ? "bg-orange-600 text-white border-orange-600" : "border-border hover:border-orange-400"
                  }`}>
                  {n}
                </button>
              ))}
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={![1,2,3,4,5,6,8,10,12].includes(form.total_weeks) ? form.total_weeks : ""}
                  onChange={e => { const v = parseInt(e.target.value); if (v > 0 && v <= 52) updateWeeks(v); }}
                  placeholder="+"
                  className={`w-14 px-2 py-2 rounded-xl border text-sm font-medium text-center transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    ![1,2,3,4,5,6,8,10,12].includes(form.total_weeks) ? "bg-orange-600 text-white border-orange-600" : "border-border"
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Estructura de semanas */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">Estructura del ciclo</h2>
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
                          : "border-border text-muted-foreground hover:border-orange-300"
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
          <button type="button" onClick={() => { setMode("pick"); setForm(f => ({ ...f, is_template_only: false })); }}
            className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors">
            Volver
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Creando...</>
              : isTemplateOnly
              ? <><Copy className="w-4 h-4" />Crear plantilla</>
              : <><Flame className="w-4 h-4" />Crear ciclo CF</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
