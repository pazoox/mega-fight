import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const FALLBACK_FILE = path.join(process.cwd(), 'src', 'data', 'systemVars.json');

async function getFallback() {
  try {
    const data = await fs.readFile(FALLBACK_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const { data: vars, error: vErr } = await supabaseAdmin
      .from('system_variables')
      .select('id, category, label, value, icon_name, is_active, order')
      .order('order', { ascending: true });

    if (vErr) throw vErr;

    if (!vars || vars.length === 0) {
      const fb = await getFallback();
      return NextResponse.json(fb);
    }

    const byCat: Record<string, any[]> = {};
    for (const v of vars) {
      const cat = v.category || 'Misc';
      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push({
        label: v.label,
        value: v.value,
        iconName: v.icon_name,
        isActive: v.is_active,
        order: v.order
      });
    }

    return NextResponse.json(byCat);
  } catch {
    const fb = await getFallback();
    return NextResponse.json(fb);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rows = [];
    for (const [category, options] of Object.entries(body || {})) {
      if (Array.isArray(options)) {
        for (const opt of options as any[]) {
          rows.push({
            category,
            label: opt.label,
            value: opt.value,
            icon_name: opt.iconName || null,
            is_active: opt.isActive ?? true,
            order: opt.order ?? 0
          });
        }
      }
    }
    if (rows.length === 0) return NextResponse.json({ error: 'No data' }, { status: 400 });
    const { data, error } = await supabaseAdmin.from('system_variables').insert(rows).select();
    if (error) throw error;
    return NextResponse.json({ success: true, inserted: data?.length || 0 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const payload: any = {};
    if (body.category !== undefined) payload.category = body.category;
    if (body.label !== undefined) payload.label = body.label;
    if (body.value !== undefined) payload.value = body.value;
    if (body.iconName !== undefined) payload.icon_name = body.iconName;
    if (body.isActive !== undefined) payload.is_active = body.isActive;
    if (body.order !== undefined) payload.order = body.order;
    const { data, error } = await supabaseAdmin.from('system_variables').update(payload).eq('id', body.id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const { error } = await supabaseAdmin.from('system_variables').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
