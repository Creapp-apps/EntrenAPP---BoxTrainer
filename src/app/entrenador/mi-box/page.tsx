"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Building2, Save, MapPin, Phone, Image, Loader2, Users, GraduationCap, Shield, Upload, X, Check, Palette } from "lucide-react";

const THEMES = [
  { id: "default", label: "Naranja", color: "#f97316" },
  { id: "ocean", label: "Océano", color: "#0080ff" },
  { id: "emerald", label: "Esmeralda", color: "#10b981" },
  { id: "violet", label: "Violeta", color: "#8b5cf6" },
  { id: "rose", label: "Rosa", color: "#e11d48" },
  { id: "crimson", label: "Rojo", color: "#dc2626" },
  { id: "amber", label: "Ámbar", color: "#f59e0b" },
];

type BoxData = {
  id: string;
  name: string;
  slug?: string;
  address?: string;
  city?: string;
  phone?: string;
  logo_url?: string;
  theme?: string;
  status: string;
  max_students: number;
  max_professors: number;
};

type SubData = {
  plan_name: string;
  status: string;
  current_period_end: string;
  price: number;
};

export default function MiBoxPage() {
  const supabase = createClient();
  const router = useRouter();
  const [box, setBox] = useState<BoxData | null>(null);
  const [sub, setSub] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: "", address: "", city: "", phone: "", logo_url: "", theme: "default" });
  const [stats, setStats] = useState({ students: 0, professors: 0 });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from("users").select("box_id").eq("id", user.id).single();
    if (!profile?.box_id) { setLoading(false); return; }

    const [boxRes, subRes, studentsRes, profsRes] = await Promise.all([
      supabase.from("boxes").select("*").eq("id", profile.box_id).single(),
      supabase.from("box_subscriptions").select("*").eq("box_id", profile.box_id).order("created_at", { ascending: false }).limit(1).single(),
      supabase.from("users").select("id", { count: "exact" }).eq("box_id", profile.box_id).eq("role", "student").eq("active", true),
      supabase.from("users").select("id", { count: "exact" }).eq("box_id", profile.box_id).eq("role", "professor").eq("active", true),
    ]);

    const b = boxRes.data as BoxData;
    setBox(b);
    setSub(subRes.data as SubData);
    setStats({ students: studentsRes.count || 0, professors: profsRes.count || 0 });
    if (b) setForm({
      name: b.name,
      address: b.address || "",
      city: b.city || "",
      phone: b.phone || "",
      logo_url: b.logo_url || "",
      theme: b.theme || "default",
    });
    setLoading(false);
  }

  async function uploadLogo(file: File) {
    if (!file.type.startsWith("image/") || !box) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `logos/${box.id}.${ext}`;
    const { error } = await supabase.storage.from("box-assets").upload(path, file, { upsert: true });
    if (error) { toast.error("Error: " + error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("box-assets").getPublicUrl(path);
    setForm({ ...form, logo_url: publicUrl });
    setUploading(false);
    toast.success("Logo subido ✓");
  }

  async function save() {
    if (!box || !form.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    const { error } = await supabase.from("boxes").update({
      name: form.name.trim(),
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      phone: form.phone.trim() || null,
      logo_url: form.logo_url.trim() || null,
      theme: form.theme !== "default" ? form.theme : null,
    }).eq("id", box.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Datos actualizados");
      // Apply theme immediately
      if (form.theme && form.theme !== "default") {
        document.documentElement.setAttribute("data-theme", form.theme);
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      router.refresh();
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!box) {
    return (
      <div className="text-center py-16">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground">Sin centro asignado</h3>
        <p className="text-sm text-muted-foreground mt-1">Contactá al administrador.</p>
      </div>
    );
  }

  const STATUS_LABEL: Record<string, { bg: string; label: string }> = {
    active: { bg: "bg-green-100 text-green-700", label: "Activo" },
    trial: { bg: "bg-blue-100 text-blue-700", label: "Trial" },
    past_due: { bg: "bg-amber-100 text-amber-700", label: "Pago pendiente" },
    suspended: { bg: "bg-red-100 text-red-700", label: "Suspendido" },
  };

  const PLAN_LABEL: Record<string, string> = { starter: "Starter", pro: "Pro", elite: "Elite" };

  function UsageBar({ label, icon: Icon, current, max, color }: { label: string; icon: any; current: number; max: number; color: string }) {
    const isUnlimited = max >= 9999;
    const pct = isUnlimited ? 0 : Math.min(100, Math.round((current / max) * 100));
    return (
      <div className="p-3 rounded-xl bg-muted/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${color}`} />
            <span className="text-xs font-medium text-foreground">{label}</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {current} / {isUnlimited ? "∞" : max}
          </span>
        </div>
        {!isUnlimited && (
          <div className="w-full h-1.5 bg-muted rounded-full">
            <div className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-green-500"}`}
              style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Box</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configuración de tu centro</p>
      </div>

      {/* Status + Plan banner */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_LABEL[box.status]?.bg || "bg-muted"}`}>
              {STATUS_LABEL[box.status]?.label || box.status}
            </span>
            {sub && (
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                Plan {PLAN_LABEL[sub.plan_name] || sub.plan_name}
              </span>
            )}
          </div>
          {sub && (
            <p className="text-xs text-muted-foreground">
              Vence: <span className="font-medium text-foreground">{new Date(sub.current_period_end).toLocaleDateString("es-AR")}</span>
            </p>
          )}
        </div>

        {/* Usage bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <UsageBar label="Alumnos" icon={Users} current={stats.students} max={box.max_students} color="text-blue-600" />
          <UsageBar label="Profesores" icon={GraduationCap} current={stats.professors} max={box.max_professors} color="text-purple-600" />
        </div>
      </div>
      {/* Form — Info */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" /> Información del centro
        </h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Nombre del centro</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                <MapPin className="w-3 h-3 inline mr-1" /> Dirección
              </label>
              <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Av. Ejemplo 1234"
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Ciudad</label>
              <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                placeholder="Buenos Aires"
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              <Phone className="w-3 h-3 inline mr-1" /> Teléfono / WhatsApp
            </label>
            <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="+54 11 1234-5678"
              className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
      </div>

      {/* Logo upload */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Image className="w-4 h-4 text-primary" /> Logo del centro
        </h2>

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadLogo(f); }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
            dragOver ? "border-primary bg-primary/5" :
            form.logo_url ? "border-green-300 bg-green-50" :
            "border-border hover:border-muted-foreground/30"
          }`}>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />

          {uploading ? (
            <div className="py-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground mt-2">Subiendo...</p>
            </div>
          ) : form.logo_url ? (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted border flex-shrink-0">
                <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm text-green-600 font-medium">Logo cargado ✓</p>
                <p className="text-xs text-muted-foreground mt-0.5">Click para cambiar</p>
              </div>
              <button onClick={e => { e.stopPropagation(); setForm({ ...form, logo_url: "" }); }}
                className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="py-2">
              <Upload className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Arrastrá tu logo o hacé click</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">PNG, JPG</p>
            </div>
          )}
        </div>
      </div>

      {/* Theme picker */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" /> Tema de colores
        </h2>
        <p className="text-xs text-muted-foreground -mt-2">Elegí el color principal de tu panel</p>

        <div className="flex gap-3 flex-wrap">
          {THEMES.map(t => (
            <button key={t.id} onClick={() => setForm({ ...form, theme: t.id })}
              className={`group flex flex-col items-center gap-1.5 transition-all duration-200 ${
                form.theme === t.id ? "scale-105" : "hover:scale-105"
              }`}>
              <div className={`relative w-11 h-11 rounded-full transition-all duration-200 ${
                form.theme === t.id ? "ring-2 ring-offset-2 shadow-lg" : ""
              }`}
                style={{
                  backgroundColor: t.color,
                  boxShadow: form.theme === t.id ? `0 0 16px ${t.color}50` : "none",
                  // @ts-ignore
                  "--tw-ring-color": t.color,
                }}>
                {form.theme === t.id && (
                  <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                )}
              </div>
              <span className={`text-[10px] transition-colors ${form.theme === t.id ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition shadow-sm w-full justify-center">
        <Save className="w-4 h-4" />
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}
