const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY']
);

async function run() {
  const { data, error } = await supabase
    .from('boxes')
    .delete()
    .in('name', ['Delfi Cohen', 'AVERGA COMO CORRE', 'AVERGA COMO CORRE '])
    .select();

  console.log("Deleted boxes:", data);
  console.log("Error:", error);
}

run();
