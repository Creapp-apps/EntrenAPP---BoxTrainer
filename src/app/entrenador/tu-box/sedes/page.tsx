"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Building2,
  Check,
  Pencil,
  Power,
  MapPin,
  Lock,
} from "lucide-react";

type Branch = {
  id: string;
  name: string;
  address: string | null;
  active: boolean;
  box_id: string;
};

export default function SedesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [boxId, setBoxId] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string>("basico");
  
  // Form state
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formActive, setFormActive] = useState(true);

  // Limits mapping
  const limits: Record<string, { max: number; label: string }> = {
    free: { max: 1, label: "Free Trial" },
    trial: { max: 1, label: "Free Trial" },
    basico: { max: 1, label: "Básico" },
    basic: { max: 1, label: "Básico" },
    estandar: { max: 1, label: "Estándar" },
    standard: { max: 1, label: "Estándar" },
    premium: { max: 99, label: "Premium" },
    pro: { max: 99, label: "Premium" },
    unlimited: { max: 99, label: "Premium" },
  };

  const currentLimit = limits[planName.toLowerCase()] || { max: 1, label: "Básico" };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user profile
    const { data: profile } = await supabase
      .from("users")
      .select("box_id")
      .eq("id", user.id)
      .single();

    let bId = profile?.box_id || null;
    if (!bId) {
      const { data: ownedBox } = await supabase
        .from("boxes")
        .select("id")
        .eq("owner_id", user.id)
        .single();
      if (ownedBox) bId = ownedBox.id;
    }
    setBoxId(bId);

    if (bId) {
      // Get subscription
      const { data: sub } = await supabase
        .from("box_subscriptions")
        .select("plan_name")
        .eq("box_id", bId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub) {
        setPlanName(sub.plan_name);
      }

      // Get branches
      const { data: branchList } = await supabase
        .from("box_branches")
        .select("*")
        .eq("box_id", bId)
        .order("created_at", { ascending: true });

      setBranches(branchList || []);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Ingresá un nombre para la sede");
      return;
    }

    if (!boxId) {
      toast.error("No estás asociado a ningún Box");
      return;
    }

    // Check limit if not editing
    if (!editingBranch && branches.length >= currentLimit.max) {
      toast.error(
        `Límite excedido: Tu plan actual (${currentLimit.label}) permite un máximo de ${currentLimit.max} sede(s).`
      );
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const payload = {
      box_id: boxId,
      name: formName.trim(),
      address: formAddress.trim() || null,
      active: formActive,
    };

    let error;
    if (editingBranch) {
      const res = await supabase
        .from("box_branches")
        .update(payload)
        .eq("id", editingBranch.id);
      error = res.error;
    } else {
      const res = await supabase.from("box_branches").insert(payload);
      error = res.error;
    }

    if (error) {
      toast.error("Error al guardar: " + error.message);
    } else {
      toast.success(editingBranch ? "Sede actualizada" : "Sede creada con éxito");
      resetForm();
      await loadData();
    }
    setFormActive(true);
    setSaving(false);
  }

  function handleEdit(branch: Branch) {
    setEditingBranch(branch);
    setFormName(branch.name);
    setFormAddress(branch.address || "");
    setFormActive(branch.active);
  }

  async function handleToggleActive(branch: Branch) {
    const supabase = createClient();
    const { error } = await supabase
      .from("box_branches")
      .update({ active: !branch.active })
      .eq("id", branch.id);

    if (error) {
      toast.error("Error al cambiar estado: " + error.message);
    } else {
      toast.success(branch.active ? "Sede desactivada" : "Sede activada");
      await loadData();
    }
  }

  async function handleDelete(branch: Branch) {
    if (!confirm(`¿Eliminar la sede "${branch.name}"? Se desvinculará de los horarios existentes.`)) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("box_branches")
      .delete()
      .eq("id", branch.id);

    if (error) {
      toast.error("Error al eliminar: " + error.message);
    } else {
      toast.success("Sede eliminada");
      await loadData();
    }
  }

  function resetForm() {
    setEditingBranch(null);
    setFormName("");
    setFormAddress("");
    setFormActive(true);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 bg-muted animate-pulse rounded-lg" />
          <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-white rounded-2xl animate-pulse border border-border" />
          <div className="md:col-span-2 h-64 bg-white rounded-2xl animate-pulse border border-border" />
        </div>
      </div>
    );
  }

  const reachedLimit = !editingBranch && branches.length >= currentLimit.max;

  return (
    <div className="space-y-6 text-foreground">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/entrenador/tu-box"
          className="p-2 rounded-xl bg-white border border-border text-muted-foreground hover:text-foreground transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sedes y Sucursales</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administración de establecimientos físicos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form panel */}
        <div className="bg-white rounded-2xl p-6 border border-border shadow-sm h-fit space-y-4">
          <h2 className="font-bold text-foreground">
            {editingBranch ? "Editar Sede" : "Agregar Sede Física"}
          </h2>
          <div className="bg-amber-50 border border-amber-200/55 rounded-xl p-3 flex gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-800 font-medium">
              Tu plan es <span className="font-bold capitalize">{currentLimit.label}</span> y te permite tener hasta <span className="font-bold">{currentLimit.max}</span> sede(s).
              {reachedLimit && (
                <p className="mt-1 text-red-600 font-bold">
                  Límite alcanzado. Actualizá tu plan para agregar más sedes.
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                Nombre de la Sede
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: Sede Recoleta"
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                Dirección
              </label>
              <input
                type="text"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="Ej: Av. Santa Fe 2300"
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="formActive"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary/30 w-4 h-4"
              />
              <label htmlFor="formActive" className="text-sm font-medium text-foreground">
                Sede Activa para horarios
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving || (reachedLimit && !editingBranch)}
                className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/95 transition disabled:opacity-50"
              >
                {saving ? "Guardando..." : editingBranch ? "Guardar Cambios" : "Guardar Sede"}
              </button>
              {editingBranch && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted border border-border transition"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List panel */}
        <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-border shadow-sm space-y-4">
          <h2 className="font-bold text-foreground">
            Sedes Registradas ({branches.length})
          </h2>
          {branches.length > 0 ? (
            <div className="divide-y divide-border">
              {branches.map((branch) => (
                <div key={branch.id} className="py-4 flex items-center justify-between group">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                      <Building2 className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                        {branch.name}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            branch.active
                              ? "bg-green-50 text-green-700 border border-green-200/50"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {branch.active ? "Activa" : "Inactiva"}
                        </span>
                      </h3>
                      {branch.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {branch.address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Toggle Active */}
                    <button
                      onClick={() => handleToggleActive(branch)}
                      className={`p-2 rounded-xl transition ${
                        branch.active
                          ? "text-green-600 hover:bg-green-50"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                      title={branch.active ? "Desactivar" : "Activar"}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    {/* Edit */}
                    <button
                      onClick={() => handleEdit(branch)}
                      className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(branch)}
                      className="p-2 rounded-xl text-muted-foreground hover:bg-red-50 hover:text-red-600 transition"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-border rounded-2xl">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">No hay sedes registradas</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Crea tu primera sede para empezar a planificar.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
