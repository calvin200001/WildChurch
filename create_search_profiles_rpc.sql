CREATE OR REPLACE FUNCTION public.search_profiles(
  search_term text DEFAULT '',
  state_filter text DEFAULT ''
)
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text,
  interests text[],
  beliefs text[],
  state text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    p.interests,
    p.beliefs,
    p.state
  FROM
    public.profiles p
  WHERE
    (search_term = '' OR
     p.username ILIKE '%' || search_term || '%' OR
     (p.interests IS NOT NULL AND EXISTS (SELECT 1 FROM unnest(p.interests) AS i WHERE i ILIKE '%' || search_term || '%')) OR
     (p.beliefs IS NOT NULL AND EXISTS (SELECT 1 FROM unnest(p.beliefs) AS b WHERE b ILIKE '%' || search_term || '%')))
    AND
    (state_filter = '' OR p.state ILIKE '%' || state_filter || '%');
END;
$$;