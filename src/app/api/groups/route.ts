import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { Group } from '@/types';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// Create a Supabase client with the Service Role Key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DATA_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'groups.json');

// Helper to map DB Row to Frontend Group
const mapToGroup = (row: any): Group => ({
  id: row.id,
  name: row.name,
  logo: row.logo,
  type: row.type,
  isActive: row.is_active,
  // Add other fields if necessary
});

// Helper to map Frontend Group to DB Insert
const mapToDb = (group: Group) => ({
  // id: randomUUID(), // Let Supabase generate ID or use a fixed one if we want? 
  // We'll let Supabase generate UUIDs, but we need to track them.
  name: group.name,
  logo: group.logo,
  type: group.type || 'Platform',
  is_active: group.isActive !== undefined ? group.isActive : true
});

export async function GET() {
  try {
    // 1. Fetch from Supabase
    const { data: dbGroups, error } = await supabaseAdmin
      .from('groups')
      .select('*')
      .order('name');

    if (error) {
        console.error('Supabase groups fetch error:', error);
        throw error;
    }

    // 2. Migration Check
    if (!dbGroups || dbGroups.length === 0) {
        try {
            const jsonData = await fs.readFile(DATA_FILE_PATH, 'utf-8');
            const localGroups: Group[] = JSON.parse(jsonData);

            if (localGroups.length > 0) {
                console.log(`Migrating ${localGroups.length} groups from JSON to Supabase...`);
                
                // We map one by one to avoid duplicates if partial fail? No, bulk insert.
                const dbInserts = localGroups.map(mapToDb);
                
                const { data: migratedData, error: migrationError } = await supabaseAdmin
                    .from('groups')
                    .insert(dbInserts)
                    .select();

                if (migrationError) {
                    console.error('Group migration failed:', migrationError);
                    // Fallback to local
                    return NextResponse.json(localGroups);
                }

                return NextResponse.json(migratedData.map(mapToGroup));
            }
        } catch (fileError) {
            console.warn('No local groups JSON found, returning empty.');
        }
    }

    return NextResponse.json(dbGroups.map(mapToGroup));

  } catch (error) {
    console.error('Error fetching groups:', error);
    // Fallback to local JSON if DB fails hard
    try {
        const jsonData = await fs.readFile(DATA_FILE_PATH, 'utf-8');
        return NextResponse.json(JSON.parse(jsonData));
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabaseAdmin
        .from('groups')
        .insert({
            name: body.name,
            type: body.type || 'Platform',
            is_active: true
        })
        .select()
        .single();

    if (error) throw error;

    return NextResponse.json(mapToGroup(data));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const { data, error } = await supabaseAdmin
        .from('groups')
        .update({
            name: body.name,
            is_active: body.isActive,
            // type: body.type // usually type doesn't change
        })
        .eq('id', body.id)
        .select()
        .single();

    if (error) throw error;

    return NextResponse.json(mapToGroup(data));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        const { error } = await supabaseAdmin
            .from('groups')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
