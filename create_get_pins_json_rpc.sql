CREATE OR REPLACE FUNCTION get_pins_json(search TEXT DEFAULT NULL)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'type', 'FeatureCollection',
      'features', COALESCE(json_agg(
        json_build_object(
          'type', 'Feature',
          'id', l.id,
          'geometry', ST_AsGeoJSON(l.location)::json,
          'properties', json_build_object(
            'id', l.id,
            'type', l.type,
            'title', l.title,
            'description', l.description,
            'created_by', l.created_by,
            'created_at', l.created_at,
            'visibility', l.visibility
          )
        )
      ), '[]'::json)
    )
    FROM locations l
    WHERE l.deleted_at IS NULL
      AND (l.visibility = 'public' OR l.created_by = auth.uid())
      AND (search IS NULL OR l.search_vector @@ plainto_tsquery('english', search))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;