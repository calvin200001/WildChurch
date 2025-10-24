// src/lib/geoQueries.js

// Find pins within radius (uses PostGIS ST_DWithin)
export async function findNearbyPins(supabase, lat, lng, radiusMiles = 50) {
  const radiusMeters = radiusMiles * 1609.34;
  
  const { data, error } = await supabase.rpc('find_nearby_locations', {
    user_lat: lat,
    user_lng: lng,
    radius_meters: radiusMeters
  });

  return data;
}
