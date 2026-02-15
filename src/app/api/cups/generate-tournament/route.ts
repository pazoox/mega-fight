import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUser } from '@/lib/auth';
import { Character } from '@/types';
import { generateCupTournamentWithSeed } from '@/lib/cupUtils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { cupId, seed: providedSeed } = body || {};

    if (!cupId) {
      return NextResponse.json({ error: 'cupId is required' }, { status: 400 });
    }

    const { data: cup, error: cupError } = await supabaseAdmin
      .from('user_cups')
      .select('*, profiles(username, avatar_url)')
      .eq('id', cupId)
      .single();

    if (cupError || !cup) {
      return NextResponse.json({ error: 'Cup not found' }, { status: 404 });
    }

    const origin = new URL(request.url).origin;
    const charsRes = await fetch(`${origin}/api/characters?onlyActive=true`, {
      cache: 'no-store'
    });

    if (!charsRes.ok) {
      return NextResponse.json({ error: 'Failed to load characters' }, { status: 500 });
    }

    const allCharacters: Character[] = await charsRes.json();

    const seed = providedSeed || crypto.randomUUID();

    const tournamentData = generateCupTournamentWithSeed(cup, allCharacters, seed);

    const teamsMap = new Map<string, any>();
    tournamentData.matches.forEach((m: any) => {
      if (m.p1) teamsMap.set(m.p1.id, m.p1);
      if (m.p2) teamsMap.set(m.p2.id, m.p2);
    });
    const uniqueTeams = Array.from(teamsMap.values());

    const rounds = tournamentData.matches.map((m: any) => ({
      roundNumber: m.round,
      status: 'scheduled',
      scheduledDate: new Date().toISOString(),
      match: {
        team1: m.p1,
        team2: m.p2
      }
    }));

    const payload = {
      name: cup.name,
      format: cup.config.format || 'elimination',
      teamSize: cup.config.teamSize || 1,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      config: {
        ...cup.config,
        meta: {
          ...(cup.config.meta || {}),
          seed
        }
      },
      teams: uniqueTeams,
      rounds,
      createdById: cup.user_id,
      createdByUsername: cup.profiles?.username,
      createdByAvatar: cup.profiles?.avatar_url
    };

    const tournamentsRes = await fetch(`${origin}/api/tournaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!tournamentsRes.ok) {
      const err = await tournamentsRes.json().catch(() => ({}));
      return NextResponse.json({ error: err.error || 'Failed to create tournament' }, { status: 500 });
    }

    const { tournamentId } = await tournamentsRes.json();

    return NextResponse.json({ tournamentId, seed });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
