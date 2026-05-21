import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE trainer_settings ADD COLUMN IF NOT EXISTS booking_deadline_minutes INT DEFAULT 1;' });
  console.log("RPC exec_sql:", data, error);
}
run();
