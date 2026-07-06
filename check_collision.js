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

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase keys in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCollision() {
  const targetEmail = 'box@vuur.com';
  const targetBoxName = 'Vuur (lamadrid)';

  console.log(`Checking collisions in database for:`);
  console.log(`- Email: "${targetEmail}"`);
  console.log(`- Box Name: "${targetBoxName}"\n`);

  // 1. Check public.users
  console.log("Checking 'public.users'...");
  const { data: usersData, error: usersErr } = await supabase
    .from('users')
    .select('id, email, full_name, role, box_id')
    .eq('email', targetEmail);

  if (usersErr) {
    console.error("Error checking public.users:", usersErr.message);
  } else {
    console.log("Found users in public.users:", usersData);
  }

  // 2. Check public.boxes
  console.log("\nChecking 'public.boxes'...");
  const { data: boxesData, error: boxesErr } = await supabase
    .from('boxes')
    .select('id, name, owner_id')
    .ilike('name', `%${targetBoxName}%`);

  if (boxesErr) {
    console.error("Error checking public.boxes:", boxesErr.message);
  } else {
    console.log("Found boxes in public.boxes:", boxesData);
  }

  // 3. Check auth.users via admin API
  console.log("\nChecking auth.users via admin client...");
  // We list users and filter since supabase-js does not have a direct auth.admin.getUserByEmail helper in all versions
  const { data: authUsers, error: authUsersErr } = await supabase.auth.admin.listUsers();
  if (authUsersErr) {
    console.error("Error checking auth.users:", authUsersErr.message);
  } else {
    const matchedAuthUser = authUsers.users.find(u => u.email.toLowerCase() === targetEmail.toLowerCase());
    if (matchedAuthUser) {
      console.log("Found matching auth user in auth.users:", {
        id: matchedAuthUser.id,
        email: matchedAuthUser.email,
        user_metadata: matchedAuthUser.user_metadata,
        app_metadata: matchedAuthUser.app_metadata
      });
    } else {
      console.log("No matching auth user found for email:", targetEmail);
    }
  }
}

checkCollision();
