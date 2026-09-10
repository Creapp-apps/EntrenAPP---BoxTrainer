"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  PlusCircle,
  Eye,
  MessageCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Flame,
} from "lucide-react";
import { PlanningAlertSummary, StudentPlanningStatus } from "@/lib/planningAlerts";
import { getInitials } from "@/lib/utils";

function whatsappUrl(phone: string, studentName: string) {
  const clean = phone.replace(/[^\d+]/g, "");
  const text = encodeURIComponent(`¡Hola ${studentName}! Te escribo para coordinar tu próxima planilla de entrenamiento.`);
  return `https://wa.me/${clean}?text=${text}`;
}

export default function PlanningAlertsWidget({
  summary,
}: {
  summary: PlanningAlertSummary;
}) {
  const {
    needingReviewCount,
    urgentCount,
    endingThisWeekCount,
    students,
  } = summary;

  // Filtrar los alumnos que necesitan acción (urgentes o por vencer)
  const alertStudents = students.filter(
    (s) => s.urgency === "no_cycle" || s.urgency === "expired" || s.urgency === "ending_soon"
  );

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-border/80 relative overflow-hidden transition-all hover:shadow-md">
      {/* Top ambient highlight */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-red-500 to-primary opacity-80" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100/80 flex items-center justify-center text-amber-700">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              Planillas a Revisar
              {needingReviewCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {needingReviewCount} pendiente{needingReviewCount !== 1 ? "s" : ""}
                </span>
              )}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Detecta alumnos en última semana o sin entrenamientos para que nunca se queden sin plan.
          </p>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {urgentCount > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {urgentCount} urgente{urgentCount !== 1 ? "s" : ""}
            </span>
          )}
          {endingThisWeekCount > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-amber-600" />
              {endingThisWeekCount} por vencer
            </span>
          )}
          <Link
            href="/entrenador/ciclos?tab=revision"
            className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors"
          >
            Ver todos
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Body List */}
      {alertStudents.length > 0 ? (
        <div className="space-y-3">
          {alertStudents.slice(0, 5).map((student) => {
            const isNoCycle = student.urgency === "no_cycle";
            const isExpired = student.urgency === "expired";
            const isEndingSoon = student.urgency === "ending_soon";

            return (
              <div
                key={student.studentId}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isNoCycle || isExpired
                    ? "bg-red-50/40 border-red-100 hover:border-red-200"
                    : "bg-amber-50/30 border-amber-100 hover:border-amber-200"
                }`}
              >
                {/* Info Alumno */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      isNoCycle || isExpired
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {student.studentAvatar ? (
                      <img
                        src={student.studentAvatar}
                        alt=""
                        className="w-full h-full rounded-2xl object-cover"
                      />
                    ) : (
                      getInitials(student.studentName)
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {student.studentName}
                      </p>
                      {student.modality && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground uppercase font-medium">
                          {student.modality === "a_distancia" ? "Online" : student.modality}
                        </span>
                      )}
                    </div>

                    {/* Estado de la planilla */}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {isNoCycle ? (
                        <span className="text-xs font-semibold text-red-700 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          Sin planilla asignada
                        </span>
                      ) : isExpired ? (
                        <span className="text-xs font-medium text-red-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-red-500" />
                          {student.cycleName} · <b className="text-red-800">{student.urgencyLabel}</b>
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-amber-800 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          {student.cycleName} · <b>{student.urgencyLabel}</b>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones Rápidas */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {/* WhatsApp */}
                  {student.studentPhone && (
                    <a
                      href={whatsappUrl(student.studentPhone, student.studentName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl text-muted-foreground hover:text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                      title={`WhatsApp a ${student.studentName}`}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}

                  {/* Ver ciclo actual si tiene */}
                  {student.cycleId && (
                    <Link
                      href={
                        student.cycleType === "crossfit"
                          ? `/entrenador/crossfit/${student.cycleId}`
                          : `/entrenador/ciclos/${student.cycleId}`
                      }
                      className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Ver planilla actual"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  )}

                  {/* Botón Principal: Crear siguiente ciclo */}
                  <Link
                    href={`/entrenador/ciclos/nuevo?alumno=${student.studentId}`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      isNoCycle || isExpired
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-amber-600 hover:bg-amber-700 text-white"
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Planificar</span>
                  </Link>
                </div>
              </div>
            );
          })}

          {alertStudents.length > 5 && (
            <div className="pt-2 text-center">
              <Link
                href="/entrenador/ciclos?tab=revision"
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                + {alertStudents.length - 5} alumnos más requieren revisión · Ver panel completo
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-center flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">¡Todas las planillas al día!</h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
            Ningún alumno activo tiene ciclos vencidos ni está en sus últimos días sin planificación futura.
          </p>
        </div>
      )}
    </div>
  );
}
