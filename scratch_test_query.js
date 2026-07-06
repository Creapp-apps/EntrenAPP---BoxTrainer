const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

if (fs.existsSync('.env.local')) {
  const content = fs.readFileSync('.env.local', 'utf-8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  const dayId = '008ca5f8-c862-46a2-947e-33c6b26290e7';
  
  const { data, error } = await admin
    .from("training_blocks")
    .select(`
      id, name, type, order, wod_type, wod_config,
      training_exercises (
        id, exercise_id, variant_id, sets, reps,
        percentage_1rm, weight_target, rest_seconds, notes, order,
        complex_id, complex_order,
        exercises ( id, name, category, video_url ),
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

  if (error) {
    console.error("QUERY ERROR:", error);
  } else {
    console.log("QUERY SUCCESS. Blocks fetched count:", data.length);
    data.forEach(b => {
      console.log(`Block: ${b.name} (${b.type})`);
      console.log(` - training_exercises count: ${b.training_exercises ? b.training_exercises.length : 0}`);
      console.log(` - cf_block_exercises count: ${b.cf_block_exercises ? b.cf_block_exercises.length : 0}`);
    });
  }
}

test();
