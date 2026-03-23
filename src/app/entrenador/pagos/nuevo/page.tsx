"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, CreditCard } from "lucide-react";
import Link from "next/link";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function NuevoPagoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedStudent = searchParams.get("alumno");

  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<{ id: string; full_name: string; monthly_price: number | null }[]>([]);
  const now = new Date();
  const [form, setForm] = useState({
    student_id: preselectedStudent || "",
    amount: "",
    month: now.getMonth(),
    year: now.getFullYear(),
    due_date: "",
    payment_method: "efectivo",
    status: "pagado",
    notes: "",
  });

  useEffect(() => {
    const fetchStudents = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from("users").select("id, full_name, monthly_price")
        .eq("role", "student").eq("created_by", user!.id).eq("active", true).order("full_name");
      setStudents(data || []);
    };
    fetchStudents();
  }, []);

  // Auto-completar precio cuando se selecciona alumno
  useEffect(() => {
    if (form.student_id) {
      const student = students.find(s => s.id === form.student_id);
      if (student?.monthly_price) {
        setForm(f => ({ ...f, amount: String(student.monthly_price) }));
      }
    }
  }, [form.student_id, students]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student_id) return toast.error("Seleccioná un alumno");
    if (!form.amount) return toast.error("Ingresá el monto");
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const period_label = `${MONTHS[form.month]} ${form.year}`;

    const { error } = await supabase.from("student_payments").insert({
      student_id: form.student_id,
      trainer_id: user!.id,
      amount: parseFloat(form.amount),
      currency: "ARS",
      status: form.status,
      due_date: form.due_date || `${form.year}-${String(form.month + 1).padStart(2, "0")}-01`,
      paid_at: form.status === "pagado" ? new Date().toISOString() : null,
      period_label,
      payment_method: form.payment_method,
      notes: form.notes || null,
    });

    if (error) {
      toast.error("Error: " + error.message);
      setLoading(false);
      return;
    }

    toast.success(`Pago de ${period_label} registrado`);
    router.push("/entrenador/pagos");
    router.refresh();
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/entrenador/pagos" className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Registrar pago</h1>
          <p className="text-sm text-muted-foreground">Asentá un pago manualmente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-5">
        {/* Alumno */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Alumno *</label>
          <select value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" required>
            <option value="">Seleccioná un alumno...</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>

        {/* Período */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Mes</label>
            <select value={form.month} onChange={e => setForm({ ...form, month: parseInt(e.target.value) })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Año</label>
            <input type="number" value={form.year} onChange={e => setForm({ ...form, year: parseInt(e.target.value) })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>

        {/* Monto */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Monto (ARS) *</label>
          <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
            placeholder="50000" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" required />
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Estado</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "pagado", label: "Pagado" },
              { value: "pendiente", label: "Pendiente" },
              { value: "vencido", label: "Vencido" },
            ].map(s => (
              <button key={s.value} type="button" onClick={() => setForm({ ...form, status: s.value })}
                className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  form.status === s.value ? "bg-primary text-white border-primary" : "border-border hover:border-primary/50"
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Método de pago */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Método de pago</label>
          <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="mercadopago">MercadoPago</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Notas <span className="text-muted-foreground text-xs">(opcional)</span></label>
          <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Alguna aclaración..."
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/entrenador/pagos"
            className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium text-center hover:bg-muted transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : <><CreditCard className="w-4 h-4" />Registrar pago</>}
          </button>
        </div>
      </form>
    </div>
  );
}
