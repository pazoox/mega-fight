
-- Enable RLS on tables if not already enabled
ALTER TABLE public.match_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Public read access for match_votes" ON public.match_votes;
DROP POLICY IF EXISTS "Public insert access for match_votes" ON public.match_votes;
DROP POLICY IF EXISTS "Public update access for match_votes" ON public.match_votes;
DROP POLICY IF EXISTS "Public read access for lobby_participants" ON public.lobby_participants;
DROP POLICY IF EXISTS "Public insert access for lobby_participants" ON public.lobby_participants;
DROP POLICY IF EXISTS "Public update access for lobby_participants" ON public.lobby_participants;
DROP POLICY IF EXISTS "Public delete access for lobby_participants" ON public.lobby_participants;

-- Create permissive policies for match_votes (since auth might be anonymous/public in some flows)
CREATE POLICY "Public read access for match_votes"
ON public.match_votes FOR SELECT
USING (true);

CREATE POLICY "Public insert access for match_votes"
ON public.match_votes FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update access for match_votes"
ON public.match_votes FOR UPDATE
USING (true);

-- Create permissive policies for lobby_participants
CREATE POLICY "Public read access for lobby_participants"
ON public.lobby_participants FOR SELECT
USING (true);

CREATE POLICY "Public insert access for lobby_participants"
ON public.lobby_participants FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update access for lobby_participants"
ON public.lobby_participants FOR UPDATE
USING (true);

CREATE POLICY "Public delete access for lobby_participants"
ON public.lobby_participants FOR DELETE
USING (true);

-- Ensure Realtime publication includes these tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'match_votes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_votes;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'lobby_participants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_participants;
  END IF;
  
  -- Also ensure rooms is published
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rooms') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  END IF;
END $$;

-- Set REPLICA IDENTITY to FULL to ensure all columns are sent in updates
ALTER TABLE public.match_votes REPLICA IDENTITY FULL;
ALTER TABLE public.lobby_participants REPLICA IDENTITY FULL;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
