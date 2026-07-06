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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const studentId = '415e30d3-f69a-4088-91e5-ec8fc42656f4';

async function run() {
  console.log(`Checking loaded 1RMs for student: ${studentId}...`);
  const { data: rms, error: rmErr } = await supabase
    .from('student_one_rm')
    .select('*')
    .eq('student_id', studentId);

  if (rmErr) {
    console.error("Error fetching RMs:", rmErr);
    return;
  }

  console.log("RMs found:", rms);

  if (rms && rms.length > 0) {
    const exerciseIds = rms.map(r => r.exercise_id);
    const { data: exs, error: exErr } = await supabase
      .from('exercises')
      .select('id, name, archived, category, muscle_group')
      .in('id', exerciseIds);

    if (exErr) {
      console.error("Error fetching exercises:", exErr);
      return;
    }

    console.log("Exercises associated with these RMs:", exs);
  }
}
run();
