-- Migration: 0003_proposal_comments.sql
-- Description: Modifies pin_comments table to support comments on meeting proposals.

-- 1. Add proposal_id column to pin_comments
ALTER TABLE public.pin_comments
ADD COLUMN proposal_id UUID REFERENCES public.meeting_proposals(id) ON DELETE CASCADE;

-- 2. Make location_id nullable
ALTER TABLE public.pin_comments
ALTER COLUMN location_id DROP NOT NULL;

-- 3. Add check constraint: a comment must be linked to either a location OR a proposal
ALTER TABLE public.pin_comments
ADD CONSTRAINT chk_location_or_proposal_id
CHECK (location_id IS NOT NULL OR proposal_id IS NOT NULL);

-- 4. Update RLS policies for pin_comments
-- Drop existing policies first
DROP POLICY IF EXISTS "Comments viewable on accessible locations" ON public.pin_comments;
DROP POLICY IF EXISTS "Authenticated users can comment" ON public.pin_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.pin_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.pin_comments;

-- Recreate policies to include proposal_id
CREATE POLICY "Comments viewable on accessible locations or proposals"
  ON public.pin_comments FOR SELECT
  USING (
    location_id IN (
      SELECT id FROM public.locations WHERE visibility = 'public' OR created_by = auth.uid()
    )
    OR
    proposal_id IN (
      SELECT id FROM public.meeting_proposals WHERE status = 'proposed' OR status = 'confirmed' OR proposed_by = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can comment on accessible locations or proposals"
  ON public.pin_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      location_id IN (SELECT id FROM public.locations WHERE visibility = 'public' OR created_by = auth.uid())
      OR
      proposal_id IN (SELECT id FROM public.meeting_proposals WHERE status = 'proposed' OR status = 'confirmed' OR proposed_by = auth.uid())
    )
  );

CREATE POLICY "Users can update own comments"
  ON public.pin_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.pin_comments FOR DELETE
  USING (auth.uid() = user_id);
