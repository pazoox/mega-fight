import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const RULES_FILE = path.join(process.cwd(), 'src', 'data', 'modifierRules.json');

export async function POST() {
  try {
    const raw = await fs.readFile(RULES_FILE, 'utf-8');
    const rules = JSON.parse(raw);
    if (!Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json({ error: 'No rules found in JSON' }, { status: 400 });
    }
    const rows = rules.map((r: any) => ({
      name: r.id || r.name || 'Unnamed Rule',
      description: r.description || null,
      trigger: r.trigger,
      target: r.target,
      effect: r.effect,
      active: r.active ?? true,
      version: r.version ?? 1
    }));
    const { data, error } = await supabaseAdmin.from('modifier_rules').insert(rows).select();
    if (error) throw error;
    return NextResponse.json({ success: true, inserted: data?.length || 0 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
