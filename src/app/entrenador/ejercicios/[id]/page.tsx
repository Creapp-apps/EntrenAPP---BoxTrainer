"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, BookOpen, Video, FileText, Plus, X,
  Loader2, Edit2, Trash2, Check, Save, Link2, ExternalLink, Sparkles
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
const CF_CATEGORY_LABELS: Record<string, string> = {
  gymnastics: "Gymnastics",
  weightlifting: "Weightlifting",
  monostructural: "Monostructural",
  mobility: "Movilidad",
  other: "Otro",
};
const CF_CATEGORIES = [
  { value: "gymnastics", label: "Gymnastics" },
  { value: "weightlifting", label: "Weightlifting" },
  { value: "monostructural", label: "Monostructural" },
  { value: "mobility", label: "Movilidad" },
  { value: "other", label: "Otro" },
];
const MUSCLE_LABELS: Record<string, string> = {
  olimpico: "Olímpico", piernas: "Piernas", espalda: "Espalda", pecho: "Pecho",
  hombros: "Hombros", brazos: "Brazos", core: "Core", full_body: "Full Body", otro: "Otro",
};
const DEFAULT_COMMON_VARIANTS = [
  "S1", "S2", "S3", "S4",
  "Colgado", "2do Tiempo", "Fuerza", "Pausa",
  "Jerk", "Dip", "Box", "Isométrico", "Excéntrico",
];

function getMediaDetails(url?: string | null) {
  if (!url) return { type: "none" };
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  
  if (lower.endsWith(".gif") || lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp") || lower.includes("/exercises/videos/")) {
    return { type: "image", isGif: lower.includes(".gif") || lower.includes("/exercises/videos/"), url: trimmed };
  }
  const ytMatch = lower.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`, url: trimmed };
  }
  if (lower.endsWith(".mp4") || lower.endsWith(".webm")) {
    return { type: "video", url: trimmed };
  }
  return { type: "link", url: trimmed };
}

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
  const [isCF, setIsCF] = useState(false);

  // Quick media editor states
  const [editingMedia, setEditingMedia] = useState(false);
  const [mediaInput, setMediaInput] = useState("");
  const [savingMedia, setSavingMedia] = useState(false);

  // Per-variant video URL editing
  const [variantVideos, setVariantVideos] = useState<Record<string, string>>({});
  const [savingVideo, setSavingVideo] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Try to fetch from exercises table first
      const { data: exStrength } = await supabase.from("exercises").select("*").eq("id", id).maybeSingle();

      if (exStrength) {
        const [{ data: vars }, { data: settings }] = await Promise.all([
          supabase.from("exercise_variants").select("*").eq("exercise_id", id).order("order"),
          supabase.from("trainer_settings").select("common_variants").single(),
        ]);
        setExercise(exStrength);
        setEditForm(exStrength);
        setIsCF(false);
        setVariants(vars || []);
        setCommonVariants(settings?.common_variants ?? DEFAULT_COMMON_VARIANTS);

        if (vars) {
          const initial: Record<string, string> = {};
          vars.forEach((v: Variant) => { initial[v.id] = v.video_url || ""; });
          setVariantVideos(initial);
        }
      } else {
        // Try to fetch from cf_exercises table
        const { data: exCF } = await supabase.from("cf_exercises").select("*").eq("id", id).maybeSingle();
        if (exCF) {
          const [{ data: vars }, { data: settings }] = await Promise.all([
            supabase.from("cf_exercise_variants").select("*").eq("exercise_id", id).order("order"),
            supabase.from("trainer_settings").select("common_variants").single(),
          ]);
          const mappedEx = {
            id: exCF.id,
            name: exCF.name,
            category: exCF.category,
            muscle_group: "otro",
            video_url: exCF.video_url || undefined,
            notes: undefined,
          };
          setExercise(mappedEx);
          setEditForm(mappedEx);
          setIsCF(true);
          setVariants(vars || []);
          setCommonVariants(settings?.common_variants ?? DEFAULT_COMMON_VARIANTS);

          if (vars) {
            const initial: Record<string, string> = {};
            vars.forEach((v: Variant) => { initial[v.id] = v.video_url || ""; });
            setVariantVideos(initial);
          }
        }
      }
    };
    load();
  }, [id]);

  // ─── Guardar edición ──────────────────────────────────────
  const handleSave = async () => {
    if (!editForm?.name.trim()) return toast.error("El nombre es obligatorio");
    setSaving(true);
    const supabase = createClient();

    let error;
    if (isCF) {
      const { error: err } = await supabase.from("cf_exercises").update({
        name: editForm.name.trim().toUpperCase(),
        category: editForm.category,
        video_url: editForm.video_url?.trim() || null,
      }).eq("id", id);
      error = err;
    } else {
      const { error: err } = await supabase.from("exercises").update({
        name: editForm.name.trim().toUpperCase(),
        category: editForm.category,
        muscle_group: editForm.muscle_group,
        video_url: editForm.video_url?.trim() || null,
        notes: editForm.notes?.trim() || null,
      }).eq("id", id);
      error = err;
    }

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

  const handleSaveQuickMedia = async () => {
    setSavingMedia(true);
    const supabase = createClient();
    const table = isCF ? "cf_exercises" : "exercises";
    const newUrl = mediaInput.trim() || null;
    const { error } = await supabase.from(table).update({ video_url: newUrl }).eq("id", id);
    if (error) {
      toast.error("Error al guardar media: " + error.message);
    } else {
      const updatedUrl = newUrl || undefined;
      setExercise(prev => prev ? { ...prev, video_url: updatedUrl } : null);
      setEditForm(prev => prev ? { ...prev, video_url: updatedUrl } : null);
      setEditingMedia(false);
      toast.success("Media/Video actualizado correctamente");
    }
    setSavingMedia(false);
  };

  // ─── Eliminar ejercicio ───────────────────────────────────
  const handleDelete = async () => {
    if (!confirm(`¿Eliminar "${exercise?.name}"?`)) return;
    setDeleting(true);
    const supabase = createClient();
    const table = isCF ? "cf_exercises" : "exercises";
    const { error } = await supabase.from(table).update({ archived: true }).eq("id", id);
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
    const table = isCF ? "cf_exercise_variants" : "exercise_variants";
    const { data, error } = await supabase.from(table).insert({
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
    const table = isCF ? "cf_exercise_variants" : "exercise_variants";
    const { data, error } = await supabase.from(table).insert({
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
    const table = isCF ? "cf_exercise_variants" : "exercise_variants";
    const { error } = await supabase.from(table).delete().eq("id", variantId);
    if (error) return toast.error("Error al eliminar variante");
    setVariants(variants.filter(v => v.id !== variantId));
    setVariantVideos(prev => { const copy = { ...prev }; delete copy[variantId]; return copy; });
  };

  // ─── Guardar video de variante ────────────────────────────
  const saveVariantVideo = async (variantId: string) => {
    const url = variantVideos[variantId]?.trim() || null;
    const current = variants.find(v => v.id === variantId)?.video_url || null;
    if ((url || null) === (current || null)) return;

    setSavingVideo(variantId);
    const supabase = createClient();
    const table = isCF ? "cf_exercise_variants" : "exercise_variants";
    const { error } = await supabase.from(table)
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
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isCF ? "bg-orange-100 text-orange-700" : "bg-primary/10 text-primary"}`}>
                  {isCF ? (CF_CATEGORY_LABELS[exercise.category] || exercise.category) : CATEGORY_LABELS[exercise.category]}
                </span>
                {!isCF && (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {MUSCLE_LABELS[exercise.muscle_group]}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className={`text-sm font-medium ${isCF ? "text-orange-600" : "text-primary"}`}>Editando ejercicio</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!editMode ? (
            <>
              <button onClick={() => setEditMode(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-${isCF ? "orange-600" : "primary"} hover:border-${isCF ? "orange-500/50" : "primary/50"} transition-colors`}>
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
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-white text-sm font-semibold transition-colors ${isCF ? "bg-orange-600 hover:bg-orange-500" : "bg-primary hover:bg-primary/90"} disabled:opacity-50`}>
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
            <label className="block text-sm font-bold text-foreground mb-1.5">Nombre *</label>
            <input value={editForm.name}
              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">Categoría</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(isCF ? CF_CATEGORIES : CATEGORIES).map(cat => (
                <button key={cat.value} type="button"
                  onClick={() => setEditForm({ ...editForm, category: cat.value })}
                  className={`py-2.5 px-3 rounded-xl border text-sm font-bold transition-all ${
                    editForm.category === cat.value
                      ? (isCF ? "bg-orange-600 text-white border-orange-600" : "bg-primary text-white border-primary")
                      : "border-border text-foreground hover:border-primary/50"
                  }`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          {!isCF && (
            <div>
              <label className="block text-sm font-bold text-foreground mb-1.5">Grupo muscular</label>
              <select value={editForm.muscle_group}
                onChange={e => setEditForm({ ...editForm, muscle_group: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary">
                {MUSCLE_GROUPS.map(mg => <option key={mg.value} value={mg.value}>{mg.label}</option>)}
              </select>
            </div>
          )}
          
          {/* Media / Video field in Edit Mode */}
          <div className="space-y-3 pt-2 border-t border-border">
            <label className="block text-sm font-bold text-foreground">
              URL Avatar (GIF) o Video (YouTube / MP4)
            </label>
            <input type="url" value={editForm.video_url || ""}
              onChange={e => setEditForm({ ...editForm, video_url: e.target.value })}
              placeholder="Ej: /exercises/videos/0001-2gPfomN.gif o https://youtube.com/..."
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
            />
            <p className="text-xs text-muted-foreground">
              Podés ingresar un GIF/imagen para animación avatar o una URL de YouTube/MP4.
            </p>

            {/* Previsualización en tiempo real en Modo Edición */}
            <div className="mt-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2">Previsualización en vivo:</p>
              {(() => {
                const media = getMediaDetails(editForm.video_url);
                if (media.type === "image") {
                  return (
                    <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-square max-h-64 mx-auto flex items-center justify-center shadow-xl">
                      <img src={media.url} alt={editForm.name} className="w-full h-full object-contain p-2" />
                      <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-white font-extrabold flex items-center gap-1.5 border border-slate-700/60 shadow-md">
                        <Sparkles className="w-3 h-3 text-emerald-400 fill-emerald-400/30" />
                        Avatar GIF en bucle
                      </div>
                    </div>
                  );
                }
                if (media.type === "youtube") {
                  return (
                    <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl aspect-video max-w-md mx-auto">
                      <iframe src={media.embedUrl} title="Video YouTube" className="w-full h-full border-0" allowFullScreen />
                    </div>
                  );
                }
                if (media.type === "video") {
                  return (
                    <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl max-h-64 max-w-md mx-auto flex items-center justify-center">
                      <video src={media.url} controls autoPlay loop muted className="w-full h-full object-contain max-h-64" />
                    </div>
                  );
                }
                return (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900">
                    Sin preview disponible para este enlace
                  </div>
                );
              })()}
            </div>
          </div>

          {!isCF && (
            <div className="pt-2 border-t border-border">
              <label className="block text-sm font-bold text-foreground mb-1.5">Notas técnicas</label>
              <textarea value={editForm.notes || ""}
                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3} placeholder="Indicaciones técnicas, puntos clave..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm font-medium"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card Principal de Media / Previsualización de Avatar */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className={`w-5 h-5 ${isCF ? "text-orange-600" : "text-emerald-600"}`} />
                <div>
                  <h3 className="font-bold text-foreground text-base">Avatar / Demostración del Ejercicio</h3>
                  <p className="text-xs text-muted-foreground">Animación avatar en bucle o video demostrativo para el alumno</p>
                </div>
              </div>
              {!editingMedia && (
                <button
                  onClick={() => { setMediaInput(exercise.video_url || ""); setEditingMedia(true); }}
                  className="px-3.5 py-2 rounded-xl border border-border text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  <Edit2 className="w-3.5 h-3.5 text-primary" />
                  {exercise.video_url ? "Cambiar GIF / Video" : "+ Agregar GIF / Video"}
                </button>
              )}
            </div>

            {/* Visualizador de Media */}
            <div className="mt-2">
              {(() => {
                const currentUrl = editingMedia ? mediaInput : exercise.video_url;
                const media = getMediaDetails(currentUrl);
                
                if (media.type === "image") {
                  return (
                    <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/80 aspect-square max-h-72 mx-auto flex items-center justify-center shadow-xl group">
                      <img
                        src={media.url}
                        alt={exercise.name}
                        className="w-full h-full object-contain p-2"
                      />
                      <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[11px] text-white font-extrabold flex items-center gap-2 border border-slate-700/60 shadow-lg">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                        Animación Avatar (GIF en bucle)
                      </div>
                    </div>
                  );
                }
                if (media.type === "youtube") {
                  return (
                    <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl aspect-video max-w-lg mx-auto">
                      <iframe
                        src={media.embedUrl}
                        title="Video YouTube"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  );
                }
                if (media.type === "video") {
                  return (
                    <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl max-h-72 max-w-lg mx-auto flex items-center justify-center">
                      <video src={media.url} controls autoPlay loop muted className="w-full h-full object-contain max-h-72" />
                    </div>
                  );
                }
                if (media.type === "link") {
                  return (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Video className="w-5 h-5 text-primary shrink-0" />
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{media.url}</span>
                      </div>
                      <a href={media.url} target="_blank" rel="noopener noreferrer" className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition shrink-0 flex items-center gap-1">
                        Abrir Enlace <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  );
                }
                return (
                  <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
                    <Video className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Sin Avatar ni Video asignado</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Podés asignar un GIF animado de avatar o una URL de YouTube para que el alumno pueda previsualizar la técnica.
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Formulario rápido para cambiar el GIF / Video URL */}
            {editingMedia && (
              <div className="pt-4 border-t border-border space-y-3 animate-in fade-in duration-200">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                    URL de GIF / Avatar o Video (YouTube / MP4)
                  </label>
                  <input
                    type="url"
                    value={mediaInput}
                    onChange={e => setMediaInput(e.target.value)}
                    placeholder="Ej: /exercises/videos/0001-2gPfomN.gif o https://youtube.com/..."
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Acepta GIFs animados (Avatars), enlaces de YouTube o archivos de video MP4.
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingMedia(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-border text-xs font-bold text-slate-700 hover:bg-muted transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuickMedia}
                    disabled={savingMedia}
                    className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                  >
                    {savingMedia ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Guardar GIF / Video
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notas técnicas */}
          {exercise.notes && (
            <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className={`w-4 h-4 ${isCF ? "text-orange-600" : "text-primary"}`} />
                <h3 className="font-bold text-foreground text-sm">Notas técnicas</h3>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">{exercise.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Variantes */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-5">
        <div>
          <h2 className="font-bold text-foreground text-lg">Variantes</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {variants.length === 0
              ? "Sin variantes. Al planificar se usará el ejercicio base."
              : `${variants.length} variante${variants.length > 1 ? "s" : ""}. Podés agregar un video o GIF a cada una.`}
          </p>
        </div>

        {/* Variantes comunes (100% legibles con alto contraste) */}
        {commonVariants.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                AGREGAR VARIANTE COMÚN:
              </p>
              <Link href="/entrenador/configuracion" className={`text-xs font-bold hover:underline ${isCF ? "text-orange-600" : "text-primary"}`}>
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
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border ${
                      alreadyAdded
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 cursor-default opacity-70"
                        : "bg-slate-100 text-slate-800 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-400 active:scale-95 shadow-xs"
                    } disabled:cursor-not-allowed`}>
                    {alreadyAdded ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Plus className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
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
            <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wide">
              Videos por variante — pegá el URL y presioná Enter para guardar:
            </p>
            <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
              {variants.map(v => {
                const videoVal = variantVideos[v.id] ?? "";
                const isSaving = savingVideo === v.id;
                const hasVideo = !!v.video_url;
                return (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
                    {/* Nombre */}
                    <span className={`font-black text-sm w-24 shrink-0 ${isCF ? "text-orange-600" : "text-primary"}`}>{v.name}</span>

                    {/* Input URL */}
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <input
                        type="url"
                        value={videoVal}
                        onChange={e => setVariantVideos(prev => ({ ...prev, [v.id]: e.target.value }))}
                        onBlur={() => saveVariantVideo(v.id)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveVariantVideo(v.id); (e.target as HTMLInputElement).blur(); } }}
                        placeholder="URL de GIF / YouTube / Video..."
                        className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-border bg-white text-sm font-semibold text-slate-900 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
                      {!isSaving && hasVideo && (
                        <a href={v.video_url!} target="_blank" rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-500 shrink-0 p-1 font-bold flex items-center gap-1 text-xs" title="Ver video">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {/* Eliminar variante */}
                    <button type="button" onClick={() => removeVariant(v.id)}
                      className="text-slate-400 hover:text-destructive transition-colors shrink-0 p-1">
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
            className={`flex-1 px-4 py-2.5 rounded-xl border border-border bg-white text-slate-900 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-${isCF ? "orange-500" : "primary"} text-sm`}
          />
          <button type="button" onClick={() => addVariant(newVariant)} disabled={loading}
            className={`px-4 py-2.5 rounded-xl bg-muted hover:bg-${isCF ? "orange-600" : "primary"} hover:text-white font-medium text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
