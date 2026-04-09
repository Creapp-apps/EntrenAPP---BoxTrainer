"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Ticket,
  Plus,
  RefreshCw,
  X,
  Check,
  CalendarCheck,
} from "lucide-react";
import type { Plan, StudentPlanSubscription, StudentModality } from "@/types";

const MODALITY_LABELS: Record<string, string> = {
  presencial: "Presencial",
  a_distancia: "A distancia",
  mixto: "Mixto",
};

const MODALITY_COLORS: Record<string, string> = {
  presencial: "bg-blue-100 text-blue-700",
  a_distancia: "bg-amber-100 text-amber-700",
  mixto: "bg-purple-100 text-purple-700",
};

export default function StudentPlanCard({ studentId, modality }: { studentId: string; modality?: string }) {
  const [subscription, setSubscription] = useState<any | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [saving, setSaving] = useState(false);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [subRes, plansRes, bookingsRes] = await Promise.all([
      supabase.from("student_plan_subscriptions")
        .select("*, plans(name, modality, sessions_per_week, price)")
        .eq("student_id", studentId)
        .eq("status", "activo")
        .order("period_start", { ascending: false })
        .limit(1),
      supabase.from("plans")
        .select("*")
        
        .eq("active", true)
        .order("name"),
      supabase.from("bookings")
        .select("*, box_schedule_slots(label, start_time, end_time)")
        .eq("student_id", studentId)
        .eq("status", "confirmada")
        .gte("booking_date", new Date().toISOString().split("T")[0])
        .order("booking_date")
        .limit(3),
    ]);

    setSubscription(subRes.data?.[0] || null);
    setPlans((plansRes.data || []) as Plan[]);
    setRecentBookings(bookingsRes.data || []);
    setLoading(false);
  }

  async function assignPlan() {
    if (!selectedPlanId) {
      toast.error("Seleccioná un plan");
      return;
    }
    setSaving(true);
    const supabase = createClient();

    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan) return;

    // Calculate period_end: billing_weeks weeks from now
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + plan.billing_weeks * 7);

    const { error } = await supabase.from("student_plan_subscriptions").insert({
      student_id: studentId,
      plan_id: selectedPlanId,
      period_start: periodStart.toISOString().split("T")[0],
      period_end: periodEnd.toISOString().split("T")[0],
      credits_total: plan.total_credits,
      credits_used: 0,
      status: "activo",
    });

    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success(`Plan "${plan.name}" asignado correctamente`);
      setShowAssign(false);
      setSelectedPlanId("");
      loadData();
    }
    setSaving(false);
  }

  async function pauseSubscription() {
    if (!subscription) return;
    if (!confirm("¿Pausar la suscripción? El alumno no podrá reservar turnos.")) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("student_plan_subscriptions")
      .update({ status: "pausado" })
      .eq("id", subscription.id);
    if (error) toast.error("Error: " + error.message);
    else {
      toast.success("Suscripción pausada");
      loadData();
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
        <div className="h-4 w-32 bg-muted animate-pulse rounded mb-3" />
        <div className="h-20 bg-muted/50 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-5 space-y-4">
      {/* Header with modality badge */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Ticket className="w-4 h-4 text-primary" />
          Plan & Créditos
        </h2>
        {modality && (
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${MODALITY_COLORS[modality] || "bg-gray-100 text-gray-600"}`}>
            {MODALITY_LABELS[modality] || modality}
          </span>
        )}
      </div>

      {subscription ? (
        <>
          {/* Active subscription */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-foreground text-sm">{subscription.plans?.name}</p>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Activo</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Créditos restantes</p>
                <p className="text-2xl font-bold text-foreground">
                  {subscription.credits_total - subscription.credits_used}
                  <span className="text-sm font-normal text-muted-foreground">/{subscription.credits_total}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Vence</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(subscription.period_end).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3 bg-white/50 rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{
                  width: `${((subscription.credits_total - subscription.credits_used) / subscription.credits_total) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAssign(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Renovar plan
            </button>
            <button
              onClick={pauseSubscription}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-red-600 ml-auto"
            >
              Pausar
            </button>
          </div>
        </>
      ) : (
        /* No active plan */
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">Sin plan activo</p>
          <button
            onClick={() => setShowAssign(true)}
            className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" />
            Asignar plan
          </button>
        </div>
      )}

      {/* Assign plan form */}
      {showAssign && (
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {subscription ? "Renovar" : "Asignar"} plan
          </p>
          <select
            value={selectedPlanId}
            onChange={e => setSelectedPlanId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          >
            <option value="">Seleccionar plan...</option>
            {plans.map(plan => (
              <option key={plan.id} value={plan.id}>
                {plan.name} — {plan.sessions_per_week}x/sem · {plan.total_credits} créditos · ${plan.price}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={assignPlan}
              disabled={saving || !selectedPlanId}
              className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-primary/90 transition disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? "Asignando..." : "Confirmar"}
            </button>
            <button
              onClick={() => { setShowAssign(false); setSelectedPlanId(""); }}
              className="px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Upcoming bookings */}
      {recentBookings.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Próximos turnos</p>
          <div className="space-y-1.5">
            {recentBookings.map((b: any) => (
              <div key={b.id} className="flex items-center gap-2 text-sm">
                <CalendarCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-foreground">
                  {new Date(b.booking_date + "T00:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
                </span>
                <span className="text-muted-foreground text-xs">
                  {b.box_schedule_slots?.start_time?.slice(0, 5)} · {b.box_schedule_slots?.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
