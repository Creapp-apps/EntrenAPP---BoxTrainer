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

async function checkTriggers() {
  console.log("Querying public table triggers using exec_sql...");
  
  const sql = `
    SELECT 
      trg.tgname AS trigger_name,
      tbl.relname AS table_name,
      ns.nspname AS schema_name,
      CASE trg.tgtype & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END AS activation,
      CASE trg.tgtype & 4 WHEN 4 THEN 'INSERT' 
           WHEN 8 THEN 'DELETE' 
           WHEN 16 THEN 'UPDATE' 
           WHEN 32 THEN 'TRUNCATE' 
      END AS event,
      proc.proname AS function_name,
      pg_get_triggerdef(trg.oid) AS trigger_definition
    FROM pg_trigger trg
    JOIN pg_class tbl ON trg.tgrelid = tbl.oid
    JOIN pg_namespace ns ON tbl.relnamespace = ns.oid
    JOIN pg_proc proc ON trg.tgfoid = proc.oid
    WHERE ns.nspname = 'public' AND NOT trg.tgisinternal;
  `;
  
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error("Error executing query:", error);
  } else {
    console.log("Triggers found in DB:");
    console.log(JSON.stringify(data, null, 2));
  }
}

checkTriggers();
