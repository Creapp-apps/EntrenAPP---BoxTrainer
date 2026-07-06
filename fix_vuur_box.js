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

async function repairVuurBox() {
  console.log("Repairing Vuur (lamadrid) box limits and subscription...");

  // 1. Get box info
  const { data: boxData, error: findError } = await supabase
    .from('boxes')
    .select('*')
    .eq('name', 'Vuur (lamadrid)')
    .single();

  if (findError || !boxData) {
    console.error("Error finding box Vuur (lamadrid):", findError ? findError.message : "Not found");
    return;
  }

  console.log("Found Box ID:", boxData.id);

  // 2. Update box limits to Premium (9999)
  console.log("Updating box limits in database...");
  const { error: updateError } = await supabase
    .from('boxes')
    .update({
      max_students: 9999,
      max_professors: 9999
    })
    .eq('id', boxData.id);

  if (updateError) {
    console.error("Error updating box limits:", updateError.message);
    return;
  }
  console.log("Successfully updated box limits to max_students = 9999 and max_professors = 9999!");

  // 3. Insert subscription
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 30);

  console.log("Inserting subscription record in DB...");
  const { data: subData, error: subError } = await supabase
    .from('box_subscriptions')
    .insert({
      box_id: boxData.id,
      plan_name: 'premium',
      price: 0,
      status: 'trial',
      current_period_start: now.toISOString().split("T")[0],
      current_period_end: trialEnd.toISOString().split("T")[0]
    })
    .select();

  if (subError) {
    console.error("Error inserting subscription (is check constraint updated?):", subError.message);
  } else {
    console.log("Subscription inserted successfully!", subData);
  }
}

repairVuurBox();
