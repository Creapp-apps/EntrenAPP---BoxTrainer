import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env.local');
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
  console.log("Running migration...");

  // 1. Drop check constraint and add mobility to it
  const sql1 = `
    ALTER TABLE public.training_blocks DROP CONSTRAINT IF EXISTS training_blocks_type_check;
    ALTER TABLE public.training_blocks ADD CONSTRAINT training_blocks_type_check 
      CHECK (type IN ('fuerza', 'prep_fisica', 'custom', 'warm_up', 'skill', 'metcon', 'mobility'));
  `;
  const { data: d1, error: e1 } = await supabase.rpc('exec_sql', { sql: sql1 });
  console.log("Alter training_blocks constraint:", d1, e1 ? e1.message : "Success");

  // 2. Add sets column to cf_block_exercises
  const sql2 = `
    ALTER TABLE public.cf_block_exercises ADD COLUMN IF NOT EXISTS sets integer not null default 3;
  `;
  const { data: d2, error: e2 } = await supabase.rpc('exec_sql', { sql: sql2 });
  console.log("Add sets column to cf_block_exercises:", d2, e2 ? e2.message : "Success");

  console.log("Migration complete!");
}

run();
