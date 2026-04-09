import { createClient } from "@/lib/supabase/server";
import { Users, CreditCard, TrendingUp, AlertCircle, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default async function TrainerDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const todayStr = today.toISOString().split("T")[0];

  // Métricas
  const [
    { count: totalStudents },
    { count: activeStudents },
    { data: overduePayments },
    { data: recentStudents },
    { data: paidThisMonth },
    { count: todayBookings },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true })
      .eq("role", "student"),
    supabase.from("users").select("*", { count: "exact", head: true })
      .eq("role", "student").eq("active", true),
    supabase.from("student_payments").select("*, users(full_name, email)")
      .eq("status", "vencido"),
    supabase.from("users").select("*")
      .eq("role", "student")
      .order("created_at", { ascending: false }).limit(5),
    // Ingresos del mes: pagos marcados como "pagado" en el mes actual
    supabase.from("student_payments").select("amount")
      
      .eq("status", "pagado")
      .gte("paid_at", monthStart)
      .lte("paid_at", monthEnd),
    // Turnos hoy: bookings confirmados para hoy en slots del trainer
    supabase.from("bookings")
      .select("id, box_schedule_slots!inner(trainer_id)", { count: "exact", head: true })
      .eq("booking_date", todayStr)
      .eq("status", "confirmada")
      .eq("box_schedule_slots.trainer_id", user!.id),
  ]);

  const monthlyIncome = (paidThisMonth || []).reduce((sum, p) => sum + (p.amount || 0), 0);

  const stats = [
    {
      label: "Alumnos activos",
      value: activeStudents ?? 0,
      total: totalStudents ?? 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/entrenador/alumnos",
    },
    {
      label: "Pagos vencidos",
      value: overduePayments?.length ?? 0,
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      href: "/entrenador/pagos",
      alert: true,
    },
    {
      label: "Ingresos del mes",
      value: formatCurrency(monthlyIncome),
      icon: CreditCard,
      color: "text-green-600",
      bg: "bg-green-50",
      href: "/entrenador/pagos",
    },
    {
      label: "Turnos hoy",
      value: todayBookings ?? 0,
      icon: Activity,
      color: "text-orange-600",
      bg: "bg-orange-50",
      href: "/entrenador/tu-box/calendario",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {today.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }} className="lg:!grid-cols-4">
        {stats.map(({ label, value, total, icon: Icon, color, bg, href, alert }) => (
          <Link key={label} href={href}
            className="bg-white rounded-2xl p-3 sm:p-5 shadow-sm border border-border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className={`${bg} p-2 sm:p-2.5 rounded-xl`}>
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
              </div>
              {alert && (value as number) > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  !
                </span>
              )}
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {label}
              {total !== undefined && (
                <span className="text-xs ml-1">/ {total} total</span>
              )}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimos alumnos */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Alumnos recientes</h2>
            <Link href="/entrenador/alumnos"
              className="text-sm text-primary hover:underline font-medium">
              Ver todos
            </Link>
          </div>
          {recentStudents && recentStudents.length > 0 ? (
            <div className="space-y-3">
              {recentStudents.map((student) => (
                <Link key={student.id} href={`/entrenador/alumnos/${student.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {student.full_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {student.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    student.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {student.active ? "Activo" : "Inactivo"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No hay alumnos todavía.</p>
              <Link href="/entrenador/alumnos"
                className="text-sm text-primary hover:underline mt-1 inline-block">
                Agregar primer alumno →
              </Link>
            </div>
          )}
        </div>

        {/* Pagos vencidos */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Pagos vencidos</h2>
            <Link href="/entrenador/pagos"
              className="text-sm text-primary hover:underline font-medium">
              Ver todos
            </Link>
          </div>
          {overduePayments && overduePayments.length > 0 ? (
            <div className="space-y-3">
              {overduePayments.slice(0, 5).map((payment) => (
                <div key={payment.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {(payment.users as Record<string, string>)?.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{payment.period_label}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                ¡Sin pagos vencidos! Todo al día.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
