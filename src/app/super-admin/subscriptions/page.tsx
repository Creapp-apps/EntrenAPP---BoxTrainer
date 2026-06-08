"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Pencil, Trash2, Save, Plus, Tag, CreditCard, Package, Percent } from "lucide-react";

type Sub = {
  id: string;
  box_id: string;
  box_name: string;
  owner_name: string;
  plan_name: string;
  price: number;
  currency: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
};

type PlanRow = {
  id: string;
  name: string;
  max_students: number;
  max_professors: number;
  max_activities: number;
  suggested_price: number;
  sort_order: number;
};

type DiscountCode = {
  id: string;
  code: string;
  discount_percent: number;
  discount_fixed: number;
  valid_until: string | null;
  max_uses: number;
  times_used: number;
  box_id: string | null;
  box_name?: string;
  active: boolean;
};

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string; border: string }> = {
  active: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "Activo" },
  trial: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", label: "Trial" },
  past_due: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: "Moroso" },
  suspended: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", label: "Suspendido" },
  cancelled: { bg: "bg-white/5", text: "text-white/40", border: "border-white/10", label: "Cancelado" },
};

const DEFAULT_PLANS: PlanRow[] = [
  { id: "plan_50", name: "Plan 50", max_students: 50, max_professors: 2, max_activities: 3, suggested_price: 45000, sort_order: 1 },
  { id: "plan_100", name: "Plan 100", max_students: 100, max_professors: 4, max_activities: 6, suggested_price: 75000, sort_order: 2 },
  { id: "plan_150", name: "Plan 150", max_students: 150, max_professors: 6, max_activities: 9, suggested_price: 95000, sort_order: 3 },
  { id: "premium", name: "Premium", max_students: 9999, max_professors: 9999, max_activities: 9999, suggested_price: 150000, sort_order: 4 },
];

const TABS = [
  { id: "subs", label: "Suscripciones", icon: CreditCard },
  { id: "plans", label: "Planes", icon: Package },
  { id: "codes", label: "Codigos", icon: Tag },
];

const INPUT_CLS = "w-full bg-black/40 border border-white/5 text-white placeholder:text-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner";

export default function SubscriptionsPage() {
  const supabase = createClient();
  const [tab, setTab] = useState("subs");

  const [subs, setSubs] = useState<Sub[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [filter, setFilter] = useState("all");

  const [plans, setPlans] = useState<PlanRow[]>(DEFAULT_PLANS);
  const [editingPlan, setEditingPlan] = useState<PlanRow | null>(null);
  const [planForm, setPlanForm] = useState({ name: "", max_students: 0, max_professors: 0, max_activities: 0, suggested_price: 0 });

  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [showNewCode, setShowNewCode] = useState(false);
  const [codeForm, setCodeForm] = useState({ code: "", discount_percent: 0, discount_fixed: 0, valid_until: "", max_uses: 0, box_id: "" });
  const [boxes, setBoxes] = useState<{ id: string; name: string }[]>([]);

  const [changingSubPlan, setChangingSubPlan] = useState<string | null>(null);
  const [deletingSub, setDeletingSub] = useState<Sub | null>(null);

  const PLAN_OPTIONS = [
    { id: "plan_50", label: "Plan 50" },
    { id: "plan_100", label: "Plan 100" },
    { id: "plan_150", label: "Plan 150" },
    { id: "premium", label: "Premium" },
  ];

  const PLAN_LIMITS: Record<string, { max_students: number; max_professors: number }> = {
    plan_50: { max_students: 50, max_professors: 2 },
    plan_100: { max_students: 100, max_professors: 4 },
    plan_150: { max_students: 150, max_professors: 6 },
    premium: { max_students: 9999, max_professors: 9999 },
  };

  useEffect(() => { loadSubs(); loadCodes(); loadBoxes(); }, []);

  async function loadSubs() {
    setLoadingSubs(true);
    const { data } = await supabase
      .from("box_subscriptions")
      .select("*, boxes(name, owner_id, users!boxes_owner_id_fkey(full_name))")
      .order("created_at", { ascending: false });
    const mapped = (data || []).map((s: any) => ({
      ...s,
      box_name: s.boxes?.name || "-",
      owner_name: s.boxes?.users?.full_name || "-",
    }));
    setSubs(mapped as Sub[]);
    setLoadingSubs(false);
  }

  async function updateSubStatus(subId: string, newStatus: string) {
    await supabase.from("box_subscriptions").update({ status: newStatus }).eq("id", subId);
    toast.success("Estado actualizado: " + newStatus);
    loadSubs();
  }

  async function renewPeriod(sub: Sub) {
    const newStart = new Date();
    const newEnd = new Date();
    newEnd.setDate(newEnd.getDate() + 30);
    await supabase.from("box_subscriptions").update({
      current_period_start: newStart.toISOString().split("T")[0],
      current_period_end: newEnd.toISOString().split("T")[0],
      status: "active",
    }).eq("id", sub.id);
    toast.success("Renovado hasta " + newEnd.toLocaleDateString("es-AR"));
    loadSubs();
  }

  async function changeSubPlan(sub: Sub, newPlan: string) {
    const limits = PLAN_LIMITS[newPlan] || PLAN_LIMITS.plan_50;
    await supabase.from("boxes").update({ max_students: limits.max_students, max_professors: limits.max_professors }).eq("id", sub.box_id);
    await supabase.from("box_subscriptions").update({ plan_name: newPlan }).eq("id", sub.id);
    toast.success("Plan cambiado a " + newPlan.toUpperCase());
    setChangingSubPlan(null);
    loadSubs();
  }

  async function deleteBoxFromSub() {
    if (!deletingSub) return;
    await supabase.from("box_subscriptions").delete().eq("box_id", deletingSub.box_id);
    await supabase.from("users").update({ box_id: null }).eq("box_id", deletingSub.box_id);
    await supabase.from("boxes").delete().eq("id", deletingSub.box_id);
    toast.success("Box \"" + deletingSub.box_name + "\" eliminado");
    setDeletingSub(null);
    loadSubs();
    loadBoxes();
  }

  async function loadCodes() {
    const { data } = await supabase.from("discount_codes").select("*, boxes(name)").order("created_at", { ascending: false });
    if (data) {
      setCodes(data.map((c: any) => ({ ...c, box_name: c.boxes?.name || null })));
    }
  }

  async function loadBoxes() {
    const { data } = await supabase.from("boxes").select("id, name").order("name");
    if (data) setBoxes(data);
  }

  async function createCode() {
    if (!codeForm.code.trim()) { toast.error("Ingresa un codigo"); return; }
    const { error } = await supabase.from("discount_codes").insert({
      code: codeForm.code.trim().toUpperCase(),
      discount_percent: codeForm.discount_percent || 0,
      discount_fixed: codeForm.discount_fixed || 0,
      valid_until: codeForm.valid_until || null,
      max_uses: codeForm.max_uses || 0,
      box_id: codeForm.box_id || null,
      active: true,
      times_used: 0,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Codigo " + codeForm.code.toUpperCase() + " creado");
    setShowNewCode(false);
    setCodeForm({ code: "", discount_percent: 0, discount_fixed: 0, valid_until: "", max_uses: 0, box_id: "" });
    loadCodes();
  }

  async function toggleCode(id: string, active: boolean) {
    await supabase.from("discount_codes").update({ active: !active }).eq("id", id);
    toast.success(active ? "Desactivado" : "Activado");
    loadCodes();
  }

  async function deleteCode(id: string) {
    await supabase.from("discount_codes").delete().eq("id", id);
    toast.success("Codigo eliminado");
    loadCodes();
  }

  function startEditPlan(plan: PlanRow) {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      max_students: plan.max_students,
      max_professors: plan.max_professors,
      max_activities: plan.max_activities,
      suggested_price: plan.suggested_price,
    });
  }

  function savePlanEdit() {
    if (!editingPlan) return;
    setPlans(plans.map(p => p.id === editingPlan.id ? {
      ...p,
      name: planForm.name,
      max_students: planForm.max_students,
      max_professors: planForm.max_professors,
      max_activities: planForm.max_activities,
      suggested_price: planForm.suggested_price,
    } : p));
    toast.success("Plan " + planForm.name + " actualizado");
    setEditingPlan(null);
  }

  const filtered = filter === "all" ? subs : subs.filter(s => s.status === filter);
  const totalMRR = subs.filter(s => ["active", "past_due"].includes(s.status)).reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Suscripciones</h2>
        <p className="text-sm text-white/40 mt-1">
          {subs.length} suscripciones - MRR: <span className="text-green-400 font-semibold">{"$"}{totalMRR.toLocaleString()}</span>
        </p>
      </div>

      <div className="flex gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-2xl w-fit backdrop-blur-sm shadow-xl">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={"flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all " + (
              tab === t.id ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25" : "text-white/50 hover:text-white hover:bg-white/5"
            )}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "subs" && (
        <>
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "all", label: "Todas" },
              { key: "active", label: "Activas" },
              { key: "trial", label: "Trial" },
              { key: "past_due", label: "Morosas" },
              { key: "suspended", label: "Suspendidas" },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={"text-xs px-4 py-2 rounded-xl font-bold transition-all " + (
                  filter === f.key ? "bg-white/10 text-white border border-white/20 shadow-lg" : "bg-white/5 border border-transparent text-white/40 hover:text-white hover:bg-white/10"
                )}>
                {f.label}
                {f.key !== "all" && <span className="ml-1.5 opacity-60 font-medium">{subs.filter(s => s.status === f.key).length}</span>}
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-white/5 bg-white/[0.01] backdrop-blur-sm overflow-visible shadow-2xl mt-6 pb-24">
            <table className="w-full">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/5">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Box</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Plan</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Precio</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Estado</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Periodo</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingSubs ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-6 bg-white/5 animate-pulse rounded-lg" /></td></tr>
                  ))
                ) : filtered.map(sub => {
                  const badge = STATUS_BADGE[sub.status] || STATUS_BADGE.active;
                  const isOverdue = new Date(sub.current_period_end) < new Date() && sub.status !== "cancelled";
                  return (
                    <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-5">
                        <p className="text-sm font-bold text-white">{sub.box_name}</p>
                        <p className="text-[10px] text-white/40 font-medium mt-0.5 uppercase tracking-wider">{sub.owner_name}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="relative">
                          <button onClick={() => setChangingSubPlan(changingSubPlan === sub.id ? null : sub.id)}
                            className="text-xs text-white/70 uppercase font-medium hover:text-orange-400 transition cursor-pointer">{sub.plan_name}</button>
                          {changingSubPlan === sub.id && (
                            <div className="absolute top-7 left-0 z-20 bg-[#1a1a1d] border border-white/10 rounded-xl p-2 shadow-xl min-w-[160px]">
                              {PLAN_OPTIONS.map(p => (
                                <button key={p.id} onClick={() => changeSubPlan(sub, p.id)}
                                  className={"w-full text-left px-3 py-2 rounded-lg text-sm transition " + (
                                    p.id === sub.plan_name ? "bg-orange-500/20 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                                  )}>{p.label}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="text-sm text-white/80 font-mono">{"$"}{sub.price.toLocaleString()}</span></td>
                      <td className="px-5 py-5">
                        <span className={"text-[10px] px-2.5 py-1 rounded-full font-bold border " + badge.bg + " " + badge.text + " " + badge.border}>{badge.label}</span>
                        {isOverdue && sub.status !== "suspended" && <span className="text-[10px] text-red-400 font-bold ml-2">Vencido</span>}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs text-white/50">
                          {new Date(sub.current_period_start).toLocaleDateString("es-AR")} - {new Date(sub.current_period_end).toLocaleDateString("es-AR")}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button onClick={() => renewPeriod(sub)}
                            className="text-[10px] px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 font-medium transition">Renovar</button>
                          {sub.status !== "suspended" ? (
                            <button onClick={() => updateSubStatus(sub.id, "suspended")}
                              className="text-[10px] px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 font-medium transition">Suspender</button>
                          ) : (
                            <button onClick={() => updateSubStatus(sub.id, "active")}
                              className="text-[10px] px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-medium transition">Reactivar</button>
                          )}
                          <button onClick={() => setDeletingSub(sub)}
                            className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition" title="Eliminar box">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {deletingSub && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setDeletingSub(null)}>
            <div className="bg-[#0a0a0c] rounded-3xl p-8 w-full max-w-sm border border-red-500/20 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-red-500/5 text-red-400">
                  <Trash2 className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">¿Eliminar "{deletingSub.box_name}"?</h3>
                <p className="text-sm text-white/50 mt-3 leading-relaxed">Se eliminara el box, la suscripcion y se desvinculan todos los usuarios. Esta accion no se puede deshacer.</p>
              </div>
              <div className="flex gap-3 mt-8 pt-6 border-t border-white/5">
                <button onClick={() => setDeletingSub(null)}
                  className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-white/50 hover:text-white hover:bg-white/5 transition-colors">Cancelar</button>
                <button onClick={deleteBoxFromSub}
                  className="flex-1 bg-red-600/90 text-white py-3 rounded-xl text-sm font-bold hover:bg-red-500 shadow-lg shadow-red-500/20 hover:-translate-y-0.5 transition-all">Eliminar</button>
              </div>
            </div>
          </div>
        )}
        </>
      )}

      {tab === "plans" && (
        <div className="space-y-4">
          <p className="text-sm text-white/40">Define los planes disponibles para tus boxes.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map(plan => {
              const isEditing = editingPlan?.id === plan.id;
              return (
                <div key={plan.id} className={"rounded-2xl border p-5 transition-all " + (
                  isEditing ? "border-orange-500 bg-orange-500/5" : "border-white/10 bg-white/[0.02]"
                )}>
                  {isEditing ? (
                    <div className="space-y-3">
                      <input value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} className={INPUT_CLS} placeholder="Nombre" />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-white/40 block mb-1">Alumnos</label>
                          <input type="number" value={planForm.max_students} onChange={e => setPlanForm({ ...planForm, max_students: +e.target.value })} className={INPUT_CLS} />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 block mb-1">Profes</label>
                          <input type="number" value={planForm.max_professors} onChange={e => setPlanForm({ ...planForm, max_professors: +e.target.value })} className={INPUT_CLS} />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 block mb-1">Actividades</label>
                          <input type="number" value={planForm.max_activities} onChange={e => setPlanForm({ ...planForm, max_activities: +e.target.value })} className={INPUT_CLS} />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/40 block mb-1">Precio sugerido ($)</label>
                        <input type="number" value={planForm.suggested_price} onChange={e => setPlanForm({ ...planForm, suggested_price: +e.target.value })} className={INPUT_CLS} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={savePlanEdit}
                          className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-xs font-medium hover:bg-orange-400 transition inline-flex items-center justify-center gap-1">
                          <Save className="w-3 h-3" /> Guardar
                        </button>
                        <button onClick={() => setEditingPlan(null)}
                          className="px-3 py-2 rounded-lg text-xs text-white/40 hover:bg-white/5 transition">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-black text-white tracking-tight">{plan.name}</h3>
                        <button onClick={() => startEditPlan(plan)}
                          className="p-2 rounded-xl text-white/30 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-end gap-1 mb-6">
                        <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-400">{"$"}{plan.suggested_price.toLocaleString()}</p>
                        <span className="text-sm text-white/30 font-bold uppercase mb-1.5">/mes</span>
                      </div>
                      <div className="space-y-3 text-sm text-white/60 font-medium">
                        <p className="flex items-center gap-2"><span className="text-emerald-400">✓</span> {plan.max_students >= 9999 ? "Ilimitados" : plan.max_students} alumnos</p>
                        <p className="flex items-center gap-2"><span className="text-emerald-400">✓</span> {plan.max_professors >= 9999 ? "Ilimitados" : plan.max_professors} profesores</p>
                        <p className="flex items-center gap-2"><span className="text-emerald-400">✓</span> {plan.max_activities >= 9999 ? "Ilimitadas" : plan.max_activities} actividades</p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                          {subs.filter(s => s.plan_name === plan.id).length} boxes activos
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "codes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/40">Codigos de descuento para boxes</p>
            <button onClick={() => setShowNewCode(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all">
              <Plus className="w-4 h-4" /> Nuevo codigo
            </button>
          </div>

          <div className="rounded-3xl border border-white/5 bg-white/[0.01] backdrop-blur-sm overflow-hidden shadow-2xl">
            <table className="w-full">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/5">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Codigo</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Descuento</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Box</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Usos</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Vence</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {codes.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-white/30">No hay codigos creados</td></tr>
                ) : codes.map(code => (
                  <tr key={code.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded">{code.code}</span>
                    </td>
                    <td className="px-5 py-4">
                      {code.discount_percent > 0 && <span className="text-sm text-white/80">{code.discount_percent}%</span>}
                      {code.discount_fixed > 0 && <span className="text-sm text-white/80">{"$"}{code.discount_fixed.toLocaleString()}</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-white/50">{code.box_name || "Todos"}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-white/50">{code.times_used}{code.max_uses > 0 ? " / " + code.max_uses : ""}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-white/50">{code.valid_until ? new Date(code.valid_until).toLocaleDateString("es-AR") : "Sin limite"}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={() => toggleCode(code.id, code.active)}
                          className={"text-[10px] px-2.5 py-1.5 rounded-lg font-medium transition " + (
                            code.active ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                          )}>{code.active ? "Desactivar" : "Activar"}</button>
                        <button onClick={() => deleteCode(code.id)}
                          className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showNewCode && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowNewCode(false)}>
              <div className="bg-[#0a0a0c] rounded-3xl p-8 w-full max-w-md border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-black text-white tracking-tight mb-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shadow-inner">
                    <Percent className="w-5 h-5" />
                  </div>
                  Nuevo codigo
                </h3>
                <p className="text-xs text-white/50 mb-6 font-medium">Crea un codigo de descuento para un box o para todos.</p>
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Codigo</label>
                    <input value={codeForm.code} onChange={e => setCodeForm({ ...codeForm, code: e.target.value.toUpperCase() })}
                      placeholder="Ej: BIENVENIDO20" className={INPUT_CLS} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Desc. %</label>
                      <input type="number" min="0" max="100" value={codeForm.discount_percent} onChange={e => setCodeForm({ ...codeForm, discount_percent: +e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Desc. fijo ($)</label>
                      <input type="number" min="0" value={codeForm.discount_fixed} onChange={e => setCodeForm({ ...codeForm, discount_fixed: +e.target.value })} className={INPUT_CLS} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Aplicar a Box</label>
                    <select value={codeForm.box_id} onChange={e => setCodeForm({ ...codeForm, box_id: e.target.value })} className={INPUT_CLS}>
                      <option value="" className="bg-[#141416]">Todos los boxes</option>
                      {boxes.map(b => <option key={b.id} value={b.id} className="bg-[#141416]">{b.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Vence</label>
                      <input type="date" value={codeForm.valid_until} onChange={e => setCodeForm({ ...codeForm, valid_until: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Usos (0=∞)</label>
                      <input type="number" min="0" value={codeForm.max_uses} onChange={e => setCodeForm({ ...codeForm, max_uses: +e.target.value })} className={INPUT_CLS} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-8 pt-6 border-t border-white/5">
                  <button onClick={createCode}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all">
                    Crear codigo
                  </button>
                  <button onClick={() => setShowNewCode(false)}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-white/50 hover:text-white hover:bg-white/5 transition-colors">Cancelar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
