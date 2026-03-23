import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Video, FileText } from "lucide-react";
import Link from "next/link";

const CATEGORY_LABELS: Record<string, string> = {
  fuerza: "Fuerza", prep_fisica: "Preparación Física", accesorio: "Accesorio",
};
const MUSCLE_LABELS: Record<string, string> = {
  olimpico: "Olímpico", piernas: "Piernas", espalda: "Espalda", pecho: "Pecho",
  hombros: "Hombros", brazos: "Brazos", core: "Core", full_body: "Full Body", otro: "Otro",
};

export default async function EjercicioDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: exercise } = await supabase
    .from("exercises").select("*").eq("id", params.id).single();

  if (!exercise) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/entrenador/ejercicios" className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{exercise.name}</h1>
          <div className="flex gap-2 mt-1">
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {CATEGORY_LABELS[exercise.category]}
            </span>
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              {MUSCLE_LABELS[exercise.muscle_group]}
            </span>
          </div>
        </div>
        <Link href={`/entrenador/ejercicios/${params.id}/editar`}
          className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
          Editar
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border divide-y divide-border">
        {exercise.video_url && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Video className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-foreground text-sm">Video demostrativo</h3>
            </div>
            <a href={exercise.video_url} target="_blank" rel="noopener noreferrer"
              className="text-primary hover:underline text-sm break-all">
              {exercise.video_url}
            </a>
          </div>
        )}
        {exercise.notes && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-foreground text-sm">Notas técnicas</h3>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{exercise.notes}</p>
          </div>
        )}
        {!exercise.video_url && !exercise.notes && (
          <div className="p-8 text-center">
            <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin notas ni video cargado.</p>
            <Link href={`/entrenador/ejercicios/${params.id}/editar`}
              className="text-sm text-primary hover:underline mt-1 inline-block">
              Agregar información →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
