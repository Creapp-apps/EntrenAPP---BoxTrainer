import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data: users } = await supabase.from('users').select('*').eq('email', 'facu.marceca@gmail.com');
  console.log("Facundo user:", users);
}
test();
