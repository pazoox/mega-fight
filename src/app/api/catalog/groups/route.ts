import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get('onlyActive') === 'true';

    let query = supabaseAdmin.from('groups').select('id,name,logo,type,is_active');
    if (onlyActive) query = query.eq('is_active', true);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    const light = (data || []).map(g => ({
      id: g.id,
      name: g.name,
      type: g.type,
      isActive: g.is_active,
      logo: g.logo
    }));

    return NextResponse.json(light);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
