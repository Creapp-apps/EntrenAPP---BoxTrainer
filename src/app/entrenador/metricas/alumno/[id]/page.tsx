"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Trophy, TrendingUp, Dumbbell, Flame,
  Target, BarChart3, Weight, Calendar,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";

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

    if (allPrs) {
      const grouped: Record<string, { date: string; weight_kg: number }[]> = {};
      for (const pr of allPrs as any[]) {
        const name = pr.exercises?.name || "Desconocido";
        if (!grouped[name]) grouped[name] = [];
        grouped[name].push({ date: pr.date, weight_kg: Number(pr.weight_kg) });
      }
      setPrHistory(grouped);
    }

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
                      {new Date(pr.date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
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
                      tickFormatter={d => new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                    />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip
                      labelFormatter={d => new Date(d).toLocaleDateString("es-AR")}
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
                      {new Date(r.date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
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
