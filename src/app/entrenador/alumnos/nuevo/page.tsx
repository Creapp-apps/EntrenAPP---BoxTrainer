"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, UserPlus, Mail } from "lucide-react";
import Link from "next/link";
import Select from "@/components/ui/Select";
import HumanBodyMockup from "@/components/HumanBodyMockup";

export default function NuevoAlumnoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    birth_date: "",
    weight_kg: "",
    height_cm: "",
    goals: "",
    injuries: "",
    monthly_price: "",
    payment_due_day: "1",
    modality: "presencial",
    gender: "no_especificar" as "hombre" | "mujer" | "no_especificar",
  });
  const [injuredParts, setInjuredParts] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) {
      return toast.error("Nombre y email son obligatorios");
    }
    setLoading(true);

    // La contraseña es generada automáticamente por el servidor.
    // El alumno recibe un magic link por email para ingresar.
    const res = await fetch("/api/students/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        injured_parts: injuredParts.join(","),
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        monthly_price: form.monthly_price ? parseFloat(form.monthly_price) : null,
        payment_due_day: parseInt(form.payment_due_day),
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      toast.error(result.error || "Error al crear el alumno");
      setLoading(false);
      return;
    }

    toast.success(`✅ Alumno ${form.full_name} creado correctamente`);
    if (result.email_sent) {
      toast.success(`📧 Email de bienvenida enviado a ${form.email}`);
    } else {
      toast.warning("No se pudo enviar el email de bienvenida");
    }
    router.push("/entrenador/alumnos");
    router.refresh();
  };

  const field = (label: string, key: keyof typeof form, props?: React.InputHTMLAttributes<HTMLInputElement>, hint?: string) => (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      <input
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        {...props}
      />
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/entrenador/alumnos" className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nuevo alumno</h1>
          <p className="text-sm text-muted-foreground">Creá la cuenta para tu alumno</p>
        </div>
      </div>

      {/* Aviso informativo sobre el acceso */}
      <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4">
        <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Acceso por enlace seguro</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            El alumno recibirá un <strong>email con un botón de acceso directo</strong> a su cuenta. No necesitás crear ni compartir contraseñas.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos de acceso */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">1</span>
            Datos de acceso
          </h2>
          {field("Nombre completo *", "full_name", { placeholder: "Ej: Juan Pérez", required: true })}
          {field("Email *", "email", { type: "email", placeholder: "juan@email.com", required: true },
            "Se usará para iniciar sesión y recibir el enlace de acceso")}
          {field("Teléfono", "phone", { type: "tel", placeholder: "+54 9 11 1234-5678" })}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Modalidad</label>
            <Select
              value={form.modality}
              onChange={(val) => setForm({ ...form, modality: val })}
              options={[
                { value: "presencial", label: "Presencial" },
                { value: "a_distancia", label: "A distancia" },
                { value: "mixto", label: "Mixto" }
              ]}
              triggerClassName="py-3 px-4 text-sm bg-background text-foreground h-[46px] flex items-center justify-between"
            />
            <p className="text-xs text-muted-foreground mt-1">Define si el alumno entrena en el box o a distancia</p>
          </div>
        </div>

        {/* Datos físicos */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">2</span>
            Datos físicos <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {field("Fecha de nacimiento", "birth_date", { type: "date" })}
            {field("Peso (kg)", "weight_kg", { type: "number", placeholder: "75", step: "0.1" })}
            {field("Talla (cm)", "height_cm", { type: "number", placeholder: "175", step: "0.1" })}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Género</label>
            <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-sm border border-slate-200">
              {(["hombre", "mujer", "no_especificar"] as const).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm({ ...form, gender: g })}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    form.gender === g
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {g === "no_especificar" ? "No especificar" : g === "hombre" ? "Hombre" : "Mujer"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Objetivos</label>
            <textarea
              value={form.goals}
              onChange={e => setForm({ ...form, goals: e.target.value })}
              placeholder="Ej: mejorar arranque, competir en mayo..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Lesiones / Limitaciones (Texto)</label>
              <textarea
                value={form.injuries}
                onChange={e => setForm({ ...form, injuries: e.target.value })}
                placeholder="Ej: molestia en hombro derecho, no hacer press..."
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Describí brevemente cualquier molestia, lesión o precaución médica que deba tenerse en cuenta.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Mapeo de lesiones (Coloreá dónde duele)</label>
              <HumanBodyMockup
                gender={form.gender}
                selectedParts={injuredParts}
                onChange={setInjuredParts}
              />
            </div>
          </div>
        </div>

        {/* Pago */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">3</span>
            Cuota mensual <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {field("Precio mensual (ARS)", "monthly_price", { type: "number", placeholder: "50000" })}
            {field("Día de vencimiento", "payment_due_day", { type: "number", min: "1", max: "31", placeholder: "1" },
              "Día del mes que vence la cuota")}
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/entrenador/alumnos"
            className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium text-center hover:bg-muted transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando alumno...</>
              : <><UserPlus className="w-4 h-4" /> Crear alumno</>}
          </button>
        </div>
      </form>
    </div>
  );
}
