-- Adicionar coluna cup_id na tabela rooms para persistência (sem FK estrita para evitar erros se a tabela não existir)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS cup_id UUID;

-- Garantir permissões
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'rooms' AND policyname = 'Anyone can read rooms') THEN
        CREATE POLICY "Anyone can read rooms" ON rooms FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'rooms' AND policyname = 'Authenticated users can create/update rooms') THEN
        CREATE POLICY "Authenticated users can create/update rooms" ON rooms FOR ALL USING (auth.uid() IS NOT NULL);
    END IF;
END $$;
