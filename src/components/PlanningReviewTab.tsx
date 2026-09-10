"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  PlusCircle,
  Eye,
  MessageCircle,
  User,
  Calendar,
  Sparkles,
  ArrowRight,
  Filter,
} from "lucide-react";
import { StudentPlanningStatus } from "@/lib/planningAlerts";
import { getInitials } from "@/lib/utils";

function whatsappUrl(phone: string, studentName: string) {
  const clean = phone.replace(/[^\d+]/g, "");
  const text = encodeURIComponent(`¡Hola ${studentName}! Te escribo para coordinar tu próxima planilla de entrenamiento.`);
  return `https://wa.me/${clean}?text=${text}`;
}

type FilterType = "all" | "urgent" | "ending_soon" | "up_to_date";

export default function PlanningReviewTab({
  students,
}: {
  students: StudentPlanningStatus[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const urgentCount = students.filter(
    (s) => s.urgency === "no_cycle" || s.urgency === "expired"
  ).length;
  const endingSoonCount = students.filter((s) => s.urgency === "ending_soon").length;
  const upToDateCount = students.filter((s) => s.urgency === "up_to_date").length;

  const filtered = students.filter((s) => {
    // Filter by tab
    if (filter === "urgent" && s.urgency !== "no_cycle" && s.urgency !== "expired") return false;
    if (filter === "ending_soon" && s.urgency !== "ending_soon") return false;
    if (filter === "up_to_date" && s.urgency !== "up_to_date") return false;

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = s.studentName.toLowerCase().includes(q);
      const matchEmail = s.studentEmail.toLowerCase().includes(q);
      const matchCycle = (s.cycleName || "").toLowerCase().includes(q);
      return matchName || matchEmail || matchCycle;
    }

    return true;
  });

  return (
    <div className="space-y-5">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setFilter("all")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filter === "all"
              ? "bg-white border-primary shadow-sm ring-2 ring-primary/20"
              : "bg-white border-border hover:border-border/80"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-muted-foreground">Total Alumnos</span>
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-black text-foreground">{students.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">activos en el box</p>
        </button>

        <button
          onClick={() => setFilter("urgent")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filter === "urgent"
              ? "bg-red-50/80 border-red-500 shadow-sm ring-2 ring-red-500/20"
              : "bg-white border-border hover:border-red-200"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-red-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Sin plan / Vencidas
            </span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-red-600">{urgentCount}</p>
          <p className="text-[11px] text-red-600/80 mt-0.5">atención inmediata</p>
        </button>

        <button
          onClick={() => setFilter("ending_soon")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filter === "ending_soon"
              ? "bg-amber-50/80 border-amber-500 shadow-sm ring-2 ring-amber-500/20"
              : "bg-white border-border hover:border-amber-200"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-amber-800">Última semana</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700">{endingSoonCount}</p>
          <p className="text-[11px] text-amber-700/80 mt-0.5">por terminar en ≤ 7 días</p>
        </button>

        <button
          onClick={() => setFilter("up_to_date")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filter === "up_to_date"
              ? "bg-emerald-50/80 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20"
              : "bg-white border-border hover:border-emerald-200"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-emerald-800">Al día</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{upToDateCount}</p>
          <p className="text-[11px] text-emerald-700/80 mt-0.5">planificación cubierta</p>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por alumno o nombre de planilla..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === "all"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Todos ({students.length})
          </button>
          <button
            onClick={() => setFilter("urgent")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === "urgent"
                ? "bg-red-600 text-white"
                : "bg-red-50 text-red-700 hover:bg-red-100"
            }`}
          >
            🔴 Urgentes ({urgentCount})
          </button>
          <button
            onClick={() => setFilter("ending_soon")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === "ending_soon"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            🟡 Por vencer ({endingSoonCount})
          </button>
          <button
            onClick={() => setFilter("up_to_date")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === "up_to_date"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            🟢 Al día ({upToDateCount})
          </button>
        </div>
      </div>

      {/* Students List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((student) => {
            const isNoCycle = student.urgency === "no_cycle";
            const isExpired = student.urgency === "expired";
            const isEndingSoon = student.urgency === "ending_soon";
            const isUpToDate = student.urgency === "up_to_date";

            // Progress calculation
            const currentW = student.currentWeek || 0;
            const totalW = student.totalWeeks || 1;
            const progressPercent = Math.min(100, Math.round((currentW / totalW) * 100));

            return (
              <div
                key={student.studentId}
                className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all shadow-sm hover:shadow-md ${
                  isNoCycle || isExpired
                    ? "border-red-200 hover:border-red-300"
                    : isEndingSoon
                    ? "border-amber-200 hover:border-amber-300"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Student Info & Planilla */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 ${
                        isNoCycle || isExpired
                          ? "bg-red-100 text-red-700"
                          : isEndingSoon
                          ? "bg-amber-100 text-amber-800"
                          : "bg-primary/10 text-primary"
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/entrenador/alumnos/${student.studentId}`}
                          className="font-bold text-base text-foreground hover:text-primary transition-colors truncate"
                        >
                          {student.studentName}
                        </Link>
                        {student.modality && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-muted text-muted-foreground">
                            {student.modality === "a_distancia" ? "A distancia" : student.modality}
                          </span>
                        )}
                        {/* Urgency Badge */}
                        {isNoCycle ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Sin planilla
                          </span>
                        ) : isExpired ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Planilla vencida
                          </span>
                        ) : isEndingSoon ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Por vencer
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Al día
                          </span>
                        )}
                      </div>

                      {/* Subtitle / Current Cycle details */}
                      {student.cycleName ? (
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="font-semibold text-foreground">
                            {student.cycleName}
                          </span>
                          <span>·</span>
                          <span>
                            Semana {student.currentWeek} de {student.totalWeeks}
                          </span>
                          <span>·</span>
                          <span
                            className={
                              isExpired
                                ? "text-red-600 font-bold"
                                : isEndingSoon
                                ? "text-amber-700 font-bold"
                                : "text-muted-foreground"
                            }
                          >
                            {student.urgencyLabel}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-red-600 mt-1 font-medium">
                          El alumno no tiene entrenamientos activos. Creale un nuevo ciclo para empezar.
                        </p>
                      )}

                      {/* Next scheduled cycle badge if covered */}
                      {student.hasNextCycleScheduled && (
                        <p className="text-xs text-emerald-700 mt-1 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Próximo ciclo programado: <b>{student.nextCycleName}</b>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar & Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:w-96 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border">
                    {/* Progress Bar if has cycle */}
                    {student.cycleName ? (
                      <div className="flex-1 w-full sm:w-auto">
                        <div className="flex items-center justify-between text-[11px] mb-1 font-medium">
                          <span className="text-muted-foreground">Progreso del ciclo</span>
                          <span
                            className={`font-bold ${
                              progressPercent >= 100
                                ? "text-red-600"
                                : progressPercent >= 75
                                ? "text-amber-600"
                                : "text-primary"
                            }`}
                          >
                            {currentW}/{totalW} sem ({progressPercent}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              progressPercent >= 100
                                ? "bg-red-500"
                                : progressPercent >= 75
                                ? "bg-amber-400"
                                : "bg-primary"
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 text-xs text-muted-foreground italic">
                        Sin barra de progreso
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {/* WhatsApp */}
                      {student.studentPhone && (
                        <a
                          href={whatsappUrl(student.studentPhone, student.studentName)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl text-muted-foreground hover:text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                          title={`WhatsApp a ${student.studentName}`}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}

                      {/* Ver ciclo actual */}
                      {student.cycleId && (
                        <Link
                          href={
                            student.cycleType === "crossfit"
                              ? `/entrenador/crossfit/${student.cycleId}`
                              : `/entrenador/ciclos/${student.cycleId}`
                          }
                          className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Ver planilla"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      )}

                      {/* Botón principal de Nuevo Ciclo / Renovar */}
                      <Link
                        href={`/entrenador/ciclos/nuevo?alumno=${student.studentId}`}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                          isNoCycle || isExpired
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : isEndingSoon
                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                            : "bg-primary hover:bg-primary/90 text-white"
                        }`}
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>{isNoCycle ? "Crear ciclo" : "Siguiente ciclo"}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-border">
          <Filter className="w-10 h-10 text-muted-foreground/60 mx-auto mb-2" />
          <h3 className="font-semibold text-foreground">No se encontraron alumnos</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {search
              ? "Probá con otro término de búsqueda."
              : "No hay alumnos en esta categoría de filtro."}
          </p>
        </div>
      )}
    </div>
  );
}
