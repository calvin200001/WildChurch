import { useEffect } from 'react';
import { useMap } from 'react-map-gl';
import { supabase } from '@/lib/supabase';
import maplibregl from 'maplibre-gl';

// Helper function, can live outside the component
function handlePinClick(e, map) {
  const pin = e.features[0];
  const coordinates = pin.geometry.coordinates.slice();
  const { title, description, type, creator, tags: tagsString, id } = pin.properties;
  const tags = tagsString ? JSON.parse(tagsString) : [];
  
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

  useEffect(() => {
    const map = mapContainer?.getMap();
    if (!map) return;

    const pinLayers = ['open-camps', 'gatherings', 'quiet-places', 'resources'];

    const loadPinsAndLayers = async () => {
      // 1. Clean up previous layers
      if (map.getSource('user-pins')) {
        const layers = ['clusters', 'cluster-count', 'open-camps', 'gatherings', 'quiet-places', 'resources'];
        layers.forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
        map.removeSource('user-pins');
      }

      // 2. Fetch pins from RPC
      console.log('UserPinLayer: Fetching pins...');
      console.log('UserPinLayer: URL:', `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/get_pins_json`);
      console.log('UserPinLayer: Search query:', searchQuery);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/get_pins_json`,
          {
            method: 'POST',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({ search: searchQuery || null }),
            cache: 'no-store'
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('UserPinLayer: Fetch failed!', response.status, errorText);
          return;
        }

        const pins = await response.json();
        console.log('UserPinLayer: Loaded', pins.features?.length || 0, 'pins');

        if (!pins || !pins.features || pins.features.length === 0) {
          console.warn('UserPinLayer: No pins to display');
          return;
        }

        // 3. Create GeoJSON
        const geojson = {
          type: 'FeatureCollection',
          features: pins.features.map(feature => ({
            type: 'Feature',
            geometry: feature.geometry,
            properties: feature.properties
          }))
        };

        // 4. Add source and layers to map
        map.addSource('user-pins', { 
          type: 'geojson', 
          data: geojson, 
          cluster: true, 
          clusterMaxZoom: 14, 
          clusterRadius: 50 
        });

        // Cluster layers
        map.addLayer({ 
          id: 'clusters', 
          type: 'circle', 
          source: 'user-pins', 
          filter: ['has', 'point_count'], 
          paint: { 
            'circle-color': '#4a7c4a', 
            'circle-radius': 20 
          } 
        });
        
        map.addLayer({ 
          id: 'cluster-count', 
          type: 'symbol', 
          source: 'user-pins', 
          filter: ['has', 'point_count'], 
          layout: { 
            'text-field': '{point_count_abbreviated}', 
            'text-size': 12 
          }, 
          paint: { 
            'text-color': 'white' 
          } 
        });

        // Individual pin layers
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
        
        console.log('UserPinLayer: Map updated with', pins.features.length, 'pins');

        // Add click listeners
        pinLayers.forEach(layerId => {
          map.on('click', layerId, (e) => {
            handlePinClick(e, map);
            e.originalEvent.stopPropagation();
          });
        });
        
      } catch (err) {
        console.error('UserPinLayer: Unexpected error during RPC call:', err);
        return;
      }
    };

    const onLoad = () => {
      console.log("UserPinLayer: Map loaded, fetching pins...");
      loadPinsAndLayers();
    };

    // Attach load event listener
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
            loadPinsAndLayers();
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      subscription.unsubscribe();
      map.off('load', onLoad);
      pinLayers.forEach(layerId => {
        map.off('click', layerId);
      });
    };
  }, [mapContainer, searchQuery]);

  return null;
}