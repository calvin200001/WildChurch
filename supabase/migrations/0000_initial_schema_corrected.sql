-- Corrected Initial Schema for WildChurch
-- Version: 2
-- Description: Combines initial schema and safety updates, and fixes the IMMUTABLE index error.

-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- User Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  testimony TEXT,
  interests TEXT[],
  lifestyle TEXT[],
  open_to TEXT[],
  verified_photo BOOLEAN DEFAULT FALSE,
  verified_host BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location_sharing BOOLEAN DEFAULT TRUE,
  last_known_location GEOGRAPHY(POINT, 4326),
  messaging_policy TEXT DEFAULT 'anyone' CHECK (messaging_policy IN ('anyone', 'following', 'verified')),
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin'))
);

CREATE INDEX profiles_location_idx ON public.profiles USING GIST(last_known_location);

-- Locations (Pins on Map)
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('open_camp', 'gathering', 'quiet_place')),
  title TEXT NOT NULL,
  description TEXT,
  active_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active_until TIMESTAMP WITH TIME ZONE,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
  verified BOOLEAN DEFAULT FALSE,
  search_vector tsvector
);

CREATE INDEX locations_geo_idx ON public.locations USING GIST(location);
CREATE INDEX locations_type_idx ON public.locations(type);
CREATE INDEX locations_active_idx ON public.locations(active_until);
CREATE INDEX locations_search_idx ON public.locations USING GIN(search_vector);

CREATE FUNCTION public.update_location_search()
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
BEFORE INSERT OR UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.update_location_search();

-- Other Tables (Pin Tags, Details, etc.)
CREATE TABLE public.pin_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX pin_tags_location_idx ON public.pin_tags(location_id);
CREATE INDEX pin_tags_tag_idx ON public.pin_tags(tag);

CREATE TABLE public.pin_details (
  location_id UUID PRIMARY KEY REFERENCES public.locations(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  what_to_bring TEXT[],
  capacity INTEGER,
  current_attendees INTEGER DEFAULT 0,
  host_contact TEXT,
  meeting_point TEXT,
  parking_notes TEXT,
  water_available BOOLEAN DEFAULT FALSE,
  fire_allowed BOOLEAN DEFAULT FALSE
);

CREATE TABLE public.custom_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  path_line GEOGRAPHY(LINESTRING, 4326) NOT NULL,
  path_type TEXT CHECK (path_type IN ('prayer_walk', 'hiking_trail', 'camp_boundary', 'other')),
  distance_meters NUMERIC,
  visibility TEXT DEFAULT 'public'
);
CREATE INDEX custom_paths_geo_idx ON public.custom_paths USING GIST(path_line);

CREATE TABLE public.pin_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  parent_id UUID REFERENCES public.pin_comments(id) ON DELETE CASCADE
);
CREATE INDEX pin_comments_location_idx ON public.pin_comments(location_id, created_at DESC);
CREATE INDEX pin_comments_parent_idx ON public.pin_comments(parent_id);

-- Messaging System
CREATE TABLE public.conversations ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() );
CREATE TABLE public.conversation_participants ( conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE, user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), PRIMARY KEY (conversation_id, user_id) );
CREATE INDEX conversation_participants_user_idx ON public.conversation_participants(user_id, last_read_at);
CREATE TABLE public.messages ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE, sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, content TEXT NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), edited BOOLEAN DEFAULT FALSE );
CREATE INDEX messages_conversation_idx ON public.messages(conversation_id, created_at DESC);

CREATE FUNCTION public.update_conversation_timestamp() RETURNS TRIGGER AS $$ BEGIN UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id; RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER message_sent AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();

-- Social & Safety Features
CREATE TABLE public.follows ( follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), PRIMARY KEY (follower_id, following_id), CHECK (follower_id != following_id) );
CREATE INDEX follows_follower_idx ON public.follows(follower_id);
CREATE INDEX follows_following_idx ON public.follows(following_id);

CREATE TABLE public.safety_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, reviewer_id),
  felt_safe BOOLEAN NOT NULL DEFAULT false,
  visible BOOLEAN GENERATED ALWAYS AS (rating >= 4) STORED
);
CREATE INDEX safety_reviews_location_idx ON public.safety_reviews(location_id);

CREATE OR REPLACE VIEW public.public_reviews AS
  SELECT * FROM public.safety_reviews
  WHERE visible = true;

CREATE TABLE public.notification_queue ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, type TEXT NOT NULL, data JSONB NOT NULL, read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() );
CREATE INDEX notification_queue_user_idx ON public.notification_queue(user_id, created_at DESC) WHERE read = FALSE;

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  reported_comment_id UUID REFERENCES public.pin_comments(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id),
  action_taken TEXT,
  moderator_notes TEXT
);
CREATE INDEX reports_status_idx ON public.reports(status, created_at DESC);

CREATE TABLE public.prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  request_text TEXT NOT NULL,
  anonymous BOOLEAN DEFAULT FALSE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  prayer_count INTEGER DEFAULT 0
);
CREATE INDEX prayer_requests_active_idx ON public.prayer_requests(expires_at);

CREATE TABLE public.prayer_responses ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), request_id UUID REFERENCES public.prayer_requests(id) ON DELETE CASCADE, user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), UNIQUE(request_id, user_id) );

CREATE FUNCTION public.increment_prayer_count() RETURNS TRIGGER AS $$ BEGIN UPDATE public.prayer_requests SET prayer_count = prayer_count + 1 WHERE id = NEW.request_id; RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER prayer_response_added AFTER INSERT ON public.prayer_responses FOR EACH ROW EXECUTE FUNCTION public.increment_prayer_count();

CREATE TABLE public.push_subscriptions ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, subscription JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, subscription) );

CREATE TABLE public.verifications (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  moderator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public locations viewable by everyone" ON public.locations FOR SELECT USING ( visibility = 'public' OR created_by = auth.uid() OR (visibility = 'friends' AND created_by IN ( SELECT following_id FROM follows WHERE follower_id = auth.uid() )) );
CREATE POLICY "Users can create locations" ON public.locations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own locations" ON public.locations FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own locations" ON public.locations FOR DELETE USING (auth.uid() = created_by);
CREATE POLICY "Pin tags viewable with location" ON public.pin_tags FOR SELECT USING ( location_id IN ( SELECT id FROM locations WHERE visibility = 'public' OR created_by = auth.uid() ) );
CREATE POLICY "Users can add tags to accessible locations" ON public.pin_tags FOR INSERT WITH CHECK ( location_id IN (SELECT id FROM locations WHERE created_by = auth.uid()) );
CREATE POLICY "Comments viewable on accessible locations" ON public.pin_comments FOR SELECT USING ( location_id IN ( SELECT id FROM locations WHERE visibility = 'public' OR created_by = auth.uid() ) );
CREATE POLICY "Authenticated users can comment" ON public.pin_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.pin_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.pin_comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Public paths viewable" ON public.custom_paths FOR SELECT USING (visibility = 'public' OR created_by = auth.uid());
CREATE POLICY "Users can create paths" ON public.custom_paths FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users see own conversations" ON public.conversations FOR SELECT USING ( id IN ( SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid() ) );
CREATE POLICY "Messages visible to participants" ON public.messages FOR SELECT USING ( conversation_id IN ( SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid() ) );
CREATE POLICY "Participants can send messages" ON public.messages FOR INSERT WITH CHECK ( auth.uid() = sender_id AND conversation_id IN ( SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid() ) );
CREATE POLICY "Users can see all follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);
CREATE POLICY "Users see own notifications" ON public.notification_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mark own notifications read" ON public.notification_queue FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Active prayer requests viewable" ON public.prayer_requests FOR SELECT USING (expires_at > NOW());
CREATE POLICY "Users can create prayer requests" ON public.prayer_requests FOR INSERT WITH CHECK (auth.uid() = user_id OR anonymous = true);
CREATE POLICY "Users can respond to prayers" ON public.prayer_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own push subscriptions" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage verifications" ON public.verifications FOR ALL USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator') );
CREATE POLICY "Users can see their own verification status" ON public.verifications FOR SELECT USING ( user_id = auth.uid() );
CREATE POLICY "Admins can see moderation actions" ON public.moderation_actions FOR SELECT USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator') );

-- RPC FUNCTIONS
CREATE OR REPLACE FUNCTION public.find_nearby_locations( user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION, radius_meters INTEGER) RETURNS TABLE ( id UUID, title TEXT, description TEXT, type TEXT, distance_meters NUMERIC, created_at TIMESTAMPTZ, creator_name TEXT ) AS $$ BEGIN RETURN QUERY SELECT l.id, l.title, l.description, l.type, ST_Distance( l.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography ) as distance_meters, l.created_at, p.first_name as creator_name FROM public.locations l JOIN public.profiles p ON l.created_by = p.id WHERE l.visibility = 'public' AND (l.active_until IS NULL OR l.active_until > NOW()) AND ST_DWithin( l.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, radius_meters ) ORDER BY distance_meters ASC LIMIT 100; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION public.find_nearby_users( lat DOUBLE PRECISION, lng DOUBLE PRECISION, radius_meters INTEGER) RETURNS TABLE ( id UUID, distance_meters NUMERIC ) AS $$ BEGIN RETURN QUERY SELECT p.id, ST_Distance( p.last_known_location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography ) as distance_meters FROM public.profiles p WHERE p.location_sharing = TRUE AND p.last_known_location IS NOT NULL AND ST_DWithin( p.last_known_location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius_meters ); END; $$ LANGUAGE plpgsql;
