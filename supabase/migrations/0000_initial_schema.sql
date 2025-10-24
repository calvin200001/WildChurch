-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- User Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  testimony TEXT,
  interests TEXT[], -- ['worship', 'prayer_walks', 'fasting', 'fellowship']
  lifestyle TEXT[], -- ['vanlife', 'hiker', 'camper', 'nomad']
  open_to TEXT[], -- ['meals', 'worship_nights', 'prayer', 'hosting']
  verified_photo BOOLEAN DEFAULT FALSE,
  verified_host BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location_sharing BOOLEAN DEFAULT TRUE,
  last_known_location GEOGRAPHY(POINT, 4326)
);

CREATE INDEX profiles_location_idx ON profiles USING GIST(last_known_location);

-- Locations (Pins on Map)
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Geospatial data
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  
  -- Pin details
  type TEXT NOT NULL CHECK (type IN ('open_camp', 'gathering', 'quiet_place')),
  title TEXT NOT NULL,
  description TEXT,
  
  -- Timing
  active_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active_until TIMESTAMP WITH TIME ZONE, -- auto-expire pins
  
  -- Visibility
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
  verified BOOLEAN DEFAULT FALSE,
  
  -- Search
  search_vector tsvector
);

-- Spatial index for proximity queries
CREATE INDEX locations_geo_idx ON locations USING GIST(location);
CREATE INDEX locations_type_idx ON locations(type);
CREATE INDEX locations_active_idx ON locations(active_until) WHERE active_until > NOW();
CREATE INDEX locations_search_idx ON locations USING GIN(search_vector);

-- Auto-update search vector
CREATE FUNCTION update_location_search()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER location_search_update
BEFORE INSERT OR UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION update_location_search();

-- Pin Tags
CREATE TABLE pin_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  tag TEXT NOT NULL, 
  -- 'worship_tonight', 'bring_food', 'guitar_circle', 'intercession', 
  -- 'sunrise_prayer', 'communion', 'bible_study', 'acoustic_jam'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX pin_tags_location_idx ON pin_tags(location_id);
CREATE INDEX pin_tags_tag_idx ON pin_tags(tag);

-- Pin Details (Extended Info)
CREATE TABLE pin_details (
  location_id UUID PRIMARY KEY REFERENCES locations(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  what_to_bring TEXT[],
  capacity INTEGER,
  current_attendees INTEGER DEFAULT 0,
  host_contact TEXT, -- encrypted or obfuscated
  meeting_point TEXT,
  parking_notes TEXT,
  water_available BOOLEAN DEFAULT FALSE,
  fire_allowed BOOLEAN DEFAULT FALSE
);

-- Custom Paths (Prayer Walks, Trails)
CREATE TABLE custom_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  path_line GEOGRAPHY(LINESTRING, 4326) NOT NULL,
  path_type TEXT CHECK (path_type IN ('prayer_walk', 'hiking_trail', 'camp_boundary', 'other')),
  distance_meters NUMERIC,
  visibility TEXT DEFAULT 'public'
);

CREATE INDEX custom_paths_geo_idx ON custom_paths USING GIST(path_line);

-- Pin Comments
CREATE TABLE pin_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  parent_id UUID REFERENCES pin_comments(id) ON DELETE CASCADE -- for threading
);

CREATE INDEX pin_comments_location_idx ON pin_comments(location_id, created_at DESC);
CREATE INDEX pin_comments_parent_idx ON pin_comments(parent_id);

-- Messaging
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX conversation_participants_user_idx ON conversation_participants(user_id, last_read_at);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited BOOLEAN DEFAULT FALSE
);

CREATE INDEX messages_conversation_idx ON messages(conversation_id, created_at DESC);

-- Update conversation timestamp
CREATE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_sent
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- Following System
CREATE TABLE follows (
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX follows_follower_idx ON follows(follower_id);
CREATE INDEX follows_following_idx ON follows(following_id);

-- Safety Reviews (Positive-Only)
CREATE TABLE safety_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 4 AND rating <= 5), -- only 4-5 stars
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, reviewer_id)
);

CREATE INDEX safety_reviews_location_idx ON safety_reviews(location_id);

-- Notification Queue
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX notification_queue_user_idx ON notification_queue(user_id, created_at DESC) WHERE read = FALSE;

-- Reports/Moderation
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  reported_comment_id UUID REFERENCES pin_comments(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id)
);

CREATE INDEX reports_status_idx ON reports(status, created_at DESC);

-- Prayer Requests (Optional Feature)
CREATE TABLE prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  request_text TEXT NOT NULL,
  anonymous BOOLEAN DEFAULT FALSE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL, -- optional: tie to a place
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  prayer_count INTEGER DEFAULT 0
);

CREATE INDEX prayer_requests_active_idx ON prayer_requests(created_at DESC) 
  WHERE expires_at > NOW();

CREATE TABLE prayer_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES prayer_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(request_id, user_id)
);

-- Update prayer count
CREATE FUNCTION increment_prayer_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE prayer_requests 
  SET prayer_count = prayer_count + 1 
  WHERE id = NEW.request_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prayer_response_added
AFTER INSERT ON prayer_responses
FOR EACH ROW
EXECUTE FUNCTION increment_prayer_count();

-- Push Subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subscription)
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;


-- Profiles: Anyone can read public profiles, users can update their own
CREATE POLICY "Public profiles viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Locations: Public pins visible to all, users manage their own
CREATE POLICY "Public locations viewable by everyone"
  ON locations FOR SELECT
  USING (
    visibility = 'public' 
    OR created_by = auth.uid()
    OR (visibility = 'friends' AND created_by IN (
      SELECT following_id FROM follows WHERE follower_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create locations"
  ON locations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own locations"
  ON locations FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own locations"
  ON locations FOR DELETE
  USING (auth.uid() = created_by);

-- Pin Tags: Inherit from location permissions
CREATE POLICY "Pin tags viewable with location"
  ON pin_tags FOR SELECT
  USING (
    location_id IN (
      SELECT id FROM locations 
      WHERE visibility = 'public' OR created_by = auth.uid()
    )
  );

CREATE POLICY "Users can add tags to accessible locations"
  ON pin_tags FOR INSERT
  WITH CHECK (
    location_id IN (SELECT id FROM locations WHERE created_by = auth.uid())
  );

-- Pin Comments: Anyone can read on public pins, auth users can comment
CREATE POLICY "Comments viewable on accessible locations"
  ON pin_comments FOR SELECT
  USING (
    location_id IN (
      SELECT id FROM locations WHERE visibility = 'public' OR created_by = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can comment"
  ON pin_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON pin_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON pin_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Custom Paths: Similar to locations
CREATE POLICY "Public paths viewable"
  ON custom_paths FOR SELECT
  USING (visibility = 'public' OR created_by = auth.uid());

CREATE POLICY "Users can create paths"
  ON custom_paths FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Messages: Only participants can access
CREATE POLICY "Users see own conversations"
  ON conversations FOR SELECT
  USING (
    id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Messages visible to participants"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id 
    AND conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Follows: Users can follow anyone, see own follows
CREATE POLICY "Users can see all follows"
  ON follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Notifications: Users see only their own
CREATE POLICY "Users see own notifications"
  ON notification_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications read"
  ON notification_queue FOR UPDATE
  USING (auth.uid() = user_id);

-- Prayer Requests: Anyone can read non-expired, creator can manage
CREATE POLICY "Active prayer requests viewable"
  ON prayer_requests FOR SELECT
  USING (expires_at > NOW());

CREATE POLICY "Users can create prayer requests"
  ON prayer_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id OR anonymous = true);

CREATE POLICY "Users can respond to prayers"
  ON prayer_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Push Subscriptions: Users can manage their own subscriptions
CREATE POLICY "Users can manage their own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- Proximity Query Function
CREATE OR REPLACE FUNCTION find_nearby_locations(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters INTEGER
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  type TEXT,
  distance_meters NUMERIC,
  created_at TIMESTAMPTZ,
  creator_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.description,
    l.type,
    ST_Distance(
      l.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) as distance_meters,
    l.created_at,
    p.first_name as creator_name
  FROM locations l
  JOIN profiles p ON l.created_by = p.id
  WHERE 
    l.visibility = 'public'
    AND (l.active_until IS NULL OR l.active_until > NOW())
    AND ST_DWithin(
      l.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Nearby Users Function
CREATE OR REPLACE FUNCTION find_nearby_users(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER
)
RETURNS TABLE (
  id UUID,
  distance_meters NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    ST_Distance(
      p.last_known_location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_meters
  FROM profiles p
  WHERE
    p.location_sharing = TRUE
    AND p.last_known_location IS NOT NULL
    AND ST_DWithin(
      p.last_known_location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    );
END;
$$ LANGUAGE plpgsql;
