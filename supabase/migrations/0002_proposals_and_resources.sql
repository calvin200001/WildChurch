-- Migration: 0002_proposals_and_resources.sql
-- Description: Adds meeting proposal system and new 'resource' pin type.

-- 1. Update 'locations' table to include 'resource' type
ALTER TABLE public.locations DROP CONSTRAINT locations_type_check;
ALTER TABLE public.locations ADD CONSTRAINT locations_type_check CHECK (type IN ('open_camp', 'gathering', 'quiet_place', 'resource'));

-- 2. Create 'meeting_proposals' table
CREATE TABLE public.meeting_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  proposed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Proposal details (similar to location)
  title TEXT NOT NULL,
  description TEXT,
  proposed_location GEOGRAPHY(POINT, 4326) NOT NULL,
  proposed_type TEXT NOT NULL DEFAULT 'gathering' CHECK (proposed_type IN ('gathering')), -- Currently only for gatherings
  
  -- Timing
  proposed_start_time TIMESTAMP WITH TIME ZONE,
  proposed_end_time TIMESTAMP WITH TIME ZONE,
  
  -- Status of the proposal
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'cancelled', 'expired')),
  
  -- Link to actual location if confirmed
  confirmed_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL
);

CREATE INDEX meeting_proposals_geo_idx ON public.meeting_proposals USING GIST(proposed_location);
CREATE INDEX meeting_proposals_status_idx ON public.meeting_proposals(status);

-- 3. Create 'proposal_commitments' table
CREATE TABLE public.proposal_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES public.meeting_proposals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(proposal_id, user_id) -- A user can only commit once per proposal
);

CREATE INDEX proposal_commitments_proposal_idx ON public.proposal_commitments(proposal_id);
CREATE INDEX proposal_commitments_user_idx ON public.proposal_commitments(user_id);

-- 4. Function to confirm proposal and create location
CREATE OR REPLACE FUNCTION public.confirm_meeting_proposal()
RETURNS TRIGGER AS $$
DECLARE
  commitment_count INTEGER;
  new_location_id UUID;
BEGIN
  -- Count commitments for this proposal
  SELECT COUNT(*) INTO commitment_count
  FROM public.proposal_commitments
  WHERE proposal_id = NEW.proposal_id;

  -- If 4 or more commitments, confirm the proposal and create a location
  IF commitment_count >= 4 THEN
    -- Update proposal status
    UPDATE public.meeting_proposals
    SET status = 'confirmed'
    WHERE id = NEW.proposal_id
    RETURNING confirmed_location_id INTO new_location_id;

    -- If location not already created, create it
    IF new_location_id IS NULL THEN
      INSERT INTO public.locations (
        created_by,
        location,
        type,
        title,
        description,
        active_from,
        active_until,
        visibility
      )
      SELECT
        mp.proposed_by,
        mp.proposed_location,
        mp.proposed_type, -- Will be 'gathering'
        mp.title,
        mp.description,
        mp.proposed_start_time,
        mp.proposed_end_time,
        'public' -- Confirmed meetings are public
      FROM public.meeting_proposals mp
      WHERE mp.id = NEW.proposal_id
      RETURNING id INTO new_location_id;

      -- Update the proposal with the confirmed location ID
      UPDATE public.meeting_proposals
      SET confirmed_location_id = new_location_id
      WHERE id = NEW.proposal_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger to run the confirmation function on new commitments
CREATE TRIGGER check_proposal_confirmation
AFTER INSERT ON public.proposal_commitments
FOR EACH ROW
EXECUTE FUNCTION public.confirm_meeting_proposal();

-- 6. RLS Policies for new tables
ALTER TABLE public.meeting_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_commitments ENABLE ROW LEVEL SECURITY;

-- Proposals: Publicly viewable, users can propose, only proposer can update/delete
CREATE POLICY "Meeting proposals viewable by everyone"
  ON public.meeting_proposals FOR SELECT
  USING (status = 'proposed' OR status = 'confirmed');

CREATE POLICY "Users can create meeting proposals"
  ON public.meeting_proposals FOR INSERT
  WITH CHECK (proposed_by = auth.uid());

CREATE POLICY "Proposer can update own meeting proposals"
  ON public.meeting_proposals FOR UPDATE
  USING (proposed_by = auth.uid());

CREATE POLICY "Proposer can delete own meeting proposals"
  ON public.meeting_proposals FOR DELETE
  USING (proposed_by = auth.uid());

-- Commitments: Publicly viewable, users can commit to proposals
CREATE POLICY "Proposal commitments viewable by everyone"
  ON public.proposal_commitments FOR SELECT
  USING (true);

CREATE POLICY "Users can commit to meeting proposals"
  ON public.proposal_commitments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their commitment from proposals"
  ON public.proposal_commitments FOR DELETE
  USING (user_id = auth.uid());
