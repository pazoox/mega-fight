-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. GROUPS (Franchises / Platforms)
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo TEXT,
    type TEXT DEFAULT 'Franchise', -- 'Franchise', 'Platform', 'Community'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CHARACTERS
CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY, -- Changed from UUID to TEXT to support existing string IDs
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    alias TEXT,
    description TEXT,
    canon_scale INTEGER DEFAULT 1, -- 1-1000
    specs JSONB DEFAULT '{}', -- height, weight, race, gender
    stages JSONB DEFAULT '[]', -- Array of CharacterStage objects (stats, images, tags)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TOURNAMENTS (Seasons)
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'setup', -- 'setup', 'active', 'completed'
    format TEXT DEFAULT 'round_robin', -- 'round_robin', 'elimination', 'hybrid'
    team_size INTEGER DEFAULT 1, -- 1v1, 2v2, etc.
    start_date DATE,
    end_date DATE,
    config JSONB DEFAULT '{}', -- Rules: daily_matches, min_rank, max_rank, allowed_tags
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TOURNAMENT TEAMS
CREATE TABLE IF NOT EXISTS tournament_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    image TEXT, -- Representative image for the team
    stats JSONB DEFAULT '{"wins": 0, "losses": 0, "points": 0, "rank": 0}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TOURNAMENT PARTICIPANTS (Linking Characters to Teams)
CREATE TABLE IF NOT EXISTS tournament_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES tournament_teams(id) ON DELETE CASCADE,
    character_id TEXT REFERENCES characters(id) ON DELETE CASCADE, -- Changed to TEXT
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TOURNAMENT MATCHES
CREATE TABLE IF NOT EXISTS tournament_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    team_a_id UUID REFERENCES tournament_teams(id) ON DELETE CASCADE,
    team_b_id UUID REFERENCES tournament_teams(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'active', 'completed'
    scheduled_date DATE,
    result JSONB DEFAULT NULL, -- { "winner_id": uuid, "score_a": int, "score_b": int, "votes": { ... } }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. VOTES (Optional - for user engagement)
CREATE TABLE IF NOT EXISTS match_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES tournament_matches(id) ON DELETE CASCADE,
    user_id UUID, -- Nullable if anonymous/IP based, or link to auth.users
    voted_team_id UUID REFERENCES tournament_teams(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. USER PROFILES (Extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  coins INTEGER DEFAULT 160,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. FRIENDS
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, receiver_id)
);

-- 10. COMMENTS
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  entity_type TEXT, -- 'match', 'character', 'tournament'
  entity_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- RLS POLICIES (Development Mode: Allow All)
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cups ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public Read Groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Public Read Characters" ON characters FOR SELECT USING (true);
CREATE POLICY "Public Read Tournaments" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Public Read Teams" ON tournament_teams FOR SELECT USING (true);
CREATE POLICY "Public Read Matches" ON tournament_matches FOR SELECT USING (true);

-- Allow public write access (DEV ONLY)
CREATE POLICY "Public Insert Groups" ON groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Groups" ON groups FOR UPDATE USING (true);
CREATE POLICY "Public Delete Groups" ON groups FOR DELETE USING (true);

CREATE POLICY "Public Insert Characters" ON characters FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Characters" ON characters FOR UPDATE USING (true);

CREATE POLICY "Public Insert Tournaments" ON tournaments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Tournaments" ON tournaments FOR UPDATE USING (true);

CREATE POLICY "Public Insert Teams" ON tournament_teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Teams" ON tournament_teams FOR UPDATE USING (true);

CREATE POLICY "Public Insert Matches" ON tournament_matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Matches" ON tournament_matches FOR UPDATE USING (true);

CREATE POLICY "Public Insert Participants" ON tournament_participants FOR INSERT WITH CHECK (true);

-- Profiles Policies
CREATE POLICY "Public Read Profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Friends Policies
CREATE POLICY "Users can read own friends" ON friends FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can insert friend request" ON friends FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update own friend request" ON friends FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can delete own friend request" ON friends FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Comments Policies
CREATE POLICY "Public Read Comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can insert comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Cups Policies
CREATE POLICY "Public Read Public Cups" ON user_cups FOR SELECT USING (status = 'public' OR auth.uid() = user_id);
CREATE POLICY "Users can insert own cups" ON user_cups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cups" ON user_cups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cups" ON user_cups FOR DELETE USING (auth.uid() = user_id);
