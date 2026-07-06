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

async function testAll() {
  const plans = ['starter', 'pro', 'enterprise', 'elite', 'plan_50', 'plan_100', 'plan_150', 'premium'];
  console.log("Testing plan names insertion on box_subscriptions...");
  for (const plan of plans) {
    const { error } = await supabase.from('box_subscriptions').insert({
      box_id: 'f03c43f8-ced4-4bc6-8c2b-f7becb7dd272',
      plan_name: plan,
      price: 0,
      status: 'trial',
      current_period_start: '2026-06-26',
      current_period_end: '2026-07-26'
    });
    console.log(`Plan: "${plan}" -> Success: ${!error}, Error: ${error ? error.message : 'None'}`);
    
    // Clean up if it succeeded
    if (!error) {
      await supabase.from('box_subscriptions').delete().eq('box_id', 'f03c43f8-ced4-4bc6-8c2b-f7becb7dd272').eq('plan_name', plan);
    }
  }
}
testAll();
