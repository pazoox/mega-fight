
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFriendship() {
  console.log('Checking users...');
  
  // 1. Get User IDs
  const { data: users, error: userError } = await supabase
    .from('profiles')
    .select('id, username');

  if (userError) {
    console.error('Error fetching users:', userError);
    return;
  }

  const labRat = users.find(u => u.username === 'LabRat');
  
  if (!labRat) {
    console.error('LabRat user not found!');
    console.log('Available users:', users.map(u => u.username));
    return;
  }

  console.log('LabRat found:', labRat);

  // 2. Check Friendships
  console.log('Checking friendships for LabRat...');
  const { data: friendships, error: friendError } = await supabase
    .from('friends')
    .select('*')
    .or(`requester_id.eq.${labRat.id},receiver_id.eq.${labRat.id}`);

  if (friendError) {
    console.error('Error fetching friendships:', friendError);
    return;
  }

  if (friendships.length === 0) {
    console.log('No friendships found for LabRat.');
  } else {
    console.log('Friendships found:', friendships);
  }
}

checkFriendship();
