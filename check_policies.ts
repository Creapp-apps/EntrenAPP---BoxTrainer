import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.rpc('query_pg_policies', { table_name: 'student_plan_subscriptions' }).catch(() => ({data: null, error: 'no rpc'}))
  if(error) {
    // just query table via SQL
    console.log('Cant use RPC')
  }
}
check()
