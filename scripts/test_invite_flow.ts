import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnv = (key: string) => {
  const line = envContent.split('\n').find(l => l.startsWith(`${key}=`));
  return line ? line.split('=')[1].trim() : '';
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseKey) {
  console.error('Missing Supabase Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNotification() {
  console.log('Testing notification system...');

  // 1. Get LabRat ID
  const { data: users, error: userError } = await supabase.from('profiles').select('id, username').eq('username', 'LabRat').single();
  
  if (userError) {
    console.error('Could not find LabRat:', userError);
    return;
  }

  const labRatId = users.id;
  console.log(`Found LabRat: ${labRatId}`);

  // 2. Insert Notification
  const notification = {
    user_id: labRatId,
    type: 'cup_invite',
    title: 'Test Notification from Script',
    message: 'This is a test invite sent via script.',
    data: { roomId: 'test-room-123' },
    read: false
  };

  const { data: inserted, error: insertError } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single();

  if (insertError) {
    console.error('Insert failed:', insertError);
  } else {
    console.log('Notification inserted successfully:', inserted);
  }

  // 3. Verify it exists
  const { data: list, error: listError } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', labRatId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (listError) {
      console.error('List failed:', listError);
  } else {
      console.log('Latest notifications for LabRat:');
      console.table(list.map(n => ({ id: n.id, title: n.title, created_at: n.created_at })));
  }
}

testNotification();
