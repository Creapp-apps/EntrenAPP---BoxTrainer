"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";

export default function NuevoAlumnoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    birth_date: "",
    weight_kg: "",
    height_cm: "",
    goals: "",
    injuries: "",
    monthly_price: "",
    payment_due_day: "1",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      return toast.error("Nombre, email y contraseña son obligatorios");
    }
    if (form.password.length < 6) {
      return toast.error("La contraseña debe tener al menos 6 caracteres");
    }
    setLoading(true);

    const supabase = createClient();
    const { data: { user: trainer } } = await supabase.auth.getUser();

    // Crear usuario via API route (necesita service role)
    const res = await fetch("/api/students/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        trainer_id: trainer!.id,
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

    toast.success(`Alumno ${form.full_name} creado correctamente`);
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

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos de acceso */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">1</span>
            Datos de acceso
          </h2>
          {field("Nombre completo *", "full_name", { placeholder: "Ej: Juan Pérez", required: true })}
          {field("Email *", "email", { type: "email", placeholder: "juan@email.com", required: true })}
          {field("Contraseña inicial *", "password", { type: "password", placeholder: "Mínimo 6 caracteres", required: true },
            "El alumno podrá cambiarla después desde su perfil")}
          {field("Teléfono", "phone", { type: "tel", placeholder: "+54 9 11 1234-5678" })}
        </div>

        {/* Datos físicos */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">2</span>
            Datos físicos <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {field("Fecha de nacimiento", "birth_date", { type: "date" })}
            {field("Peso (kg)", "weight_kg", { type: "number", placeholder: "75", step: "0.1" })}
            {field("Talla (cm)", "height_cm", { type: "number", placeholder: "175", step: "0.1" })}
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
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Lesiones / Limitaciones</label>
            <textarea
              value={form.injuries}
              onChange={e => setForm({ ...form, injuries: e.target.value })}
              placeholder="Ej: molestia en hombro derecho, no hacer press..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
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
