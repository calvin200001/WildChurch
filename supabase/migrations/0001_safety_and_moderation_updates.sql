-- Migration: 0001_safety_and_moderation_updates.sql
-- Description: Updates schema to support enhanced safety, moderation, and privacy features.

-- 1. Update 'profiles' table for privacy settings and roles
ALTER TABLE public.profiles
  ADD COLUMN messaging_policy TEXT DEFAULT 'anyone' CHECK (messaging_policy IN ('anyone', 'following', 'verified')),
  ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin'));

-- 2. Update 'safety_reviews' table for detailed review system
-- First, drop the old rating constraint
ALTER TABLE public.safety_reviews
  DROP CONSTRAINT safety_reviews_rating_check;

-- Now, add the new constraint and columns
ALTER TABLE public.safety_reviews
  ADD CONSTRAINT safety_reviews_rating_check CHECK (rating >= 1 AND rating <= 5),
  ADD COLUMN felt_safe BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN visible BOOLEAN GENERATED ALWAYS AS (rating >= 4) STORED;

-- Create a view for publicly visible reviews
CREATE OR REPLACE VIEW public_reviews AS
  SELECT * FROM public.safety_reviews
  WHERE visible = true;

-- 3. Update 'reports' table for better moderation tracking
ALTER TABLE public.reports
  ADD COLUMN action_taken TEXT,
  ADD COLUMN moderator_notes TEXT;

-- 4. Create new 'verifications' table for managing user verification
CREATE TABLE public.verifications (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  verified_by UUID REFERENCES public.profiles(id), -- admin who verified
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS for the new table
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage verifications"
  ON public.verifications FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator') );
CREATE POLICY "Users can see their own verification status"
  ON public.verifications FOR SELECT
  USING ( user_id = auth.uid() );


-- 5. Create new 'moderation_actions' table for audit trails
CREATE TABLE public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  moderator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS for the new table
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can see moderation actions"
  ON public.moderation_actions FOR SELECT
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator') );

-- Note: The logic for making someone a "Verified Host" is complex (e.g., "hosted 5+ gatherings")
-- and is best handled by a periodic server-side function or manual admin action rather than a simple SQL rule.
-- The `profiles.verified_host` boolean can be updated by an admin or a trusted function.
