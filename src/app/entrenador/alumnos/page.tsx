import { createClient } from "@/lib/supabase/server";
import { Users, Plus, Search, MessageCircle, Ticket, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { getInitials, formatCurrency } from "@/lib/utils";
import AlumnosCSV from "@/components/AlumnosCSV";

function whatsappUrl(phone: string) {
  const clean = phone.replace(/[^\d+]/g, "");
  return `https://wa.me/${clean}`;
}

const MODALITY_CONFIG: Record<string, { label: string; color: string }> = {
  presencial: { label: "Presencial", color: "bg-blue-100 text-blue-700" },
  a_distancia: { label: "A distancia", color: "bg-amber-100 text-amber-700" },
  mixto: { label: "Mixto", color: "bg-purple-100 text-purple-700" },
};

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function AlumnosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: students } = await supabase
    .from("users")
    .select("*")
    .eq("role", "student")
    
    .order("full_name");

  // Fetch active subscriptions and overdue payments for all students in parallel
  const studentIds = students?.map(s => s.id) || [];
  
  const [subsRes, paymentsRes] = await Promise.all([
    studentIds.length > 0
      ? supabase.from("student_plan_subscriptions")
          .select("student_id, credits_total, credits_used, period_end, status, plans(name)")
          .in("student_id", studentIds)
          .eq("status", "activo")
      : Promise.resolve({ data: [] }),
    studentIds.length > 0
      ? supabase.from("student_payments")
          .select("student_id, due_date, status")
          .in("student_id", studentIds)
          .in("status", ["vencido", "pendiente"])
      : Promise.resolve({ data: [] }),
  ]);

  // Build lookups
  const subsByStudent = new Map<string, any>();
  for (const sub of (subsRes.data || [])) {
    // Keep the most recent one per student
    if (!subsByStudent.has(sub.student_id) || sub.period_end > subsByStudent.get(sub.student_id).period_end) {
      subsByStudent.set(sub.student_id, sub);
    }
  }

  const paymentAlerts = new Map<string, { overdue: number; nearDue: number }>();
  for (const p of (paymentsRes.data || [])) {
    if (!paymentAlerts.has(p.student_id)) {
      paymentAlerts.set(p.student_id, { overdue: 0, nearDue: 0 });
    }
    const alert = paymentAlerts.get(p.student_id)!;
    if (p.status === "vencido") alert.overdue++;
    else if (p.status === "pendiente") {
      const days = daysUntil(p.due_date);
      if (days <= 5 && days >= 0) alert.nearDue++;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alumnos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{students?.length ?? 0} alumnos registrados</p>
        </div>
        <Link href="/entrenador/alumnos/nuevo"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition">
          <Plus className="w-4 h-4" />
          Nuevo alumno
        </Link>
      </div>

      {/* CSV Actions */}
      <AlumnosCSV />

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar alumno..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Lista */}
      {students && students.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {students.map((student) => {
            const sub = subsByStudent.get(student.id);
            const alert = paymentAlerts.get(student.id);
            const modalityConf = MODALITY_CONFIG[student.modality as string];
            const creditsRemaining = sub ? sub.credits_total - sub.credits_used : null;
            const creditsPercent = sub ? (creditsRemaining! / sub.credits_total) * 100 : 0;
            const subDaysLeft = sub ? daysUntil(sub.period_end) : null;

            return (
              <div key={student.id} className="relative group bg-white rounded-2xl shadow-sm border border-border hover:shadow-md hover:border-primary/30 transition-all overflow-hidden">
                
                {/* Payment urgency top stripe */}
                {alert && alert.overdue > 0 && (
                  <div className="h-1 bg-gradient-to-r from-red-500 to-red-400 w-full" />
                )}
                {alert && alert.overdue === 0 && alert.nearDue > 0 && (
                  <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-300 w-full" />
                )}

                <Link href={`/entrenador/alumnos/${student.id}`} className="block p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                      {getInitials(student.full_name || "?")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{student.full_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{student.email}</p>

                      {/* Tags row: estado + modalidad */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          student.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {student.active ? "Activo" : "Inactivo"}
                        </span>
                        {modalityConf && (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${modalityConf.color}`}>
                            {modalityConf.label}
                          </span>
                        )}
                        {student.monthly_price && (
                          <span className="text-[11px] text-muted-foreground">
                            {formatCurrency(student.monthly_price)}/mes
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Plan + Credits bar */}
                  {sub && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-medium text-foreground truncate">
                            {(sub.plans as any)?.name}
                          </span>
                        </div>
                        <span className={`text-xs font-bold ${
                          creditsPercent <= 20 ? "text-red-600" : creditsPercent <= 50 ? "text-amber-600" : "text-primary"
                        }`}>
                          {creditsRemaining}/{sub.credits_total}
                        </span>
                      </div>
                      {/* Mini progress bar */}
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            creditsPercent <= 20 ? "bg-red-500" : creditsPercent <= 50 ? "bg-amber-400" : "bg-primary"
                          }`}
                          style={{ width: `${creditsPercent}%` }}
                        />
                      </div>
                      {subDaysLeft !== null && subDaysLeft <= 7 && subDaysLeft >= 0 && (
                        <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Vence en {subDaysLeft} día{subDaysLeft !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Payment alert */}
                  {alert && alert.overdue > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 bg-red-50 rounded-lg px-2.5 py-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="text-[11px] font-medium text-red-700">
                        {alert.overdue} pago{alert.overdue > 1 ? "s" : ""} vencido{alert.overdue > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                  {alert && alert.overdue === 0 && alert.nearDue > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 bg-amber-50 rounded-lg px-2.5 py-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-[11px] font-medium text-amber-700">
                        Pago próximo a vencer
                      </span>
                    </div>
                  )}
                </Link>

                {/* WhatsApp button */}
                {student.phone && (
                  <a
                    href={whatsappUrl(student.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-xl bg-[#25D366] text-white hover:bg-[#1ebe5d] shadow-sm"
                    title={`WhatsApp · ${student.phone}`}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-border">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Sin alumnos todavía</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Agregá tu primer alumno para comenzar.
          </p>
          <Link href="/entrenador/alumnos/nuevo"
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition">
            <Plus className="w-4 h-4" />
            Agregar alumno
          </Link>
        </div>
      )}
    </div>
  );
}
