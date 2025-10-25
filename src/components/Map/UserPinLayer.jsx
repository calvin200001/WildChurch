import { useEffect, useCallback } from 'react';
import { useMap } from 'react-map-gl';
import { supabase } from '@/lib/supabase';
import maplibregl from 'maplibre-gl';

// Helper function, can live outside the component
function handlePinClick(e, map) {
  const pin = e.features[0];
  const coordinates = pin.geometry.coordinates.slice();
  const { title, description, type, creator, tags, id } = pin.properties;
  
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
        <p><small>Posted by ${creator || 'Anonymous'}</small></p>
        <button onclick="window.viewPinDetails('${id}')">View Details</button>
      </div>
    `)
    .addTo(map);
}

export function UserPinLayer() {
  const { current: mapContainer } = useMap();

  // This is the single, controlling useEffect for this component's entire lifecycle.
  useEffect(() => {
    const map = mapContainer?.getMap(); // Get it inside the effect
    if (!map) return;

    // Define all logic INSIDE the effect to avoid stale closures.
    const loadPinsAndLayers = async () => {
      // 1. Clean up previous layers on every run to prevent errors
      if (map.getSource('user-pins')) {
        const layers = ['clusters', 'cluster-count', 'open-camps', 'gatherings', 'quiet-places', 'resources'];
        layers.forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
        map.removeSource('user-pins');
      }

      // 2. Fetch data using the robust PostGIS function
      console.log("Fetching pins using 'get_locations_geojson' RPC...");
      const { data: pins, error } = await supabase.rpc('get_locations_geojson');
      if (error) { console.error('Error fetching pins via RPC:', error); return; }
      if (!pins) { console.warn('RPC function returned no pins.'); return; }

      // 3. Transform data into a valid GeoJSON FeatureCollection
      const geojson = {
        type: 'FeatureCollection',
        features: pins.map(pin => ({
          type: 'Feature',
          geometry: pin.geojson,
          properties: { id: pin.id, title: pin.title, type: pin.type, description: pin.description, creator: pin.creator_name, tags: JSON.stringify(pin.tags) }
        }))
      };

      // 4. Add the source and all layers to the map
      console.log('Map object before addSource:', map);
      map.addSource('user-pins', { type: 'geojson', data: geojson, cluster: true, clusterMaxZoom: 14, clusterRadius: 50 });
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
      const pinLayers = ['open-camps', 'gatherings', 'quiet-places', 'resources'];
      pinLayers.forEach(layerId => {
        map.on('click', layerId, (e) => {
          handlePinClick(e, map);
          e.originalEvent.stopPropagation(); // Stop propagation to prevent other map click handlers
        });
      });
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
  }, [mapContainer]); // This effect only re-runs if the map instance itself changes

  return null;
}