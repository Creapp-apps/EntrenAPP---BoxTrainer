"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";

export default function EditarAlumnoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    birth_date: "",
    weight_kg: "",
    height_cm: "",
    goals: "",
    injuries: "",
    monthly_price: "",
    payment_due_day: "1",
  });
  const [email, setEmail] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: student } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

      if (!student) {
        toast.error("Alumno no encontrado");
        router.push("/entrenador/alumnos");
        return;
      }

      setEmail(student.email || "");
      setForm({
        full_name: student.full_name || "",
        phone: student.phone || "",
        birth_date: student.birth_date || "",
        weight_kg: student.weight_kg?.toString() || "",
        height_cm: student.height_cm?.toString() || "",
        goals: student.goals || "",
        injuries: student.injuries || "",
        monthly_price: student.monthly_price?.toString() || "",
        payment_due_day: student.payment_due_day?.toString() || "1",
      });
      setLoading(false);
    };
    load();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error("El nombre es obligatorio");

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        birth_date: form.birth_date || null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        goals: form.goals.trim() || null,
        injuries: form.injuries.trim() || null,
        monthly_price: form.monthly_price ? parseFloat(form.monthly_price) : null,
        payment_due_day: parseInt(form.payment_due_day) || 1,
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      toast.error("Error al guardar: " + error.message);
      return;
    }

    toast.success("Cambios guardados correctamente");
    router.push(`/entrenador/alumnos/${id}`);
    router.refresh();
  };

  const field = (
    label: string,
    key: keyof typeof form,
    props?: React.InputHTMLAttributes<HTMLInputElement>,
    hint?: string
  ) => (
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/entrenador/alumnos/${id}`} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Editar alumno</h1>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos personales */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">1</span>
            Datos personales
          </h2>
          {field("Nombre completo *", "full_name", { placeholder: "Ej: Juan Pérez", required: true })}
          {field("Teléfono", "phone", { type: "tel", placeholder: "+54 9 11 1234-5678" })}

          {/* Email — no editable */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
            <input
              value={email}
              disabled
              className="w-full px-4 py-3 rounded-xl border border-border bg-muted text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">El email no se puede modificar desde aquí</p>
          </div>
        </div>

        {/* Datos físicos */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">2</span>
            Datos físicos <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("Precio mensual (ARS)", "monthly_price", { type: "number", placeholder: "50000" })}
            {field("Día de vencimiento", "payment_due_day", { type: "number", min: "1", max: "31", placeholder: "1" },
              "Día del mes que vence la cuota")}
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/entrenador/alumnos/${id}`}
            className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium text-center hover:bg-muted transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
              : <><Save className="w-4 h-4" />Guardar cambios</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
