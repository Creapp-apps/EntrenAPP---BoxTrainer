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

  // Check existing exercises names
  const { data: existingExData } = await admin
    .from("exercises")
    .select("name")
    .eq("trainer_id", user.id)
    .eq("archived", false);

  const { data: existingCfData } = await admin
    .from("cf_exercises")
    .select("name")
    .eq("trainer_id", user.id)
    .eq("archived", false);

  const existingNames = new Set((existingExData || []).map(e => e.name.toLowerCase().trim()));
  const existingCfNames = new Set((existingCfData || []).map(e => e.name.toLowerCase().trim()));

  // Insert Fuerza + Prep Física exercises
  const allExercises = [...DEFAULT_FUERZA, ...DEFAULT_PREP_FISICA];
  const exerciseRows = allExercises
    .filter(e => !existingNames.has(e.name.toLowerCase().trim()))
    .map(e => ({
      trainer_id: user.id,
      name: e.name,
      category: e.category,
      muscle_group: e.muscle_group,
      archived: false,
    }));

  let insertedExercises = 0;
  let insertedCf = 0;

  if (exerciseRows.length > 0) {
    const { data, error } = await supabase.from("exercises").insert(exerciseRows).select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    insertedExercises = data?.length || 0;
  }

  // Insert CrossFit exercises
  const cfRows = DEFAULT_CROSSFIT
    .filter(e => !existingCfNames.has(e.name.toLowerCase().trim()))
    .map(e => ({
      trainer_id: user.id,
      name: e.name,
      category: e.category,
      default_unit: e.default_unit,
      archived: false,
    }));

  if (cfRows.length > 0) {
    const { data, error } = await supabase.from("cf_exercises").insert(cfRows).select("id");
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
      exercises: existingExData?.length || 0,
      cf_exercises: existingCfData?.length || 0,
    },
  });
}
