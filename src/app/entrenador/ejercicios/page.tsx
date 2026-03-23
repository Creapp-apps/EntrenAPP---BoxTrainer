import { createClient } from "@/lib/supabase/server";
import { BookOpen, Plus, Search } from "lucide-react";
import Link from "next/link";

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

export default async function EjerciciosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: exercises } = await supabase
    .from("exercises")
    .select("*")
    .eq("trainer_id", user!.id)
    .eq("archived", false)
    .order("name");

  const byCategory = (exercises || []).reduce((acc: Record<string, typeof exercises>, ex) => {
    const cat = ex!.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(ex);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ejercicios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{exercises?.length ?? 0} ejercicios en la biblioteca</p>
        </div>
        <Link href="/entrenador/ejercicios/nuevo"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition">
          <Plus className="w-4 h-4" />
          Nuevo ejercicio
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="Buscar ejercicio..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      {Object.keys(byCategory).length > 0 ? (
        Object.entries(byCategory).map(([cat, exs]) => (
          <div key={cat} className="space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              {CATEGORY_LABELS[cat] || cat}
              <span className="text-sm font-normal text-muted-foreground">({exs?.length})</span>
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-border divide-y divide-border">
              {exs?.map((ex) => (
                <Link key={ex!.id} href={`/entrenador/ejercicios/${ex!.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{ex!.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{MUSCLE_LABELS[ex!.muscle_group] || ex!.muscle_group}</p>
                  </div>
                  {ex!.video_url && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-medium">Video</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-border">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Biblioteca vacía</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Cargá los ejercicios que usás en tus planificaciones.
          </p>
          <Link href="/entrenador/ejercicios/nuevo"
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition">
            <Plus className="w-4 h-4" />
            Cargar primer ejercicio
          </Link>
        </div>
      )}
    </div>
  );
}
