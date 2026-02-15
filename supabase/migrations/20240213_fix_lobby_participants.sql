-- Garantir que a tabela lobby_participants existe
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

-- Habilitar RLS
ALTER TABLE lobby_participants ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para lobby_participants
DO $$ 
BEGIN
    -- Permitir leitura pública (para que todos vejam quem está no lobby)
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'lobby_participants' AND policyname = 'Anyone can view lobby') THEN
        CREATE POLICY "Anyone can view lobby" ON lobby_participants FOR SELECT USING (true);
    END IF;

    -- Permitir inserção para autenticados
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'lobby_participants' AND policyname = 'Authenticated can join lobby') THEN
        CREATE POLICY "Authenticated can join lobby" ON lobby_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Permitir atualização para o próprio usuário (mudar status)
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'lobby_participants' AND policyname = 'Users can update own status') THEN
        CREATE POLICY "Users can update own status" ON lobby_participants FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    -- Permitir deleção (sair do lobby)
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'lobby_participants' AND policyname = 'Users can leave lobby') THEN
        CREATE POLICY "Users can leave lobby" ON lobby_participants FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Garantir publicação no Realtime
DO $$
BEGIN
  -- Remove e adiciona para garantir
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'lobby_participants') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE lobby_participants;
  END IF;
  ALTER PUBLICATION supabase_realtime ADD TABLE lobby_participants;
END $$;
