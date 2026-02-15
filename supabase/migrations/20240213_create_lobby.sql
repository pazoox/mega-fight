-- Create a table for lobby participants
CREATE TABLE IF NOT EXISTS lobby_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    avatar_url TEXT,
    is_host BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending', -- 'pending', 'ready'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE lobby_participants ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read participants for a room
CREATE POLICY "Anyone can read lobby participants" ON lobby_participants FOR SELECT USING (true);

-- Allow authenticated users to insert themselves
CREATE POLICY "Users can join lobby" ON lobby_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own status
CREATE POLICY "Users can update own status" ON lobby_participants FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to leave (delete)
CREATE POLICY "Users can leave lobby" ON lobby_participants FOR DELETE USING (auth.uid() = user_id);
