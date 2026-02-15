require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');
const fs = require('fs');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined in .env.local');
  process.exit(1);
}

const sql = postgres(connectionString);

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const migrationSql = fs.readFileSync('supabase/migrations/master_lobby_fix.sql', 'utf8');
    
    console.log('Executing migration...');
    // Execute the SQL. postgres.js can execute multiple statements if they are in a single string?
    // postgres.js usually prefers template literals. Let's try simple execution.
    // The migration has BEGIN; ... COMMIT; so it should be treated as a single block.
    await sql.unsafe(migrationSql);
    
    console.log('Migration executed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await sql.end();
  }
}

runMigration();
