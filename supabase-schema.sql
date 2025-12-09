-- =============================================
-- JDR Tables - Database Schema for Supabase
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUM TYPES
-- =============================================

CREATE TYPE game_type AS ENUM ('campaign', 'oneshot');
CREATE TYPE session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE registration_status AS ENUM ('confirmed', 'waitlist', 'declined');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE trigger_warning AS ENUM (
  'violence', 'graphic_violence', 'sexual_content', 'nudity',
  'racism', 'sexism', 'homophobia', 'transphobia',
  'substance_abuse', 'mental_health', 'child_harm', 'animal_harm',
  'body_horror', 'torture', 'suicide', 'domestic_abuse'
);

-- =============================================
-- PROFILES TABLE (extends auth.users)
-- =============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role DEFAULT 'user' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- CAMPAIGNS TABLE
-- =============================================

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  system TEXT,
  gm_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trigger_warnings trigger_warning[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- SESSIONS TABLE
-- =============================================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_type game_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  system TEXT,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  session_number INTEGER DEFAULT 0 CHECK (session_number >= 0),
  dm_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  max_players INTEGER DEFAULT 6 CHECK (max_players >= 1 AND max_players <= 20),
  status session_status DEFAULT 'scheduled' NOT NULL,
  trigger_warnings trigger_warning[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT valid_time_range CHECK (ends_at > starts_at),
  CONSTRAINT campaign_requires_id CHECK (
    (game_type = 'oneshot') OR
    (game_type = 'campaign' AND campaign_id IS NOT NULL)
  )
);

-- =============================================
-- SESSION REGISTRATIONS TABLE
-- =============================================

CREATE TABLE session_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status registration_status DEFAULT 'confirmed' NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(session_id, player_id)
);

-- =============================================
-- PLAYER INVITATIONS TABLE
-- =============================================

CREATE TABLE player_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_player UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT,
  status invitation_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  responded_at TIMESTAMPTZ,

  -- Only one of campaign_id or session_id should be set
  CONSTRAINT invitation_target CHECK (
    (campaign_id IS NOT NULL AND session_id IS NULL) OR
    (campaign_id IS NULL AND session_id IS NOT NULL)
  )
);

-- =============================================
-- EVENT LOGS TABLE
-- =============================================

CREATE TABLE event_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT, -- 'session', 'campaign', 'user', 'registration', etc.
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_sessions_dm_id ON sessions(dm_id);
CREATE INDEX idx_sessions_starts_at ON sessions(starts_at);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_campaign_id ON sessions(campaign_id);
CREATE INDEX idx_registrations_session_id ON session_registrations(session_id);
CREATE INDEX idx_registrations_player_id ON session_registrations(player_id);
CREATE INDEX idx_invitations_invited_player ON player_invitations(invited_player);
CREATE INDEX idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at DESC);

-- =============================================
-- VIEWS
-- =============================================

-- Available sessions with player count
CREATE VIEW available_sessions AS
SELECT
  s.*,
  COUNT(sr.id) FILTER (WHERE sr.status = 'confirmed') AS current_players,
  s.max_players - COUNT(sr.id) FILTER (WHERE sr.status = 'confirmed') AS available_slots,
  p.display_name AS dm_name,
  c.name AS campaign_name
FROM sessions s
LEFT JOIN session_registrations sr ON s.id = sr.session_id
LEFT JOIN profiles p ON s.dm_id = p.id
LEFT JOIN campaigns c ON s.campaign_id = c.id
WHERE s.status = 'scheduled' AND s.starts_at > NOW()
GROUP BY s.id, p.display_name, c.name;

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to check DM schedule conflict
CREATE OR REPLACE FUNCTION check_dm_schedule_conflict()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM sessions
    WHERE dm_id = NEW.dm_id
    AND id != COALESCE(NEW.id, uuid_nil())
    AND status != 'cancelled'
    AND (NEW.starts_at, NEW.ends_at) OVERLAPS (starts_at, ends_at)
  ) THEN
    RAISE EXCEPTION 'Vous avez deja une session en tant que MJ a cette periode';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check player schedule conflict
CREATE OR REPLACE FUNCTION check_player_schedule_conflict()
RETURNS TRIGGER AS $$
DECLARE
  session_record RECORD;
BEGIN
  SELECT starts_at, ends_at INTO session_record
  FROM sessions WHERE id = NEW.session_id;

  IF EXISTS (
    SELECT 1 FROM session_registrations sr
    JOIN sessions s ON sr.session_id = s.id
    WHERE sr.player_id = NEW.player_id
    AND sr.session_id != NEW.session_id
    AND sr.status = 'confirmed'
    AND s.status != 'cancelled'
    AND (session_record.starts_at, session_record.ends_at) OVERLAPS (s.starts_at, s.ends_at)
  ) THEN
    RAISE EXCEPTION 'Vous avez deja une session prevue a cette periode';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check session capacity
CREATE OR REPLACE FUNCTION check_session_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM session_registrations
  WHERE session_id = NEW.session_id AND status = 'confirmed';

  SELECT max_players INTO max_count
  FROM sessions WHERE id = NEW.session_id;

  IF current_count >= max_count THEN
    RAISE EXCEPTION 'Cette session est complete';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Log the signup
  INSERT INTO event_logs (user_id, event_type, entity_type, entity_id, details)
  VALUES (NEW.id, 'user_signup', 'user', NEW.id, jsonb_build_object('email', NEW.email, 'provider', NEW.raw_app_meta_data->>'provider'));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log events
CREATE OR REPLACE FUNCTION log_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO event_logs (user_id, event_type, entity_type, entity_id, details)
  VALUES (p_user_id, p_event_type, p_entity_type, p_entity_id, p_details)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- DM schedule conflict trigger
CREATE TRIGGER check_dm_schedule_before_insert
  BEFORE INSERT OR UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION check_dm_schedule_conflict();

-- Player schedule conflict trigger
CREATE TRIGGER check_player_schedule_before_insert
  BEFORE INSERT ON session_registrations
  FOR EACH ROW EXECUTE FUNCTION check_player_schedule_conflict();

-- Session capacity trigger
CREATE TRIGGER check_capacity_before_insert
  BEFORE INSERT ON session_registrations
  FOR EACH ROW EXECUTE FUNCTION check_session_capacity();

-- Auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Campaigns policies
CREATE POLICY "Campaigns are viewable by everyone"
  ON campaigns FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create campaigns"
  ON campaigns FOR INSERT WITH CHECK (auth.uid() = gm_id);

CREATE POLICY "GMs can update own campaigns"
  ON campaigns FOR UPDATE USING (auth.uid() = gm_id);

CREATE POLICY "GMs can delete own campaigns"
  ON campaigns FOR DELETE USING (auth.uid() = gm_id);

CREATE POLICY "Admins can manage all campaigns"
  ON campaigns FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Sessions policies
CREATE POLICY "Sessions are viewable by everyone"
  ON sessions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create sessions"
  ON sessions FOR INSERT WITH CHECK (auth.uid() = dm_id);

CREATE POLICY "DMs can update own sessions"
  ON sessions FOR UPDATE USING (auth.uid() = dm_id);

CREATE POLICY "DMs can delete own sessions"
  ON sessions FOR DELETE USING (auth.uid() = dm_id);

CREATE POLICY "Admins can manage all sessions"
  ON sessions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Registrations policies
CREATE POLICY "Registrations are viewable by everyone"
  ON session_registrations FOR SELECT USING (true);

CREATE POLICY "Users can register themselves"
  ON session_registrations FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can cancel own registration"
  ON session_registrations FOR DELETE USING (auth.uid() = player_id);

CREATE POLICY "DMs can manage registrations for their sessions"
  ON session_registrations FOR ALL USING (
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND dm_id = auth.uid())
  );

CREATE POLICY "Admins can manage all registrations"
  ON session_registrations FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Invitations policies
CREATE POLICY "Users can see their invitations"
  ON player_invitations FOR SELECT USING (
    auth.uid() = invited_player OR auth.uid() = invited_by
  );

CREATE POLICY "Users can create invitations"
  ON player_invitations FOR INSERT WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Invited players can respond to invitations"
  ON player_invitations FOR UPDATE USING (auth.uid() = invited_player);

CREATE POLICY "Inviters can delete their invitations"
  ON player_invitations FOR DELETE USING (auth.uid() = invited_by);

CREATE POLICY "Admins can manage all invitations"
  ON player_invitations FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Event logs policies
CREATE POLICY "Users can see own logs"
  ON event_logs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can see all logs"
  ON event_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert logs"
  ON event_logs FOR INSERT WITH CHECK (true);

-- =============================================
-- INITIAL ADMIN USER (update email after first signup)
-- =============================================

-- After your first signup, run this to make yourself admin:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
