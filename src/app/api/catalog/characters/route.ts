import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

type DbCharacterRow = {
  id: string;
  name: string;
  group_id: string | null;
  stages: unknown[] | null;
  is_active: boolean;
  card_layout: string | null;
};

type DbGroupRow = {
  id: string;
  name: string;
  type: string | null;
  is_active: boolean | null;
};

type CatalogStage = {
  stage: string;
  thumbnail: string;
  stats: Record<string, number>;
  totalPwr: number;
};

type CatalogCharacter = {
  id: string;
  name: string;
  groupId: string;
  stages: CatalogStage[];
  isActive: boolean;
  cardLayout: string | null;
  groupName: string;
  groupType: string;
  groupIsActive: boolean;
};

function sumStats(stats: Record<string, number> | null | undefined): number {
  if (!stats) return 0;
  let total = 0;
  for (const value of Object.values(stats)) {
    if (typeof value === 'number') total += value;
  }
  return total;
}

function isStatsObject(stats: unknown): stats is Record<string, number> {
  if (!stats || typeof stats !== 'object') return false;
  const values = Object.values(stats as Record<string, unknown>);
  for (const v of values) {
    if (typeof v !== 'number') return false;
  }
  return true;
}

function normalizeStage(stage: unknown): CatalogStage {
  const defaults: Record<string, number> = { hp: 0, str: 0, def: 0, sta: 0, sp_atk: 0, int: 0, spd: 0, atk_spd: 0 };
  if (stage && typeof stage === 'object') {
    const s = stage as { stage?: unknown; thumbnail?: unknown; image?: unknown; stats?: unknown };
    const name = typeof s.stage === 'string' && s.stage.length > 0 ? s.stage : 'Base';
    const thumb = typeof s.thumbnail === 'string' && s.thumbnail.length > 0
      ? s.thumbnail
      : typeof s.image === 'string'
      ? s.image
      : '';
    const baseStats = isStatsObject(s.stats) ? (s.stats as Record<string, number>) : defaults;
    return { stage: name, thumbnail: thumb, stats: baseStats, totalPwr: sumStats(baseStats) };
  }
  return { stage: 'Base', thumbnail: '', stats: defaults, totalPwr: 0 };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get('onlyActive') === 'true';
    const search = (searchParams.get('search') || '').toLowerCase();
    const groupIdsParam = searchParams.getAll('groupId');

    let query = supabaseAdmin
      .from('characters')
      .select('id,name,group_id,stages,is_active,card_layout');

    if (onlyActive) query = query.eq('is_active', true);
    if (groupIdsParam && groupIdsParam.length > 0) {
      query = query.in('group_id', groupIdsParam);
    }

    const { data: chars, error } = await query.order('updated_at', { ascending: false });
    if (error) throw error;

    const groupIds = Array.from(new Set((chars || []).map(c => c.group_id).filter((id): id is string => Boolean(id))));

    const { data: groups } = await supabaseAdmin
      .from('groups')
      .select('id,name,type,is_active')
      .in('id', groupIds.length ? groupIds : ['']);

    const gmap = new Map<string, DbGroupRow>((groups || []).map(g => [g.id, g]));

    const light: CatalogCharacter[] = (chars || [])
      .filter(c => (search ? c.name.toLowerCase().includes(search) : true))
      .map(c => {
        const g = c.group_id ? gmap.get(c.group_id) : undefined;
        const stagesArray = Array.isArray(c.stages) ? c.stages : [];

        const compactStages: CatalogStage[] = stagesArray.map((s: unknown) => normalizeStage(s));

        const item: CatalogCharacter = {
          id: c.id,
          name: c.name,
          groupId: c.group_id || '',
          stages: compactStages,
          isActive: c.is_active,
          cardLayout: c.card_layout,
          groupName: g?.name || '',
          groupType: g?.type || '',
          groupIsActive: g?.is_active ?? true,
        };

        return item;
      });

    return NextResponse.json(light);
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
