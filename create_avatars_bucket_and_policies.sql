-- Create 'avatars' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false) -- Set to false for private bucket
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for 'avatars' bucket

-- Drop existing policies (if they exist) to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Allow authenticated uploads"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'avatars' AND
    starts_with(name, auth.uid()::text)
  );

-- Allow authenticated users to view any avatar (avatars are public)
CREATE POLICY "Allow authenticated reads"
  ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars');

-- Allow authenticated users to update their own avatar
CREATE POLICY "Allow authenticated updates"
  ON storage.objects FOR UPDATE TO authenticated USING (
    bucket_id = 'avatars' AND
    starts_with(name, auth.uid()::text)
  );

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Allow authenticated deletes"
  ON storage.objects FOR DELETE TO authenticated USING (
    bucket_id = 'avatars' AND
    starts_with(name, auth.uid()::text)
  );