-- 11. USER CUPS (Custom Tournaments)
CREATE TABLE IF NOT EXISTS user_cups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    config JSONB NOT NULL, -- Stores teamSize, rules, criteria, etc.
    status TEXT DEFAULT 'private', -- 'private', 'pending', 'public'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_cups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Public Cups" ON user_cups FOR SELECT USING (status = 'public' OR auth.uid() = user_id);
CREATE POLICY "Users can insert own cups" ON user_cups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cups" ON user_cups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cups" ON user_cups FOR DELETE USING (auth.uid() = user_id);
