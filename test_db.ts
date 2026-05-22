import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const dayId = '0afe8ae0-8e37-4367-b0e4-417aa5fe2849';
  
  console.log("=== DAY INFO ===");
  const { data: day, error: dayErr } = await supabase.from('training_days').select('*').eq('id', dayId).single();
  console.log("Day:", day, "Error:", dayErr);

  console.log("\n=== BLOCKS ===");
  const { data: blocks, error: blockErr } = await supabase.from('training_blocks').select('*').eq('day_id', dayId);
  console.log("Blocks:", blocks, "Error:", blockErr);

  if (blocks && blocks.length > 0) {
    const blockIds = blocks.map(b => b.id);
    console.log("\n=== EXERCISES ===");
    const { data: exercises, error: exErr } = await supabase.from('training_exercises').select('id, name:exercises(name), complex_id, complex_order, reps').in('block_id', blockIds);
    console.log("Exercises:", JSON.stringify(exercises, null, 2), "Error:", exErr);
  }

  console.log("\n=== COMPLEX SETS ===");
  const { data: complexSets, error: setsErr } = await supabase.from('training_complex_sets').select('*').eq('day_id', dayId);
  console.log("Complex Sets:", complexSets, "Error:", setsErr);
}
test();
