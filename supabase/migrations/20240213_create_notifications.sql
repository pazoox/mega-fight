-- 12. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'friend_request', 'cup_invite', 'cup_approved', 'reward'
    title TEXT NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}', -- { "friend_id": uuid, "cup_id": uuid, "coins": int }
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Allow inserts (for now, to simplify friend request logic from client side if needed, though server-side is better)
CREATE POLICY "Users can insert notifications" ON notifications FOR INSERT WITH CHECK (true);
