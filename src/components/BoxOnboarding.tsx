"use client";

import { useState, useRef, DragEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Building2, MapPin, Phone, Image, ChevronRight, Check, Sparkles, Upload, X } from "lucide-react";

type OnboardingData = {
  boxId: string;
  boxName: string;
};

const STEPS = [
  { id: 0, title: "Bienvenida" },
  { id: 1, title: "Centro" },
  { id: 2, title: "Contacto" },
  { id: 3, title: "Marca" },
];

export default function BoxOnboarding({ boxId, boxName, onComplete }: OnboardingData & { onComplete: () => void }) {
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("default");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: boxName || "",
    address: "",
    city: "",
    phone: "",
    whatsapp: "",
    logo_url: "",
  });

  const THEMES = [
    { id: "default", label: "Naranja", color: "#f97316", ring: "ring-orange-500" },
    { id: "ocean", label: "Océano", color: "#0080ff", ring: "ring-blue-500" },
    { id: "emerald", label: "Esmeralda", color: "#10b981", ring: "ring-emerald-500" },
    { id: "violet", label: "Violeta", color: "#8b5cf6", ring: "ring-violet-500" },
    { id: "rose", label: "Rosa", color: "#e11d48", ring: "ring-rose-500" },
    { id: "crimson", label: "Rojo", color: "#dc2626", ring: "ring-red-500" },
    { id: "amber", label: "Ámbar", color: "#f59e0b", ring: "ring-amber-500" },
  ];

  async function uploadLogo(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Solo se permiten imágenes"); return; }
    if (file.size > 500 * 1024 * 1024) { toast.error("Máximo 500MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `logos/${boxId}.${ext}`;
    const { error } = await supabase.storage.from("box-assets").upload(path, file, { upsert: true });
    if (error) { toast.error("Error: " + error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("box-assets").getPublicUrl(path);
    setForm({ ...form, logo_url: publicUrl });
    setUploading(false);
    toast.success("Logo subido ✓");
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadLogo(file);
  }

  async function finish() {
    setSaving(true);
    try {
      const res = await fetch("/api/manage-box", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "onboarding",
          boxId,
          name: form.name.trim(),
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          phone: form.phone.trim() || null,
          logo_url: form.logo_url.trim() || null,
          theme: selectedTheme !== "default" ? selectedTheme : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Error al guardar");
        setSaving(false);
        return;
      }
      toast.success("¡Centro configurado!");
      setSaving(false);
      onComplete();
    } catch (err: any) {
      toast.error(err.message);
      setSaving(false);
    }
  }

  const inputCls = "w-full bg-zinc-900/80 border border-zinc-800 text-white placeholder:text-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition-all";

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Background subtle pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(234,88,12,0.06)_0%,transparent_50%),radial-gradient(circle_at_70%_80%,rgba(34,197,94,0.04)_0%,transparent_50%)]" />

      <div className="w-full max-w-md relative">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-0 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                  i < step ? "bg-green-500 text-white scale-100" :
                  i === step ? "bg-orange-500 text-white scale-110 shadow-lg shadow-orange-500/30" :
                  "bg-zinc-800 text-zinc-500"
                }`}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-[2px] mx-1.5">
                    <div className={`h-full rounded-full transition-all duration-700 ${i < step ? "bg-green-500" : "bg-zinc-800"}`} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between px-0.5">
            {STEPS.map((s, i) => (
              <span key={s.id} className={`text-[10px] transition-colors duration-300 ${i <= step ? "text-zinc-400" : "text-zinc-700"}`}>{s.title}</span>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-7 shadow-2xl shadow-black/50">

          {/* ─── Step 0: Welcome ─── */}
          {step === 0 && (
            <div className="text-center space-y-5 animate-[fadeIn_0.4s_ease]">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 mx-auto flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">¡Bienvenido a EntrenAPP!</h2>
                <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
                  Configurá tu centro en menos de 1 minuto.<br />
                  Después ya podés empezar a gestionar.
                </p>
              </div>
              <button onClick={() => setStep(1)}
                className="bg-orange-500 hover:bg-orange-400 text-white px-7 py-3 rounded-xl font-medium transition-all duration-200 inline-flex items-center gap-2 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 active:scale-[0.98]">
                Comenzar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ─── Step 1: Center info ─── */}
          {step === 1 && (
            <div className="space-y-5 animate-[fadeIn_0.4s_ease]">
              <div className="text-center mb-2">
                <Building2 className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-white">Datos del centro</h3>
                <p className="text-zinc-500 text-xs mt-1">Nombre y ubicación</p>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 block mb-1.5">Nombre del centro</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1.5">Dirección</label>
                  <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                    placeholder="Av. Libertador 1234" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1.5">Ciudad</label>
                  <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                    placeholder="Buenos Aires" className={inputCls} />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep(0)}
                  className="px-4 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition">Atrás</button>
                <button onClick={() => setStep(2)} disabled={!form.name.trim()}
                  className="flex-1 bg-orange-500 hover:bg-orange-400 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-30 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2">
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 2: Contact ─── */}
          {step === 2 && (
            <div className="space-y-5 animate-[fadeIn_0.4s_ease]">
              <div className="text-center mb-2">
                <Phone className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-white">Contacto</h3>
                <p className="text-zinc-500 text-xs mt-1">¿Cómo te contactan tus alumnos?</p>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 block mb-1.5">📱 WhatsApp</label>
                <input type="text" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="+54 11 1234-5678" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 block mb-1.5">📞 Teléfono (opcional)</label>
                <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="+54 11 8765-4321" className={inputCls} />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition">Atrás</button>
                <button onClick={() => setStep(3)}
                  className="flex-1 bg-orange-500 hover:bg-orange-400 text-white py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2">
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 3: Branding — drag & drop ─── */}
          {step === 3 && (
            <div className="space-y-5 animate-[fadeIn_0.4s_ease]">
              <div className="text-center mb-2">
                <Image className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-white">Tu marca</h3>
                <p className="text-zinc-500 text-xs mt-1">Subí el logo de tu centro</p>
              </div>

              {/* Drag & Drop */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 ${
                  dragOver ? "border-orange-500 bg-orange-500/5" :
                  form.logo_url ? "border-green-500/30 bg-green-500/5" :
                  "border-zinc-800 hover:border-zinc-700 bg-zinc-900/30"
                }`}>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />

                {uploading ? (
                  <div className="py-2">
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-zinc-500 mt-2">Subiendo...</p>
                  </div>
                ) : form.logo_url ? (
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 flex-shrink-0">
                      <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm text-green-400 font-medium">Logo listo ✓</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">Click para cambiar</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setForm({ ...form, logo_url: "" }); }}
                      className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="py-2">
                    <Upload className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="text-sm text-zinc-500 mt-2">Arrastrá tu logo o hacé click</p>
                    <p className="text-[10px] text-zinc-700 mt-0.5">PNG, JPG · máx 500MB</p>
                  </div>
                )}
              </div>

              {/* Theme picker */}
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-2.5">🎨 Color del tema</p>
                <div className="flex gap-2 flex-wrap">
                  {THEMES.map(t => (
                    <button key={t.id} onClick={() => setSelectedTheme(t.id)}
                      className={`group relative w-9 h-9 rounded-full transition-all duration-200 hover:scale-110 ${
                        selectedTheme === t.id ? "ring-2 ring-offset-2 ring-offset-zinc-950 scale-110" : ""
                      }`}
                      style={{
                        backgroundColor: t.color,
                        boxShadow: selectedTheme === t.id ? `0 0 12px ${t.color}40` : "none",
                      }}
                      title={t.label}>
                      {selectedTheme === t.id && (
                        <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-700 mt-1.5">
                  {THEMES.find(t => t.id === selectedTheme)?.label || "Default"}
                </p>
              </div>

              {/* Summary */}
              <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Resumen</p>
                <div className="flex items-center gap-3">
                  {form.logo_url && (
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                      <img src={form.logo_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-white font-semibold truncate">{form.name}</p>
                    {form.address && <p className="text-[11px] text-zinc-500 truncate">{form.address}{form.city ? `, ${form.city}` : ""}</p>}
                    {form.whatsapp && <p className="text-[11px] text-zinc-500">WA: {form.whatsapp}</p>}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition">Atrás</button>
                <button onClick={finish} disabled={saving || uploading || !form.name.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-30 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2 shadow-lg shadow-green-600/20">
                  {saving ? "Guardando..." : "🚀 Comenzar a usar EntrenAPP"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-zinc-700 mt-4">EntrenAPP · Plataforma de gestión deportiva</p>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
