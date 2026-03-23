// ─── ROLES ────────────────────────────────────────────────────────────────────
export type UserRole = "trainer" | "co_trainer" | "student";

// ─── USUARIOS ─────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  active: boolean;
  created_by?: string; // trainer_id que creó al alumno
  created_at: string;
}

export interface StudentProfile extends User {
  birth_date?: string;
  weight_kg?: number;
  height_cm?: number;
  goals?: string;
  injuries?: string;
  monthly_price?: number;
  payment_due_day?: number; // día del mes que vence el pago
}

// ─── EJERCICIOS ────────────────────────────────────────────────────────────────
export type ExerciseCategory = "fuerza" | "prep_fisica" | "accesorio";
export type MuscleGroup =
  | "olimpico"
  | "piernas"
  | "espalda"
  | "pecho"
  | "hombros"
  | "brazos"
  | "core"
  | "full_body"
  | "otro";

export interface Exercise {
  id: string;
  trainer_id: string;
  name: string;
  category: ExerciseCategory;
  muscle_group: MuscleGroup;
  video_url?: string;
  thumbnail_url?: string;
  notes?: string;
  archived: boolean;
  created_at: string;
}

// ─── CICLOS DE ENTRENAMIENTO ───────────────────────────────────────────────────
export type WeekType = "carga" | "descarga" | "intensificacion" | "acumulacion" | "test";

export interface PhaseWeek {
  week_number: number;
  type: WeekType;
}

export interface TrainingCycle {
  id: string;
  trainer_id: string;
  student_id: string;
  name: string;
  start_date: string;
  end_date?: string;
  total_weeks: number;
  phase_structure: PhaseWeek[];
  active: boolean;
  created_at: string;
}

export interface TrainingWeek {
  id: string;
  cycle_id: string;
  week_number: number;
  type: WeekType;
}

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1=Lunes ... 7=Domingo

export interface TrainingDay {
  id: string;
  week_id: string;
  day_of_week: DayOfWeek;
  label: string; // ej: "Día de Fuerza A"
  order: number;
}

export type BlockType = "fuerza" | "prep_fisica" | "custom";

export interface TrainingBlock {
  id: string;
  day_id: string;
  name: string;
  type: BlockType;
  order: number;
}

export interface TrainingExercise {
  id: string;
  block_id: string;
  exercise_id: string;
  exercise?: Exercise; // joined
  sets: number;
  reps: string; // puede ser "5", "3-5", "AMRAP"
  weight_target?: number; // kg absolutos
  percentage_1rm?: number; // % del 1RM (alternativa al peso absoluto)
  rpe_target?: number; // 1-10
  tempo?: string; // ej: "3-1-2-0"
  rest_seconds?: number;
  notes?: string;
  order: number;
}

// ─── 1RM POR ALUMNO ────────────────────────────────────────────────────────────
export interface StudentOneRM {
  id: string;
  student_id: string;
  exercise_id: string;
  exercise?: Exercise;
  weight_kg: number;
  date: string;
  notes?: string;
}

// ─── REGISTROS DE SESIÓN ──────────────────────────────────────────────────────
export interface SessionLog {
  id: string;
  student_id: string;
  training_day_id: string;
  training_day?: TrainingDay;
  date: string;
  completed: boolean;
  overall_notes?: string;
  rpe_average?: number;
  created_at: string;
}

export interface ExerciseLog {
  id: string;
  session_log_id: string;
  training_exercise_id: string;
  training_exercise?: TrainingExercise;
  sets_done: number;
  reps_done: string;
  weight_used?: number;
  rpe?: number;
  notes?: string;
}

// ─── RÉCORDS PERSONALES ───────────────────────────────────────────────────────
export interface PersonalRecord {
  id: string;
  student_id: string;
  exercise_id: string;
  exercise?: Exercise;
  weight_kg: number;
  reps: number;
  date: string;
  verified_by_trainer: boolean;
}

// ─── PAGOS ────────────────────────────────────────────────────────────────────
export type PaymentStatus = "pagado" | "pendiente" | "vencido" | "cancelado";
export type PaymentMethod = "mercadopago" | "efectivo" | "transferencia" | "otro";

export interface StudentPayment {
  id: string;
  student_id: string;
  student?: User;
  trainer_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  due_date: string;
  paid_at?: string;
  period_label: string; // ej: "Marzo 2026"
  mercadopago_payment_id?: string;
  mercadopago_preference_id?: string;
  payment_method?: PaymentMethod;
  notes?: string;
  created_at: string;
}

// ─── NOTIFICACIONES ──────────────────────────────────────────────────────────
export type NotificationType =
  | "nueva_planificacion"
  | "pago_vencido"
  | "pago_proximo"
  | "pago_recibido"
  | "nuevo_pr"
  | "mensaje_entrenador"
  | "inactividad";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  created_at: string;
}

// ─── COMENTARIOS ─────────────────────────────────────────────────────────────
export interface SessionComment {
  id: string;
  session_log_id: string;
  user_id: string;
  user?: User;
  message: string;
  created_at: string;
}

// ─── DASHBOARD METRICS ───────────────────────────────────────────────────────
export interface TrainerDashboardMetrics {
  total_students: number;
  active_students: number;
  sessions_today: number;
  monthly_revenue: number;
  overdue_payments: number;
  students_without_plan: number;
}
