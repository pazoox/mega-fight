BEGIN;

ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS current_match_id text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS tournament_id text;
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_status_check CHECK (status IN ('waiting','playing','finished'));
CREATE INDEX IF NOT EXISTS rooms_status_idx ON public.rooms(status);
CREATE INDEX IF NOT EXISTS rooms_host_idx ON public.rooms(host_id);

-- Deduplicate lobby_participants before creating UNIQUE index
WITH ranked_lp AS (
  SELECT 
    id, room_id, user_id, status, 
    COALESCE(created_at, now()) AS created_at,
    ROW_NUMBER() OVER (
      PARTITION BY room_id, user_id 
      ORDER BY (status = 'ready') DESC, COALESCE(created_at, now()) DESC
    ) AS rn
  FROM public.lobby_participants
)
DELETE FROM public.lobby_participants lp
USING ranked_lp r
WHERE lp.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS lobby_participants_room_user_uidx ON public.lobby_participants(room_id, user_id);
CREATE INDEX IF NOT EXISTS lobby_participants_room_idx ON public.lobby_participants(room_id);
CREATE INDEX IF NOT EXISTS lobby_participants_status_idx ON public.lobby_participants(status);

ALTER TABLE public.match_votes ALTER COLUMN match_id SET DEFAULT 'current';
UPDATE public.match_votes SET match_id = 'current' WHERE match_id IS NULL;
ALTER TABLE public.match_votes ALTER COLUMN match_id SET NOT NULL;
-- Deduplicate match_votes before UNIQUE index on (room_id, user_id, match_id)
WITH ranked_mv AS (
  SELECT 
    id, room_id, user_id, match_id,
    COALESCE(created_at, now()) AS created_at,
    ROW_NUMBER() OVER (
      PARTITION BY room_id, user_id, match_id 
      ORDER BY COALESCE(created_at, now()) DESC
    ) AS rn
  FROM public.match_votes
)
DELETE FROM public.match_votes mv
USING ranked_mv r
WHERE mv.id = r.id AND r.rn > 1;

ALTER TABLE public.match_votes DROP CONSTRAINT IF EXISTS match_votes_voted_for_check;
ALTER TABLE public.match_votes ADD CONSTRAINT match_votes_voted_for_check CHECK (voted_for IN ('teamA','teamB'));
CREATE UNIQUE INDEX IF NOT EXISTS match_votes_unique_vote ON public.match_votes(room_id, user_id, match_id);
CREATE INDEX IF NOT EXISTS match_votes_room_match_idx ON public.match_votes(room_id, match_id);
CREATE INDEX IF NOT EXISTS match_votes_user_idx ON public.match_votes(user_id);

-- Compatibility for Explore/Tournaments feature expecting 'vote_for'
ALTER TABLE public.match_votes ADD COLUMN IF NOT EXISTS vote_for text NULL;

CREATE TABLE IF NOT EXISTS public.room_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS room_events_room_idx ON public.room_events(room_id);
CREATE INDEX IF NOT EXISTS room_events_type_idx ON public.room_events(type);

CREATE TABLE IF NOT EXISTS public.match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  match_id text NOT NULL,
  winner_team_key text NOT NULL,
  votes_teamA integer NOT NULL DEFAULT 0,
  votes_teamB integer NOT NULL DEFAULT 0,
  finished_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS match_results_room_idx ON public.match_results(room_id);
CREATE INDEX IF NOT EXISTS match_results_match_idx ON public.match_results(match_id);

CREATE OR REPLACE VIEW public.room_vote_counts AS
SELECT room_id, match_id,
SUM(CASE WHEN voted_for='teamA' THEN 1 ELSE 0 END) AS teamA_count,
SUM(CASE WHEN voted_for='teamB' THEN 1 ELSE 0 END) AS teamB_count
FROM public.match_votes
GROUP BY room_id, match_id;

ALTER TABLE public.match_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS match_votes_self_insert ON public.match_votes;
CREATE POLICY match_votes_self_insert ON public.match_votes
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.lobby_participants lp
    WHERE lp.room_id = match_votes.room_id AND lp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS match_votes_self_update ON public.match_votes;
CREATE POLICY match_votes_self_update ON public.match_votes
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS match_votes_room_select ON public.match_votes;
CREATE POLICY match_votes_room_select ON public.match_votes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lobby_participants lp
    WHERE lp.room_id = match_votes.room_id AND lp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS lobby_self_insert ON public.lobby_participants;
CREATE POLICY lobby_self_insert ON public.lobby_participants
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS lobby_self_update ON public.lobby_participants;
CREATE POLICY lobby_self_update ON public.lobby_participants
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS lobby_room_select ON public.lobby_participants;
CREATE POLICY lobby_room_select ON public.lobby_participants
FOR SELECT
USING (room_id IN (SELECT id FROM public.rooms));

CREATE OR REPLACE FUNCTION public.finalize_vote(p_room_id uuid, p_match_id text, p_forced_winner text DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  player_count integer;
  teamA integer;
  teamB integer;
  majority integer;
  winner text;
BEGIN
  SELECT COUNT(*) INTO player_count FROM public.lobby_participants WHERE room_id = p_room_id;
  IF player_count = 0 THEN
    RETURN jsonb_build_object('status','no_players');
  END IF;

  SELECT teamA_count, teamB_count
  INTO teamA, teamB
  FROM public.room_vote_counts
  WHERE room_id = p_room_id AND match_id = p_match_id;

  IF teamA IS NULL AND teamB IS NULL THEN
    RETURN jsonb_build_object('status','no_votes');
  END IF;

  majority := floor(player_count/2) + 1;

  IF teamA >= majority THEN
    winner := 'teamA';
  ELSIF teamB >= majority THEN
    winner := 'teamB';
  ELSIF teamA + teamB >= player_count THEN
    IF teamA > teamB THEN
      winner := 'teamA';
    ELSIF teamB > teamA THEN
      winner := 'teamB';
    ELSE
      winner := NULL;
    END IF;
  END IF;

  IF winner IS NULL THEN
    IF p_forced_winner IS NULL THEN
      RETURN jsonb_build_object('status','tie','teamA',teamA,'teamB',teamB);
    ELSE
      winner := p_forced_winner;
    END IF;
  END IF;

  INSERT INTO public.match_results(room_id, match_id, winner_team_key, votes_teamA, votes_teamB)
  VALUES (p_room_id, p_match_id, winner, COALESCE(teamA,0), COALESCE(teamB,0));

  DELETE FROM public.match_votes WHERE room_id = p_room_id AND match_id = p_match_id;

  INSERT INTO public.room_events(room_id, type, payload)
  VALUES (p_room_id, 'vote_end', jsonb_build_object('match_id', p_match_id, 'winner', winner, 'teamA', teamA, 'teamB', teamB));

  RETURN jsonb_build_object('status','ok','winner',winner,'teamA',teamA,'teamB',teamB);
END;
$$;

COMMIT;
