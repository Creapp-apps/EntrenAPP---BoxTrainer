import { createClient } from "@/lib/supabase/server";
import { Trophy, TrendingUp } from "lucide-react";
import Link from "next/link";

export default async function PRsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: records } = await supabase
    .from("personal_records")
    .select("*, exercises(name, category)")
    .eq("student_id", user!.id)
    .order("created_at", { ascending: false });

  // Group by exercise
  const byExercise: Record<string, { name: string; category: string; best: number; date: string }> = {};
  records?.forEach(r => {
    const ex = r.exercises as Record<string, string>;
    if (!byExercise[r.exercise_id] || r.weight_kg > byExercise[r.exercise_id].best) {
      byExercise[r.exercise_id] = {
        name: ex?.name || "",
        category: ex?.category || "",
        best: r.weight_kg,
        date: r.created_at,
      };
    }
  });

  const sorted = Object.entries(byExercise).sort((a, b) => b[1].best - a[1].best);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-sidebar text-white px-4 pt-12 pb-6">
        <h1 className="text-2xl font-bold">Mis récords</h1>
        <p className="text-white/60 text-sm mt-1">
          {sorted.length} ejercicio{sorted.length !== 1 ? "s" : ""} con PR registrado
        </p>
      </div>

      <div className="px-4 py-4 space-y-3 pb-24">
        {sorted.length > 0 ? (
          sorted.map(([exId, data]) => (
            <div key={exId} className="bg-white rounded-2xl shadow-sm border border-border p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{data.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{data.category}</p>
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
              Tus PRs aparecerán acá cuando tu entrenador los registre.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
