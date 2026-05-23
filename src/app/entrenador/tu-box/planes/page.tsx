"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Ticket,
  Power,
  Users,
  Check,
  Pencil,
} from "lucide-react";
import type { Plan, StudentModality } from "@/types";

type Activity = { id: string; name: string; color: string };

const MODALITY_LABELS: Record<StudentModality, string> = {
  presencial: "Presencial",
  a_distancia: "A distancia",
  mixto: "Mixto",
};

const MODALITY_COLORS: Record<StudentModality, string> = {
  presencial: "bg-blue-100 text-blue-700",
  a_distancia: "bg-amber-100 text-amber-700",
  mixto: "bg-purple-100 text-purple-700",
};

export default function PlanesPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [boxId, setBoxId] = useState<string | null>(null);
  const [brandingConfig, setBrandingConfig] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    modality: "presencial" as StudentModality,
    sessions_per_week: 2,
    billing_weeks: 5,
    price: 0,
    allowed_activities: [] as string[],
    description: "",
    show_on_landing: false,
  });

  useEffect(() => { loadPlans(); }, []);

  async function loadPlans() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [plansRes, actRes, userRes] = await Promise.all([
      supabase.from("plans").select("*").order("created_at", { ascending: false }),
      supabase.from("box_activities").select("id, name, color").eq("active", true).order("name"),
      supabase.from("users").select("box_id").eq("id", user.id).single(),
    ]);

    let bId = userRes.data?.box_id || null;
    if (!bId) {
      // Fallback: Check if the user is an owner of a box
      const { data: ownedBox } = await supabase.from("boxes").select("id").eq("owner_id", user.id).single();
      if (ownedBox) bId = ownedBox.id;
    }
    setBoxId(bId);

    if (bId) {
      const { data: boxRes } = await supabase.from("boxes").select("branding_config").eq("id", bId).single();
      setBrandingConfig(boxRes?.branding_config || {});
    }

    setPlans((plansRes.data || []) as Plan[]);
    setActivities((actRes.data || []) as Activity[]);
    setLoading(false);
  }

  async function savePlan() {
    if (!form.name.trim()) {
      toast.error("Ingresá un nombre para el plan");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const isEdit = !!editingPlan;
    let savedPlanId = editingPlan?.id || null;

    // Try to save with landing page columns first
    let payload: any = {
      name: form.name,
      modality: form.modality,
      sessions_per_week: form.sessions_per_week,
      billing_weeks: form.billing_weeks,
      price: form.price,
      allowed_activities: form.allowed_activities,
      description: form.description,
      show_on_landing: form.show_on_landing,
    };

    if (!isEdit) {
      payload.trainer_id = user.id;
    }

    let error: any = null;

    if (isEdit) {
      const res = await supabase.from("plans").update(payload).eq("id", editingPlan.id);
      error = res.error;
    } else {
      const res = await supabase.from("plans").insert(payload).select("id").single();
      error = res.error;
      if (!error && res.data) {
        savedPlanId = res.data.id;
      }
    }

    // Fallback if columns are not present in the DB yet (PostgreSQL error code 42703 is undefined_column)
    if (error && (error.code === "42703" || error.message?.includes("column"))) {
      console.log("Database schema missing landing fields. Retrying without description/show_on_landing...");
      delete payload.description;
      delete payload.show_on_landing;

      let retryRes: any;
      if (isEdit) {
        retryRes = await supabase.from("plans").update(payload).eq("id", editingPlan.id);
        error = retryRes.error;
      } else {
        retryRes = await supabase.from("plans").insert(payload).select("id").single();
        error = retryRes.error;
        if (!error && retryRes.data) {
          savedPlanId = retryRes.data.id;
        }
      }
    }

    if (error) {
      toast.error("Error al guardar plan: " + error.message);
    } else {
      // Save landing settings metadata to boxes.branding_config as a bulletproof double-layered store!
      if (savedPlanId && boxId) {
        const newMetadata = {
          ...(brandingConfig?.plans_landing_metadata || {}),
          [savedPlanId]: {
            description: form.description,
            show_on_landing: form.show_on_landing,
          }
        };

        const newBrandingConfig = {
          ...(brandingConfig || {}),
          plans_landing_metadata: newMetadata
        };

        const { error: boxError } = await supabase
          .from("boxes")
          .update({ branding_config: newBrandingConfig })
          .eq("id", boxId);

        if (boxError) {
          console.error("Failed to update branding_config plans_landing_metadata:", boxError);
        } else {
          setBrandingConfig(newBrandingConfig);
        }
      }

      toast.success(isEdit ? "Plan actualizado exitosamente" : "Plan creado exitosamente");
      setShowNew(false);
      setEditingPlan(null);
      setForm({ 
        name: "", 
        modality: "presencial", 
        sessions_per_week: 2, 
        billing_weeks: 5, 
        price: 0, 
        allowed_activities: [],
        description: "",
        show_on_landing: false
      });
      loadPlans();
    }
    setSaving(false);
  }

  function startEdit(plan: Plan) {
    setEditingPlan(plan);
    const planMetadata = brandingConfig?.plans_landing_metadata?.[plan.id] || {};
    setForm({
      name: plan.name,
      modality: plan.modality,
      sessions_per_week: plan.sessions_per_week,
      billing_weeks: plan.billing_weeks,
      price: plan.price,
      allowed_activities: (plan as any).allowed_activities || [],
      description: planMetadata.description || (plan as any).description || "",
      show_on_landing: planMetadata.show_on_landing !== undefined ? !!planMetadata.show_on_landing : !!(plan as any).show_on_landing,
    });
    setShowNew(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function togglePlan(id: string, active: boolean) {
    const supabase = createClient();
    const { error } = await supabase.from("plans").update({ active: !active }).eq("id", id);
    if (error) {
      toast.error("Error al actualizar");
    } else {
      toast.success(active ? "Plan desactivado" : "Plan activado");
      loadPlans();
    }
  }

  async function deletePlan(id: string) {
    if (!confirm("¿Eliminar este plan? Los alumnos asignados perderán su suscripción.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar");
    } else {
      // Clean up metadata from branding_config on plan deletion
      if (boxId) {
        const newMetadata = { ...(brandingConfig?.plans_landing_metadata || {}) };
        delete newMetadata[id];
        
        const newBrandingConfig = {
          ...(brandingConfig || {}),
          plans_landing_metadata: newMetadata
        };

        const { error: boxError } = await supabase
          .from("boxes")
          .update({ branding_config: newBrandingConfig })
          .eq("id", boxId);

        if (boxError) {
          console.error("Failed to clean up branding_config metadata on plan deletion:", boxError);
        } else {
          setBrandingConfig(newBrandingConfig);
        }
      }

      toast.success("Plan eliminado");
      loadPlans();
    }
  }

  const totalCredits = form.sessions_per_week * form.billing_weeks;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-40 bg-white rounded-2xl animate-pulse border border-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/entrenador/tu-box"
            className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Planes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Creá y gestioná los planes de tu box
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingPlan(null);
            setForm({ 
              name: "", 
              modality: "presencial", 
              sessions_per_week: 2, 
              billing_weeks: 5, 
              price: 0, 
              allowed_activities: [],
              description: "",
              show_on_landing: false
            });
            setShowNew(!showNew);
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition"
        >
          <Plus className="w-4 h-4" />
          Nuevo plan
        </button>
      </div>

      {/* Form nuevo / editar plan */}
      {showNew && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-primary/20">
          <h3 className="font-semibold text-foreground mb-4">
            {editingPlan ? `Editar plan: ${editingPlan.name}` : "Crear plan"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Nombre del plan</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Plan 2x semana"
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Modalidad</label>
              <select
                value={form.modality}
                onChange={e => setForm({ ...form, modality: e.target.value as StudentModality })}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="presencial">Presencial</option>
                <option value="a_distancia">A distancia</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Sesiones por semana</label>
              <input
                type="number"
                min="1"
                max="7"
                value={form.sessions_per_week}
                onChange={e => setForm({ ...form, sessions_per_week: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Semanas de facturación</label>
              <input
                type="number"
                min="1"
                max="8"
                value={form.billing_weeks}
                onChange={e => setForm({ ...form, billing_weeks: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Precio ($)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={form.price}
                onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Actividades permitidas */}
          {activities.length > 0 && (
            <div className="mt-4">
              <label className="text-xs font-medium text-muted-foreground block mb-2">Actividades que cubre este plan</label>
              <div className="flex flex-wrap gap-2">
                {activities.map(a => {
                  const selected = form.allowed_activities.includes(a.id);
                  return (
                    <button key={a.id} type="button"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        allowed_activities: selected
                          ? prev.allowed_activities.filter(x => x !== a.id)
                          : [...prev.allowed_activities, a.id]
                      }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                        selected ? "border-transparent shadow-sm" : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                      style={selected ? { backgroundColor: a.color + '20', color: a.color, borderColor: a.color + '40' } : {}}
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }} />
                      {a.name}
                      {selected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Configuración de Landing Page */}
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configuración de Landing Page pública</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Mini descripción del plan (se mostrará en la landing)
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Ej: Acceso ilimitado a todas nuestras clases presenciales con coach dedicado."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                />
              </div>
              <div className="flex flex-col justify-center h-full pt-1">
                <label className="text-xs font-medium text-muted-foreground block mb-2">Visibilidad en la Landing</label>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, show_on_landing: !prev.show_on_landing }))}
                  className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    form.show_on_landing 
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm"
                      : "bg-white border-border text-muted-foreground hover:border-primary/20"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${form.show_on_landing ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
                    Mostrar en la landing
                  </span>
                  {form.show_on_landing && <Check className="w-4 h-4 shrink-0" />}
                </button>
              </div>
            </div>
          </div>

          {/* Preview de créditos */}
          <div className="mt-4 p-3 bg-muted/50 rounded-xl">
            <p className="text-sm text-muted-foreground">
              Este plan otorga <span className="font-bold text-foreground">{totalCredits} créditos</span> por período
              ({form.sessions_per_week} sesiones × {form.billing_weeks} semanas)
              {form.allowed_activities.length > 0 && (
                <> · válido para {form.allowed_activities.length} actividad{form.allowed_activities.length > 1 ? "es" : ""}</>
              )}
            </p>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={savePlan}
              disabled={saving}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
            >
              {saving ? "Guardando..." : editingPlan ? "Guardar cambios" : "Crear plan"}
            </button>
            <button
              onClick={() => {
                setShowNew(false);
                setEditingPlan(null);
                setForm({ 
                  name: "", 
                  modality: "presencial", 
                  sessions_per_week: 2, 
                  billing_weeks: 5, 
                  price: 0, 
                  allowed_activities: [],
                  description: "",
                  show_on_landing: false
                });
              }}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de planes */}
      {plans.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => {
            const planMetadata = brandingConfig?.plans_landing_metadata?.[plan.id] || {};
            const isPlanShowOnLanding = planMetadata.show_on_landing !== undefined ? planMetadata.show_on_landing : !!(plan as any).show_on_landing;
            const planDescription = planMetadata.description || (plan as any).description || "";

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl p-5 shadow-sm border border-border transition-opacity flex flex-col justify-between ${!plan.active ? "opacity-50" : ""}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${MODALITY_COLORS[plan.modality]}`}>
                        {MODALITY_LABELS[plan.modality]}
                      </span>
                      {isPlanShowOnLanding && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/50 flex items-center gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Landing
                        </span>
                      )}
                      {((plan as any).allowed_activities || []).map((aId: string) => {
                        const act = activities.find(a => a.id === aId);
                        return act ? (
                          <span key={aId} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: act.color + '20', color: act.color }}>
                            {act.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => startEdit(plan)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => togglePlan(plan.id, plan.active)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          plan.active
                            ? "text-green-600 hover:bg-green-50"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                        title={plan.active ? "Desactivar" : "Activar"}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deletePlan(plan.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.sessions_per_week}x/semana · {plan.billing_weeks} semanas
                  </p>
                  {planDescription && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 bg-muted/20 p-2 rounded-lg italic">
                      "{planDescription}"
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Créditos</p>
                    <p className="font-bold text-foreground">{(plan as any).total_credits}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Precio</p>
                    <p className="font-bold text-foreground">${plan.price.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-border">
          <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Sin planes creados</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Creá planes con créditos para que tus alumnos puedan reservar turnos.
          </p>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" />
            Crear primer plan
          </button>
        </div>
      )}
    </div>
  );
}
