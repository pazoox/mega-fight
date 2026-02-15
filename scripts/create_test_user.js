const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnv = (key) => {
  const line = envContent.split('\n').find(l => l.startsWith(`${key}=`));
  return line ? line.split('=')[1].trim() : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseKey) {
  console.error('Missing Supabase Service Role Key (SUPABASE_SERVICE_ROLE_KEY) in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
  const email = 'labrat@megafight.com';
  const password = 'abc123';
  const username = 'LabRat';

  console.log(`Creating user ${email}...`);

  // 1. Create Auth User
  const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username }
  });

  if (createError) {
    console.log('User creation error:', createError.message);
    
    // Try to find the user
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
        console.log('Found existing user:', existingUser.id);
        await ensureProfile(existingUser.id, username); // Removed email
    } else {
        console.error('Could not find existing user even though creation failed.');
    }
    return;
  }

  console.log('User created:', user.id);
  await ensureProfile(user.id, username); // Removed email
}

async function ensureProfile(userId, username) {
    // Check if profile exists
    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "Row not found"
        console.error('Error fetching profile:', fetchError);
        return;
    }

    if (profile) {
        console.log('Profile already exists:', profile);
    } else {
        console.log('Creating profile for', userId, '...');
        const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                username,
                // email removed
                coins: 160, // Default coins
                avatar_url: null
            });

        if (insertError) {
            console.error('Error creating profile:', insertError);
        } else {
            console.log('Profile created successfully.');
        }
    }
}

createTestUser();
