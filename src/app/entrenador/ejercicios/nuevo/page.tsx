"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, BookOpen, Plus, X } from "lucide-react";
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

// Variantes globales predefinidas por tipo
const VARIANTES_GLOBALES: Record<string, string[]> = {
  "Desde plataforma": ["P1", "P2", "P3"],
  "Colgado": ["C1", "C2", "C3"],
  "Sentadilla": ["Pausa", "Tempo", "Box"],
};

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
  const [variants, setVariants] = useState<string[]>([]);
  const [newVariant, setNewVariant] = useState("");

  const addVariant = (name: string) => {
    const trimmed = name.trim().toUpperCase();
    if (!trimmed) return;
    if (variants.includes(trimmed)) return toast.error("Esa variante ya existe");
    setVariants([...variants, trimmed]);
    setNewVariant("");
  };

  const removeVariant = (v: string) => setVariants(variants.filter(x => x !== v));

  const addGlobalSet = (set: string[]) => {
    const newOnes = set.map(s => s.toUpperCase()).filter(s => !variants.includes(s));
    if (newOnes.length === 0) return toast.error("Todas esas variantes ya están agregadas");
    setVariants([...variants, ...newOnes]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("El nombre es obligatorio");
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Crear ejercicio base
    const { data: exercise, error } = await supabase.from("exercises").insert({
      trainer_id: user!.id,
      name: form.name.trim().toUpperCase(),
      category: form.category,
      muscle_group: form.muscle_group,
      video_url: form.video_url.trim() || null,
      notes: form.notes.trim() || null,
      archived: false,
    }).select().single();

    if (error || !exercise) {
      toast.error("Error al guardar: " + error?.message);
      setLoading(false);
      return;
    }

    // 2. Crear variantes si hay
    if (variants.length > 0) {
      const variantsToInsert = variants.map((name, idx) => ({
        exercise_id: exercise.id,
        name,
        order: idx,
      }));
      const { error: varError } = await supabase.from("exercise_variants").insert(variantsToInsert);
      if (varError) toast.error("Ejercicio guardado pero hubo un error con las variantes");
    }

    toast.success("Ejercicio guardado correctamente");
    router.push("/entrenador/ejercicios");
    router.refresh();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/entrenador/ejercicios" className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nuevo ejercicio</h1>
          <p className="text-sm text-muted-foreground">Agregá un ejercicio a tu biblioteca</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos base */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Nombre del ejercicio <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: ARRANQUE, SENTADILLA FRONTAL, ENVIÓN..."
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Escribí el nombre base. Las variantes (P1, P2, Colgado, etc.) las agregás abajo.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Categoría *</label>
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map(cat => (
                <button key={cat.value} type="button" onClick={() => setForm({ ...form, category: cat.value })}
                  className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                    form.category === cat.value ? "bg-primary text-white border-primary" : "border-border text-foreground hover:border-primary/50"
                  }`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Grupo muscular / Tipo *</label>
            <select value={form.muscle_group} onChange={e => setForm({ ...form, muscle_group: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              {MUSCLE_GROUPS.map(mg => <option key={mg.value} value={mg.value}>{mg.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              URL de video <span className="text-muted-foreground text-xs">(opcional)</span>
            </label>
            <input type="url" value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Notas técnicas <span className="text-muted-foreground text-xs">(opcional)</span>
            </label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Indicaciones técnicas, puntos clave del movimiento..."
              rows={3} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>
        </div>

        {/* Variantes */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-foreground">Variantes</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Agregá las versiones del ejercicio. Al planificar podrás elegir cuál usar.
            </p>
          </div>

          {/* Atajos de variantes globales */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Variantes comunes — clic para agregar:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(VARIANTES_GLOBALES).map(([group, set]) => (
                <button key={group} type="button" onClick={() => addGlobalSet(set)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary text-sm font-medium transition-colors border border-border">
                  <Plus className="w-3 h-3" />
                  {group} ({set.join(", ")})
                </button>
              ))}
            </div>
          </div>

          {/* Variantes actuales */}
          {variants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {variants.map(v => (
                <span key={v} className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-semibold">
                  {v}
                  <button type="button" onClick={() => removeVariant(v)}
                    className="hover:text-destructive transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Agregar variante manual */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newVariant}
              onChange={e => setNewVariant(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addVariant(newVariant); } }}
              placeholder="Ej: SUSPENDIDO, CON PAUSA, JERK..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            <button type="button" onClick={() => addVariant(newVariant)}
              className="px-4 py-2.5 rounded-xl bg-muted hover:bg-primary hover:text-white font-medium text-sm transition-colors flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>

          {variants.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Sin variantes — el ejercicio se usará tal cual. Podés agregar variantes ahora o después.
            </p>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <Link href="/entrenador/ejercicios"
            className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium text-center hover:bg-muted transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : <><BookOpen className="w-4 h-4" />Guardar ejercicio</>}
          </button>
        </div>
      </form>
    </div>
  );
}
