"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  CreditCard, Plus, AlertCircle, CheckCircle2, Clock,
  Check, X, Pencil, Trash2,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from "@/lib/utils";

type Payment = {
  id: string;
  student_id: string;
  trainer_id: string;
  amount: number;
  status: "pendiente" | "pagado" | "vencido";
  due_date: string;
  paid_at: string | null;
  period_label: string;
  notes: string | null;
  users: { full_name: string; email: string } | null;
};

type FilterStatus = "todos" | "pendiente" | "vencido" | "pagado";

// ─── Modal confirmar pago ────────────────────────────────────
function MarkPaidModal({ payment, onConfirm, onClose, saving }: {
  payment: Payment;
  onConfirm: (amount: number, paidAt: string) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [amount, setAmount] = useState(payment.amount);
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split("T")[0]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-border">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Confirmar pago
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {(payment.users as any)?.full_name} · {payment.period_label}
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Monto cobrado</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">$</span>
              <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Fecha de cobro</label>
            <input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button onClick={() => onConfirm(amount, paidAt)} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50">
            <Check className="w-4 h-4" />
            {saving ? "Guardando..." : "Confirmar cobro"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal editar pago ───────────────────────────────────────
function EditModal({ payment, onSave, onClose, saving }: {
  payment: Payment;
  onSave: (data: Partial<Payment>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [amount, setAmount] = useState(payment.amount);
  const [dueDate, setDueDate] = useState(payment.due_date);
  const [periodLabel, setPeriodLabel] = useState(payment.period_label);
  const [status, setStatus] = useState<Payment["status"]>(payment.status);
  const [notes, setNotes] = useState(payment.notes || "");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-border">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Editar pago
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {(payment.users as any)?.full_name}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Monto</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input type="number" min="0" step="0.01" value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Vencimiento</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Período / Etiqueta</label>
            <input type="text" value={periodLabel} onChange={e => setPeriodLabel(e.target.value)}
              placeholder="Ej: Abril 2026"
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Estado</label>
            <select value={status} onChange={e => setStatus(e.target.value as Payment["status"])}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white">
              <option value="pendiente">Pendiente</option>
              <option value="vencido">Vencido</option>
              <option value="pagado">Pagado</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Notas (opcional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} placeholder="Observaciones internas..."
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button
            onClick={() => onSave({ amount, due_date: dueDate, period_label: periodLabel, status, notes: notes || null })}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50">
            <Check className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function PagosPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("todos");
  const [markingPaid, setMarkingPaid] = useState<Payment | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPayments(); }, []);

  async function loadPayments() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("student_payments")
      .select("*, users!student_payments_student_id_fkey(full_name, email)")
      .eq("trainer_id", user.id)
      .order("due_date", { ascending: false });

    if (error) toast.error("Error cargando pagos");
    setPayments((data || []) as Payment[]);
    setLoading(false);
  }

  async function confirmMarkPaid(amount: number, paidAt: string) {
    if (!markingPaid) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("student_payments")
      .update({ status: "pagado", amount, paid_at: new Date(paidAt + "T12:00:00").toISOString() })
      .eq("id", markingPaid.id);
    if (error) toast.error("Error: " + error.message);
    else { toast.success("✅ Pago registrado"); setMarkingPaid(null); await loadPayments(); }
    setSaving(false);
  }

  async function saveEdit(data: Partial<Payment>) {
    if (!editingPayment) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("student_payments")
      .update(data)
      .eq("id", editingPayment.id);
    if (error) toast.error("Error: " + error.message);
    else { toast.success("Pago actualizado"); setEditingPayment(null); await loadPayments(); }
    setSaving(false);
  }

  async function deletePayment(payment: Payment) {
    const student = (payment.users as any)?.full_name || "este alumno";
    if (!confirm(`¿Eliminar el pago de ${student} (${payment.period_label})?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("student_payments").delete().eq("id", payment.id);
    if (error) toast.error("Error: " + error.message);
    else { toast.success("Pago eliminado"); await loadPayments(); }
  }

  async function markAsOverdue(paymentId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("student_payments").update({ status: "vencido" }).eq("id", paymentId);
    if (error) toast.error("Error: " + error.message);
    else { toast.success("Marcado como vencido"); await loadPayments(); }
  }

  // ─── Derived ─────────────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const overdue = payments.filter(p => p.status === "vencido");
  const pending = payments.filter(p => p.status === "pendiente");
  const paid = payments.filter(p => p.status === "pagado");

  const totalMonth = paid
    .filter(p => { if (!p.paid_at) return false; const d = new Date(p.paid_at); return d >= monthStart && d <= monthEnd; })
    .reduce((sum, p) => sum + p.amount, 0);

  const filtered = filter === "todos" ? payments : payments.filter(p => p.status === filter);

  const filterTabs: { key: FilterStatus; label: string; count: number }[] = [
    { key: "todos", label: "Todos", count: payments.length },
    { key: "pendiente", label: "Pendientes", count: pending.length },
    { key: "vencido", label: "Vencidos", count: overdue.length },
    { key: "pagado", label: "Cobrados", count: paid.length },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-border" />)}
        </div>
        <div className="h-64 bg-white rounded-2xl animate-pulse border border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de pagos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Control de cuotas y cobranzas</p>
        </div>
        <Link href="/entrenador/pagos/nuevo"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition">
          <Plus className="w-4 h-4" />
          Registrar
        </Link>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-50 p-2 rounded-xl"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
            <span className="text-sm font-medium text-muted-foreground">Ingresos del mes</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalMonth)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-yellow-50 p-2 rounded-xl"><Clock className="w-5 h-5 text-yellow-600" /></div>
            <span className="text-sm font-medium text-muted-foreground">Pendientes</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{pending.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-50 p-2 rounded-xl"><AlertCircle className="w-5 h-5 text-red-600" /></div>
            <span className="text-sm font-medium text-muted-foreground">Vencidos</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filterTabs.map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
              filter === tab.key
                ? "bg-foreground text-white border-foreground shadow-sm"
                : "bg-white border-border text-muted-foreground hover:text-foreground"
            }`}>
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-md ${filter === tab.key ? "bg-white/20 text-white" : "bg-muted"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">
              {filter === "todos" ? "Todos los pagos" : filterTabs.find(t => t.key === filter)?.label}
            </h2>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((payment) => {
              const student = payment.users as any;
              const isPending = payment.status === "pendiente";
              const isOverdue = payment.status === "vencido";
              const isExpired = isPending && new Date(payment.due_date) < new Date();

              return (
                <div key={payment.id} className={`flex items-center gap-3 px-5 py-4 group transition-colors hover:bg-muted/20 ${isOverdue ? "bg-red-50/30" : ""}`}>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{student?.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.period_label} · {" "}
                      {payment.status === "pagado" && payment.paid_at
                        ? <span className="text-green-600">Cobrado el {formatDate(payment.paid_at)}</span>
                        : <span className={isOverdue || isExpired ? "text-red-500" : ""}>Vence: {formatDate(payment.due_date)}</span>
                      }
                    </p>
                    {payment.notes && <p className="text-xs text-muted-foreground italic mt-0.5 truncate">{payment.notes}</p>}
                  </div>

                  {/* Monto */}
                  <span className="font-semibold text-sm shrink-0">{formatCurrency(payment.amount)}</span>

                  {/* Badge estado */}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${PAYMENT_STATUS_COLORS[payment.status]}`}>
                    {PAYMENT_STATUS_LABELS[payment.status]}
                  </span>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Cobrado */}
                    {(isPending || isOverdue) && (
                      <button onClick={() => setMarkingPaid(payment)}
                        className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                        title="Marcar como cobrado">
                        <Check className="w-3.5 h-3.5" />
                        Cobrado
                      </button>
                    )}
                    {/* Vencido */}
                    {isPending && isExpired && (
                      <button onClick={() => markAsOverdue(payment.id)}
                        className="text-red-500 hover:bg-red-50 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors border border-red-200"
                        title="Marcar como vencido">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Editar */}
                    <button onClick={() => setEditingPayment(payment)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:opacity-0 lg:group-hover:opacity-100"
                      title="Editar pago">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {/* Eliminar */}
                    <button onClick={() => deletePayment(payment)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors lg:opacity-0 lg:group-hover:opacity-100"
                      title="Eliminar pago">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-border">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">
            {filter === "todos" ? "Sin pagos registrados" : `Sin pagos ${filterTabs.find(t => t.key === filter)?.label?.toLowerCase()}`}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {filter === "todos" ? "Registrá los pagos de tus alumnos para llevar el control." : "No hay pagos en esta categoría."}
          </p>
          {filter === "todos" && (
            <Link href="/entrenador/pagos/nuevo"
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition">
              <Plus className="w-4 h-4" />
              Registrar pago
            </Link>
          )}
        </div>
      )}

      {/* Modal: confirmar cobro */}
      {markingPaid && (
        <MarkPaidModal
          payment={markingPaid}
          onConfirm={confirmMarkPaid}
          onClose={() => setMarkingPaid(null)}
          saving={saving}
        />
      )}

      {/* Modal: editar pago */}
      {editingPayment && (
        <EditModal
          payment={editingPayment}
          onSave={saveEdit}
          onClose={() => setEditingPayment(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
