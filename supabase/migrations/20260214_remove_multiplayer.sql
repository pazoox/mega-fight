-- Remove Multiplayer tables and realtime publications
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS rooms;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS lobby_participants;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS match_votes;

DROP TABLE IF EXISTS lobby_participants CASCADE;
DROP TABLE IF EXISTS match_votes CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

-- Optional: clean up notifications type usage of 'cup_invite' if stored as enum
-- UPDATE notifications SET type = 'reward' WHERE type = 'cup_invite';

