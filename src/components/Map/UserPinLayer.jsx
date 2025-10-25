import { useEffect, useCallback } from 'react';
import { useMap } from 'react-map-gl';
import { supabase } from '@/lib/supabase';
import maplibregl from 'maplibre-gl';

// Helper function, can live outside the component
function handlePinClick(e, map) {
  const pin = e.features[0];
  const coordinates = pin.geometry.coordinates.slice();
  const { title, description, type, creator, tags: tagsString, id } = pin.properties;
  const tags = tagsString ? JSON.parse(tagsString) : []; // Parse tags back to array
  
  while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
  }
  const typeEmoji = {'open_camp': '🏕️', 'gathering': '🙏', 'quiet_place': '🌲', 'resource': '📍'};
  
  console.log('Creating popup for pin:', pin.properties.id);
  new maplibregl.Popup({ maxWidth: '320px', className: 'custom-popup' })
    .setLngLat(coordinates)
    .setHTML(`
      <div class="bg-earth-800 rounded-lg p-4">
        <h3>${typeEmoji[type] || ''} ${title}</h3>
        <p>${description || 'No description provided.'}</p>
        ${tags.length > 0 ? `<p><small>Tags: ${tags.join(', ')}</small></p>` : ''}
        <p><small>Posted by ${creator || 'Anonymous'}</small></p>
        <button onclick="window.viewPinDetails('${id}')">View Details</button>
      </div>
    `)
    .addTo(map);
}

export function UserPinLayer({ searchQuery = '' }) {
  const { current: mapContainer } = useMap();

  // This is the single, controlling useEffect for this component's entire lifecycle.
  useEffect(() => {
    const map = mapContainer?.getMap(); // Get it inside the effect
    if (!map) return;

    const pinLayers = ['open-camps', 'gatherings', 'quiet-places', 'resources']; // Moved pinLayers definition here

    // Define all logic INSIDE the effect to avoid stale closures.
    const loadPinsAndLayers = async () => {
      // 1. Clean up previous layers on every run to prevent errors
      if (map.getSource('user-pins')) {
        const layers = ['clusters', 'cluster-count', 'open-camps', 'gatherings', 'quiet-places', 'resources'];
        layers.forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
        map.removeSource('user-pins');
      }

      // 2. Fetch data using the robust PostGIS function
      console.log("UserPinLayer: Fetching pins using 'get_pins_json' RPC...");
      try {
        console.log('UserPinLayer: About to call RPC...');
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/get_pins_json`,
          {
            method: 'POST',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ search: searchQuery })
          }
        );

        const pins = await response.json();
        const error = response.ok ? null : { message: 'Failed to fetch pins' };

        console.log('UserPinLayer: RPC RETURNED!');
        console.log('UserPinLayer: pins type:', typeof pins);
        console.log('UserPinLayer: pins value:', pins);
        console.log('UserPinLayer: error:', error);

        if (error) {
          console.error('UserPinLayer: Error fetching pins via RPC:', error);
          return;
        }

        if (!pins || !pins.features) {
          console.warn('UserPinLayer: RPC returned no pins or invalid format:', pins);
          return;
        }

        console.log('UserPinLayer: Processing', pins.features.length, 'pins');

        // 3. Transform data into a valid GeoJSON FeatureCollection
        const geojson = {
          type: 'FeatureCollection',
          features: pins.features.map(feature => ({
            type: 'Feature',
            geometry: feature.geometry,
            properties: feature.properties
          }))
        };
        console.log('UserPinLayer: GeoJSON created:', geojson);

        // 4. Add the source and all layers to the map
        console.log('UserPinLayer: Map object before addSource:', map);
        map.addSource('user-pins', { 
          type: 'geojson', 
          data: geojson, 
          cluster: true, 
          clusterMaxZoom: 14, 
          clusterRadius: 50 
        });
        console.log('UserPinLayer: Added user-pins source.');

        map.addLayer({ id: 'clusters', type: 'circle', source: 'user-pins', filter: ['has', 'point_count'], paint: { 'circle-color': '#4a7c4a', 'circle-radius': 20 } });
        map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'user-pins', filter: ['has', 'point_count'], layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12 }, paint: { 'text-color': 'white' } });
        map.addLayer({
          id: 'open-camps',
          type: 'circle',
          source: 'user-pins',
          filter: ['all', ['!has', 'point_count'], ['==', 'type', 'open_camp']],
          paint: {
            'circle-radius': 8,
            'circle-color': '#ff6b35',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });

        map.addLayer({
          id: 'gatherings',
          type: 'circle',
          source: 'user-pins',
          filter: ['all', ['!has', 'point_count'], ['==', 'type', 'gathering']],
          paint: {
            'circle-radius': 8,
            'circle-color': '#6b2d5c',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });

        map.addLayer({
          id: 'quiet-places',
          type: 'circle',
          source: 'user-pins',
          filter: ['all', ['!has', 'point_count'], ['==', 'type', 'quiet_place']],
          paint: {
            'circle-radius': 8,
            'circle-color': '#2d5016',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });

        map.addLayer({
          id: 'resources',
          type: 'circle',
          source: 'user-pins',
          filter: ['all', ['!has', 'point_count'], ['==', 'type', 'resource']],
          paint: {
            'circle-radius': 8,
            'circle-color': '#0066cc',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
        console.log('Map updated with new pins.');

        // Add click listeners for each pin layer
        pinLayers.forEach(layerId => {
          map.on('click', layerId, (e) => {
            handlePinClick(e, map);
            e.originalEvent.stopPropagation(); // Stop propagation to prevent other map click handlers
          });
        });
        
      } catch (err) {
        console.error('UserPinLayer: Unexpected error during RPC call:', err);
        return;
      }
    };

    const onLoad = () => {
      console.log("Map style loaded. Loading pins without custom icons...");
      // Skip icon loading for now, use default markers
      loadPinsAndLayers();
    };

    // Attach the single 'load' event listener
    if (map.isStyleLoaded()) {
      onLoad();
    } else {
      map.on('load', onLoad);
    }
    
    // Set up real-time listener
    const subscription = supabase
      .channel('map-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'locations' }, 
        () => {
          if (map && map.isStyleLoaded()) {
            // Reload pins as style is loaded
            loadPinsAndLayers();
          }
        }
      )
      .subscribe();

    // Return a cleanup function
    return () => {
      subscription.unsubscribe();
      map.off('load', onLoad);
      pinLayers.forEach(layerId => {
        map.off('click', layerId);
      });
      // Proper cleanup would remove sources and layers here, but this is often skipped if the map is permanent
    };
  }, [mapContainer, searchQuery]); // This effect only re-runs if the map instance itself changes

  return null;
}