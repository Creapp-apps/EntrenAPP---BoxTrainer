import { createClient } from "@/lib/supabase/server";
import { CreditCard, CheckCircle, Clock, AlertCircle, Ticket } from "lucide-react";
import { formatCurrency, formatDate, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from "@/lib/utils";

export default async function PagosAlumnoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: payments }, { data: profile }, { data: availablePlans }] = await Promise.all([
    supabase.from("student_payments")
      .select("*")
      .eq("student_id", user!.id)
      .order("due_date", { ascending: false }),
    supabase.from("users")
      .select("monthly_price, payment_due_day")
      .eq("id", user!.id).single(),
    supabase.from("plans")
      .select("*")
      .eq("active", true)
      .order("price", { ascending: true }),
  ]);

  const overdueCount = payments?.filter(p => p.status === "vencido").length || 0;
  const pendingCount = payments?.filter(p => p.status === "pendiente").length || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-sidebar text-white px-4 pt-12 pb-6">
        <h1 className="text-2xl font-bold">Mis pagos</h1>
        {profile?.monthly_price && (
          <p className="text-white/60 text-sm mt-1">
            {formatCurrency(profile.monthly_price)}/mes · Vence el día {profile.payment_due_day}
          </p>
        )}
      </div>

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Summary cards */}
        {(overdueCount > 0 || pendingCount > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {overdueCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-700">{overdueCount}</p>
                <p className="text-xs text-red-600">Vencido{overdueCount !== 1 ? "s" : ""}</p>
              </div>
            )}
            {pendingCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
                <Clock className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-yellow-700">{pendingCount}</p>
                <p className="text-xs text-yellow-600">Pendiente{pendingCount !== 1 ? "s" : ""}</p>
              </div>
            )}
          </div>
        )}

        {/* Payment list */}
        {payments && payments.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-border divide-y divide-border overflow-hidden">
            {payments.map(p => (
              <div key={p.id} className="px-5 py-4 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  p.status === "pagado" ? "bg-green-100" : p.status === "vencido" ? "bg-red-100" : "bg-yellow-100"
                }`}>
                  {p.status === "pagado"
                    ? <CheckCircle className="w-4 h-4 text-green-600" />
                    : p.status === "vencido"
                    ? <AlertCircle className="w-4 h-4 text-red-600" />
                    : <Clock className="w-4 h-4 text-yellow-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{p.period_label}</p>
                  <p className="text-xs text-muted-foreground">
                    Vence: {formatDate(p.due_date)}
                    {p.paid_at && ` · Pagado: ${formatDate(p.paid_at)}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">{formatCurrency(p.amount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_COLORS[p.status]}`}>
                    {PAYMENT_STATUS_LABELS[p.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-border">
            <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">Sin pagos registrados</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Tu entrenador registrará tus pagos acá.
            </p>
          </div>
        {/* 🏷️ Planes del Box y Tarifas */}
        {availablePlans && availablePlans.length > 0 && (
          <div className="pt-4">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1 mb-3 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-[var(--box-primary)]" /> Planes y Tarifas Vigentes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {availablePlans.map(plan => (
                <div key={plan.id} className="bg-white rounded-2xl p-5 shadow-sm border border-border hover:border-[var(--box-primary)] transition-all flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--box-primary)] opacity-[0.03] rounded-bl-full" />
                  
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--box-primary)] text-white px-2 py-0.5 rounded-lg">
                        {plan.modality === 'presencial' ? 'Presencial' : plan.modality === 'mixto' ? 'Mixto' : 'Distancia'}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {plan.billing_weeks} semanas
                      </span>
                    </div>

                    <h3 className="font-bold text-foreground leading-tight text-lg">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {plan.sessions_per_week} sesión{plan.sessions_per_week !== 1 ? 'es' : ''} por semana
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total créditos</p>
                      <p className="text-lg font-black text-foreground">{plan.total_credits}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-[var(--box-primary)]">{formatCurrency(plan.price)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
