import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ArrowLeft, User, Calendar, CreditCard, Dumbbell, Phone, Target, AlertTriangle, BarChart2, MessageCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from "@/lib/utils";
import AlumnoActions from "@/components/AlumnoActions";
import StudentPlanCard from "@/components/StudentPlanCard";

// ─── Tonnage helpers ─────────────────────────────────────────
function parseReps(repsStr: string): number {
  if (!repsStr) return 1;
  // "3-5" or "3x5" => average; else direct parse
  const rangeMatch = repsStr.match(/^(\d+)[-x](\d+)$/);
  if (rangeMatch) return Math.round((parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2);
  const n = parseInt(repsStr);
  return isNaN(n) ? 1 : n;
}

type ExerciseLogRow = {
  weight_used_kg?: number | null;
  sets_completed: number;
  reps_completed: string;
  set_weights?: number[] | null;
};

function calcSessionTonnage(logs: ExerciseLogRow[]): number {
  return logs.reduce((total, log) => {
    if (!log.weight_used_kg && !log.set_weights) return total;
    const reps = parseReps(log.reps_completed);
    if (log.set_weights && log.set_weights.length > 0) {
      return total + log.set_weights.reduce((s, w) => s + (w ?? 0) * reps, 0);
    }
    return total + (log.weight_used_kg ?? 0) * log.sets_completed * reps;
  }, 0);
}

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  // ISO week start = Monday
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  return monday.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function whatsappUrl(phone: string) {
  // Strips everything except digits and leading +
  const clean = phone.replace(/[^\d+]/g, "");
  return `https://wa.me/${clean}`;
}

export default async function AlumnoDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("users").select("*").eq("id", params.id).single();

  if (!student) notFound();

  const [{ data: cycles }, { data: payments }, { data: records }, { data: recentSessions }] = await Promise.all([
    supabase.from("training_cycles").select("*")
      .eq("student_id", params.id).order("created_at", { ascending: false }),
    supabase.from("student_payments").select("*")
      .eq("student_id", params.id).order("due_date", { ascending: false }).limit(6),
    supabase.from("personal_records").select("*, exercises(name)")
      .eq("student_id", params.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("session_logs")
      .select("id, completed_at, exercise_logs(weight_used_kg, sets_completed, reps_completed, set_weights)")
      .eq("student_id", params.id)
      .order("completed_at", { ascending: false })
      .limit(30),
  ]);

  // Build weekly tonnage from recent sessions
  type WeekData = { label: string; tonnage: number; sessions: number };
  const weekMap = new Map<string, WeekData>();

  if (recentSessions) {
    for (const session of recentSessions) {
      const completed = session.completed_at as string;
      if (!completed) continue;
      const weekKey = getWeekLabel(completed);
      const logs = (session.exercise_logs as ExerciseLogRow[]) || [];
      const tonnage = calcSessionTonnage(logs);

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { label: weekKey, tonnage: 0, sessions: 0 });
      }
      const entry = weekMap.get(weekKey)!;
      entry.tonnage += tonnage;
      entry.sessions += 1;
    }
  }

  const weeklyTonnage = Array.from(weekMap.values()).slice(0, 8).reverse();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/entrenador/alumnos" className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
            {student.full_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{student.full_name}</h1>
              {student.modality && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  student.modality === "presencial" ? "bg-blue-100 text-blue-700" :
                  student.modality === "a_distancia" ? "bg-amber-100 text-amber-700" :
                  "bg-purple-100 text-purple-700"
                }`}>
                  {student.modality === "presencial" ? "Presencial" : student.modality === "a_distancia" ? "A distancia" : "Mixto"}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{student.email}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {student.phone && (
            <a
              href={whatsappUrl(student.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#25D366] text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-[#1ebe5d] transition"
              title={`Escribirle por WhatsApp a ${student.full_name}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          )}
          <Link href={`/entrenador/alumnos/${params.id}/1rm`}
            className="flex items-center gap-2 bg-muted text-foreground px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted/80 transition border border-border">
            <BarChart2 className="w-4 h-4" />
            <span className="hidden sm:inline">1RM</span>
          </Link>
          <Link href={`/entrenador/ciclos/nuevo?alumno=${params.id}`}
            className="flex items-center gap-2 bg-primary text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo ciclo</span>
          </Link>
          <AlumnoActions studentId={params.id} studentName={student.full_name} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Datos del alumno */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <h2 className="font-semibold text-foreground">Datos personales</h2>
            {student.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <a
                  href={whatsappUrl(student.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-foreground hover:text-[#25D366] transition-colors group"
                >
                  <span>{student.phone}</span>
                  <MessageCircle className="w-3.5 h-3.5 text-[#25D366] opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
            )}
            {student.birth_date && (
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{formatDate(student.birth_date)}</span>
              </div>
            )}
            {(student.weight_kg || student.height_cm) && (
              <div className="flex gap-4 text-sm">
                {student.weight_kg && <span className="bg-muted px-3 py-1.5 rounded-lg"><b>{student.weight_kg}</b> kg</span>}
                {student.height_cm && <span className="bg-muted px-3 py-1.5 rounded-lg"><b>{student.height_cm}</b> cm</span>}
              </div>
            )}
            {student.goals && (
              <div className="flex items-start gap-3 text-sm">
                <Target className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{student.goals}</span>
              </div>
            )}
            {student.injuries && (
              <div className="flex items-start gap-3 text-sm">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <span className="text-orange-700 text-xs bg-orange-50 p-2 rounded-lg flex-1">{student.injuries}</span>
              </div>
            )}
            {student.monthly_price && (
              <div className="flex items-center gap-3 text-sm pt-2 border-t border-border">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span>{formatCurrency(student.monthly_price)}/mes · vence día {student.payment_due_day}</span>
              </div>
            )}
          </div>

          {/* Plan & Créditos */}
          <StudentPlanCard studentId={params.id} modality={student.modality} />

          {/* PRs */}
          {records && records.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
              <h2 className="font-semibold text-foreground mb-3">Récords personales</h2>
              <div className="space-y-2">
                {records.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground truncate">{(r.exercises as Record<string, string>)?.name}</span>
                    <span className="font-bold text-primary ml-2 shrink-0">{r.weight_kg} kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ciclos y pagos */}
        <div className="lg:col-span-2 space-y-4">
          {/* Ciclos */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Ciclos de entrenamiento</h2>
              <Link href={`/entrenador/ciclos/nuevo?alumno=${params.id}`}
                className="text-sm text-primary hover:underline font-medium">+ Nuevo</Link>
            </div>
            {cycles && cycles.length > 0 ? (
              <div className="space-y-2">
                {cycles.map((cycle) => (
                  <Link key={cycle.id} href={`/entrenador/ciclos/${cycle.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                    <Dumbbell className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{cycle.name}</p>
                      <p className="text-xs text-muted-foreground">{cycle.total_weeks} semanas · desde {formatDate(cycle.start_date)}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${cycle.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {cycle.active ? "Activo" : "Fin"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Sin ciclos asignados todavía.</p>
            )}
          </div>

          {/* Carga semanal (tonnage) */}
          {weeklyTonnage.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">Carga semanal</h2>
                <span className="text-xs text-muted-foreground ml-auto">kg totales movidos</span>
              </div>
              {/* Bar chart (CSS-only) */}
              {(() => {
                const maxTonnage = Math.max(...weeklyTonnage.map(w => w.tonnage), 1);
                return (
                  <div className="flex items-end gap-2 h-28">
                    {weeklyTonnage.map((week, i) => {
                      const pct = week.tonnage > 0 ? (week.tonnage / maxTonnage) * 100 : 0;
                      const isLatest = i === weeklyTonnage.length - 1;
                      return (
                        <div key={week.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                          <span className={`text-xs font-bold ${isLatest ? "text-primary" : "text-muted-foreground"} truncate w-full text-center`}>
                            {week.tonnage > 0 ? `${Math.round(week.tonnage / 1000 * 10) / 10}t` : ""}
                          </span>
                          <div className="w-full flex items-end" style={{ height: "72px" }}>
                            <div
                              className={`w-full rounded-t-lg transition-all ${isLatest ? "bg-primary" : "bg-primary/30"}`}
                              style={{ height: `${Math.max(pct, week.tonnage > 0 ? 8 : 0)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate w-full text-center">{week.label}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              {/* Total last week */}
              {weeklyTonnage.length > 0 && weeklyTonnage[weeklyTonnage.length - 1].tonnage > 0 && (
                <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm">
                  <span className="text-muted-foreground">Semana actual</span>
                  <span className="font-semibold text-foreground">
                    {Math.round(weeklyTonnage[weeklyTonnage.length - 1].tonnage).toLocaleString()} kg
                    <span className="text-xs text-muted-foreground ml-1">
                      ({weeklyTonnage[weeklyTonnage.length - 1].sessions} sesión{weeklyTonnage[weeklyTonnage.length - 1].sessions !== 1 ? "es" : ""})
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Pagos */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Pagos</h2>
              <Link href={`/entrenador/pagos/nuevo?alumno=${params.id}`}
                className="text-sm text-primary hover:underline font-medium">+ Registrar</Link>
            </div>
            {payments && payments.length > 0 ? (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{p.period_label}</p>
                      <p className="text-xs text-muted-foreground">Vence: {formatDate(p.due_date)}</p>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(p.amount)}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PAYMENT_STATUS_COLORS[p.status]}`}>
                      {PAYMENT_STATUS_LABELS[p.status]}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Sin pagos registrados.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
