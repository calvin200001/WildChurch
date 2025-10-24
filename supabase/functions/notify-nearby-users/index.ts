import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { locationId } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get the new location
  const { data: location } = await supabase
    .from('locations')
    .select('*, profiles!created_by(*)')
    .eq('id', locationId)
    .single();

  if (!location) {
    return new Response('Location not found', { status: 404 });
  }

  // Find users within 50 miles
  const { data: nearbyUsers } = await supabase.rpc('find_nearby_users', {
    lat: location.location.coordinates[1],
    lng: location.location.coordinates[0],
    radius_meters: 80467 // 50 miles
  });

  // Create notifications
  const notifications = nearbyUsers.map(user => ({
    user_id: user.id,
    type: 'nearby_gathering',
    data: {
      location_id: locationId,
      title: location.title,
      creator: location.profiles.first_name,
      distance_miles: Math.round(user.distance_meters / 1609.34)
    }
  }));

  await supabase.from('notification_queue').insert(notifications);

  // Trigger push notifications via Netlify function
  for (const user of nearbyUsers) {
    await fetch(`${Deno.env.get('SITE_URL')}/.netlify/functions/send-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        title: 'New Gathering Nearby',
        body: `${location.profiles.first_name} posted "${location.title}" ${Math.round(user.distance_meters / 1609.34)} miles away`,
        data: { locationId }
      })
    });
  }

  return new Response(JSON.stringify({ notified: nearbyUsers.length }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
