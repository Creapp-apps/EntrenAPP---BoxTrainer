import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function test() {
  const { data } = await supabase.from('boxes').select('*').limit(1);
  console.log("Box:", data);
}
test();
