import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Autenticación del usuario actual
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Usamos el cliente administrativo para tener bypass de RLS y poder exportar todo consolidado
    const adminSupabase = await createAdminClient();

    // 2. Obtener perfil del usuario solicitante
    const { data: profile, error: profileError } = await adminSupabase
      .from("users")
      .select("role, box_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }

    const isSuperAdmin = profile.role === "super_admin";
    const isTrainer = profile.role === "trainer" || profile.role === "professor" || profile.role === "co_trainer";

    if (!isSuperAdmin && !isTrainer) {
      return NextResponse.json({ error: "Acción no permitida" }, { status: 403 });
    }

    // Estructura para el JSON consolidado
    let exportData: Record<string, any> = {};
    let filenamePrefix = "backup_global";

    // ───────────── MODO SUPER ADMIN (TOTAL DE BASE DE DATOS) ─────────────
    if (isSuperAdmin) {
      const tablesToDump = [
        "boxes", "users", "plans", "student_plan_subscriptions", 
        "student_payments", "box_schedule_templates", "box_schedule_slots", 
        "bookings", "exercises", "exercise_variants", "exercise_complexes",
        "training_cycles", "training_weeks", "training_days", "training_blocks",
        "training_exercises", "training_complex_sets", "student_results", "student_rms",
        "cf_exercises", "cf_block_exercises", "cf_wod_levels", "cf_results"
      ];

      // Consultas concurrentes de volcado completo
      const fetchPromises = tablesToDump.map(async (table) => {
        const { data } = await adminSupabase.from(table).select("*");
        return { table, data: data || [] };
      });

      const results = await Promise.all(fetchPromises);
      results.forEach(({ table, data }) => {
        exportData[table] = data;
      });

      filenamePrefix = "backup_global_total";

    } 
    // ───────────── MODO ENTRENADOR (FILTRADO POR BOX) ─────────────
    else {
      const boxId = profile.box_id;
      if (!boxId) {
        return NextResponse.json({ error: "El usuario no está asociado a ningún Box" }, { status: 400 });
      }

      // ─── PASO 1: Datos del Box, Usuarios, Planes, y Horarios del Box ───
      const [boxRes, usersRes, plansRes, schedTemplatesRes] = await Promise.all([
        adminSupabase.from("boxes").select("*").eq("id", boxId).single(),
        adminSupabase.from("users").select("*").eq("box_id", boxId),
        adminSupabase.from("plans").select("*").eq("box_id", boxId),
        adminSupabase.from("box_schedule_templates").select("*").eq("box_id", boxId)
      ]);

      const box = boxRes.data;
      const users = usersRes.data || [];
      const plans = plansRes.data || [];
      const scheduleTemplates = schedTemplatesRes.data || [];

      exportData["boxes"] = box ? [box] : [];
      exportData["users"] = users;
      exportData["plans"] = plans;
      exportData["box_schedule_templates"] = scheduleTemplates;

      filenamePrefix = `backup_box_${box?.name ? box.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : boxId}`;

      // IDs para consultas descendentes
      const allUserIds = users.map(u => u.id);
      const studentIds = users.filter(u => u.role === "student").map(u => u.id);
      const trainerIds = users.filter(u => u.role !== "student").map(u => u.id);
      const templateIds = scheduleTemplates.map(t => t.id);

      // ─── PASO 2: Consultas en cascada ───
      const hasUsers = allUserIds.length > 0;
      const hasStudents = studentIds.length > 0;
      const hasTrainers = trainerIds.length > 0;
      const hasTemplates = templateIds.length > 0;

      const [
        slotsRes, bookingsRes, subsRes, paymentsRes, resultsRes, rmsRes,
        cyclesRes, cfExercisesRes, cfResultsRes, customExercisesRes, customVariantsRes
      ] = await Promise.all([
        hasTemplates ? adminSupabase.from("box_schedule_slots").select("*").in("template_id", templateIds) : Promise.resolve({ data: [] }),
        hasStudents ? adminSupabase.from("bookings").select("*").in("student_id", studentIds) : Promise.resolve({ data: [] }),
        hasStudents ? adminSupabase.from("student_plan_subscriptions").select("*").in("student_id", studentIds) : Promise.resolve({ data: [] }),
        hasStudents ? adminSupabase.from("student_payments").select("*").in("student_id", studentIds) : Promise.resolve({ data: [] }),
        hasStudents ? adminSupabase.from("student_results").select("*").in("student_id", studentIds) : Promise.resolve({ data: [] }),
        hasStudents ? adminSupabase.from("student_rms").select("*").in("student_id", studentIds) : Promise.resolve({ data: [] }),
        hasUsers ? adminSupabase.from("training_cycles").select("*").or(`trainer_id.in.(${allUserIds.join(',')}),student_id.in.(${allUserIds.join(',')})`) : Promise.resolve({ data: [] }),
        hasTrainers ? adminSupabase.from("cf_exercises").select("*").in("trainer_id", trainerIds) : Promise.resolve({ data: [] }),
        hasStudents ? adminSupabase.from("cf_results").select("*").in("student_id", studentIds) : Promise.resolve({ data: [] }),
        hasTrainers ? adminSupabase.from("exercises").select("*").in("created_by", trainerIds) : Promise.resolve({ data: [] }),
        hasTrainers ? adminSupabase.from("exercise_variants").select("*").in("created_by", trainerIds) : Promise.resolve({ data: [] })
      ]);

      exportData["box_schedule_slots"] = slotsRes.data || [];
      exportData["bookings"] = bookingsRes.data || [];
      exportData["student_plan_subscriptions"] = subsRes.data || [];
      exportData["student_payments"] = paymentsRes.data || [];
      exportData["student_results"] = resultsRes.data || [];
      exportData["student_rms"] = rmsRes.data || [];
      exportData["cf_exercises"] = cfExercisesRes.data || [];
      exportData["cf_results"] = cfResultsRes.data || [];
      exportData["exercises"] = customExercisesRes.data || [];
      exportData["exercise_variants"] = customVariantsRes.data || [];
      
      const cycles = cyclesRes.data || [];
      exportData["training_cycles"] = cycles;

      // ─── PASO 3: Planificación profunda (Ciclos -> Semanas -> Días) ───
      const cycleIds = cycles.map(c => c.id);
      const hasCycles = cycleIds.length > 0;

      const { data: weeks } = hasCycles 
        ? await adminSupabase.from("training_weeks").select("*").in("cycle_id", cycleIds) 
        : { data: [] };
      
      exportData["training_weeks"] = weeks || [];

      const weekIds = (weeks || []).map(w => w.id);
      const hasWeeks = weekIds.length > 0;

      const { data: days } = hasWeeks
        ? await adminSupabase.from("training_days").select("*").in("week_id", weekIds)
        : { data: [] };

      exportData["training_days"] = days || [];

      const dayIds = (days || []).map(d => d.id);
      const hasDays = dayIds.length > 0;

      // ─── PASO 4: Planificación de bloques y sets ───
      const [blocksRes, complexSetsRes] = await Promise.all([
        hasDays ? adminSupabase.from("training_blocks").select("*").in("day_id", dayIds) : Promise.resolve({ data: [] }),
        hasDays ? adminSupabase.from("training_complex_sets").select("*").in("day_id", dayIds) : Promise.resolve({ data: [] })
      ]);

      exportData["training_blocks"] = blocksRes.data || [];
      exportData["training_complex_sets"] = complexSetsRes.data || [];

      const blockIds = (blocksRes.data || []).map(b => b.id);
      const hasBlocks = blockIds.length > 0;

      // ─── PASO 5: Ejercicios puntuales por bloque (Fuerza y CrossFit) ───
      const [exRes, cfBlockExRes] = await Promise.all([
        hasBlocks ? adminSupabase.from("training_exercises").select("*").in("block_id", blockIds) : Promise.resolve({ data: [] }),
        hasBlocks ? adminSupabase.from("cf_block_exercises").select("*").in("block_id", blockIds) : Promise.resolve({ data: [] })
      ]);

      exportData["training_exercises"] = exRes.data || [];
      const cfBlockEx = cfBlockExRes.data || [];
      exportData["cf_block_exercises"] = cfBlockEx;

      // ─── PASO 6: Niveles de CrossFit por bloque ───
      const cfBlockExIds = cfBlockEx.map(c => c.id);
      const hasCfBlockEx = cfBlockExIds.length > 0;

      const { data: cfLevels } = hasCfBlockEx
        ? await adminSupabase.from("cf_wod_levels").select("*").in("block_exercise_id", cfBlockExIds)
        : { data: [] };

      exportData["cf_wod_levels"] = cfLevels || [];
    }

    // 3. Preparar Objeto Final del Backup
    const finalBackupObject = {
      app: "EntrenAPP",
      backup_version: "1.0",
      timestamp: new Date().toISOString(),
      exported_by: user.email,
      is_full_backup: isSuperAdmin,
      tables: exportData
    };

    // Formatear el nombre del archivo: prefijo + fecha legible
    const dateFormatted = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const filename = `${filenamePrefix}_${dateFormatted}.json`;

    // 4. Retornar Stream JSON como descarga directa
    return new Response(JSON.stringify(finalBackupObject, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });

  } catch (err: any) {
    console.error("Error crítico en backup API:", err);
    return NextResponse.json({ error: "Fallo del servidor generando backup" }, { status: 500 });
  }
}
