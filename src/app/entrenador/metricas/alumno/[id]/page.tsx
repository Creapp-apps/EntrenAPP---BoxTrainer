"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Trophy, TrendingUp, Dumbbell, Flame,
  Target, BarChart3, Weight, Calendar, Clock, CheckCircle2, XCircle, AlertTriangle, ChevronDown,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend, ComposedChart,
} from "recharts";

function parseReps(repsStr: string): number {
  if (!repsStr) return 1;
  const rangeMatch = repsStr.match(/^(\d+)[-x](\d+)$/);
  if (rangeMatch) return Math.round((parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2);
  const n = parseInt(repsStr);
  return isNaN(n) ? 1 : n;
}

const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  return new Date(dateStr);
};

const getMondayStr = (dateStr: string) => {
  const d = parseLocalDate(dateStr);
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  
  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

type StudentData = {
  student_id: string;
  total_sessions: number;
  completed_sessions: number;
  adherence_pct: number;
  personal_records: PREntry[];
  tonnage_30d: number;
  cf_results: CfResult[];
};

type PREntry = {
  exercise_id: string;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  date: string;
  verified: boolean;
};

type CfResult = {
  block_id: string;
  day_id: string;
  score_value: string;
  score_type: string;
  level_used: string;
  date: string;
};

type StudentInfo = {
  full_name: string;
  email: string;
  cf_level?: string;
};

export default function StudentMetricsPage() {
  const params = useParams();
  const studentId = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [data, setData] = useState<StudentData | null>(null);
  const [prHistory, setPrHistory] = useState<Record<string, { date: string; weight_kg: number }[]>>({});
  const [loadFatigue, setLoadFatigue] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>(null);
  const [detailedLogs, setDetailedLogs] = useState<any[]>([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const toggleSession = (id: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => { load(); }, [studentId]);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Info básica del alumno
    const { data: info } = await supabase
      .from("users")
      .select("full_name, email, cf_level")
      .eq("id", studentId)
      .single();
    if (info) setStudentInfo(info as StudentInfo);

    // Métricas del alumno
    const { data: metrics } = await supabase.rpc("student_metrics", {
      p_student_id: studentId,
      p_trainer_id: user.id,
    });
    if (metrics) setData(metrics as unknown as StudentData);

    // Historial de PRs para el gráfico (todos los records del alumno)
    const { data: allPrs } = await supabase
      .from("personal_records")
      .select("exercise_id, weight_kg, date, exercises(name)")
      .eq("student_id", studentId)
      .order("date", { ascending: true });

    const { data: allRms } = await supabase
      .from("student_one_rm")
      .select("exercise_id, weight_kg, recorded_at, exercises(name)")
      .eq("student_id", studentId)
      .order("recorded_at", { ascending: true });

    const mergedHistory: any[] = [];
    if (allPrs) {
      allPrs.forEach((pr: any) => {
        mergedHistory.push({
          exercise_id: pr.exercise_id,
          exercise_name: pr.exercises?.name || "Desconocido",
          weight_kg: Number(pr.weight_kg),
          date: pr.date
        });
      });
    }
    if (allRms) {
      allRms.forEach((rm: any) => {
        mergedHistory.push({
          exercise_id: rm.exercise_id,
          exercise_name: rm.exercises?.name || "Desconocido",
          weight_kg: Number(rm.weight_kg),
          date: rm.recorded_at
        });
      });
    }

    const grouped: Record<string, { date: string; weight_kg: number }[]> = {};
    mergedHistory.forEach(item => {
      if (!grouped[item.exercise_name]) grouped[item.exercise_name] = [];
      grouped[item.exercise_name].push({ date: item.date, weight_kg: item.weight_kg });
    });
    for (const key in grouped) {
      grouped[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    setPrHistory(grouped);

    // Weekly Load & Fatigue
    const { data: lfData, error: lfErr } = await supabase.rpc("student_weekly_load_fatigue", {
      p_student_id: studentId,
      p_weeks: 8,
    });
    if (lfErr) console.error("❌ Error en student_weekly_load_fatigue:", lfErr);
    if (lfData) setLoadFatigue(lfData);

    // Attendance stats
    const { data: attData, error: attErr } = await supabase.rpc("student_attendance_stats", {
      p_student_id: studentId,
      p_days: 30,
    });
    if (attErr) console.error("❌ Error en student_attendance_stats:", attErr);
    if (attData) setAttendance(attData);

    // Fetch detailed logs with exercise names
    const { data: detailedData, error: detailedErr } = await supabase
      .from("session_logs")
      .select(`
        id,
        date,
        rpe_overall,
        comments,
        exercise_logs (
          id,
          sets_completed,
          reps_completed,
          weight_used_kg,
          set_weights,
          exercises (
            name
          )
        )
      `)
      .eq("student_id", studentId)
      .eq("completed", true)
      .order("date", { ascending: false });

    if (detailedErr) console.error("❌ Error en detailed session logs:", detailedErr);
    if (detailedData) setDetailedLogs(detailedData);

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || !studentInfo) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No se pudieron cargar las métricas del alumno.</p>
      </div>
    );
  }

  const adherenceColor = data.adherence_pct >= 70 ? "text-green-600" : data.adherence_pct >= 40 ? "text-amber-600" : "text-red-500";

  // Flatten PR history for chart (pick first exercise with most data)
  const prChartEntries = Object.entries(prHistory).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/entrenador/metricas" className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{studentInfo.full_name}</h1>
          <p className="text-sm text-muted-foreground">{studentInfo.email}</p>
        </div>
        {studentInfo.cf_level && (
          <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full font-semibold uppercase">
            {studentInfo.cf_level}
          </span>
        )}
      </div>

      {/* ─── Summary Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Adherencia */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
          <span className="text-sm font-medium text-muted-foreground">Adherencia</span>
          <p className={`text-3xl font-bold mt-2 ${adherenceColor}`}>{data.adherence_pct}%</p>
          <p className="text-xs text-muted-foreground mt-1">{data.completed_sessions}/{data.total_sessions} sesiones</p>
        </div>

        {/* PRs registrados */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
          <span className="text-sm font-medium text-muted-foreground">PRs registrados</span>
          <p className="text-3xl font-bold text-foreground mt-2">{data.personal_records.length}</p>
          <p className="text-xs text-muted-foreground mt-1">ejercicios con RM</p>
        </div>

        {/* Tonelaje 30d */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
          <span className="text-sm font-medium text-muted-foreground">Tonelaje (30d)</span>
          <p className="text-3xl font-bold text-foreground mt-2">
            {Number(data.tonnage_30d).toLocaleString("es-AR")} <span className="text-base font-normal text-muted-foreground">kg</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">volumen total</p>
        </div>

        {/* WODs CF */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
          <span className="text-sm font-medium text-muted-foreground">WODs cargados</span>
          <p className="text-3xl font-bold text-foreground mt-2">{data.cf_results.length}</p>
          <p className="text-xs text-muted-foreground mt-1">resultados CF</p>
        </div>
      </div>

      {/* ─── Carga y Fatiga (RPE) ─────────────────────────────── */}
      {loadFatigue.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Gráfico 1: Volumen Semanal vs RPE Real */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
            <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary" />
              Volumen Semanal vs. Esfuerzo (RPE)
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Comparación de toneladas levantadas y RPE promedio reportado por semana
            </p>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={loadFatigue}
                  margin={{ top: 10, right: -10, left: -20, bottom: 0 }}
                  onClick={(state) => {
                    if (state && state.activePayload && state.activePayload.length > 0) {
                      const weekStart = state.activePayload[0].payload?.week_start_date;
                      if (weekStart) setSelectedWeekStart(weekStart);
                    }
                  }}
                >
                  <XAxis
                    dataKey="week_start_date"
                    tick={{ fontSize: 9 }}
                    tickFormatter={d => {
                      const date = parseLocalDate(d);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 10]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={d => `Semana del ${parseLocalDate(d).toLocaleDateString("es-AR")}`}
                    formatter={(value: any, name: any, props: any) => {
                      if (name === "Tonelaje") {
                        const workouts = props.payload?.completed_workouts || 0;
                        const avg = workouts > 0 ? Math.round(value / workouts) : 0;
                        return [
                          `Total: ${Number(value).toLocaleString("es-AR")} kg (${workouts} ent. — Prom: ${avg.toLocaleString("es-AR")} kg)`,
                          name
                        ];
                      }
                      return [`${value} RPE`, name];
                    }}
                  />
                  <Bar yAxisId="left" dataKey="total_tonnage" name="Tonelaje" fill="#3b82f6" opacity={0.8} radius={[4, 4, 0, 0]} cursor="pointer" />
                  <Line yAxisId="right" type="monotone" dataKey="avg_real_rpe" name="RPE Real" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1">
              💡 Hacé clic en cualquier barra del gráfico para ver el desglose de ejercicios abajo.
            </p>
          </div>

          {/* Gráfico 2: RPE Real vs RPE Planificado */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
            <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-600" />
              Esfuerzo Real vs. Planificado (RPE)
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Diferencia semanal entre la intensidad planificada y la percibida por el alumno
            </p>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={loadFatigue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="week_start_date"
                    tick={{ fontSize: 9 }}
                    tickFormatter={d => {
                      const date = parseLocalDate(d);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                  <Tooltip labelFormatter={d => `Semana del ${parseLocalDate(d).toLocaleDateString("es-AR")}`} />
                  <Legend tick={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="avg_planned_rpe" name="RPE Planificado" stroke="#a855f7" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="avg_real_rpe" name="RPE Real" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── Desglose semanal de ejercicios (Click en gráfico) ──── */}
      {(() => {
        const groupedSessionsByWeek = detailedLogs.reduce((acc: any, log: any) => {
          const mondayStr = getMondayStr(log.date);
          if (!acc[mondayStr]) acc[mondayStr] = [];
          acc[mondayStr].push(log);
          return acc;
        }, {});

        const activeWeekMonday = selectedWeekStart || (loadFatigue.length > 0 ? loadFatigue[loadFatigue.length - 1].week_start_date : null);
        const activeSessions = activeWeekMonday ? (groupedSessionsByWeek[activeWeekMonday] || []) : [];

        if (activeWeekMonday) {
          return (
            <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-4">
              <div className="border-b border-border pb-3 flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-primary" />
                    Desglose de Entrenamientos
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ejercicios y pesos registrados en la semana del {parseLocalDate(activeWeekMonday).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-xl text-xs font-semibold border border-blue-100">
                  {activeSessions.length} entrenamiento{activeSessions.length !== 1 ? 's' : ''} registrados
                </div>
              </div>

              {activeSessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeSessions.map((session: any) => (
                    <div key={session.id} className="bg-muted/30 border border-border/40 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          {parseLocalDate(session.date).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" })}
                        </span>
                        {session.rpe_overall && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                            RPE {session.rpe_overall}
                          </span>
                        )}
                      </div>

                      {session.comments && (
                        <p className="text-xs text-muted-foreground italic bg-white p-2 rounded-lg border border-border/30">
                          &ldquo;{session.comments}&rdquo;
                        </p>
                      )}

                      <div className="divide-y divide-border/30">
                        {session.exercise_logs && session.exercise_logs.length > 0 ? (
                          session.exercise_logs.map((el: any) => {
                            const reps = parseReps(el.reps_completed);
                            let individualTonnage = 0;
                            if (el.set_weights && el.set_weights.length > 0) {
                              individualTonnage = el.set_weights.reduce((sum: number, w: number) => sum + (w || 0) * reps, 0);
                            } else {
                              individualTonnage = (el.weight_used_kg || 0) * el.sets_completed * reps;
                            }

                            return (
                              <div key={el.id} className="flex items-center justify-between text-xs py-2">
                                <div className="flex-1 pr-4 min-w-0">
                                  <p className="font-semibold text-foreground truncate">{el.exercises?.name || "Ejercicio"}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {el.sets_completed} series × {el.reps_completed} reps {el.set_weights ? `[${el.set_weights.join(", ")} kg]` : `[${el.weight_used_kg || 0} kg]`}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-bold text-foreground text-xs">{individualTonnage.toLocaleString("es-AR")} kg</span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-muted-foreground">Sin ejercicios registrados.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No hay entrenamientos completados registrados en esta semana.
                </p>
              )}
            </div>
          );
        }
        return null;
      })()}

      {/* ─── Historial Completo de Entrenamientos (Acordeón) ────── */}
      {detailedLogs && detailedLogs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-3">
          <div className="border-b border-border pb-3 mb-1">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary" />
              Historial de Entrenamientos Completados
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {detailedLogs.length} sesiones finalizadas · Tocá cada una para ver el desglose
            </p>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {detailedLogs.map((session: any) => {
              const isOpen = expandedSessions.has(session.id);
              const logs = session.exercise_logs || [];
              const sessionTonnage = logs.reduce((total: number, el: any) => {
                const reps = parseReps(el.reps_completed);
                if (el.set_weights && el.set_weights.length > 0) {
                  return total + el.set_weights.reduce((s: number, w: number) => s + (w || 0) * reps, 0);
                }
                return total + (el.weight_used_kg || 0) * (el.sets_completed || 1) * reps;
              }, 0);

              return (
                <div key={session.id} className="border border-border/50 rounded-xl overflow-hidden">
                  {/* Header clicable */}
                  <button
                    onClick={() => toggleSession(session.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {parseLocalDate(session.date).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {logs.length} ejercicio{logs.length !== 1 ? "s" : ""}
                          {sessionTonnage > 0 ? ` · ${sessionTonnage.toLocaleString("es-AR")} kg totales` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {session.rpe_overall && (
                        <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold">
                          RPE {session.rpe_overall}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Contenido expandido */}
                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-border/30 bg-muted/10">
                      {session.comments && (
                        <p className="text-xs text-muted-foreground italic py-2 border-b border-border/20 mb-2">
                          &ldquo;{session.comments}&rdquo;
                        </p>
                      )}
                      <div className="divide-y divide-border/20">
                        {logs.length > 0 ? (
                          logs.map((el: any) => {
                            const reps = parseReps(el.reps_completed);
                            let individualTonnage = 0;
                            if (el.set_weights && el.set_weights.length > 0) {
                              individualTonnage = el.set_weights.reduce((sum: number, w: number) => sum + (w || 0) * reps, 0);
                            } else {
                              individualTonnage = (el.weight_used_kg || 0) * (el.sets_completed || 1) * reps;
                            }
                            const hasWeight = individualTonnage > 0;

                            return (
                              <div key={el.id} className="flex items-center justify-between text-xs py-2.5">
                                <div className="flex-1 pr-3 min-w-0">
                                  <p className="font-semibold text-foreground truncate">{el.exercises?.name || "Ejercicio"}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {el.sets_completed} series × {el.reps_completed} reps
                                    {el.set_weights && el.set_weights.some((w: number) => w > 0)
                                      ? ` · [${el.set_weights.join(", ")} kg]`
                                      : el.weight_used_kg > 0
                                        ? ` · ${el.weight_used_kg} kg`
                                        : " · Sin peso registrado"
                                    }
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  {hasWeight ? (
                                    <span className="font-bold text-foreground text-xs">{individualTonnage.toLocaleString("es-AR")} kg</span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">— kg</span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-muted-foreground py-3">Sin ejercicios registrados.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Asistencia (Reservas) ─────────────────────────────── */}
      {attendance && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Tasa de Presentismo (Pie Chart) */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 lg:col-span-1 flex flex-col justify-between">
            <div>
              <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-600" />
                Presentismo
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                Reservas registradas los últimos 30 días
              </p>
            </div>
            
            {attendance.present === 0 && attendance.no_show === 0 && attendance.cancelled === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground flex-1 flex items-center justify-center">
                Sin reservas en este período
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-[140px] w-full flex justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Asistido", value: Number(attendance.present), color: "#22c55e" },
                          { name: "Falta (No-Show)", value: Number(attendance.no_show), color: "#ef4444" },
                          { name: "Cancelado", value: Number(attendance.cancelled), color: "#9ca3af" },
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={50}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {[
                          { color: "#22c55e" },
                          { color: "#ef4444" },
                          { color: "#9ca3af" },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Leyenda manual */}
                <div className="w-full grid grid-cols-3 gap-2 text-center mt-3">
                  <div className="bg-green-50 rounded-xl p-1.5 border border-green-100/60">
                    <p className="text-[10px] text-green-800 font-medium">Asistió</p>
                    <p className="text-lg font-bold text-green-600">{attendance.present}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-1.5 border border-red-100/60">
                    <p className="text-[10px] text-red-800 font-medium">No-Show</p>
                    <p className="text-lg font-bold text-red-600">{attendance.no_show}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-1.5 border border-gray-100/60">
                    <p className="text-[10px] text-gray-800 font-medium">Canceló</p>
                    <p className="text-lg font-bold text-gray-600">{attendance.cancelled}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Historial de Reservas Recientes */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 lg:col-span-2">
            <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Historial de Reservas Recientes
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Últimas 15 clases reservadas por el alumno
            </p>
            {attendance.history && attendance.history.length > 0 ? (
              <div className="max-h-[220px] overflow-y-auto pr-1">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2">Fecha</th>
                      <th className="py-2">Horario</th>
                      <th className="py-2 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.history.map((h: any) => (
                      <tr key={h.id} className="border-b border-border/40 hover:bg-muted/20">
                        <td className="py-2 font-medium text-foreground">
                          {parseLocalDate(h.booking_date).toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short" })}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {h.slot_label} ({h.start_time.substring(0, 5)} - {h.end_time.substring(0, 5)})
                        </td>
                        <td className="py-2 text-right">
                          <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[9px] ${
                            h.status === "completada" ? "bg-green-100 text-green-700" :
                            h.status === "no_show" ? "bg-red-100 text-red-700" :
                            h.status === "cancelada" ? "bg-gray-100 text-gray-700" :
                            "bg-blue-100 text-blue-700"
                          }`}>
                            {h.status === "completada" ? "Asistió" :
                             h.status === "no_show" ? "No-Show" :
                             h.status === "cancelada" ? "Cancelada" : "Confirmada"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-12">
                Sin reservas en el historial.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── PRs Table ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          Records Personales
        </h2>
        {data.personal_records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Ejercicio</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">Peso</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">Reps</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">Fecha</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">Verificado</th>
                </tr>
              </thead>
              <tbody>
                {data.personal_records.map(pr => (
                  <tr key={pr.exercise_id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2.5 font-medium text-foreground">{pr.exercise_name}</td>
                    <td className="text-center py-2.5 font-bold text-primary">{pr.weight_kg} kg</td>
                    <td className="text-center py-2.5 text-muted-foreground">{pr.reps} rep{pr.reps > 1 ? "s" : ""}</td>
                    <td className="text-center py-2.5 text-muted-foreground">
                      {parseLocalDate(pr.date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="text-center py-2.5">
                      {pr.verified ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Sí</span>
                      ) : (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">Sin PRs registrados</p>
        )}
      </div>

      {/* ─── PR Evolution Charts ──────────────────────────────── */}
      {prChartEntries.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            Evolución de PRs
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {prChartEntries.slice(0, 4).map(([exName, history]) => (
              <div key={exName}>
                <p className="text-sm font-medium text-foreground mb-2">{exName}</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={history}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={d => parseLocalDate(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                    />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip
                      labelFormatter={d => parseLocalDate(d).toLocaleDateString("es-AR")}
                      formatter={(v: number) => [`${v} kg`, "Peso"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight_kg"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#3b82f6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── CF Results ───────────────────────────────────────── */}
      {data.cf_results.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-600" />
            Últimos resultados CrossFit
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Fecha</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">Tipo</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">Score</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">Nivel</th>
                </tr>
              </thead>
              <tbody>
                {data.cf_results.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2.5 text-foreground">
                      {parseLocalDate(r.date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="text-center py-2.5">
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                        {r.score_type}
                      </span>
                    </td>
                    <td className="text-center py-2.5 font-bold text-foreground">{r.score_value}</td>
                    <td className="text-center py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.level_used === "rx" ? "bg-green-100 text-green-700" :
                        r.level_used === "athlete" ? "bg-purple-100 text-purple-700" :
                        "bg-muted text-muted-foreground"
                      }`}>{r.level_used.toUpperCase()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
