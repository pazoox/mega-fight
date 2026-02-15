-- Safe removal of Tournament tables from Realtime publication (only if present)
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    FOR r IN
      SELECT n.nspname AS schemaname, c.relname AS tablename
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public'
        AND c.relkind='r'
        AND c.relname IN ('tournaments','tournament_matches','tournament_teams','tournament_participants')
    LOOP
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE %I.%I', r.schemaname, r.tablename);
    END LOOP;
  END IF;
END $$;

-- Drop Tournament tables (idempotent)
DROP TABLE IF EXISTS public.tournament_matches CASCADE;
DROP TABLE IF EXISTS public.tournament_teams CASCADE;
DROP TABLE IF EXISTS public.tournament_participants CASCADE;
DROP TABLE IF EXISTS public.tournaments CASCADE;
