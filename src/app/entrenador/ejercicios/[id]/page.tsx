"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, BookOpen, Video, FileText, Plus, X,
  Loader2, Edit2, Trash2, Check, Save, Link2, ExternalLink
} from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  { value: "fuerza", label: "Fuerza" },
  { value: "prep_fisica", label: "Prep. Física" },
  { value: "accesorio", label: "Accesorio" },
];
const MUSCLE_GROUPS = [
  { value: "olimpico", label: "Olímpico" },
  { value: "piernas", label: "Piernas" },
  { value: "espalda", label: "Espalda" },
  { value: "pecho", label: "Pecho" },
  { value: "hombros", label: "Hombros" },
  { value: "brazos", label: "Brazos" },
  { value: "core", label: "Core" },
  { value: "full_body", label: "Full Body" },
  { value: "otro", label: "Otro" },
];
const CATEGORY_LABELS: Record<string, string> = {
  fuerza: "Fuerza", prep_fisica: "Preparación Física", accesorio: "Accesorio",
};
const MUSCLE_LABELS: Record<string, string> = {
  olimpico: "Olímpico", piernas: "Piernas", espalda: "Espalda", pecho: "Pecho",
  hombros: "Hombros", brazos: "Brazos", core: "Core", full_body: "Full Body", otro: "Otro",
};
const DEFAULT_COMMON_VARIANTS = [
  "S1", "S2", "S3", "S4",
  "Colgado", "2do Tiempo", "Fuerza", "Pausa",
  "Jerk", "Dip", "Box", "Isométrico", "Excéntrico",
];

type Exercise = {
  id: string; name: string; category: string;
  muscle_group: string; video_url?: string; notes?: string;
};
type Variant = { id: string; name: string; order: number; video_url?: string | null };

export default function EjercicioDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [commonVariants, setCommonVariants] = useState<string[]>([]);
  const [newVariant, setNewVariant] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Exercise | null>(null);
  const [saving, setSaving] = useState(false);

  // Per-variant video URL editing
  const [variantVideos, setVariantVideos] = useState<Record<string, string>>({});
  const [savingVideo, setSavingVideo] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: ex }, { data: vars }, { data: settings }] = await Promise.all([
        supabase.from("exercises").select("*").eq("id", id).single(),
        supabase.from("exercise_variants").select("*").eq("exercise_id", id).order("order"),
        supabase.from("trainer_settings").select("common_variants").single(),
      ]);
      setExercise(ex);
      setEditForm(ex);
      setVariants(vars || []);
      setCommonVariants(settings?.common_variants ?? DEFAULT_COMMON_VARIANTS);

      // Init video URL inputs from DB values
      if (vars) {
        const initial: Record<string, string> = {};
        vars.forEach((v: Variant) => { initial[v.id] = v.video_url || ""; });
        setVariantVideos(initial);
      }
    };
    load();
  }, [id]);

  // ─── Guardar edición ──────────────────────────────────────
  const handleSave = async () => {
    if (!editForm?.name.trim()) return toast.error("El nombre es obligatorio");
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("exercises").update({
      name: editForm.name.trim().toUpperCase(),
      category: editForm.category,
      muscle_group: editForm.muscle_group,
      video_url: editForm.video_url?.trim() || null,
      notes: editForm.notes?.trim() || null,
    }).eq("id", id);

    if (error) {
      toast.error("Error al guardar: " + error.message);
    } else {
      setExercise({ ...editForm, name: editForm.name.trim().toUpperCase() });
      setEditMode(false);
      toast.success("Ejercicio actualizado");
    }
    setSaving(false);
  };

  const cancelEdit = () => {
    setEditForm(exercise);
    setEditMode(false);
  };

  // ─── Eliminar ejercicio ───────────────────────────────────
  const handleDelete = async () => {
    if (!confirm(`¿Eliminar "${exercise?.name}"?`)) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("exercises").update({ archived: true }).eq("id", id);
    if (error) {
      toast.error("Error al eliminar: " + error.message);
      setDeleting(false);
    } else {
      toast.success("Ejercicio eliminado");
      router.push("/entrenador/ejercicios");
    }
  };

  // ─── Variantes ────────────────────────────────────────────
  const addVariant = async (name: string) => {
    const trimmed = name.trim().toUpperCase();
    if (!trimmed) return;
    if (variants.find(v => v.name === trimmed)) return toast.error("Esa variante ya existe");
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("exercise_variants").insert({
      exercise_id: id, name: trimmed, order: variants.length,
    }).select().single();
    if (error) { toast.error("Error al agregar variante"); setLoading(false); return; }
    setVariants([...variants, data]);
    setVariantVideos(prev => ({ ...prev, [data.id]: "" }));
    setNewVariant("");
    setLoading(false);
  };

  const addCommonVariant = async (name: string) => {
    const upper = name.toUpperCase();
    if (variants.find(v => v.name === upper)) return toast.error(`"${upper}" ya está agregada`);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("exercise_variants").insert({
      exercise_id: id, name: upper, order: variants.length,
    }).select().single();
    if (error) { toast.error("Error: " + error.message); setLoading(false); return; }
    setVariants([...variants, data]);
    setVariantVideos(prev => ({ ...prev, [data.id]: "" }));
    toast.success(`"${upper}" agregada`);
    setLoading(false);
  };

  const removeVariant = async (variantId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("exercise_variants").delete().eq("id", variantId);
    if (error) return toast.error("Error al eliminar variante");
    setVariants(variants.filter(v => v.id !== variantId));
    setVariantVideos(prev => { const copy = { ...prev }; delete copy[variantId]; return copy; });
  };

  // ─── Guardar video de variante ────────────────────────────
  const saveVariantVideo = async (variantId: string) => {
    const url = variantVideos[variantId]?.trim() || null;
    // Skip if unchanged
    const current = variants.find(v => v.id === variantId)?.video_url || null;
    if ((url || null) === (current || null)) return;

    setSavingVideo(variantId);
    const supabase = createClient();
    const { error } = await supabase.from("exercise_variants")
      .update({ video_url: url })
      .eq("id", variantId);

    if (error) {
      toast.error("Error al guardar video");
    } else {
      setVariants(prev => prev.map(v => v.id === variantId ? { ...v, video_url: url } : v));
      toast.success("Video guardado");
    }
    setSavingVideo(null);
  };

  if (!exercise || !editForm) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/entrenador/ejercicios" className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          {!editMode ? (
            <>
              <h1 className="text-2xl font-bold text-foreground truncate">{exercise.name}</h1>
              <div className="flex gap-2 mt-1">
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {CATEGORY_LABELS[exercise.category]}
                </span>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {MUSCLE_LABELS[exercise.muscle_group]}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm font-medium text-primary">Editando ejercicio</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!editMode ? (
            <>
              <button onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors">
                <Edit2 className="w-4 h-4" />
                <span className="hidden sm:inline">Editar</span>
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors disabled:opacity-50">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span className="hidden sm:inline">Eliminar</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={cancelEdit}
                className="px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Formulario de edición / Vista */}
      {editMode ? (
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nombre *</label>
            <input value={editForm.name}
              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Categoría</label>
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map(cat => (
                <button key={cat.value} type="button"
                  onClick={() => setEditForm({ ...editForm, category: cat.value })}
                  className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${
                    editForm.category === cat.value
                      ? "bg-primary text-white border-primary"
                      : "border-border text-foreground hover:border-primary/50"
                  }`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Grupo muscular</label>
            <select value={editForm.muscle_group}
              onChange={e => setEditForm({ ...editForm, muscle_group: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              {MUSCLE_GROUPS.map(mg => <option key={mg.value} value={mg.value}>{mg.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              URL video del ejercicio base
            </label>
            <input type="url" value={editForm.video_url || ""}
              onChange={e => setEditForm({ ...editForm, video_url: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Notas técnicas</label>
            <textarea value={editForm.notes || ""}
              onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
              rows={3} placeholder="Indicaciones técnicas, puntos clave..."
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </div>
      ) : (
        (exercise.video_url || exercise.notes) && (
          <div className="bg-white rounded-2xl shadow-sm border border-border divide-y divide-border">
            {exercise.video_url && (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-4 h-4 text-primary" />
                  <h3 className="font-medium text-foreground text-sm">Video — ejercicio base</h3>
                </div>
                <a href={exercise.video_url} target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm break-all">
                  {exercise.video_url}
                </a>
              </div>
            )}
            {exercise.notes && (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="font-medium text-foreground text-sm">Notas técnicas</h3>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{exercise.notes}</p>
              </div>
            )}
          </div>
        )
      )}

      {/* Variantes */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-foreground">Variantes</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {variants.length === 0
              ? "Sin variantes. Al planificar se usará el ejercicio base."
              : `${variants.length} variante${variants.length > 1 ? "s" : ""}. Podés agregar un video a cada una.`}
          </p>
        </div>

        {/* Variantes comunes */}
        {commonVariants.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Agregar variante común:
              </p>
              <Link href="/entrenador/configuracion" className="text-xs text-primary hover:underline">
                Gestionar
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {commonVariants.map(cv => {
                const alreadyAdded = !!variants.find(v => v.name === cv.toUpperCase());
                return (
                  <button key={cv} type="button"
                    onClick={() => addCommonVariant(cv)}
                    disabled={loading || alreadyAdded}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      alreadyAdded
                        ? "bg-primary/10 text-primary border-primary/30 cursor-default opacity-60"
                        : "bg-muted hover:bg-primary/10 hover:text-primary hover:border-primary/30 border-border"
                    } disabled:cursor-not-allowed`}>
                    {alreadyAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    {cv}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Lista de variantes con URL de video inline */}
        {variants.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Videos por variante — pegá el URL y presioná Enter o hacé click afuera para guardar:
            </p>
            <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
              {variants.map(v => {
                const videoVal = variantVideos[v.id] ?? "";
                const isSaving = savingVideo === v.id;
                const hasVideo = !!v.video_url;
                return (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-muted/20 transition-colors">
                    {/* Nombre */}
                    <span className="font-bold text-sm text-primary w-20 shrink-0">{v.name}</span>

                    {/* Input URL */}
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <input
                        type="url"
                        value={videoVal}
                        onChange={e => setVariantVideos(prev => ({ ...prev, [v.id]: e.target.value }))}
                        onBlur={() => saveVariantVideo(v.id)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveVariantVideo(v.id); (e.target as HTMLInputElement).blur(); } }}
                        placeholder="Pegar URL de YouTube..."
                        className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
                      {!isSaving && hasVideo && (
                        <a href={v.video_url!} target="_blank" rel="noopener noreferrer"
                          className="text-primary hover:text-primary/70 shrink-0" title="Ver video">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    {/* Eliminar variante */}
                    <button type="button" onClick={() => removeVariant(v.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Input nueva variante */}
        <div className="flex gap-2">
          <input type="text" value={newVariant}
            onChange={e => setNewVariant(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addVariant(newVariant); } }}
            placeholder="Ej: SUSPENDIDO, CON PAUSA..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          <button type="button" onClick={() => addVariant(newVariant)} disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-muted hover:bg-primary hover:text-white font-medium text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
