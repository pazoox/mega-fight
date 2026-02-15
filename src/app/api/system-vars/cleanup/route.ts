import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const rulesFilePath = path.join(process.cwd(), 'src/data/modifierRules.json');

async function getModifierRules() {
  try {
    const data = await fs.readFile(rulesFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading modifier rules during cleanup:', error);
    return [];
  }
}

async function saveModifierRules(data: any[]) {
  await fs.writeFile(rulesFilePath, JSON.stringify(data, null, 2));
}

const supabaseAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

function cleanCharacterByCategory(category: string, value: string, character: any) {
  let changed = false;

  const stages = Array.isArray(character.stages) ? [...character.stages] : [];
  const specs = character.specs ? { ...character.specs } : null;

  const cleanArray = (arr: any) => {
    if (!Array.isArray(arr)) return arr;
    const filtered = arr.filter((v) => v !== value);
    if (filtered.length !== arr.length) {
      changed = true;
    }
    return filtered;
  };

  if (['Combat Class', 'Movement', 'Power Source', 'Element'].includes(category)) {
    const tagField =
      category === 'Combat Class'
        ? 'combatClass'
        : category === 'Movement'
        ? 'movement'
        : category === 'Power Source'
        ? 'source'
        : 'element';

    stages.forEach((stage, idx) => {
      const tags = stage.tags || {};
      const current = tags[tagField];
      if (Array.isArray(current)) {
        const cleaned = cleanArray(current);
        if (cleaned !== current) {
          stages[idx] = {
            ...stage,
            tags: {
              ...tags,
              [tagField]: cleaned,
            },
          };
        }
      }
    });
  }

  if (category === 'Composition' || category === 'Size') {
    const tagField = category === 'Composition' ? 'composition' : 'size';
    stages.forEach((stage, idx) => {
      const tags = stage.tags || {};
      if (tags[tagField] === value) {
        changed = true;
        stages[idx] = {
          ...stage,
          tags: {
            ...tags,
            [tagField]: null,
          },
        };
      }
    });
  }

  if (category === 'Race' && specs) {
    if (specs.race === value) {
      changed = true;
      specs.race = null;
    }
  }

  if (category === 'Combat Tags') {
    stages.forEach((stage, idx) => {
      const combat = stage.combat || {};
      const mainSkill = combat.mainSkill || { name: '', description: '', tags: [] };
      const secondarySkill = combat.secondarySkill || { name: '', description: '', tags: [] };

      const mainTags = cleanArray(mainSkill.tags || []);
      const secondaryTags = cleanArray(secondarySkill.tags || []);

      if (changed) {
        stages[idx] = {
          ...stage,
          combat: {
            ...combat,
            mainSkill: {
              ...mainSkill,
              tags: mainTags,
            },
            secondarySkill: {
              ...secondarySkill,
              tags: secondaryTags,
            },
          },
        };
      }
    });
  }

  if (!changed) {
    return null;
  }

  const updated: any = { id: character.id };
  if (stages.length) updated.stages = stages;
  if (specs) updated.specs = specs;
  return updated;
}

function cleanArenaByCategory(category: string, value: string, arena: any) {
  let changed = false;

  const updated: any = { id: arena.id };

  if (category === 'Environment') {
    const env = Array.isArray(arena.environment) ? arena.environment : [];
    const filtered = env.filter((e: string) => e !== value);
    if (filtered.length !== env.length) {
      changed = true;
      updated.environment = filtered;
    }
  }

  if (category === 'Weather') {
    if (arena.weather === value) {
      changed = true;
      updated.weather = null;
    }
  }

  if (category === 'Daytime') {
    if (arena.daytime === value) {
      changed = true;
      updated.daytime = null;
    }
  }

  return changed ? updated : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const category = body?.category as string;
    const value = body?.value as string;

    if (!category || !value) {
      return NextResponse.json({ error: 'category and value are required' }, { status: 400 });
    }

    const currentRules = await getModifierRules();
    const filteredRules = currentRules.filter(
      (r: any) =>
        !(
          (r.trigger?.type === category && r.trigger?.value === value) ||
          (r.target?.type === category && r.target?.value === value)
        )
    );

    if (filteredRules.length !== currentRules.length) {
      await saveModifierRules(filteredRules);
    }

    let updatedCharacters = 0;
    let updatedArenas = 0;

    if (supabaseAdmin) {
      const { data: characters, error: charError } = await supabaseAdmin
        .from('characters')
        .select('id, specs, stages');

      if (charError) {
        console.error('Error fetching characters for cleanup:', charError);
      } else if (characters && characters.length > 0) {
        const updates: any[] = [];
        characters.forEach((c: any) => {
          const cleaned = cleanCharacterByCategory(category, value, c);
          if (cleaned) updates.push(cleaned);
        });

        if (updates.length > 0) {
          const { error: updateError } = await supabaseAdmin
            .from('characters')
            .upsert(updates, { onConflict: 'id' });
          if (updateError) {
            console.error('Error updating characters during cleanup:', updateError);
          } else {
            updatedCharacters = updates.length;
          }
        }
      }

      const { data: arenas, error: arenaError } = await supabaseAdmin
        .from('arenas')
        .select('id, environment, weather, daytime');

      if (arenaError) {
        console.error('Error fetching arenas for cleanup:', arenaError);
      } else if (arenas && arenas.length > 0) {
        const arenaUpdates: any[] = [];
        arenas.forEach((a: any) => {
          const cleaned = cleanArenaByCategory(category, value, a);
          if (cleaned) arenaUpdates.push(cleaned);
        });

        if (arenaUpdates.length > 0) {
          const { error: arenaUpdateError } = await supabaseAdmin
            .from('arenas')
            .upsert(arenaUpdates, { onConflict: 'id' });
          if (arenaUpdateError) {
            console.error('Error updating arenas during cleanup:', arenaUpdateError);
          } else {
            updatedArenas = arenaUpdates.length;
          }
        }
      }
    } else {
      console.warn('Supabase admin client not configured; skipping fighters/arenas cleanup.');
    }

    return NextResponse.json({
      success: true,
      removedRules: currentRules.length - filteredRules.length,
      updatedCharacters,
      updatedArenas,
    });
  } catch (error) {
    console.error('Error running system vars cleanup:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

