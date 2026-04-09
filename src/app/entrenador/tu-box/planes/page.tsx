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
  const [saving, setSaving] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [form, setForm] = useState({
    name: "",
    modality: "presencial" as StudentModality,
    sessions_per_week: 2,
    billing_weeks: 5,
    price: 0,
    allowed_activities: [] as string[],
  });

  useEffect(() => { loadPlans(); }, []);

  async function loadPlans() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [plansRes, actRes] = await Promise.all([
      supabase.from("plans").select("*").order("created_at", { ascending: false }),
      supabase.from("box_activities").select("id, name, color").eq("active", true).order("name"),
    ]);
    setPlans((plansRes.data || []) as Plan[]);
    setActivities((actRes.data || []) as Activity[]);
    setLoading(false);
  }

  async function createPlan() {
    if (!form.name.trim()) {
      toast.error("Ingresá un nombre para el plan");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("plans").insert({
      trainer_id: user.id,
      name: form.name,
      modality: form.modality,
      sessions_per_week: form.sessions_per_week,
      billing_weeks: form.billing_weeks,
      price: form.price,
      allowed_activities: form.allowed_activities,
    });

    if (error) {
      toast.error("Error al crear plan: " + error.message);
    } else {
      toast.success("Plan creado exitosamente");
      setShowNew(false);
      setForm({ name: "", modality: "presencial", sessions_per_week: 2, billing_weeks: 5, price: 0, allowed_activities: [] });
      loadPlans();
    }
    setSaving(false);
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
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition"
        >
          <Plus className="w-4 h-4" />
          Nuevo plan
        </button>
      </div>

      {/* Form nuevo plan */}
      {showNew && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-primary/20">
          <h3 className="font-semibold text-foreground mb-4">Crear plan</h3>
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
              onClick={createPlan}
              disabled={saving}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Crear plan"}
            </button>
            <button
              onClick={() => setShowNew(false)}
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
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl p-5 shadow-sm border border-border transition-opacity ${!plan.active ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${MODALITY_COLORS[plan.modality]}`}>
                    {MODALITY_LABELS[plan.modality]}
                  </span>
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => togglePlan(plan.id, plan.active)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      plan.active
                        ? "text-green-600 hover:bg-green-50"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    title={plan.active ? "Desactivar" : "Activar"}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deletePlan(plan.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-foreground">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {plan.sessions_per_week}x/semana · {plan.billing_weeks} semanas
              </p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Créditos</p>
                  <p className="font-bold text-foreground">{plan.total_credits}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Precio</p>
                  <p className="font-bold text-foreground">${plan.price.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
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
