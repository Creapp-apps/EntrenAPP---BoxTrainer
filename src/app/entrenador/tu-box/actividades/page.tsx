"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Pencil, X, Check, Palette, Loader2 } from "lucide-react";

const PRESET_COLORS = [
  "#3b82f6", "#ea580c", "#16a34a", "#8b5cf6",
  "#ec4899", "#f59e0b", "#06b6d4", "#ef4444",
];

type Activity = {
  id: string;
  name: string;
  color: string;
  active: boolean;
};

export default function ActividadesPage() {
  const supabase = createClient();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", color: "#3b82f6" });
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("box_activities")
      .select("*")
      .eq("trainer_id", user!.id)
      .order("created_at");
    setActivities((data || []) as Activity[]);
    setLoading(false);
  }

  async function create() {
    if (!form.name.trim()) { toast.error("Ingresá un nombre"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("box_activities").insert({
      trainer_id: user!.id,
      name: form.name.trim(),
      color: form.color,
    });
    if (error) toast.error(error.message.includes("duplicate") ? "Ya existe esa actividad" : error.message);
    else { toast.success(`"${form.name}" creada`); setShowNew(false); setForm({ name: "", color: "#3b82f6" }); load(); }
    setSaving(false);
  }

  async function update(id: string) {
    if (!form.name.trim()) { toast.error("Ingresá un nombre"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("box_activities")
      .update({ name: form.name.trim(), color: form.color })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Actualizada"); setEditId(null); load(); }
    setSaving(false);
  }

  async function remove(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"? Los slots con esta actividad quedarán sin tipo.`)) return;
    const { error } = await supabase.from("box_activities").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Eliminada"); load(); }
  }

  function startEdit(a: Activity) {
    setEditId(a.id);
    setForm({ name: a.name, color: a.color });
    setShowNew(false);
  }

  function cancel() {
    setEditId(null);
    setShowNew(false);
    setForm({ name: "", color: "#3b82f6" });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/entrenador/tu-box" className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Actividades</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tipos de clase que se dictan en tu box
            </p>
          </div>
        </div>
        <button onClick={() => { setShowNew(true); setEditId(null); setForm({ name: "", color: "#3b82f6" }); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition">
          <Plus className="w-4 h-4" /> Nueva
        </button>
      </div>

      {/* New activity form */}
      {showNew && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-primary/20 space-y-4">
          <h3 className="font-semibold text-foreground">Nueva actividad</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Nombre</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Yoga, Spinning..."
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Color</label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })}
                    className={`w-8 h-8 rounded-full transition-all ${form.color === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-105"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={saving}
              className="flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {saving ? "Guardando..." : "Crear"}
            </button>
            <button onClick={cancel} className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
          </div>
        </div>
      )}

      {/* Activities list */}
      {activities.length > 0 ? (
        <div className="space-y-2">
          {activities.map(a => (
            <div key={a.id} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
              {editId === a.id ? (
                <div className="p-5 space-y-4 bg-primary/5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">Nombre</label>
                      <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">Color</label>
                      <div className="flex items-center gap-2">
                        {PRESET_COLORS.map(c => (
                          <button key={c} onClick={() => setForm({ ...form, color: c })}
                            className={`w-7 h-7 rounded-full transition-all ${form.color === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-105"}`}
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => update(a.id)} disabled={saving}
                      className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
                      <Check className="w-3.5 h-3.5" /> {saving ? "Guardando..." : "Guardar"}
                    </button>
                    <button onClick={cancel} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted">
                      <X className="w-3.5 h-3.5" /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 px-5 py-4 group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: a.color + "20" }}>
                    <Palette className="w-5 h-5" style={{ color: a.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{a.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }} />
                      <span className="text-xs text-muted-foreground">{a.color}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(a)}
                      className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(a.id, a.name)}
                      className="p-2 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-border">
          <Palette className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Sin actividades</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Creá actividades para organizar los turnos de tu box.
          </p>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <div className="shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <Palette className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-blue-900">¿Para qué sirven las actividades?</p>
          <p className="text-sm text-blue-700 mt-0.5">
            Cada turno que creás en <strong>Horarios</strong> se asigna a una actividad. Los alumnos solo ven los turnos de las actividades que cubre su plan.
          </p>
        </div>
      </div>
    </div>
  );
}
