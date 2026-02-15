import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// Helper to get admin client
const getAdminClient = () => {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
  }
  return supabase;
};

// GET: Fetch user's notifications
export async function GET(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = getAdminClient();

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Mark notifications as read
export async function PUT(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, all } = body;

    const supabaseAdmin = getAdminClient();

    let query = supabaseAdmin.from('notifications').update({ read: true }).eq('user_id', user.id);

    if (!all && id) {
      query = query.eq('id', id);
    }

    const { error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create notification (e.g. invite)
export async function POST(request: Request) {
    try {
        const user = await getUser(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        console.log('POST /api/user/notifications body:', body);
        const { targetUserId, type, title, message, data } = body;

        if (!targetUserId || !type || !title) {
            console.error('Missing fields in notification POST:', { targetUserId, type, title });
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const supabaseAdmin = getAdminClient();

        const { error } = await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: targetUserId,
                type,
                title,
                message,
                data,
                read: false
            });

        if (error) {
            console.error('Supabase insert error:', error);
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Error in POST /notifications:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
