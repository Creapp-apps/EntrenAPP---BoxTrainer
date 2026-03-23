"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, BookOpen } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  { value: "fuerza", label: "Fuerza" },
  { value: "prep_fisica", label: "Preparación Física" },
  { value: "accesorio", label: "Accesorio" },
];

const MUSCLE_GROUPS = [
  { value: "olimpico", label: "Olímpico (Arranque, Envión, etc.)" },
  { value: "piernas", label: "Piernas" },
  { value: "espalda", label: "Espalda" },
  { value: "pecho", label: "Pecho" },
  { value: "hombros", label: "Hombros" },
  { value: "brazos", label: "Brazos" },
  { value: "core", label: "Core" },
  { value: "full_body", label: "Full Body" },
  { value: "otro", label: "Otro" },
];

export default function NuevoEjercicioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "fuerza",
    muscle_group: "olimpico",
    video_url: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("El nombre es obligatorio");
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("exercises").insert({
      trainer_id: user!.id,
      name: form.name.trim(),
      category: form.category,
      muscle_group: form.muscle_group,
      video_url: form.video_url.trim() || null,
      notes: form.notes.trim() || null,
      archived: false,
    });

    if (error) {
      toast.error("Error al guardar: " + error.message);
      setLoading(false);
      return;
    }

    toast.success("Ejercicio guardado correctamente");
    router.push("/entrenador/ejercicios");
    router.refresh();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/entrenador/ejercicios"
          className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nuevo ejercicio</h1>
          <p className="text-sm text-muted-foreground">Agregá un ejercicio a tu biblioteca</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-5">

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Nombre del ejercicio <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Ej: ARRANQUE, ARRANQUE P3, SENTADILLA FRONTAL..."
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Tip: usá nombres claros y consistentes. Ej: "ARRANQUE", "ARRANQUE P3", "ARRANQUE S3"
          </p>
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Categoría <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setForm({ ...form, category: cat.value })}
                className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                  form.category === cat.value
                    ? "bg-primary text-white border-primary"
                    : "border-border text-foreground hover:border-primary/50"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grupo muscular */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Grupo muscular / Tipo <span className="text-destructive">*</span>
          </label>
          <select
            value={form.muscle_group}
            onChange={e => setForm({ ...form, muscle_group: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {MUSCLE_GROUPS.map(mg => (
              <option key={mg.value} value={mg.value}>{mg.label}</option>
            ))}
          </select>
        </div>

        {/* URL de video */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            URL de video demostrativo <span className="text-muted-foreground text-xs">(opcional)</span>
          </label>
          <input
            type="url"
            value={form.video_url}
            onChange={e => setForm({ ...form, video_url: e.target.value })}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Notas técnicas */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Notas técnicas <span className="text-muted-foreground text-xs">(opcional)</span>
          </label>
          <textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Indicaciones técnicas, puntos clave del movimiento..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <Link href="/entrenador/ejercicios"
            className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium text-center hover:bg-muted transition-colors">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><BookOpen className="w-4 h-4" /> Guardar ejercicio</>}
          </button>
        </div>
      </form>
    </div>
  );
}
