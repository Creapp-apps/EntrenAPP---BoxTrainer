"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

type BoxDetail = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  logo_url?: string;
  status: string;
  max_students: number;
  max_professors: number;
  created_at: string;
  owner?: { full_name: string; email: string };
};

type UserRow = { id: string; full_name: string; email: string; role: string; active: boolean; created_at: string };

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-500/20", text: "text-green-400", label: "Activo" },
  trial: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Trial" },
  past_due: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Moroso" },
  suspended: { bg: "bg-red-500/20", text: "text-red-400", label: "Suspendido" },
};

export default function BoxDetailPage() {
  const params = useParams();
  const boxId = params.id as string;
  const supabase = createClient();
  const [box, setBox] = useState<BoxDetail | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", city: "", phone: "", max_students: 50, max_professors: 5 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const [boxRes, usersRes, subRes] = await Promise.all([
      supabase.from("boxes").select("*, users!boxes_owner_id_fkey(full_name, email)").eq("id", boxId).single(),
      supabase.from("users").select("id, full_name, email, role, active, created_at").eq("box_id", boxId).order("role").order("full_name"),
      supabase.from("box_subscriptions").select("*").eq("box_id", boxId).order("created_at", { ascending: false }).limit(1).single(),
    ]);
    const b = boxRes.data as any;
    setBox({ ...b, owner: b?.users } as BoxDetail);
    setUsers((usersRes.data || []) as UserRow[]);
    setSub(subRes.data);
    if (b) setForm({ name: b.name, address: b.address || "", city: b.city || "", phone: b.phone || "", max_students: b.max_students, max_professors: b.max_professors });
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("boxes").update({
      name: form.name, address: form.address || null, city: form.city || null,
      phone: form.phone || null, max_students: form.max_students, max_professors: form.max_professors,
    }).eq("id", boxId);
    if (error) toast.error(error.message);
    else { toast.success("Actualizado"); setEditing(false); load(); }
    setSaving(false);
  }

  async function updateSubPlan(plan: string, price: number) {
    if (!sub) return;
    await supabase.from("box_subscriptions").update({ plan_name: plan, price }).eq("id", sub.id);
    toast.success(`Plan actualizado a ${plan}`);
    load();
  }

  if (loading) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-white/5 animate-pulse rounded-2xl" />)}</div>;
  }
  if (!box) return <p className="text-white/40">Box no encontrado</p>;

  const badge = STATUS_BADGE[box.status] || STATUS_BADGE.active;
  const trainers = users.filter(u => u.role === "trainer");
  const professors = users.filter(u => u.role === "professor");
  const students = users.filter(u => u.role === "student");

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/super-admin/boxes" className="text-white/40 hover:text-white/70 transition">Boxes</Link>
        <span className="text-white/20">/</span>
        <span className="text-white/80">{box.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{box.name}</h2>
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${badge.bg} ${badge.text}`}>{badge.label}</span>
          </div>
          <p className="text-sm text-white/40 mt-1">
            {box.owner?.full_name} · {box.owner?.email}
            {box.city && ` · ${box.city}`}
          </p>
        </div>
        <button onClick={() => setEditing(!editing)}
          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition">
          {editing ? "Cancelar" : "Editar"}
        </button>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 block mb-1">Nombre</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">Ciudad</label>
              <input value={form.city} onChange={e => setForm({...form, city: e.target.value})}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">Dirección</label>
              <input value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">Teléfono</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">Máx alumnos</label>
              <input type="number" value={form.max_students} onChange={e => setForm({...form, max_students: Number(e.target.value)})}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">Máx profesores</label>
              <input type="number" value={form.max_professors} onChange={e => setForm({...form, max_professors: Number(e.target.value)})}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            </div>
          </div>
          <button onClick={save} disabled={saving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-500 disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      )}

      {/* Subscription */}
      {sub && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          <h3 className="text-sm font-medium text-white/60 mb-3">Suscripción</h3>
          <div className="flex items-center gap-4 flex-wrap">
            {["starter", "pro", "enterprise"].map(plan => (
              <button key={plan} onClick={() => updateSubPlan(plan, plan === "starter" ? 0 : plan === "pro" ? 15000 : 30000)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                  sub.plan_name === plan
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "border-white/10 text-white/40 hover:text-white hover:border-white/20"
                }`}>
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </button>
            ))}
            <span className="text-sm text-white/40 ml-auto">
              ${sub.price}/mo · vence {new Date(sub.current_period_end).toLocaleDateString("es-AR")}
            </span>
          </div>
        </div>
      )}

      {/* Users by role */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { title: "Trainers", list: trainers, color: "text-blue-400" },
          { title: "Profesores", list: professors, color: "text-purple-400" },
          { title: `Alumnos (${students.length}/${box.max_students})`, list: students, color: "text-green-400" },
        ].map(section => (
          <div key={section.title} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <h4 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${section.color}`}>{section.title}</h4>
            {section.list.length > 0 ? (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {section.list.map(u => (
                  <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-[10px] font-bold">
                      {u.full_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/80 truncate">{u.full_name}</p>
                      <p className="text-[10px] text-white/30 truncate">{u.email}</p>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${u.active ? "bg-green-500" : "bg-red-500"}`} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/30 text-center py-3">—</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
