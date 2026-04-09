"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, X, Settings, RotateCcw, Loader2, Check, Shield, Users, Trophy, Search, GraduationCap, Trash2 } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_VARIANTS = [
  "S1", "S2", "S3", "S4",
  "Colgado", "2do Tiempo", "Fuerza", "Pausa",
  "Jerk", "Dip", "Box", "Isométrico", "Excéntrico",
];

const SUGGESTIONS = [
  { label: "Series de posición", items: ["S1", "S2", "S3", "S4"] },
  { label: "Olímpico", items: ["Colgado", "2do Tiempo", "Jerk", "Dip", "Fuerza"] },
  { label: "Modificadores", items: ["Pausa", "Box", "Isométrico", "Excéntrico", "Tempo", "Touch & Go"] },
  { label: "Halterofilia", items: ["Split", "Squat Jerk", "Power", "Block", "Hang Low", "Hang High"] },
];

type Student = {
  id: string;
  full_name: string;
  email: string;
  can_edit_own_rms: boolean;
  cycle_types: string[];
};

type CycleFilter = "all" | "strength" | "prep_fisica" | "crossfit";

export default function ConfiguracionPage() {
  const supabase = createClient();
  const [variants, setVariants] = useState<string[]>([]);
  const [newVariant, setNewVariant] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [cycleFilter, setCycleFilter] = useState<CycleFilter>("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [professors, setProfessors] = useState<{id:string;full_name:string;email:string;active:boolean}[]>([]);
  const [showProfModal, setShowProfModal] = useState(false);
  const [profForm, setProfForm] = useState({ name: "", email: "", password: "" });
  const [savingProf, setSavingProf] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Cargar alumnos con su permiso de RM
    const { data: studs } = await supabase
      .from("users")
      .select("id, full_name, email, can_edit_own_rms")
      
      .eq("role", "student")
      .eq("active", true)
      .order("full_name");

    // Fetch active cycles to know each student's cycle types
    const { data: cycles } = await supabase
      .from("training_cycles")
      .select("student_id, cycle_type")
      .eq("trainer_id", user!.id)
      .eq("active", true)
      .eq("is_template", false);

    const cycleMap: Record<string, Set<string>> = {};
    (cycles || []).forEach((c: any) => {
      if (!c.student_id) return;
      if (!cycleMap[c.student_id]) cycleMap[c.student_id] = new Set();
      cycleMap[c.student_id].add(c.cycle_type || "strength");
    });

    setStudents((studs || []).map((s: any) => ({
      ...s,
      cycle_types: Array.from(cycleMap[s.id] || []),
    })) as Student[]);

    // Cargar profesores
    const { data: profs } = await supabase
      .from("users")
      .select("id, full_name, email, active")
      
      .eq("role", "professor")
      .order("full_name");
    setProfessors((profs || []) as any[]);

    // Variantes
    const { data, error } = await supabase
      .from("trainer_settings")
      .select("common_variants")
      .eq("trainer_id", user!.id)
      .single();

    setVariants(error || !data ? DEFAULT_VARIANTS : (data.common_variants || DEFAULT_VARIANTS));
    setLoading(false);
  }

  async function toggleStudentRm(studentId: string, newValue: boolean) {
    setTogglingId(studentId);
    const { error } = await supabase
      .from("users")
      .update({ can_edit_own_rms: newValue })
      .eq("id", studentId);

    if (error) {
      toast.error("Error al actualizar");
    } else {
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, can_edit_own_rms: newValue } : s));
      const name = students.find(s => s.id === studentId)?.full_name;
      toast.success(newValue ? `${name} puede cargar RMs` : `${name} ya no puede cargar RMs`);
    }
    setTogglingId(null);
  }

  async function toggleAll(value: boolean) {
    setTogglingId("all");
    const filtered = filteredStudents;
    const ids = filtered.map(s => s.id);
    if (ids.length === 0) return setTogglingId(null);

    const { error } = await supabase
      .from("users")
      .update({ can_edit_own_rms: value })
      .in("id", ids);

    if (error) {
      toast.error("Error al actualizar");
    } else {
      setStudents(prev => prev.map(s => ids.includes(s.id) ? { ...s, can_edit_own_rms: value } : s));
      const label = cycleFilter === "all" ? "Todos" : cycleFilter === "strength" ? "Fuerza" : cycleFilter === "crossfit" ? "CrossFit" : "Prep Física";
      toast.success(value ? `${label}: habilitados` : `${label}: deshabilitados`);
    }
    setTogglingId(null);
  }

  // Filtered students by cycle type + name search
  const filteredStudents = students.filter(s => {
    if (cycleFilter !== "all" && !s.cycle_types.includes(cycleFilter)) return false;
    if (studentSearch && !s.full_name.toLowerCase().includes(studentSearch.toLowerCase())) return false;
    return true;
  });

  async function saveVariants(newList: string[]) {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("trainer_settings")
      .upsert(
        { trainer_id: user!.id, common_variants: newList, updated_at: new Date().toISOString() },
        { onConflict: "trainer_id" }
      );
    if (error) toast.error("Error al guardar: " + error.message);
    setSaving(false);
  }

  function addVariant(name: string) {
    const trimmed = name.trim().toUpperCase();
    if (!trimmed) return;
    if (variants.includes(trimmed)) { toast.error("Ya existe"); return; }
    const updated = [...variants, trimmed];
    setVariants(updated);
    saveVariants(updated);
    setNewVariant("");
    toast.success(`"${trimmed}" agregada`);
  }

  function removeVariant(v: string) {
    const updated = variants.filter(x => x !== v);
    setVariants(updated);
    saveVariants(updated);
  }

  function addSuggestions(items: string[]) {
    const toAdd = items.map(i => i.toUpperCase()).filter(i => !variants.includes(i));
    if (toAdd.length === 0) { toast.error("Ya están todas"); return; }
    const updated = [...variants, ...toAdd];
    setVariants(updated);
    saveVariants(updated);
    toast.success(`${toAdd.length} agregada${toAdd.length > 1 ? "s" : ""}`);
  }

  function restoreDefaults() {
    if (!confirm("¿Restaurar variantes por defecto?")) return;
    setVariants(DEFAULT_VARIANTS);
    saveVariants(DEFAULT_VARIANTS);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const enabledCount = students.filter(s => s.can_edit_own_rms).length;

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
          {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {!saving && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <Check className="w-3.5 h-3.5" /> Guardado
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground ml-13">
          Los cambios se guardan automáticamente.
        </p>
      </div>

      {/* ─── Per-student RM permissions ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground">Carga de RMs por alumnos</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Elegí qué alumnos pueden cargar sus propios récords personales. Los RMs auto-cargados quedan como <em>no verificados</em>.
            </p>
          </div>
        </div>

        {/* Filter by cycle type */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl overflow-x-auto">
          {([["all", "Todos"], ["strength", "Fuerza"], ["prep_fisica", "Prep Física"], ["crossfit", "CrossFit"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setCycleFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                cycleFilter === key ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {label}
              <span className={`ml-1 text-xs ${cycleFilter === key ? "text-primary" : ""}`}>
                ({key === "all" ? students.length : students.filter(s => s.cycle_types.includes(key)).length})
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
            placeholder="Buscar alumno por nombre..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <span className="text-xs text-muted-foreground">
            {filteredStudents.filter(s => s.can_edit_own_rms).length}/{filteredStudents.length} habilitados
          </span>
          <div className="flex-1" />
          <button onClick={() => toggleAll(true)} disabled={togglingId === "all"}
            className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium transition-colors disabled:opacity-50">
            Habilitar filtrados
          </button>
          <button onClick={() => toggleAll(false)} disabled={togglingId === "all"}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 font-medium transition-colors disabled:opacity-50">
            Deshabilitar filtrados
          </button>
        </div>

        {/* Student list */}
        {filteredStudents.length > 0 ? (
          <div className="space-y-1">
            {filteredStudents.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.full_name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {s.cycle_types.length > 0 ? s.cycle_types.map(ct => (
                      <span key={ct} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        ct === "crossfit" ? "bg-orange-100 text-orange-700" :
                        ct === "prep_fisica" ? "bg-green-100 text-green-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {ct === "crossfit" ? "CF" : ct === "prep_fisica" ? "Prep" : "Fuerza"}
                      </span>
                    )) : (
                      <span className="text-[10px] text-muted-foreground">Sin ciclo activo</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleStudentRm(s.id, !s.can_edit_own_rms)}
                  disabled={togglingId === s.id}
                  className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none ${
                    s.can_edit_own_rms ? "bg-green-500" : "bg-muted"
                  } ${togglingId === s.id ? "opacity-50" : ""}`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                    s.can_edit_own_rms ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {cycleFilter === "all" ? "No tenés alumnos activos." : `Ningún alumno con ciclo de ${cycleFilter === "strength" ? "Fuerza" : cycleFilter === "crossfit" ? "CrossFit" : "Prep Física"} activo.`}
          </p>
        )}
      </div>

      {/* Variantes comunes */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-foreground">Variantes comunes</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Acceso rápido al planificar ciclos.</p>
          </div>
          <button onClick={restoreDefaults}
            className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1.5 transition-colors">
            <RotateCcw className="w-3 h-3" /> Restaurar
          </button>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Tus variantes ({variants.length})
          </p>
          {variants.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Sin variantes.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {variants.map(v => (
                <span key={v} className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-semibold">
                  {v}
                  <button type="button" onClick={() => removeVariant(v)} className="hover:text-red-500 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Agregar variante</p>
          <div className="flex gap-2">
            <input type="text" value={newVariant} onChange={e => setNewVariant(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addVariant(newVariant); } }}
              placeholder="Ej: SUSPENDIDO, HANG LOW..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            <button type="button" onClick={() => addVariant(newVariant)} disabled={!newVariant.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Sugerencias</p>
          <div className="space-y-2">
            {SUGGESTIONS.map(group => (
              <div key={group.label} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{group.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{group.items.join(" · ")}</p>
                </div>
                <button type="button" onClick={() => addSuggestions(group.items)}
                  className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Agregar todo
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <div className="shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <Settings className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-blue-900">¿Cómo funcionan las variantes?</p>
          <p className="text-sm text-blue-700 mt-0.5">
            Al planificar podés seleccionar <strong>ARRANQUE → S1</strong> o <strong>ARRANQUE → Colgado</strong> sin crear ejercicios separados.
          </p>
        </div>
      </div>

      {/* ─── Profesores ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Profesores</h2>
              <p className="text-sm text-muted-foreground">Usuarios con acceso para planificar</p>
            </div>
          </div>
          <button onClick={() => { setShowProfModal(true); setProfForm({ name: "", email: "", password: "" }); }}
            className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-primary/90 transition">
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        </div>

        {professors.length > 0 ? (
          <div className="space-y-1">
            {professors.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {p.active ? "Activo" : "Inactivo"}
                </span>
                <button onClick={async () => {
                  const supabase = createClient();
                  await supabase.from("users").update({ active: !p.active }).eq("id", p.id);
                  setProfessors(prev => prev.map(x => x.id === p.id ? { ...x, active: !p.active } : x));
                  toast.success(p.active ? "Profesor desactivado" : "Profesor activado");
                }}
                  className={`relative shrink-0 w-10 h-6 rounded-full transition-colors duration-200 ${p.active ? "bg-green-500" : "bg-muted"}`}>
                  <span className={`block w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${p.active ? "translate-x-5" : "translate-x-1"}`} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No tenés profesores. Agregalos para que puedan planificar.</p>
        )}
      </div>

      {/* ─── Modal crear profesor ────────────────────────── */}
      {showProfModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowProfModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground mb-4">Nuevo profesor</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Nombre completo</label>
                <input type="text" value={profForm.name} onChange={e => setProfForm({ ...profForm, name: e.target.value })}
                  placeholder="Ej: Juan Pérez" className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
                <input type="email" value={profForm.email} onChange={e => setProfForm({ ...profForm, email: e.target.value })}
                  placeholder="profesor@email.com" className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Contraseña temporal</label>
                <input type="text" value={profForm.password} onChange={e => setProfForm({ ...profForm, password: e.target.value })}
                  placeholder="Min 6 caracteres" className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button disabled={savingProf} onClick={async () => {
                if (!profForm.name.trim() || !profForm.email.trim() || profForm.password.length < 6) {
                  toast.error("Completá todos los campos (contraseña mín 6 chars)"); return;
                }
                setSavingProf(true);
                try {
                  const res = await fetch("/api/create-professor", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: profForm.name,
                      email: profForm.email,
                      password: profForm.password,
                    }),
                  });
                  const result = await res.json();
                  if (!res.ok) {
                    toast.error(result.error || "Error al crear profesor");
                    setSavingProf(false);
                    return;
                  }
                  toast.success(`Profesor "${profForm.name}" creado correctamente`);
                  setShowProfModal(false);
                  loadSettings();
                } catch (err: any) {
                  toast.error("Error de conexión");
                }
                setSavingProf(false);
              }}
                className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {savingProf ? "Creando..." : "Crear profesor"}
              </button>
              <button onClick={() => setShowProfModal(false)}
                className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
