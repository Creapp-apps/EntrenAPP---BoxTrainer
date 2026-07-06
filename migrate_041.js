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

async function run() {
  const sqlPath = path.join(__dirname, 'supabase', 'migrations', '041_fix_exercise_variants_rls.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log("Applying migration 041 via RPC exec_sql...");
  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error("Migration failed:", error);
  } else {
    console.log("Migration applied successfully! Result:", data);
  }
}
run();
