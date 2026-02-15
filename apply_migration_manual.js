const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', 'master_lobby_fix.sql');
  
  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('Reading migration file...');
    
    // Split by statement if needed, or run as one block if supported
    // The postgres-js driver or supabase-js rpc might be needed if direct sql isn't supported via js client easily
    // But supabase-js doesn't have a direct 'query' method for raw sql unless exposed via RPC.
    // However, I can use the 'postgres' package which is in package.json dependencies.
    
    console.log('Using postgres connection to run SQL...');
    // We can't easily use 'postgres' lib without the direct connection string (postgres://...), 
    // which is usually not in .env.local for Supabase (it usually has URL/Anon/Service).
    // But wait, the user might have a `apply_migration.js` or similar I can check.
    
    // Alternatively, I can try to use a specialized RPC function if it exists, or just use the pg driver if I can construct the connection string.
    // Usually Supabase connection string is: postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
    
    // If I cannot run SQL directly, I will ask the user to run it or try to create a 'rpc' call if there is a 'exec_sql' function.
    // Let's check if there is an existing 'exec_sql' function in previous migrations or codebase.
    
    // Actually, looking at the previous turn's file list, I saw `diagnose_rooms.js`.
    // Let's try to use the `postgres` library if the connection string is available. 
    // If not, I'll try to find a way.
    
    // Since I don't have the password, I can't use direct Postgres connection.
    // BUT, I can try to use the Supabase SQL Editor via the browser if I fail here.
    
    // Wait, the user has 'postgres' in dependencies.
    // Let's check if there is a connection string in .env (not .env.local) or anywhere else.
    // Or I can assume the user has to run it.
    
    // Plan B: I will try to use the 'rpc' method if the user has a 'exec_sql' function.
    // Plan C: I will create a new migration file and hope the user's deployment process picks it up? No, local dev.
    
    // Let's try to see if I can find a connection string.
    
    console.log('Migration content preview:', sql.substring(0, 100));
    console.log('-----------------------------------');
    console.log('Please copy the content of "supabase/migrations/master_lobby_fix.sql" and run it in your Supabase SQL Editor.');
    console.log('-----------------------------------');
    
  } catch (err) {
    console.error('Error reading migration file:', err);
  }
}

runMigration();
