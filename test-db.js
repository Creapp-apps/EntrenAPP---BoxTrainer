require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: cols, error } = await supabase.from('users').select('*').limit(1);
  console.log("Users:", Object.keys(cols[0] || {}));
  
  const { data: turnos } = await supabase.from('turnos').select('*').limit(1);
  console.log("Turnos:", Object.keys(turnos[0] || {}));
}
check();
