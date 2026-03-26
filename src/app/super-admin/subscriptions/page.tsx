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

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-500/20", text: "text-green-400", label: "Activo" },
  trial: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Trial" },
  past_due: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Moroso" },
  suspended: { bg: "bg-red-500/20", text: "text-red-400", label: "Suspendido" },
  cancelled: { bg: "bg-white/10", text: "text-white/40", label: "Cancelado" },
};

const DEFAULT_PLANS: PlanRow[] = [
  { id: "starter", name: "Starter", max_students: 30, max_professors: 1, max_activities: 2, suggested_price: 15000, sort_order: 1 },
  { id: "pro", name: "Pro", max_students: 80, max_professors: 3, max_activities: 5, suggested_price: 30000, sort_order: 2 },
  { id: "elite", name: "Elite", max_students: 9999, max_professors: 9999, max_activities: 9999, suggested_price: 50000, sort_order: 3 },
];

const TABS = [
  { id: "subs", label: "Suscripciones", icon: CreditCard },
  { id: "plans", label: "Planes", icon: Package },
  { id: "codes", label: "Codigos", icon: Tag },
];

const INPUT_CLS = "w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40";

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
    { id: "starter", label: "Starter" },
    { id: "pro", label: "Pro" },
    { id: "elite", label: "Elite" },
  ];

  const PLAN_LIMITS: Record<string, { max_students: number; max_professors: number }> = {
    starter: { max_students: 30, max_professors: 1 },
    pro: { max_students: 80, max_professors: 3 },
    elite: { max_students: 9999, max_professors: 9999 },
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
    const limits = PLAN_LIMITS[newPlan] || PLAN_LIMITS.starter;
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

      <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={"flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition " + (
              tab === t.id ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-white/50 hover:text-white/80"
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
                className={"text-xs px-3 py-1.5 rounded-lg font-medium transition " + (
                  filter === f.key ? "bg-orange-500 text-white" : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
                )}>
                {f.label}
                {f.key !== "all" && <span className="ml-1.5 opacity-60">{subs.filter(s => s.status === f.key).length}</span>}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-white/5 overflow-hidden">
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
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-white">{sub.box_name}</p>
                        <p className="text-[10px] text-white/30">{sub.owner_name}</p>
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
                      <td className="px-5 py-4">
                        <span className={"text-[10px] px-2.5 py-1 rounded-full font-semibold " + badge.bg + " " + badge.text}>{badge.label}</span>
                        {isOverdue && sub.status !== "suspended" && <span className="text-[10px] text-red-400 ml-2">Vencido</span>}
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
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setDeletingSub(null)}>
            <div className="bg-[#141416] rounded-2xl p-6 w-full max-w-sm border border-red-500/20" onClick={e => e.stopPropagation()}>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Eliminar "{deletingSub.box_name}"?</h3>
                <p className="text-sm text-white/40 mt-2">Se eliminara el box, la suscripcion y se desvinculan todos los usuarios. Esta accion no se puede deshacer.</p>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setDeletingSub(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white/60 bg-white/5 hover:bg-white/10 transition">Cancelar</button>
                <button onClick={deleteBoxFromSub}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-500 transition">Eliminar</button>
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
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                        <button onClick={() => startEditPlan(plan)}
                          className="p-1.5 rounded-lg text-white/30 hover:text-orange-400 hover:bg-orange-500/10 transition">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-2xl font-bold text-orange-400 mb-4">{"$"}{plan.suggested_price.toLocaleString()}<span className="text-xs text-white/30 font-normal">/mes</span></p>
                      <div className="space-y-2 text-sm text-white/60">
                        <p>{plan.max_students >= 9999 ? "Ilimitados" : plan.max_students} alumnos</p>
                        <p>{plan.max_professors >= 9999 ? "Ilimitados" : plan.max_professors} profesores</p>
                        <p>{plan.max_activities >= 9999 ? "Ilimitadas" : plan.max_activities} actividades</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/5">
                        <p className="text-[10px] text-white/20">
                          {subs.filter(s => s.plan_name === plan.id).length} boxes en este plan
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
              className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-400 transition shadow-lg shadow-orange-500/20">
              <Plus className="w-4 h-4" /> Nuevo codigo
            </button>
          </div>

          <div className="rounded-2xl border border-white/5 overflow-hidden">
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
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowNewCode(false)}>
              <div className="bg-[#141416] rounded-2xl p-6 w-full max-w-md border border-white/10" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><Percent className="w-5 h-5 text-orange-400" /> Nuevo codigo</h3>
                <p className="text-xs text-white/40 mb-5">Crea un codigo de descuento para un box o para todos.</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-white/50 block mb-1.5">Codigo</label>
                    <input value={codeForm.code} onChange={e => setCodeForm({ ...codeForm, code: e.target.value.toUpperCase() })}
                      placeholder="Ej: BIENVENIDO20" className={INPUT_CLS} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-white/50 block mb-1.5">Descuento %</label>
                      <input type="number" min="0" max="100" value={codeForm.discount_percent} onChange={e => setCodeForm({ ...codeForm, discount_percent: +e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-white/50 block mb-1.5">o Descuento fijo ($)</label>
                      <input type="number" min="0" value={codeForm.discount_fixed} onChange={e => setCodeForm({ ...codeForm, discount_fixed: +e.target.value })} className={INPUT_CLS} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/50 block mb-1.5">Aplicar a Box (vacio = todos)</label>
                    <select value={codeForm.box_id} onChange={e => setCodeForm({ ...codeForm, box_id: e.target.value })} className={INPUT_CLS}>
                      <option value="" className="bg-[#141416]">Todos los boxes</option>
                      {boxes.map(b => <option key={b.id} value={b.id} className="bg-[#141416]">{b.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-white/50 block mb-1.5">Vence</label>
                      <input type="date" value={codeForm.valid_until} onChange={e => setCodeForm({ ...codeForm, valid_until: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-white/50 block mb-1.5">Max usos (0 = sin limite)</label>
                      <input type="number" min="0" value={codeForm.max_uses} onChange={e => setCodeForm({ ...codeForm, max_uses: +e.target.value })} className={INPUT_CLS} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={createCode}
                    className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-orange-400 transition shadow-lg shadow-orange-500/20">
                    Crear codigo
                  </button>
                  <button onClick={() => setShowNewCode(false)}
                    className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/60 hover:bg-white/5 transition">Cancelar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
