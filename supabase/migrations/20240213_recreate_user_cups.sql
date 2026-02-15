-- Recriar tabela user_cups que sumiu do schema cache
BEGIN;

CREATE TABLE IF NOT EXISTS user_cups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    name TEXT NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    status TEXT DEFAULT 'private',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE user_cups ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view public cups" ON user_cups;
    CREATE POLICY "Users can view public cups" ON user_cups FOR SELECT USING (status = 'public');

    DROP POLICY IF EXISTS "Users can view own cups" ON user_cups;
    CREATE POLICY "Users can view own cups" ON user_cups FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can create cups" ON user_cups;
    CREATE POLICY "Users can create cups" ON user_cups FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can update own cups" ON user_cups;
    CREATE POLICY "Users can update own cups" ON user_cups FOR UPDATE USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can delete own cups" ON user_cups;
    CREATE POLICY "Users can delete own cups" ON user_cups FOR DELETE USING (auth.uid() = user_id);
END $$;

COMMIT;
