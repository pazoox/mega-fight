-- Create rooms table to track game state
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY, -- roomId string
    tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'waiting', -- 'waiting', 'playing', 'finished'
    host_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create/update rooms" ON rooms FOR ALL USING (auth.uid() IS NOT NULL);

-- Create match_votes table for multiplayer voting
CREATE TABLE IF NOT EXISTS match_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES tournament_matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    vote_for UUID REFERENCES tournament_teams(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, user_id)
);

-- Enable RLS for votes
ALTER TABLE match_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read votes" ON match_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON match_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can change vote" ON match_votes FOR UPDATE USING (auth.uid() = user_id);

-- Enable Realtime for these tables
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
  ALTER PUBLICATION supabase_realtime ADD TABLE match_votes;
COMMIT;
