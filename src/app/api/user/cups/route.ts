import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUser } from '@/lib/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch cups
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const status = searchParams.get('status');
  const id = searchParams.get('id');

  try {
    let query = supabaseAdmin.from('user_cups').select('*, profiles(username, avatar_url)');

    if (id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
      query = query.eq('id', id);
    } else if (userId) {
      query = query.eq('user_id', userId);
    } else if (status) {
      query = query.eq('status', status);
    } else {
      return NextResponse.json({ error: 'Either id, userId, or status is required' }, { status: 400 });
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new cup
export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { userId, name, description, config } = body;

    if (!userId || !name || !config) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    
    // Enforce user can only create for themselves
    if (user.id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabaseAdmin
      .from('user_cups')
      .insert({
        user_id: userId,
        name,
        description,
        config,
        status: 'private'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update cup (share, approve, reject)
export async function PUT(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    // Get current cup and user role
    const { data: cup } = await supabaseAdmin.from('user_cups').select('*').eq('id', id).single();
    if (!cup) return NextResponse.json({ error: 'Cup not found' }, { status: 404 });

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profile?.role === 'admin';
    const isOwner = cup.user_id === user.id;

    if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Perform Update
    const { data, error } = await supabaseAdmin
      .from('user_cups')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // NOTIFICATION: If status changed to public (Approved)
    if (status === 'public' && cup.status !== 'public') {
        await supabaseAdmin.from('notifications').insert({
            user_id: cup.user_id,
            type: 'cup_approved',
            title: 'Tournament Approved!',
            message: `Your tournament "${cup.name}" has been approved and is now public!`,
            data: { cup_id: cup.id },
            read: false
        });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a cup
export async function DELETE(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Cup ID required' }, { status: 400 });

    // Check ownership
    const { data: cup } = await supabaseAdmin.from('user_cups').select('user_id').eq('id', id).single();
    if (!cup) return NextResponse.json({ error: 'Cup not found' }, { status: 404 });

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profile?.role === 'admin';

    if (cup.user_id !== user.id && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('user_cups')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
