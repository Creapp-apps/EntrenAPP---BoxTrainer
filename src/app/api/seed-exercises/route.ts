import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { DEFAULT_FUERZA, DEFAULT_PREP_FISICA, DEFAULT_CROSSFIT } from "@/lib/defaultExercises";

export async function POST() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify user is trainer or super_admin
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!profile || !["trainer", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check how many exercises already exist
  const { count: existingCount } = await admin
    .from("exercises")
    .select("id", { count: "exact", head: true })
    .eq("trainer_id", user.id)
    .eq("archived", false);

  const { count: existingCfCount } = await admin
    .from("cf_exercises")
    .select("id", { count: "exact", head: true })
    .eq("trainer_id", user.id)
    .eq("archived", false);

  // Insert Fuerza + Prep Física exercises
  const allExercises = [...DEFAULT_FUERZA, ...DEFAULT_PREP_FISICA];
  const exerciseRows = allExercises.map(e => ({
    trainer_id: user.id,
    name: e.name,
    category: e.category,
    muscle_group: e.muscle_group,
    archived: false,
  }));

  let insertedExercises = 0;
  let insertedCf = 0;

  if (exerciseRows.length > 0) {
    const { data, error } = await admin.from("exercises").insert(exerciseRows).select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    insertedExercises = data?.length || 0;
  }

  // Insert CrossFit exercises
  const cfRows = DEFAULT_CROSSFIT.map(e => ({
    trainer_id: user.id,
    name: e.name,
    category: e.category,
    default_unit: e.default_unit,
    archived: false,
  }));

  if (cfRows.length > 0) {
    const { data, error } = await admin.from("cf_exercises").insert(cfRows).select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    insertedCf = data?.length || 0;
  }

  return NextResponse.json({
    success: true,
    inserted: {
      exercises: insertedExercises,
      cf_exercises: insertedCf,
    },
    previousCount: {
      exercises: existingCount || 0,
      cf_exercises: existingCfCount || 0,
    },
  });
}
