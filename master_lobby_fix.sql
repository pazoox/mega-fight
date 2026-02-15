-- Master Lobby Fix Migration Script
-- This script recreates the multiplayer tables to ensure correct schema and permissions.

-- 1. Drop existing tables (order matters due to foreign keys)
DROP TABLE IF EXISTS match_votes;
DROP TABLE IF EXISTS lobby_participants;
DROP TABLE IF EXISTS rooms;

-- 2. Create 'rooms' table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL,
    name TEXT,
    status TEXT DEFAULT 'waiting', -- 'waiting', 'playing', 'finished'
    current_match JSONB, -- Stores the full match/tournament state
    cup_id TEXT, -- Stores the Cup ID for persistence
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create 'lobby_participants' table
CREATE TABLE lobby_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    username TEXT,
    avatar_url TEXT,
    is_host BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'not_ready', -- 'ready', 'not_ready'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- 4. Create 'match_votes' table
CREATE TABLE match_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    match_id TEXT NOT NULL,
    voted_for TEXT NOT NULL, -- 'teamA' or 'teamB'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lobby_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_votes ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies (Permissive for development/gameplay)

-- Rooms: Allow public read/write (simplified for gameplay fluidity)
CREATE POLICY "Public Rooms Access" ON rooms
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Lobby Participants: Allow public read/write
CREATE POLICY "Public Lobby Access" ON lobby_participants
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Match Votes: Allow public read/write
CREATE POLICY "Public Votes Access" ON match_votes
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 7. Grant Permissions to anon and authenticated roles
GRANT ALL ON rooms TO anon, authenticated, service_role;
GRANT ALL ON lobby_participants TO anon, authenticated, service_role;
GRANT ALL ON match_votes TO anon, authenticated, service_role;

-- 8. Add to Realtime Publication
-- We use a DO block to avoid errors if the publication doesn't exist, 
-- though usually 'supabase_realtime' exists by default.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- Add tables to publication
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE lobby_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE match_votes;

-- 9. (Optional) Replica Identity for better update tracking
ALTER TABLE rooms REPLICA IDENTITY FULL;
ALTER TABLE lobby_participants REPLICA IDENTITY FULL;
ALTER TABLE match_votes REPLICA IDENTITY FULL;
