import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { Character, Group } from '@/types';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// Create a Supabase client with the Service Role Key for admin operations (bypassing RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: any;

if (supabaseUrl && supabaseKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseKey);
} else {
  console.error('Missing Supabase credentials in /api/characters');
}

const DATA_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'characters.json');
const GROUPS_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'groups.json');

// Helper to map DB Row to Frontend Character
const mapToCharacter = (row: any): Character => ({
  id: row.id,
  name: row.name,
  alias: row.alias,
  description: row.description,
  groupId: row.group_id,
  specs: row.specs,
  stages: row.stages,
  isActive: row.is_active,
  wins: row.wins || 0,
  matches: row.matches || 0,
  cardLayout: row.card_layout
});

// Helper to map Frontend Character to DB Insert
const mapToDb = (char: Partial<Character>, groupUuid?: string | null) => {
  const payload: Record<string, any> = {};
  if ((char as any).id !== undefined) payload.id = (char as any).id;
  if (char.name !== undefined) payload.name = char.name;
  if (char.alias !== undefined) payload.alias = char.alias;
  if (char.description !== undefined) payload.description = char.description;
  if (groupUuid !== undefined) payload.group_id = groupUuid;
  else if (char.groupId !== undefined) payload.group_id = char.groupId;
  if (char.specs !== undefined) payload.specs = char.specs;
  if (char.stages !== undefined) payload.stages = char.stages;
  if (char.isActive !== undefined) payload.is_active = char.isActive;
  if (char.wins !== undefined) payload.wins = char.wins;
  if (char.matches !== undefined) payload.matches = char.matches;
  if (char.cardLayout !== undefined) payload.card_layout = char.cardLayout;
  return payload;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const id = searchParams.get('id');
    const groupId = searchParams.get('groupId');
    const onlyActive = searchParams.get('onlyActive') === 'true';
    const mode = searchParams.get('mode'); // 'list' for lightweight payload

    const parsedLimit = limitParam ? Number(limitParam) : undefined;
    const limit = parsedLimit && !Number.isNaN(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 500)) : undefined;

    const parsedOffset = offsetParam ? Number(offsetParam) : undefined;
    const offset = parsedOffset && !Number.isNaN(parsedOffset) && parsedOffset > 0 ? parsedOffset : 0;

    const hasFilter = Boolean(id || groupId);

    // Fallback path if Supabase is not configured
    if (!supabaseAdmin) {
      try {
        const charJson = await fs.readFile(DATA_FILE_PATH, 'utf-8');
        let localCharacters: Character[] = JSON.parse(charJson);
        if (onlyActive) {
          localCharacters = localCharacters.filter(c => c.isActive);
        }
        // Lightweight mode (list)
        if (mode === 'list') {
          const light = (localCharacters || []).map((c: Character) => {
            const firstStage = Array.isArray(c.stages) && c.stages.length > 0 ? c.stages[0] : null;
            return {
              id: c.id,
              name: c.name,
              groupId: c.groupId,
              stages: firstStage ? [{
                stage: firstStage.stage || 'Base',
                image: firstStage.image || '',
                thumbnail: firstStage.thumbnail || '',
                stats: firstStage.stats || { hp: 0, str: 0, def: 0, sta: 0, sp_atk: 0, int: 0, spd: 0, atk_spd: 0 },
                combat: firstStage.combat || { mainSkill: { name: '', description: '', tags: [] } },
                tags: firstStage.tags || { combatClass: [], movement: [], composition: 'Organic', size: 'Medium', source: [], element: [] }
              }] : []
            };
          });
          return NextResponse.json(light);
        }
        return NextResponse.json(localCharacters);
      } catch (fileError) {
        console.warn('Local characters fallback missing; returning empty list:', fileError);
        return NextResponse.json([]);
      }
    }

    const baseSelect = mode === 'list'
      ? 'id,name,group_id,stages,is_active,card_layout'
      : '*';

    let query = supabaseAdmin
      .from('characters')
      .select(baseSelect)
      .order('updated_at', { ascending: false });

    if (id) {
      query = query.eq('id', id);
    }

    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    if (onlyActive) {
      query = query.eq('is_active', true);
    }

    if (limit) {
      if (offset > 0) {
        query = query.range(offset, offset + limit - 1);
      } else {
        query = query.limit(limit);
      }
    }

    const { data: dbCharacters, error } = await query;

    if (error) {
      console.error('Supabase fetch error:', error);
      try {
        const charJson = await fs.readFile(DATA_FILE_PATH, 'utf-8');
        let localCharacters: Character[] = JSON.parse(charJson);
        if (onlyActive) {
          localCharacters = localCharacters.filter(c => c.isActive);
        }
        return NextResponse.json(localCharacters);
      } catch (fileError) {
        console.warn('Local characters fallback failed; returning empty list:', fileError);
        return NextResponse.json([]);
      }
    }

    // 2. Fetch Groups (needed for migration/fixing)
    const { data: dbGroups } = await supabaseAdmin.from('groups').select('*');
    
    // 3. Check if we need to Migrate (Only if DB is empty)
    const needsMigration = !hasFilter && (!dbCharacters || dbCharacters.length === 0);
    // Removed needsFixing check to prevent infinite loop/performance issues on every request.
    // Fix logic should be moved to a dedicated admin tool or migration script.

    if (needsMigration) {
        try {
            const charJson = await fs.readFile(DATA_FILE_PATH, 'utf-8');
            const localCharacters: Character[] = JSON.parse(charJson);
            
            const groupJson = await fs.readFile(GROUPS_FILE_PATH, 'utf-8');
            const localGroups: Group[] = JSON.parse(groupJson);

            // Build Maps
            // Legacy Group ID (e.g. "naruto") -> Group Name (e.g. "Naruto")
            const legacyIdToName = new Map<string, string>();
            localGroups.forEach(g => legacyIdToName.set(g.id, g.name));

            // Group Name -> Supabase UUID
            const nameToUuid = new Map<string, string>();
            dbGroups?.forEach((g: any) => nameToUuid.set(g.name, g.id));

            // Helper to find UUID for a character
            const resolveGroupId = (char: Character): string | null => {
                const legacyGroupId = char.groupId; // "naruto"
                if (!legacyGroupId) return null;
                const groupName = legacyIdToName.get(legacyGroupId); // "Naruto"
                if (!groupName) return null;
                return nameToUuid.get(groupName) || null; // UUID
            };

            if (localCharacters.length > 0) {
                console.log(`Migrating ${localCharacters.length} characters from JSON to Supabase...`);
                
                const dbInserts = localCharacters.map(c => mapToDb(c, resolveGroupId(c)));
                
                const { data: migratedData, error: migrationError } = await supabaseAdmin
                    .from('characters')
                    .insert(dbInserts)
                    .select();

                if (migrationError) {
                    console.error('Migration failed:', migrationError);
                    return NextResponse.json(localCharacters);
                }
                return NextResponse.json(migratedData.map(mapToCharacter));
            }

        } catch (fileError) {
            console.warn('Error reading local JSON files:', fileError);
        }
    }

    // Lightweight list mode to reduce client egress
    if (mode === 'list') {
      const light = (dbCharacters || []).map((row: any) => {
        const firstStage = Array.isArray(row.stages) && row.stages.length > 0 ? row.stages[0] : null;
        return {
          id: row.id,
          name: row.name,
          groupId: row.group_id,
          stages: firstStage ? [{
            stage: firstStage.stage || 'Base',
            image: firstStage.image || '',
            thumbnail: firstStage.thumbnail || '',
            stats: firstStage.stats || { hp: 0, str: 0, def: 0, sta: 0, sp_atk: 0, int: 0, spd: 0, atk_spd: 0 },
            combat: firstStage.combat || { mainSkill: { name: '', description: '', tags: [] } },
            tags: firstStage.tags || { combatClass: [], movement: [], composition: 'Organic', size: 'Medium', source: [], element: [] }
          }] : []
        };
      });
      return NextResponse.json(light);
    }

    return NextResponse.json(dbCharacters.map(mapToCharacter));

  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newCharacter: Partial<Character> = await request.json();

    // Basic validation
    if (!newCharacter.name || !newCharacter.groupId) {
      return NextResponse.json(
        { error: 'Missing required fields (name, groupId)' },
        { status: 400 }
      );
    }

    const id = (newCharacter as any).id || randomUUID();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase client not initialized. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 }
      );
    }

    // Insert into Supabase
    const { data, error } = await supabaseAdmin
        .from('characters')
        .insert(mapToDb({ ...newCharacter, id }))
        .select()
        .single();

    if (error) throw error;

    return NextResponse.json({ success: true, character: mapToCharacter(data) });
  } catch (error) {
    console.error('Error saving character:', error);
    const message = (error as any)?.message || 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const updatedCharacter: Partial<Character> = await request.json();

    if (!updatedCharacter.id) {
      return NextResponse.json({ error: 'Character ID is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from('characters')
        .update({ ...mapToDb(updatedCharacter), updated_at: new Date().toISOString() })
        .eq('id', updatedCharacter.id)
        .select()
        .single();

    if (error) throw error;

    return NextResponse.json({ success: true, character: mapToCharacter(data) });
  } catch (error) {
    console.error('Error updating character:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Character ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
        .from('characters')
        .delete()
        .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting character:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
