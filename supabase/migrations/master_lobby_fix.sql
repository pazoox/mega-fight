-- Master Fix for Multiplayer Lobby System
-- Recreates tables with correct schema and permissions
-- Adds current_match column for persisting game state

BEGIN;

-- 1. Drop existing tables (Reverse order of dependencies)
DROP TABLE IF EXISTS public.match_votes;
DROP TABLE IF EXISTS public.lobby_participants;
DROP TABLE IF EXISTS public.rooms;

-- 2. Create 'rooms' table
CREATE TABLE public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL, -- references auth.users not strictly enforced to avoid issues if user deleted
    status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'playing', 'finished'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    cup_id UUID, -- Optional link to a cup configuration
    current_match JSONB, -- Stores the full match state (Team A, Team B, Arena, Modifiers)
    tournament_data JSONB -- Stores the full tournament state for multi-round support
);

-- 3. Create 'lobby_participants' table
CREATE TABLE public.lobby_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    username TEXT,
    avatar_url TEXT,
    is_host BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'ready'
    created_at TIMESTAMPTZ DEFAULT NOW(), -- Renamed from joined_at to match code expectations
    UNIQUE(room_id, user_id)
);

-- 4. Create 'match_votes' table
CREATE TABLE public.match_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    vote_for TEXT NOT NULL, -- 'teamA' or 'teamB'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id) -- One vote per user per room (can be reset by clearing table)
);

-- 5. Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_votes ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (Open for now for development ease, restrict later)

-- Rooms: Everyone can read/create/update
CREATE POLICY "Rooms are public" ON public.rooms
    FOR ALL USING (true) WITH CHECK (true);

-- Participants: Everyone can read/create/update/delete
CREATE POLICY "Participants are public" ON public.lobby_participants
    FOR ALL USING (true) WITH CHECK (true);

-- Votes: Everyone can read/create/update
CREATE POLICY "Votes are public" ON public.match_votes
    FOR ALL USING (true) WITH CHECK (true);

-- 7. Realtime Publication
-- Safely add tables to publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rooms') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'lobby_participants') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_participants;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'match_votes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.match_votes;
    END IF;
END $$;

COMMIT;
