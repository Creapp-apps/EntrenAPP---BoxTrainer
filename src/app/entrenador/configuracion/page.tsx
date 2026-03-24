"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, X, Settings, RotateCcw, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_VARIANTS = [
  "S1", "S2", "S3", "S4",
  "Colgado", "2do Tiempo", "Fuerza", "Pausa",
  "Jerk", "Dip", "Box", "Isométrico", "Excéntrico",
];

// Grupos de sugerencias para agregar rápido
const SUGGESTIONS = [
  { label: "Series de posición", items: ["S1", "S2", "S3", "S4"] },
  { label: "Olímpico", items: ["Colgado", "2do Tiempo", "Jerk", "Dip", "Fuerza"] },
  { label: "Modificadores", items: ["Pausa", "Box", "Isométrico", "Excéntrico", "Tempo", "Touch & Go"] },
  { label: "Halterofilia", items: ["Split", "Squat Jerk", "Power", "Block", "Hang Low", "Hang High"] },
];

export default function ConfiguracionPage() {
  const supabase = createClient();
  const [variants, setVariants] = useState<string[]>([]);
  const [newVariant, setNewVariant] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Intentar obtener settings; si no existen, usar defaults
    const { data, error } = await supabase
      .from("trainer_settings")
      .select("common_variants")
      .eq("trainer_id", user!.id)
      .single();

    if (error || !data) {
      // No existe aún — usar defaults en memoria, se guardarán al primer cambio
      setVariants(DEFAULT_VARIANTS);
    } else {
      setVariants(data.common_variants || DEFAULT_VARIANTS);
    }
    setLoading(false);
  }

  async function saveVariants(newList: string[]) {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("trainer_settings")
      .upsert(
        { trainer_id: user!.id, common_variants: newList, updated_at: new Date().toISOString() },
        { onConflict: "trainer_id" }
      );

    if (error) {
      toast.error("Error al guardar: " + error.message);
    }
    setSaving(false);
  }

  function addVariant(name: string) {
    const trimmed = name.trim().toUpperCase();
    if (!trimmed) return;
    if (variants.includes(trimmed)) {
      toast.error("Esa variante ya está en la lista");
      return;
    }
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
    if (toAdd.length === 0) {
      toast.error("Todas esas variantes ya están en la lista");
      return;
    }
    const updated = [...variants, ...toAdd];
    setVariants(updated);
    saveVariants(updated);
    toast.success(`${toAdd.length} variante${toAdd.length > 1 ? "s" : ""} agregada${toAdd.length > 1 ? "s" : ""}`);
  }

  function restoreDefaults() {
    if (!confirm("¿Restaurar las variantes a los valores por defecto? Se perderán las que hayas agregado.")) return;
    setVariants(DEFAULT_VARIANTS);
    saveVariants(DEFAULT_VARIANTS);
    toast.success("Variantes restauradas a valores por defecto");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

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
          {!saving && variants.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <Check className="w-3.5 h-3.5" /> Guardado
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground ml-13">
          Los cambios se guardan automáticamente.
        </p>
      </div>

      {/* Variantes comunes */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-foreground">Variantes comunes</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Estas variantes aparecen como acceso rápido en todos los ejercicios cuando planificás ciclos. Podés agregar o eliminar las que quieras.
            </p>
          </div>
          <button
            onClick={restoreDefaults}
            className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1.5 transition-colors"
            title="Restaurar valores por defecto"
          >
            <RotateCcw className="w-3 h-3" />
            Restaurar
          </button>
        </div>

        {/* Chips actuales */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Tus variantes ({variants.length})
          </p>
          {variants.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Sin variantes. Agregá algunas abajo.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {variants.map(v => (
                <span
                  key={v}
                  className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-semibold"
                >
                  {v}
                  <button
                    type="button"
                    onClick={() => removeVariant(v)}
                    className="hover:text-red-500 transition-colors"
                    title={`Eliminar "${v}"`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Input para agregar variante personalizada */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Agregar variante personalizada
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newVariant}
              onChange={e => setNewVariant(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") { e.preventDefault(); addVariant(newVariant); }
              }}
              placeholder="Ej: SUSPENDIDO, HANG LOW, TOUCH & GO..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            <button
              type="button"
              onClick={() => addVariant(newVariant)}
              disabled={!newVariant.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>
        </div>

        {/* Sugerencias por grupo */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Agregar grupo de sugerencias
          </p>
          <div className="space-y-2">
            {SUGGESTIONS.map(group => (
              <div key={group.label} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{group.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {group.items.join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addSuggestions(group.items)}
                  className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar todo
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
            Cuando entrás a un ejercicio podés agregar estas variantes con un solo clic. Así al planificar podés seleccionar <strong>ARRANQUE → S1</strong> o <strong>ARRANQUE → Colgado</strong> sin tener que crearlos como ejercicios separados.
          </p>
        </div>
      </div>
    </div>
  );
}
