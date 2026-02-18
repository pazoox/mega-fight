import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get('onlyActive') === 'true';
    let query = supabaseAdmin.from('modifier_rules').select('*');
    if (onlyActive) query = query.eq('active', true);
    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, error } = await supabaseAdmin.from('modifier_rules').insert(body).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST /api/modifier-rules:', error);
    const message = (error as any)?.message || 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const { data, error } = await supabaseAdmin.from('modifier_rules').update(body).eq('id', body.id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const { error } = await supabaseAdmin.from('modifier_rules').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
