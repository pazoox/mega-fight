-- Recriar tabela rooms (se não existir)
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY, -- roomId string
    tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'waiting', -- 'waiting', 'playing', 'finished'
    host_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS para rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para rooms (usando DO block para evitar erros de duplicidade)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'rooms' AND policyname = 'Anyone can read rooms') THEN
        CREATE POLICY "Anyone can read rooms" ON rooms FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'rooms' AND policyname = 'Authenticated users can create/update rooms') THEN
        CREATE POLICY "Authenticated users can create/update rooms" ON rooms FOR ALL USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- Recriar tabela match_votes (se não existir)
CREATE TABLE IF NOT EXISTS match_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES tournament_matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    vote_for UUID REFERENCES tournament_teams(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, user_id)
);

-- Habilitar RLS para match_votes
ALTER TABLE match_votes ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para match_votes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'match_votes' AND policyname = 'Anyone can read votes') THEN
        CREATE POLICY "Anyone can read votes" ON match_votes FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'match_votes' AND policyname = 'Users can vote') THEN
        CREATE POLICY "Users can vote" ON match_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'match_votes' AND policyname = 'Users can change vote') THEN
        CREATE POLICY "Users can change vote" ON match_votes FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Habilitar Realtime de forma segura
DO $$
BEGIN
  -- Remover da publicação se já existir (para garantir estado limpo)
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rooms') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE rooms;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'match_votes') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE match_votes;
  END IF;

  -- Adicionar novamente
  ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
  ALTER PUBLICATION supabase_realtime ADD TABLE match_votes;
END $$;
