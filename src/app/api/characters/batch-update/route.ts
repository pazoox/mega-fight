
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the Service Role Key for admin operations (bypassing RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { updates } = await request.json() as { updates: { id: string, wins: number, matches: number }[] };

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid payload: updates must be an array' }, { status: 400 });
    }

    let changesCount = 0;

    // Optimization: Fetch all characters involved in one query to get current stats
    const ids = updates.map(u => u.id);
    const { data: currentChars, error: fetchError } = await supabaseAdmin
      .from('characters')
      .select('id, wins, matches')
      .in('id', ids);

    if (fetchError) {
      console.error('Error fetching characters for update:', fetchError);
      throw fetchError;
    }

    const charMap = new Map(currentChars?.map(c => [c.id, c]));
    const updatePromises = [];

    for (const update of updates) {
      const char = charMap.get(update.id);
      if (char) {
        // Calculate new values (applying delta)
        const newWins = (char.wins || 0) + update.wins;
        const newMatches = (char.matches || 0) + update.matches;
        
        // Push update promise
        updatePromises.push(
          supabaseAdmin
            .from('characters')
            .update({ wins: newWins, matches: newMatches })
            .eq('id', update.id)
        );
        changesCount++;
      } else {
        console.warn(`Character with ID ${update.id} not found in database.`);
      }
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    return NextResponse.json({ success: true, updated: changesCount });
  } catch (error) {
    console.error('Error updating character stats:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
