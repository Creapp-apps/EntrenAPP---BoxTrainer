import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Users, CreditCard, TrendingUp, AlertCircle, Activity, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import QuickAnnouncementPanel from "@/components/QuickAnnouncementPanel";
import TodayClassesList from "@/components/TodayClassesList";
import LiveClock from "@/components/LiveClock";
import PlanningAlertsWidget from "@/components/PlanningAlertsWidget";
import { getBoxPlanningAlerts } from "@/lib/planningAlerts";

export default async function TrainerDashboard() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const todayStr = today.toISOString().split("T")[0];

  const maxDueDate = new Date(today);
  maxDueDate.setDate(today.getDate() + 10);
  const maxDueDateStr = maxDueDate.toISOString().split("T")[0];

  // Obtener Perfil para sacar box_id
  const { data: profile } = await supabase
    .from("users")
    .select("box_id")
    .eq("id", user!.id)
    .single();

  // Métricas + Listas de Apoyo
  const [
    { count: totalStudents },
    { count: activeStudents },
    { data: overduePayments },
    { data: upcomingPayments },
    { data: paidThisMonth },
    { data: todayBookingsData },
    { data: todaySlotsData },
    studentsListRes,
    announcementsRes,
    planningAlertsRes,
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true })
      .eq("role", "student")
      .eq("box_id", profile?.box_id),
    supabase.from("users").select("*", { count: "exact", head: true })
      .eq("role", "student")
      .eq("active", true)
      .eq("box_id", profile?.box_id),
    supabase.from("student_payments").select("*, users!inner(full_name, email, box_id)")
      .eq("status", "vencido")
      .eq("users.box_id", profile?.box_id),
    // Pagos a vencer (próximos 10 días)
    supabase.from("student_payments").select("*, users!inner(full_name, email, box_id)")
      .eq("status", "pendiente")
      .eq("users.box_id", profile?.box_id)
      .gte("due_date", todayStr)
      .lte("due_date", maxDueDateStr)
      .order("due_date", { ascending: true }).limit(5),
    // Ingresos del mes
    supabase.from("student_payments").select("amount, users!inner(box_id)")
      .eq("status", "pagado")
      .eq("users.box_id", profile?.box_id)
      .gte("paid_at", monthStart)
      .lte("paid_at", monthEnd),
    // Turnos hoy (Cambiado a adminSupabase para traer datos de usuarios sin problema de RLS circular)
    adminSupabase.from("bookings")
      .select("id, status, student_id, users(full_name, avatar_url), box_schedule_slots!inner(id, label, start_time, end_time, max_capacity, trainer_id)")
      .eq("booking_date", todayStr)
      // Remove status filter so we can see who came and who didn't
      .eq("box_schedule_slots.trainer_id", user!.id),
    // Todos los horarios de hoy para mostrar clases vacías también
    adminSupabase.from("box_schedule_slots")
      .select("*, box_activities(name, color)")
      .eq("trainer_id", user!.id)
      .eq("day_of_week", today.getDay() === 0 ? 7 : today.getDay()),
    // Lista de estudiantes para selectores
    supabase.from("users")
      .select("id, full_name")
      .eq("role", "student")
      .eq("box_id", profile?.box_id)
      .order("full_name"),
    // Anuncios recientes del Box
    supabase.from("box_announcements")
      .select("*")
      .eq("box_id", profile?.box_id)
      .order("created_at", { ascending: false })
      .limit(10),
    // Alertas de planificación de alumnos
    getBoxPlanningAlerts(supabase, profile?.box_id),
  ]);

  const boxStudents = studentsListRes.data || [];
  const recentAnnouncements = announcementsRes.data || [];
  const planningAlerts = planningAlertsRes;

  const monthlyIncome = (paidThisMonth || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  
  // Contar turnos confirmados o completados de hoy
  const todayBookingsCount = (todayBookingsData || []).filter(
    (b) => b.status === "confirmada" || b.status === "completada"
  ).length;

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
      value: todayBookingsCount,
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

      {/* ⚠️ Control de Planificación y Alertas de Planillas */}
      <PlanningAlertsWidget summary={planningAlerts} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pagos a vencer */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Próximos vencimientos</h2>
            <Link href="/entrenador/pagos"
              className="text-sm text-primary hover:underline font-medium">
              Ver todos
            </Link>
          </div>
          {upcomingPayments && upcomingPayments.length > 0 ? (
            <div className="space-y-3">
              {upcomingPayments.map((payment) => (
                <div key={payment.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/40 border border-amber-100/70">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {(payment.users as any)?.full_name}
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Vence el {new Date(payment.due_date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long" })}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-foreground shrink-0">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
              <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-medium">Sin próximos vencimientos.</p>
              <p className="text-xs text-muted-foreground/80 mt-0.5">No hay pagos pendientes por vencer en los próximos 10 días.</p>
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

      {/* 📋 Clases de Hoy */}
      <hr className="border-border my-2" />
      
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <span className="bg-orange-500 text-white p-1.5 rounded-lg text-xs">⏰</span> Clases de Hoy
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Revisa tus horarios y toma asistencia rápidamente.</p>
          </div>
          <LiveClock />
        </div>
        <TodayClassesList slots={todaySlotsData || []} bookings={(todayBookingsData as any) || []} />
      </div>

      {/* 📢 Cartelera y Comunicados del Box */}
      <hr className="border-border my-8" />
      
      <div className="space-y-2">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="bg-slate-900 text-white p-1.5 rounded-lg text-xs">📢</span> Cartelera del Box
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Notifica a tu comunidad o deja anotaciones individuales del WOD.</p>
        </div>
        <QuickAnnouncementPanel students={boxStudents} initialAnnouncements={recentAnnouncements as any} />
      </div>
    </div>
  );
}
