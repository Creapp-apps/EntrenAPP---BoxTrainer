"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Pencil, Trash2, X, Save } from "lucide-react";

const PLANS = [
  { id: "starter", label: "Starter", desc: "30 alumnos · 1 prof · 2 act.", color: "bg-zinc-700/40 text-zinc-300" },
  { id: "pro", label: "Pro", desc: "80 alumnos · 3 prof · 5 act.", color: "bg-orange-500/20 text-orange-400" },
  { id: "elite", label: "Elite", desc: "Ilimitados", color: "bg-amber-500/20 text-amber-300" },
];

type Box = {
  id: string;
  name: string;
  slug?: string;
  owner_id?: string;
  owner?: { full_name: string; email: string };
  address?: string;
  city?: string;
  phone?: string;
  status: string;
  max_students: number;
  max_professors: number;
  created_at: string;
  subscription?: {
    id: string;
    plan_name: string;
    price: number;
    status: string;
    current_period_end: string;
  };
  _student_count?: number;
};

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-500/20", text: "text-green-400", label: "Activo" },
  trial: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Trial" },
  past_due: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Moroso" },
  suspended: { bg: "bg-red-500/20", text: "text-red-400", label: "Suspendido" },
  cancelled: { bg: "bg-white/10", text: "text-white/40", label: "Cancelado" },
};

export default function BoxesPage() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", email: "", ownerName: "", password: "", plan: "starter", price: 0, trialDays: 14 });
  const [saving, setSaving] = useState(false);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [editingBox, setEditingBox] = useState<Box | null>(null);
  const [editForm, setEditForm] = useState({ name: "", address: "", city: "", phone: "" });
  const [deletingBox, setDeletingBox] = useState<Box | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/list-boxes");
      const data = await res.json();
      if (res.ok && data.boxes) {
        setBoxes(data.boxes as Box[]);
      } else {
        console.error("Error loading boxes:", data.error);
        setBoxes([]);
      }
    } catch (err) {
      console.error("Error loading boxes:", err);
      setBoxes([]);
    }
    setLoading(false);
  }

  async function createBox() {
    if (!form.name.trim() || !form.email.trim() || !form.ownerName.trim() || !form.password.trim()) {
      toast.error("Completá todos los campos"); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/create-box", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, email: form.email, ownerName: form.ownerName,
          password: form.password, plan: form.plan, price: form.price, trialDays: form.trialDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); setSaving(false); return; }
      toast.success(`Box "${form.name}" creado`);
      setShowCreate(false);
      setForm({ name: "", email: "", ownerName: "", password: "", plan: "starter", price: 0, trialDays: 14 });
      load();
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  }

  async function changePlan(box: Box, newPlan: string) {
    const res = await fetch("/api/manage-box", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "changePlan", boxId: box.id, plan: newPlan, subscriptionId: box.subscription?.id }),
    });
    if (!res.ok) { toast.error("Error al cambiar plan"); return; }
    toast.success(`Plan → ${newPlan.toUpperCase()}`);
    setChangingPlan(null);
    load();
  }

  async function saveEdit() {
    if (!editingBox) return;
    const res = await fetch("/api/manage-box", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit", boxId: editingBox.id, name: editForm.name, address: editForm.address, city: editForm.city, phone: editForm.phone }),
    });
    if (!res.ok) { toast.error("Error al actualizar"); return; }
    toast.success("Box actualizado");
    setEditingBox(null);
    load();
  }

  async function deleteBox() {
    if (!deletingBox) return;
    const res = await fetch("/api/manage-box", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boxId: deletingBox.id }),
    });
    if (!res.ok) { toast.error("Error al eliminar"); return; }
    toast.success(`"${deletingBox.name}" eliminado`);
    setDeletingBox(null);
    load();
  }

  async function toggleStatus(box: Box) {
    const res = await fetch("/api/manage-box", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggleStatus", boxId: box.id, currentStatus: box.status }),
    });
    if (!res.ok) { toast.error("Error al cambiar estado"); return; }
    const data = await res.json();
    toast.success(data.newStatus === "suspended" ? "Suspendido" : "Reactivado");
    load();
  }

  const filtered = boxes.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.owner?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.owner?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const inputCls = "w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Boxes</h2>
          <p className="text-sm text-white/40 mt-1">{boxes.length} centros registrados</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-400 transition shadow-lg shadow-orange-500/20">
          + Nuevo Box
        </button>
      </div>

      {/* Search */}
      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nombre, dueño o email..."
        className={inputCls} />

      {/* Table */}
      <div className="rounded-2xl border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/5">
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Box</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Dueño</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Plan</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Estado</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Alumnos</th>
              <th className="text-right px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-6 bg-white/5 animate-pulse rounded-lg" /></td></tr>
              ))
            ) : filtered.length > 0 ? (
              filtered.map(box => {
                const badge = STATUS_BADGE[box.status] || STATUS_BADGE.active;
                const plan = box.subscription?.plan_name || "starter";
                const planInfo = PLANS.find(p => p.id === plan) || PLANS[0];
                const pct = box.max_students > 0 && box.max_students < 9999
                  ? Math.min(100, Math.round(((box._student_count || 0) / box.max_students) * 100)) : 0;
                return (
                  <tr key={box.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-white">{box.name}</p>
                      {box.city && <p className="text-xs text-white/30 mt-0.5">{box.city}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-white/70">{box.owner?.full_name || "—"}</p>
                      <p className="text-xs text-white/30">{box.owner?.email || ""}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="relative">
                        <button onClick={() => setChangingPlan(changingPlan === box.id ? null : box.id)}
                          className={`text-[10px] px-2 py-1 rounded-full font-medium uppercase cursor-pointer hover:opacity-80 transition ${planInfo.color}`}>
                          {planInfo.label}
                        </button>
                        {box.subscription?.price ? (
                          <span className="text-xs text-white/30 ml-2">${box.subscription.price}</span>
                        ) : null}
                        {changingPlan === box.id && (
                          <div className="absolute top-8 left-0 z-20 bg-[#1a1a1d] border border-white/10 rounded-xl p-2 shadow-xl min-w-[200px]">
                            {PLANS.map(p => (
                              <button key={p.id} onClick={() => changePlan(box, p.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                                  p.id === plan ? "bg-orange-500/20 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                                }`}>
                                <span className="font-medium">{p.label}</span>
                                <span className="text-[10px] text-white/30 block">{p.desc}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/70 font-mono">{box._student_count}</span>
                        <span className="text-xs text-white/20">/ {box.max_students >= 9999 ? "∞" : box.max_students}</span>
                      </div>
                      {box.max_students < 9999 && (
                        <div className="w-16 h-1 bg-white/5 rounded-full mt-1">
                          <div className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={() => { setEditingBox(box); setEditForm({ name: box.name, address: box.address || "", city: box.city || "", phone: box.phone || "" }); }}
                          className="p-1.5 rounded-lg text-white/30 hover:text-orange-400 hover:bg-orange-500/10 transition" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeletingBox(box)}
                          className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition" title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleStatus(box)}
                          className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition ml-1 ${
                            box.status === "suspended"
                              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                              : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          }`}>
                          {box.status === "suspended" ? "Reactivar" : "Suspender"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-white/30">
                {search ? "Sin resultados" : "No hay boxes creados aún"}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Create Modal ─── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-[#141416] rounded-2xl p-6 w-full max-w-lg border border-white/10" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-5">Nuevo Box</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-white/50 block mb-1.5">Nombre del centro</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: CrossFit Palermo" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-white/50 block mb-1.5">Nombre del dueño</label>
                  <input type="text" value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })}
                    placeholder="Juan Pérez" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50 block mb-1.5">Email del dueño</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="dueño@email.com" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-white/50 block mb-1.5">Contraseña inicial</label>
                <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Ej: MiBox2024!" className={inputCls} />
              </div>
              {/* Plan cards */}
              <div>
                <label className="text-xs font-medium text-white/50 block mb-2">Plan</label>
                <div className="grid grid-cols-3 gap-2">
                  {PLANS.map(p => (
                    <button key={p.id} onClick={() => setForm({ ...form, plan: p.id })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        form.plan === p.id
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20"
                      }`}>
                      <p className={`text-sm font-bold ${form.plan === p.id ? "text-orange-400" : "text-white/70"}`}>{p.label}</p>
                      <p className="text-[9px] text-white/30 mt-1 leading-tight">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-white/50 block mb-1.5">Días de trial</label>
                  <input type="number" min="0" max="90" value={form.trialDays} onChange={e => setForm({ ...form, trialDays: Number(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50 block mb-1.5">Precio mensual ($)</label>
                  <input type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className={inputCls} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button disabled={saving} onClick={createBox}
                className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-orange-400 disabled:opacity-50 transition shadow-lg shadow-orange-500/20">
                {saving ? "Creando..." : "Crear Box"}
              </button>
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/60 hover:bg-white/5 transition">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Modal ─── */}
      {editingBox && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setEditingBox(null)}>
          <div className="bg-[#141416] rounded-2xl p-6 w-full max-w-md border border-white/10" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-5">Editar — {editingBox.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-white/50 block mb-1.5">Nombre</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-white/50 block mb-1.5">Dirección</label>
                  <input type="text" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} placeholder="Av. Libertador 1234" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50 block mb-1.5">Ciudad</label>
                  <input type="text" value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} placeholder="Buenos Aires" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-white/50 block mb-1.5">Teléfono</label>
                <input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+54..." className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={saveEdit}
                className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-orange-400 transition inline-flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Guardar
              </button>
              <button onClick={() => setEditingBox(null)}
                className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/60 hover:bg-white/5 transition">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm Modal ─── */}
      {deletingBox && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setDeletingBox(null)}>
          <div className="bg-[#141416] rounded-2xl p-6 w-full max-w-sm border border-red-500/20" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">¿Eliminar "{deletingBox.name}"?</h3>
              <p className="text-sm text-white/40 mt-2">Se eliminará el box, la suscripción y se desvinculan los usuarios. Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeletingBox(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white/60 bg-white/5 hover:bg-white/10 transition">Cancelar</button>
              <button onClick={deleteBox}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-500 transition">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
