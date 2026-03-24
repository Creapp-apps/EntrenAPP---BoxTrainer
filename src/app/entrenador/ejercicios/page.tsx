"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const CATEGORY_LABELS: Record<string, string> = {
  fuerza: "Fuerza",
  prep_fisica: "Preparación Física",
  accesorio: "Accesorio",
};

const MUSCLE_LABELS: Record<string, string> = {
  olimpico: "Olímpico",
  piernas: "Piernas",
  espalda: "Espalda",
  pecho: "Pecho",
  hombros: "Hombros",
  brazos: "Brazos",
  core: "Core",
  full_body: "Full Body",
  otro: "Otro",
};

type Exercise = {
  id: string;
  name: string;
  category: string;
  muscle_group: string;
  video_url?: string | null;
};

export default function EjerciciosPage() {
  const supabase = createClient();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<Exercise | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadExercises();
  }, []);

  async function loadExercises() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("exercises")
      .select("id, name, category, muscle_group, video_url")
      .eq("trainer_id", user!.id)
      .eq("archived", false)
      .order("name");
    setExercises(data || []);
  }

  async function confirmDelete() {
    if (!confirmTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from("exercises")
      .update({ archived: true })
      .eq("id", confirmTarget.id);

    if (error) {
      toast.error("No se pudo eliminar el ejercicio");
    } else {
      toast.success(`"${confirmTarget.name}" eliminado`);
      setExercises(prev => prev.filter(e => e.id !== confirmTarget.id));
    }
    setDeleting(false);
    setConfirmTarget(null);
  }

  const filtered = exercises.filter(ex =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  );

  const byCategory = filtered.reduce((acc: Record<string, Exercise[]>, ex) => {
    if (!acc[ex.category]) acc[ex.category] = [];
    acc[ex.category]!.push(ex);
    return acc;
  }, {});

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ejercicios</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {exercises.length} ejercicios en la biblioteca
            </p>
          </div>
          <Link
            href="/entrenador/ejercicios/nuevo"
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" />
            Nuevo ejercicio
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar ejercicio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {Object.keys(byCategory).length > 0 ? (
          Object.entries(byCategory).map(([cat, exs]) => (
            <div key={cat} className="space-y-3">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                {CATEGORY_LABELS[cat] || cat}
                <span className="text-sm font-normal text-muted-foreground">({exs.length})</span>
              </h2>
              <div className="bg-white rounded-2xl shadow-sm border border-border divide-y divide-border">
                {exs.map(ex => (
                  <div
                    key={ex.id}
                    className="relative group flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Invisible link covering the row */}
                    <Link
                      href={`/entrenador/ejercicios/${ex.id}`}
                      className="absolute inset-0"
                      aria-label={ex.name}
                    />

                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{ex.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {MUSCLE_LABELS[ex.muscle_group] || ex.muscle_group}
                      </p>
                    </div>
                    {ex.video_url && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-medium">
                        Video
                      </span>
                    )}

                    {/* Delete button — visible on hover */}
                    <button
                      onClick={e => {
                        e.preventDefault();
                        setConfirmTarget(ex);
                      }}
                      className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500"
                      title="Eliminar ejercicio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-border">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">
              {search ? "Sin resultados" : "Biblioteca vacía"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {search
                ? `No se encontraron ejercicios con "${search}"`
                : "Cargá los ejercicios que usás en tus planificaciones."}
            </p>
            {!search && (
              <Link
                href="/entrenador/ejercicios/nuevo"
                className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition"
              >
                <Plus className="w-4 h-4" />
                Cargar primer ejercicio
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Confirm delete dialog */}
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
