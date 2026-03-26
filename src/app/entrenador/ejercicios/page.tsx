"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, Plus, Search, Trash2, Flame, Dumbbell, Video, Pencil, Zap, Filter, Download, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ─── Labels ──────────────────────────────────────────────────
const MUSCLE_LABELS: Record<string, string> = {
  olimpico: "Olímpico", piernas: "Piernas", espalda: "Espalda",
  pecho: "Pecho", hombros: "Hombros", brazos: "Brazos",
  core: "Core", full_body: "Full Body", otro: "Otro",
};

const CF_CATEGORY_LABELS: Record<string, string> = {
  gymnastics: "Gymnastics", weightlifting: "Weightlifting",
  monostructural: "Monostructural", other: "Otro",
};

const CF_UNIT_LABELS: Record<string, string> = {
  reps: "Reps", cals: "Calorías", meters: "Metros",
  kg: "Kg", lbs: "Lbs", seconds: "Seg", distance_m: "Dist (m)",
};

// ─── Types ───────────────────────────────────────────────────
type Exercise = {
  id: string; name: string; category: string;
  muscle_group: string; video_url?: string | null;
};

type CfExercise = {
  id: string; name: string; category: string;
  default_unit: string; video_url?: string | null;
};

type Tab = "fuerza" | "prep_fisica" | "crossfit";

export default function EjerciciosPage() {
  const supabase = createClient();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [cfExercises, setCfExercises] = useState<CfExercise[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("fuerza");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [cfCatFilter, setCfCatFilter] = useState("all");

  // Delete
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string; table: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: exs }, { data: cfs }] = await Promise.all([
      supabase.from("exercises").select("id, name, category, muscle_group, video_url")
        .eq("trainer_id", user!.id).eq("archived", false).order("name"),
      supabase.from("cf_exercises").select("id, name, category, default_unit, video_url")
        .eq("trainer_id", user!.id).eq("archived", false).order("name"),
    ]);
    setExercises(exs || []);
    setCfExercises(cfs || []);
  }

  async function confirmDelete() {
    if (!confirmTarget) return;
    setDeleting(true);
    const { error } = await supabase.from(confirmTarget.table).update({ archived: true }).eq("id", confirmTarget.id);
    if (error) {
      toast.error("No se pudo eliminar");
    } else {
      toast.success(`"${confirmTarget.name}" eliminado`);
      if (confirmTarget.table === "exercises") {
        setExercises(prev => prev.filter(e => e.id !== confirmTarget.id));
      } else {
        setCfExercises(prev => prev.filter(e => e.id !== confirmTarget.id));
      }
    }
    setDeleting(false);
    setConfirmTarget(null);
  }

  // ─── Filtered data ──────────────────────────────────────────
  const fuerzaExs = exercises.filter(e => e.category === "fuerza");
  const prepExs = exercises.filter(e => e.category === "prep_fisica" || e.category === "accesorio");

  const currentStrength = tab === "fuerza" ? fuerzaExs : prepExs;
  const filteredStrength = currentStrength.filter(ex => {
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (muscleFilter !== "all" && ex.muscle_group !== muscleFilter) return false;
    return true;
  });

  const filteredCf = cfExercises.filter(ex => {
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (cfCatFilter !== "all" && ex.category !== cfCatFilter) return false;
    return true;
  });

  // Group by muscle/category
  const byMuscle = filteredStrength.reduce((acc: Record<string, Exercise[]>, ex) => {
    const key = ex.muscle_group;
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(ex);
    return acc;
  }, {});

  const byCfCat = filteredCf.reduce((acc: Record<string, CfExercise[]>, ex) => {
    if (!acc[ex.category]) acc[ex.category] = [];
    acc[ex.category]!.push(ex);
    return acc;
  }, {});

  // Available muscle groups for the filter
  const availableMuscles = [...new Set(currentStrength.map(e => e.muscle_group))].sort();
  const availableCfCats = [...new Set(cfExercises.map(e => e.category))].sort();

  // Reset sub-filters on tab change
  const switchTab = (t: Tab) => {
    setTab(t);
    setMuscleFilter("all");
    setCfCatFilter("all");
    setSearch("");
  };

  const newExTipo = tab === "crossfit" ? "crossfit" : tab === "prep_fisica" ? "fuerza" : "fuerza";

  async function loadDefaults() {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed-exercises", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error al cargar plantilla"); return; }
      toast.success(`✅ Cargados ${data.inserted.exercises} ejercicios + ${data.inserted.cf_exercises} CrossFit`);
      loadAll();
    } catch (err: any) { toast.error(err.message); }
    setSeeding(false);
  }

  function exportCSV() {
    const { exercisesToCSV, cfExercisesToCSV, DEFAULT_FUERZA, DEFAULT_PREP_FISICA, DEFAULT_CROSSFIT } = require("@/lib/defaultExercises");
    let csv: string;
    let filename: string;
    if (tab === "crossfit") {
      csv = cfExercisesToCSV(DEFAULT_CROSSFIT);
      filename = "ejercicios_crossfit.csv";
    } else {
      csv = exercisesToCSV(tab === "fuerza" ? DEFAULT_FUERZA : DEFAULT_PREP_FISICA);
      filename = `ejercicios_${tab}.csv`;
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`CSV exportado: ${filename}`);
  }

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ejercicios</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {fuerzaExs.length} fuerza · {prepExs.length} prep. física · {cfExercises.length} cross/funcional
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV}
              className="flex items-center gap-2 border border-border text-foreground px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition"
              title="Exportar CSV">
              <Download className="w-4 h-4" /> CSV
            </button>
            {exercises.length === 0 && cfExercises.length === 0 && (
              <button onClick={loadDefaults} disabled={seeding}
                className="flex items-center gap-2 border-2 border-dashed border-orange-400/50 text-orange-500 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-500/10 disabled:opacity-50 transition">
                <FileSpreadsheet className="w-4 h-4" />
                {seeding ? "Cargando..." : "Cargar plantilla"}
              </button>
            )}
            <Link
              href={`/entrenador/ejercicios/nuevo?tipo=${newExTipo}`}
              className={`flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-sm ${
                tab === "crossfit" ? "bg-orange-600 hover:bg-orange-700" : "bg-primary hover:bg-primary/90"
              }`}
            >
              <Plus className="w-4 h-4" />
              Nuevo ejercicio
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
          <button onClick={() => switchTab("fuerza")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "fuerza" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Dumbbell className="w-4 h-4" />
            Fuerza
            {fuerzaExs.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                tab === "fuerza" ? "bg-primary/10 text-primary" : "bg-muted-foreground/20"
              }`}>{fuerzaExs.length}</span>
            )}
          </button>
          <button onClick={() => switchTab("prep_fisica")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "prep_fisica" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Zap className="w-4 h-4" />
            Prep. Física
            {prepExs.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                tab === "prep_fisica" ? "bg-green-100 text-green-700" : "bg-muted-foreground/20"
              }`}>{prepExs.length}</span>
            )}
          </button>
          <button onClick={() => switchTab("crossfit")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "crossfit" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Flame className="w-4 h-4" />
            Cross / Funcional
            {cfExercises.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                tab === "crossfit" ? "bg-orange-100 text-orange-700" : "bg-muted-foreground/20"
              }`}>{cfExercises.length}</span>
            )}
          </button>
        </div>

        {/* Search + Filter row */}
        <div className="flex gap-3 items-start">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
                tab === "crossfit" ? "focus:ring-orange-500" : "focus:ring-primary"
              }`}
            />
          </div>

          {/* Sub-filter: muscle group for fuerza/prep, category for CF */}
          {tab !== "crossfit" && availableMuscles.length > 1 && (
            <select value={muscleFilter} onChange={e => setMuscleFilter(e.target.value)}
              className="px-3 py-3 rounded-xl border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-w-[140px]">
              <option value="all">Todos los grupos</option>
              {availableMuscles.map(mg => (
                <option key={mg} value={mg}>{MUSCLE_LABELS[mg] || mg}</option>
              ))}
            </select>
          )}
          {tab === "crossfit" && availableCfCats.length > 1 && (
            <select value={cfCatFilter} onChange={e => setCfCatFilter(e.target.value)}
              className="px-3 py-3 rounded-xl border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[160px]">
              <option value="all">Todas las categorías</option>
              {availableCfCats.map(cat => (
                <option key={cat} value={cat}>{CF_CATEGORY_LABELS[cat] || cat}</option>
              ))}
            </select>
          )}
        </div>

        {/* ─── Fuerza / Prep Física view ─────────────────────── */}
        {tab !== "crossfit" && (
          Object.keys(byMuscle).length > 0 ? (
            Object.entries(byMuscle).map(([muscle, exs]) => (
              <div key={muscle} className="space-y-3">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full inline-block ${tab === "fuerza" ? "bg-primary" : "bg-green-500"}`} />
                  {MUSCLE_LABELS[muscle] || muscle}
                  <span className="text-sm font-normal text-muted-foreground">({exs.length})</span>
                </h2>
                <div className="bg-white rounded-2xl shadow-sm border border-border divide-y divide-border">
                  {exs.map(ex => (
                    <div key={ex.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors group">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        tab === "fuerza" ? "bg-primary/10" : "bg-green-100"
                      }`}>
                        <BookOpen className={`w-4 h-4 ${tab === "fuerza" ? "text-primary" : "text-green-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{ex.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{MUSCLE_LABELS[ex.muscle_group] || ex.muscle_group}</p>
                      </div>
                      {ex.video_url && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-medium flex items-center gap-1">
                          <Video className="w-3 h-3" />Video
                        </span>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/entrenador/ejercicios/${ex.id}`}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Editar">
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button onClick={() => setConfirmTarget({ id: ex.id, name: ex.name, table: "exercises" })}
                          className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-border">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-foreground">
                {search || muscleFilter !== "all" ? "Sin resultados" : tab === "fuerza" ? "Sin ejercicios de fuerza" : "Sin ejercicios de prep. física"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {search ? `No se encontraron ejercicios con "${search}"` : "Cargá ejercicios para empezar o usá la plantilla predefinida."}
              </p>
              {!search && muscleFilter === "all" && (
                <div className="flex items-center gap-3 justify-center">
                  <button onClick={loadDefaults} disabled={seeding}
                    className="inline-flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-400 disabled:opacity-50 transition shadow-lg shadow-orange-500/20">
                    <FileSpreadsheet className="w-4 h-4" />
                    {seeding ? "Cargando..." : "🚀 Cargar plantilla por defecto"}
                  </button>
                  <Link href={`/entrenador/ejercicios/nuevo?tipo=fuerza`}
                    className="inline-flex items-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition">
                    <Plus className="w-4 h-4" /> Cargar manualmente
                  </Link>
                </div>
              )}
            </div>
          )
        )}

        {/* ─── CrossFit view ─────────────────────────────────── */}
        {tab === "crossfit" && (
          Object.keys(byCfCat).length > 0 ? (
            Object.entries(byCfCat).map(([cat, exs]) => (
              <div key={cat} className="space-y-3">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                  {CF_CATEGORY_LABELS[cat] || cat}
                  <span className="text-sm font-normal text-muted-foreground">({exs.length})</span>
                </h2>
                <div className="bg-white rounded-2xl shadow-sm border border-border divide-y divide-border">
                  {exs.map(ex => (
                    <div key={ex.id} className="flex items-center gap-4 px-5 py-4 hover:bg-orange-50/50 transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                        <Flame className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{ex.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{CF_CATEGORY_LABELS[ex.category] || ex.category}</span>
                          <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">{CF_UNIT_LABELS[ex.default_unit] || ex.default_unit}</span>
                        </div>
                      </div>
                      {ex.video_url && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-lg font-medium flex items-center gap-1">
                          <Video className="w-3 h-3" />Video
                        </span>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-2 rounded-lg hover:bg-orange-100 text-muted-foreground hover:text-orange-700 transition-colors"
                          title="Editar"
                          onClick={() => toast.info("Editor de ejercicio CF — próximamente")}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirmTarget({ id: ex.id, name: ex.name, table: "cf_exercises" })}
                          className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-border">
              <Flame className="w-12 h-12 text-orange-300 mx-auto mb-3" />
              <h3 className="font-semibold text-foreground">{search || cfCatFilter !== "all" ? "Sin resultados" : "Sin ejercicios CrossFit"}</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {search ? `No se encontraron ejercicios con "${search}"` : "Cargá los movimientos para tus WODs o usá la plantilla."}
              </p>
              {!search && cfCatFilter === "all" && (
                <div className="flex items-center gap-3 justify-center">
                  <button onClick={loadDefaults} disabled={seeding}
                    className="inline-flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-400 disabled:opacity-50 transition shadow-lg shadow-orange-500/20">
                    <FileSpreadsheet className="w-4 h-4" />
                    {seeding ? "Cargando..." : "🚀 Cargar plantilla por defecto"}
                  </button>
                  <Link href="/entrenador/ejercicios/nuevo?tipo=crossfit"
                    className="inline-flex items-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition">
                    <Plus className="w-4 h-4" /> Cargar manualmente
                  </Link>
                </div>
              )}
            </div>
          )
        )}
      </div>

      <ConfirmDialog
        open={!!confirmTarget}
        title="Eliminar ejercicio"
        description={`¿Querés eliminar "${confirmTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </>
  );
}
