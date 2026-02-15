DO $$
BEGIN
  -- 1. lobby_participants
  -- Remove se existir para garantir reset e evitar conflitos
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'lobby_participants') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE lobby_participants;
  END IF;
  -- Adiciona novamente
  ALTER PUBLICATION supabase_realtime ADD TABLE lobby_participants;

  -- 2. rooms
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rooms') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE rooms;
  END IF;
  ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

  -- 3. match_votes
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'match_votes') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE match_votes;
  END IF;
  ALTER PUBLICATION supabase_realtime ADD TABLE match_votes;

  -- 4. notifications
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE notifications;
  END IF;
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

END $$;
