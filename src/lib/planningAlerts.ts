/**
 * Sistema de Detección y Alertas de Planificación (Planillas)
 *
 * Determina qué alumnos están por quedarse sin planificación,
 * qué planillas ya finalizaron y qué alumnos no tienen planilla asignada.
 */

export type PlanningUrgency = "expired" | "no_cycle" | "ending_soon" | "up_to_date";

export interface StudentPlanningStatus {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string | null;
  studentAvatar?: string | null;
  modality?: string | null;
  studentStatus?: string | null; // active, paused, suspended
  studentActive: boolean;

  urgency: PlanningUrgency;
  urgencyLabel: string;
  urgencyScore: number; // 1 = Urgente (sin plan o vencido), 2 = Última semana (<= 7 días), 3 = Penúltima semana (<= 14 días), 4 = Al día con próximo plan, 5 = Al día

  // Datos del ciclo actual
  cycleId?: string;
  cycleName?: string;
  cycleType?: "fuerza" | "crossfit" | string;
  currentWeek?: number;
  totalWeeks?: number;
  daysRemaining?: number;
  startDate?: string;
  endDate?: string;
  syncMode?: "SYNC" | "ASYNC" | string;

  // Próximo ciclo si ya fue planificado
  hasNextCycleScheduled?: boolean;
  nextCycleName?: string;
  nextCycleStartDate?: string;
}

export interface PlanningAlertSummary {
  totalStudents: number;
  needingReviewCount: number; // expired + no_cycle + ending_soon
  urgentCount: number; // expired + no_cycle
  endingThisWeekCount: number; // ending_soon (<= 7 días)
  noCycleCount: number;
  expiredCount: number;
  upToDateCount: number;
  students: StudentPlanningStatus[];
}

interface RawCycleEnrollment {
  id: string;
  active?: boolean;
  sync_mode?: string;
  enrolled_at?: string;
  training_cycles?: {
    id: string;
    name: string;
    start_date: string;
    end_date?: string | null;
    total_weeks: number;
    cycle_type?: string;
    is_template?: boolean;
    active?: boolean;
  } | null;
}

export interface RawStudentWithEnrollments {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  modality?: string | null;
  status?: string | null;
  active?: boolean;
  training_cycle_enrollments?: RawCycleEnrollment[] | null;
}

/**
 * Calcula el estado de planificación para un único alumno.
 */
export function calculateStudentPlanningStatus(
  student: RawStudentWithEnrollments,
  referenceDate: Date = new Date()
): StudentPlanningStatus {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const baseResult: StudentPlanningStatus = {
    studentId: student.id,
    studentName: student.full_name || "Alumno",
    studentEmail: student.email || "",
    studentPhone: student.phone,
    studentAvatar: student.avatar_url,
    modality: student.modality,
    studentStatus: student.status,
    studentActive: student.active !== false,
    urgency: "up_to_date",
    urgencyLabel: "Al día",
    urgencyScore: 5,
  };

  // Filtrar inscripciones activas a ciclos válidos (no plantillas)
  const validEnrollments = (student.training_cycle_enrollments || []).filter(
    (e) => e.active !== false && e.training_cycles && !e.training_cycles.is_template
  );

  if (validEnrollments.length === 0) {
    return {
      ...baseResult,
      urgency: "no_cycle",
      urgencyLabel: "Sin planilla asignada",
      urgencyScore: 1,
    };
  }

  // Mapear ciclos con sus fechas efectivas
  const parsedCycles = validEnrollments.map((enrollment) => {
    const cycle = enrollment.training_cycles!;
    const syncMode = (enrollment.sync_mode || "SYNC").toUpperCase();
    const startDateStr = syncMode === "ASYNC" && enrollment.enrolled_at
      ? enrollment.enrolled_at.split("T")[0]
      : cycle.start_date || new Date().toISOString().split("T")[0];

    const startDate = new Date(startDateStr + "T00:00:00");
    const totalWeeks = Number(cycle.total_weeks) || 4;
    const durationDays = totalWeeks * 7;
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(daysDiff / 7) + 1;
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
      enrollment,
      cycle,
      syncMode,
      startDateStr,
      startDate,
      endDateStr: endDate.toISOString().split("T")[0],
      endDate,
      totalWeeks,
      currentWeek,
      daysRemaining,
    };
  });

  // Ordenar por fecha de fin descendente para encontrar el ciclo actual / más relevante
  parsedCycles.sort((a, b) => b.endDate.getTime() - a.endDate.getTime());

  // Buscar si hay algún ciclo actual (donde today esté entre start y end, o el más reciente)
  // O un ciclo futuro ya agendado
  const futureCycles = parsedCycles.filter((c) => c.startDate.getTime() > today.getTime());
  const activeOrPastCycles = parsedCycles.filter((c) => c.startDate.getTime() <= today.getTime());

  // Ciclo principal en curso
  const currentCycle = activeOrPastCycles.length > 0 ? activeOrPastCycles[0] : parsedCycles[0];
  const nextScheduledCycle = futureCycles.find(
    (c) => c.cycle.id !== currentCycle.cycle.id && c.startDate.getTime() >= currentCycle.startDate.getTime()
  );

  const hasNextCycle = !!nextScheduledCycle;
  const daysRemaining = currentCycle.daysRemaining;
  const currentWeek = currentCycle.currentWeek;
  const totalWeeks = currentCycle.totalWeeks;

  // Evaluar estado de urgencia
  if (hasNextCycle) {
    return {
      ...baseResult,
      cycleId: currentCycle.cycle.id,
      cycleName: currentCycle.cycle.name,
      cycleType: currentCycle.cycle.cycle_type || "fuerza",
      currentWeek: Math.max(1, Math.min(currentWeek, totalWeeks)),
      totalWeeks,
      daysRemaining,
      startDate: currentCycle.startDateStr,
      endDate: currentCycle.endDateStr,
      syncMode: currentCycle.syncMode,
      hasNextCycleScheduled: true,
      nextCycleName: nextScheduledCycle.cycle.name,
      nextCycleStartDate: nextScheduledCycle.startDateStr,
      urgency: "up_to_date",
      urgencyLabel: `Próximo ciclo listo: ${nextScheduledCycle.cycle.name}`,
      urgencyScore: 4,
    };
  }

  // 1. Ciclo Vencido / Terminado sin nuevo plan
  if (daysRemaining <= 0 || currentWeek > totalWeeks) {
    const daysAgo = Math.abs(daysRemaining);
    const label = daysAgo === 0 ? "Venció hoy" : `Venció hace ${daysAgo} día${daysAgo !== 1 ? "s" : ""}`;
    return {
      ...baseResult,
      cycleId: currentCycle.cycle.id,
      cycleName: currentCycle.cycle.name,
      cycleType: currentCycle.cycle.cycle_type || "fuerza",
      currentWeek: Math.min(currentWeek, totalWeeks),
      totalWeeks,
      daysRemaining,
      startDate: currentCycle.startDateStr,
      endDate: currentCycle.endDateStr,
      syncMode: currentCycle.syncMode,
      urgency: "expired",
      urgencyLabel: `${label} · Requiere nuevo ciclo`,
      urgencyScore: 1,
    };
  }

  // 2. Última semana del ciclo (o quedan <= 7 días)
  if (daysRemaining <= 7 || currentWeek === totalWeeks) {
    const label = daysRemaining === 1 ? "Vence mañana" : `Vence en ${daysRemaining} días`;
    return {
      ...baseResult,
      cycleId: currentCycle.cycle.id,
      cycleName: currentCycle.cycle.name,
      cycleType: currentCycle.cycle.cycle_type || "fuerza",
      currentWeek: Math.max(1, Math.min(currentWeek, totalWeeks)),
      totalWeeks,
      daysRemaining,
      startDate: currentCycle.startDateStr,
      endDate: currentCycle.endDateStr,
      syncMode: currentCycle.syncMode,
      urgency: "ending_soon",
      urgencyLabel: `Última semana (S${currentWeek}/${totalWeeks}) · ${label}`,
      urgencyScore: 2,
    };
  }

  // 3. Penúltima semana (8 a 14 días)
  if (daysRemaining <= 14 || currentWeek === totalWeeks - 1) {
    return {
      ...baseResult,
      cycleId: currentCycle.cycle.id,
      cycleName: currentCycle.cycle.name,
      cycleType: currentCycle.cycle.cycle_type || "fuerza",
      currentWeek: Math.max(1, Math.min(currentWeek, totalWeeks)),
      totalWeeks,
      daysRemaining,
      startDate: currentCycle.startDateStr,
      endDate: currentCycle.endDateStr,
      syncMode: currentCycle.syncMode,
      urgency: "ending_soon",
      urgencyLabel: `Semana ${currentWeek} de ${totalWeeks} · Quedan ${daysRemaining} días`,
      urgencyScore: 3,
    };
  }

  // 4. Normal / Al día
  return {
    ...baseResult,
    cycleId: currentCycle.cycle.id,
    cycleName: currentCycle.cycle.name,
    cycleType: currentCycle.cycle.cycle_type || "fuerza",
    currentWeek: Math.max(1, currentWeek),
    totalWeeks,
    daysRemaining,
    startDate: currentCycle.startDateStr,
    endDate: currentCycle.endDateStr,
    syncMode: currentCycle.syncMode,
    urgency: "up_to_date",
    urgencyLabel: `Semana ${currentWeek} de ${totalWeeks} · Al día`,
    urgencyScore: 5,
  };
}

/**
 * Evalúa y ordena a todos los alumnos según prioridad de revisión.
 */
export function evaluateAllStudentsPlanning(
  students: RawStudentWithEnrollments[],
  referenceDate: Date = new Date()
): PlanningAlertSummary {
  const evaluated = students.map((s) => calculateStudentPlanningStatus(s, referenceDate));

  // Ordenar por score de urgencia ascendente (1 es más urgente)
  // En caso de empate, los que tienen menos días restantes van primero
  evaluated.sort((a, b) => {
    if (a.urgencyScore !== b.urgencyScore) {
      return a.urgencyScore - b.urgencyScore;
    }
    const daysA = a.daysRemaining ?? -9999;
    const daysB = b.daysRemaining ?? -9999;
    return daysA - daysB;
  });

  let noCycleCount = 0;
  let expiredCount = 0;
  let endingThisWeekCount = 0;
  let upToDateCount = 0;

  for (const s of evaluated) {
    if (s.urgency === "no_cycle") noCycleCount++;
    else if (s.urgency === "expired") expiredCount++;
    else if (s.urgency === "ending_soon") endingThisWeekCount++;
    else upToDateCount++;
  }

  const urgentCount = noCycleCount + expiredCount;
  const needingReviewCount = urgentCount + endingThisWeekCount;

  return {
    totalStudents: students.length,
    needingReviewCount,
    urgentCount,
    endingThisWeekCount,
    noCycleCount,
    expiredCount,
    upToDateCount,
    students: evaluated,
  };
}

/**
 * Consulta y evalúa las alertas de planificación para los alumnos de un box dado.
 */
export async function getBoxPlanningAlerts(
  supabase: any,
  boxId?: string | null
): Promise<PlanningAlertSummary> {
  let query = supabase
    .from("users")
    .select(`
      id,
      full_name,
      email,
      phone,
      avatar_url,
      modality,
      status,
      active,
      training_cycle_enrollments(
        id,
        active,
        sync_mode,
        enrolled_at,
        training_cycles(
          id,
          name,
          start_date,
          end_date,
          total_weeks,
          cycle_type,
          is_template,
          active
        )
      )
    `)
    .eq("role", "student")
    .eq("active", true);

  if (boxId) {
    query = query.eq("box_id", boxId);
  }

  const { data: students, error } = await query.order("full_name");
  if (error || !students) {
    console.error("[PLANNING_ALERTS] Error fetching students:", error?.message);
    return {
      totalStudents: 0,
      needingReviewCount: 0,
      urgentCount: 0,
      endingThisWeekCount: 0,
      noCycleCount: 0,
      expiredCount: 0,
      upToDateCount: 0,
      students: [],
    };
  }

  return evaluateAllStudentsPlanning(students as RawStudentWithEnrollments[]);
}
