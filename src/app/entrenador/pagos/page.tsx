import { createClient } from "@/lib/supabase/server";
import { CreditCard, Plus, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from "@/lib/utils";

export default async function PagosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: payments } = await supabase
    .from("student_payments")
    .select("*, users!student_payments_student_id_fkey(full_name, email)")
    .eq("trainer_id", user!.id)
    .order("due_date", { ascending: false });

  const overdue = payments?.filter(p => p.status === "vencido") || [];
  const pending = payments?.filter(p => p.status === "pendiente") || [];
  const paid = payments?.filter(p => p.status === "pagado") || [];

  const totalMonth = paid
    .filter(p => new Date(p.paid_at!).getMonth() === new Date().getMonth())
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de pagos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Control de cuotas y cobranzas</p>
        </div>
        <Link href="/entrenador/pagos/nuevo"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition">
          <Plus className="w-4 h-4" />
          Registrar pago
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

      {/* Lista de pagos */}
      {payments && payments.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Todos los pagos</h2>
          </div>
          <div className="divide-y divide-border">
            {payments.map((payment) => {
              const student = payment.users as Record<string, string>;
              return (
                <div key={payment.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{student?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{payment.period_label} · Vence: {formatDate(payment.due_date)}</p>
                  </div>
                  <span className="font-semibold text-sm">{formatCurrency(payment.amount)}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PAYMENT_STATUS_COLORS[payment.status]}`}>
                    {PAYMENT_STATUS_LABELS[payment.status]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-border">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Sin pagos registrados</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Registrá los pagos de tus alumnos para llevar el control.</p>
          <Link href="/entrenador/pagos/nuevo"
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition">
            <Plus className="w-4 h-4" />
            Registrar pago
          </Link>
        </div>
      )}
    </div>
  );
}
