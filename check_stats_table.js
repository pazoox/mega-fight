
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envPath = '.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTable() {
  const { data, error } = await supabase
    .from('character_stats')
    .select('*')
    .limit(1);

  if (error) {
    console.log('Table character_stats does not exist or error:', error.message);
  } else {
    console.log('Table character_stats exists.');
  }
}

checkTable();
