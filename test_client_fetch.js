const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function simulateApi() {
  const dayId = '0afe8ae0-8e37-4367-b0e4-417aa5fe2849';

  // 1. Blocks
  const { data: blocksData, error: blocksError } = await supabase
    .from("training_blocks")
    .select(`
      id, name, type, order,
      training_exercises (
        id, exercise_id, variant_id, sets, reps,
        percentage_1rm, weight_target, rest_seconds, notes, order,
        complex_id, complex_order,
        exercises ( id, name, category, video_url ),
        exercise_variants ( id, name, video_url )
      )
    `)
    .eq("day_id", dayId)
    .order("order");

  // 2. Complex sets
  const { data: complexSets, error: setsError } = await supabase
    .from("training_complex_sets")
    .select("id, complex_id, set_number, percentage_1rm, reps_overrides, rounds")
    .eq("day_id", dayId)
    .order("set_number");

  console.log("=== API SIMULATION RESULT ===");
  console.log("Blocks length:", blocksData?.length);
  console.log("ComplexSets:", complexSets);
  console.log("ComplexSets Error:", setsError);
}

simulateApi();
