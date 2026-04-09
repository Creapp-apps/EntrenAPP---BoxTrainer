"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, CreditCard, Search, X, Check, User } from "lucide-react";
import Link from "next/link";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

type Student = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  monthly_price: number | null;
};

// ─── Combobox buscador de alumno ──────────────────────────────
function StudentSearch({
  students,
  selectedId,
  onSelect,
}: {
  students: Student[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = students.find(s => s.id === selectedId);

  // Cerrar al click afuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = query.trim().length === 0
    ? students
    : students.filter(s => {
        const q = query.toLowerCase();
        return (
          s.full_name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.phone && s.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")))
        );
      });

  function handleSelect(id: string) {
    onSelect(id);
    setOpen(false);
    setQuery("");
  }

  function handleClear() {
    onSelect("");
    setQuery("");
    setOpen(true);
  }

  return (
    <div ref={ref} className="relative">
      {/* Si hay alumno seleccionado y el dropdown está cerrado → mostrar chip */}
      {selected && !open ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary bg-primary/5 cursor-pointer"
          onClick={() => { setOpen(true); }}>
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {selected.full_name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{selected.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{selected.email}</p>
          </div>
          <button type="button"
            onClick={e => { e.stopPropagation(); handleClear(); }}
            className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={selected ? selected.full_name : "Buscar por nombre, email o teléfono..."}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            autoComplete="off"
            autoFocus={open && !selected}
          />
          {query && (
            <button type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-muted transition-colors">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      {/* Dropdown resultados */}
      {open && (
        <div className="absolute z-30 w-full mt-1.5 bg-white border border-border rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <User className="w-8 h-8 text-muted-foreground mx-auto mb-1.5" />
              <p className="text-sm text-muted-foreground">
                No se encontró ningún alumno con "{query}"
              </p>
            </div>
          ) : (
            filtered.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelect(s.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors text-left border-b border-border/50 last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {s.full_name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.email}{s.phone ? ` · ${s.phone}` : ""}
                  </p>
                </div>
                {s.monthly_price && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    ${s.monthly_price.toLocaleString("es-AR")}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function NuevoPagoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedStudent = searchParams.get("alumno");

  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
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
      const { data } = await supabase
        .from("users")
        .select("id, full_name, email, phone, monthly_price")
        .eq("role", "student").eq("active", true)
        .order("full_name");
      setStudents((data || []) as Student[]);
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

        {/* Alumno — buscador */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Alumno *
          </label>
          <StudentSearch
            students={students}
            selectedId={form.student_id}
            onSelect={id => setForm({ ...form, student_id: id })}
          />
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
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
              placeholder="50000"
              className="w-full pl-8 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Estado</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "pagado", label: "✅ Pagado" },
              { value: "pendiente", label: "⏳ Pendiente" },
              { value: "vencido", label: "🔴 Vencido" },
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
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Notas <span className="text-muted-foreground text-xs">(opcional)</span>
          </label>
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
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
              : <><CreditCard className="w-4 h-4" />Registrar pago</>}
          </button>
        </div>
      </form>
    </div>
  );
}
