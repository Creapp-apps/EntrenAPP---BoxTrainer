import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function test() {
  const { error } = await supabase.from('trainer_settings').update({ booking_deadline_minutes: 1 }).eq('trainer_id', '6237cd79-e651-42cb-83de-b18f13ef1c22');
  console.log("Error:", error);
}
test();
