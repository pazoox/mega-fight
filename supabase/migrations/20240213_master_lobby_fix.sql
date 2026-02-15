-- MASTER LOBBY FIX
-- Execute este script completo para garantir que TODA a infraestrutura multiplayer exista e esteja correta.

BEGIN;

-- 1. Garantir tabela ROOMS
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    tournament_id UUID, -- Removida FK estrita para evitar erros de dependência
    cup_id UUID,        -- Armazena o ID da copa para persistência (sem FK estrita)
    status TEXT DEFAULT 'waiting',
    host_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar coluna cup_id se a tabela já existia sem ela
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'cup_id') THEN
        ALTER TABLE rooms ADD COLUMN cup_id UUID;
    END IF;
END $$;

-- 2. Garantir tabela LOBBY_PARTICIPANTS
CREATE TABLE IF NOT EXISTS lobby_participants (
    room_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES profiles(id),
    username TEXT,
    avatar_url TEXT,
    is_host BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

-- 3. Garantir tabela MATCH_VOTES
CREATE TABLE IF NOT EXISTS match_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID, -- Removida FK estrita
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    vote_for UUID, -- Removida FK estrita
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, user_id)
);

-- 4. Habilitar RLS em todas
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lobby_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_votes ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Segurança (Recriar para garantir)
DO $$ 
BEGIN
    -- ROOMS
    DROP POLICY IF EXISTS "Anyone can read rooms" ON rooms;
    CREATE POLICY "Anyone can read rooms" ON rooms FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Authenticated users can create/update rooms" ON rooms;
    CREATE POLICY "Authenticated users can create/update rooms" ON rooms FOR ALL USING (auth.uid() IS NOT NULL);

    -- LOBBY_PARTICIPANTS
    DROP POLICY IF EXISTS "Anyone can view lobby" ON lobby_participants;
    CREATE POLICY "Anyone can view lobby" ON lobby_participants FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Authenticated can join lobby" ON lobby_participants;
    CREATE POLICY "Authenticated can join lobby" ON lobby_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can update own status" ON lobby_participants;
    CREATE POLICY "Users can update own status" ON lobby_participants FOR UPDATE USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can leave lobby" ON lobby_participants;
    CREATE POLICY "Users can leave lobby" ON lobby_participants FOR DELETE USING (auth.uid() = user_id);

    -- MATCH_VOTES
    DROP POLICY IF EXISTS "Anyone can read votes" ON match_votes;
    CREATE POLICY "Anyone can read votes" ON match_votes FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Users can vote" ON match_votes;
    CREATE POLICY "Users can vote" ON match_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can change vote" ON match_votes;
    CREATE POLICY "Users can change vote" ON match_votes FOR UPDATE USING (auth.uid() = user_id);
END $$;

-- 6. Configurar Realtime (Supabase Publication)
-- Usamos bloco DO para verificar existência antes de alterar
DO $$
BEGIN
    -- ROOMS
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rooms') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE rooms;
    END IF;
    ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

    -- LOBBY_PARTICIPANTS
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'lobby_participants') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE lobby_participants;
    END IF;
    ALTER PUBLICATION supabase_realtime ADD TABLE lobby_participants;

    -- MATCH_VOTES
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'match_votes') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE match_votes;
    END IF;
    ALTER PUBLICATION supabase_realtime ADD TABLE match_votes;
    
    -- NOTIFICATIONS (Garantir também)
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE notifications;
    END IF;
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
END $$;

COMMIT;
