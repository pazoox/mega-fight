import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const VARS_FILE = path.join(process.cwd(), 'src', 'data', 'systemVars.json');

export async function POST() {
  try {
    const raw = await fs.readFile(VARS_FILE, 'utf-8');
    const vars = JSON.parse(raw);
    const rows: any[] = [];
    for (const [category, options] of Object.entries(vars || {})) {
      if (Array.isArray(options)) {
        for (const opt of options as any[]) {
          const rawLabel = (opt as any).label ?? (opt as any).value ?? '';
          const rawValue = (opt as any).value ?? (opt as any).label ?? '';
          if (!rawLabel || !rawValue) continue;
          rows.push({
            category,
            label: rawLabel,
            value: rawValue,
            icon_name: (opt as any).iconName || (opt as any).icon || null,
            is_active: (opt as any).isActive ?? true,
            order: (opt as any).order ?? 0
          });
        }
      }
    }
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No variables found in JSON' }, { status: 400 });
    }
    await supabaseAdmin.from('system_variables').delete().neq('id', '');
    const { data, error } = await supabaseAdmin.from('system_variables').insert(rows).select();
    if (error) throw error;
    return NextResponse.json({ success: true, inserted: data?.length || 0 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
