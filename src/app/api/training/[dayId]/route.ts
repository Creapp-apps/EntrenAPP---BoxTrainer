import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/training/[dayId]
// Retorna los bloques + ejercicios completos de un día de entrenamiento.
// Usa el admin client (service role) para bypassear el RLS de exercises,
// ya que el join training_exercises → exercises falla para el rol 'student'.
// La autenticación y autorización se verifican explícitamente antes de retornar datos.
export async function GET(
  _req: NextRequest,
  { params }: { params: { dayId: string } }
) {
  const { dayId } = params;

  // 1. Verificar que el usuario esté autenticado (client con cookies)
  const supabaseUser = await createClient();
  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Usar el admin client para queries que bypasean RLS
  const admin = await createAdminClient();

  // 3. Verificar que el día pertenece a un ciclo
  const { data: dayData, error: dayError } = await admin
    .from("training_days")
    .select(`
      id,
      training_weeks!inner (
        week_number,
        type,
        training_cycles!inner ( id, name, cycle_type )
      )
    `)
    .eq("id", dayId)
    .single();

  if (dayError || !dayData) {
    return NextResponse.json({ error: "Day not found" }, { status: 404 });
  }

  // 4. Verificar que el alumno está enrolado activamente en este ciclo
  const week = (dayData as any).training_weeks;
  const cycle = week?.training_cycles;

  const { data: enrollData, error: enrollError } = await admin
    .from("training_cycle_enrollments")
    .select("id")
    .eq("cycle_id", cycle.id)
    .eq("student_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (enrollError || !enrollData) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 5. Fetchear bloques + ejercicios completos con admin (sin límite de RLS)
  const { data: blocksData, error: blocksError } = await admin
    .from("training_blocks")
    .select(`
      id, name, type, order, wod_type, wod_config,
      training_exercises (
        id, exercise_id, variant_id, sets, reps,
        percentage_1rm, weight_target, rest_seconds, notes, order,
        complex_id, complex_order,
        exercises ( id, name, category, video_url, thumbnail_url, notes, muscle_group ),
        exercise_variants ( id, name, video_url )
      ),
      cf_block_exercises (
        id, exercise_id, variant_id, order, reps, unit_override, notes, sets,
        cf_exercises ( id, name, category, default_unit, video_url ),
        cf_exercise_variants ( id, name, video_url ),
        cf_wod_levels ( id, level, value, notes )
      )
    `)
    .eq("day_id", dayId)
    .order("order");

  if (blocksError) {
    console.error("[api/training] blocksError:", blocksError);
    return NextResponse.json({ error: blocksError.message }, { status: 500 });
  }

  // 6. Fetchear complex sets para el día
  const { data: complexSets, error: setsError } = await admin
    .from("training_complex_sets")
    .select("id, complex_id, set_number, percentage_1rm, reps_overrides, rounds")
    .eq("day_id", dayId)
    .order("set_number");

  if (setsError) {
    console.error("[api/training] setsError:", setsError);
  }

  // 7. Fetchear 1RM del alumno
  const { data: oneRMs } = await admin
    .from("student_one_rm")
    .select("exercise_id, weight_kg")
    .eq("student_id", user.id);

  // 8. Fetchear overrides personalizados del alumno para este ciclo
  const { data: studentOverrides } = await admin
    .from("student_exercise_overrides")
    .select("training_exercise_id, weight_target, percentage_1rm")
    .eq("enrollment_id", enrollData.id);

  // Construir un mapa training_exercise_id -> override para fácil lookup
  const overridesMap: Record<string, { weight_target?: number | null; percentage_1rm?: number | null }> = {};
  for (const ov of studentOverrides || []) {
    overridesMap[ov.training_exercise_id] = {
      weight_target: ov.weight_target,
      percentage_1rm: ov.percentage_1rm,
    };
  }

  return NextResponse.json({
    blocks: blocksData || [],
    complexSets: complexSets || [],
    oneRMs: oneRMs || [],
    studentOverrides: overridesMap,
    dayInfo: {
      cycle_id: cycle?.id,
      cycle_name: cycle?.name,
      week_number: week?.week_number,
      cycle_type: cycle?.cycle_type,
    },
  });
}
