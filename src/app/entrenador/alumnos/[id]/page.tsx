import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ArrowLeft, User, Calendar, CreditCard, Dumbbell, Phone, Target, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from "@/lib/utils";

export default async function AlumnoDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("users").select("*").eq("id", params.id).single();

  if (!student) notFound();

  const [{ data: cycles }, { data: payments }, { data: records }] = await Promise.all([
    supabase.from("training_cycles").select("*")
      .eq("student_id", params.id).order("created_at", { ascending: false }),
    supabase.from("student_payments").select("*")
      .eq("student_id", params.id).order("due_date", { ascending: false }).limit(6),
    supabase.from("personal_records").select("*, exercises(name)")
      .eq("student_id", params.id).order("created_at", { ascending: false }).limit(5),
  ]);

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
            <h1 className="text-2xl font-bold text-foreground">{student.full_name}</h1>
            <p className="text-sm text-muted-foreground">{student.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/entrenador/ciclos/nuevo?alumno=${params.id}`}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition">
            <Calendar className="w-4 h-4" />
            Nuevo ciclo
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Datos del alumno */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <h2 className="font-semibold text-foreground">Datos personales</h2>
            {student.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{student.phone}</span>
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
