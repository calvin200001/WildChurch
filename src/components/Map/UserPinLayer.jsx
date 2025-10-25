import { useEffect, useCallback } from 'react';
import { useMap } from 'react-map-gl';
import { supabase } from '@/lib/supabase';
import maplibregl from 'maplibre-gl';

function handlePinClick(e, map) {
  const pin = e.features[0];
  const coordinates = pin.geometry.coordinates.slice();
  const { title, description, type, creator, tags, id } = pin.properties;
  
  while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
  }
  
  const typeEmoji = {
    'open_camp': '🏕️',
    'gathering': '🙏',
    'quiet_place': '🌲',
    'resource': '📍'
  };
  
  new maplibregl.Popup({
    maxWidth: '320px',
    className: 'custom-popup'
  })
    .setLngLat(coordinates)
    .setHTML(`
      <div class="bg-earth-800 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xl font-display font-bold text-earth-50">
            ${typeEmoji[type] || ''} ${title}
          </h3>
        </div>
        <span class="inline-block px-3 py-1 bg-forest-800 text-forest-200 text-xs font-medium rounded-full mb-3">
          ${type.replace('_', ' ')}
        </span>
        <p class="text-earth-200 mb-3 text-sm leading-relaxed">
          ${description || 'No description provided.'}
        </p>
        <p class="text-xs text-earth-400 mb-3">
          📝 Posted by <span class="text-earth-300 font-medium">${creator || 'Anonymous'}</span>
        </p>
        ${tags && JSON.parse(tags).length > 0 ? `
          <div class="flex flex-wrap gap-2 mb-4">
            ${JSON.parse(tags).map(tag => 
              `<span class="px-2 py-1 bg-earth-700 text-earth-300 text-xs rounded-full">
                ${tag.replace('_',' ')}
              </span>`
            ).join('')}
          </div>
        ` : ''}
        <button 
          class="w-full bg-forest-700 hover:bg-forest-600 text-earth-50 font-semibold py-2 px-4 rounded-lg transition-colors"
          onclick="window.viewPinDetails('${id}')"
        >
          View Full Details →
        </button>
      </div>
    `)
    .addTo(map);
}

export function UserPinLayer() {
  const { current: map } = useMap();

  const loadPins = useCallback(async () => {
    if (!map) return;
    
    // This cleanup logic is ESSENTIAL to prevent race conditions on reloads.
    if (map.getSource('user-pins')) {
        const layers = ['clusters', 'cluster-count', 'open-camps', 'gatherings', 'quiet-places', 'resources'];
        layers.forEach(layerId => {
            if (map.getLayer(layerId)) {
                map.removeLayer(layerId);
            }
        });
        map.removeSource('user-pins');
    }

    console.log("Fetching pins using 'get_locations_geojson' RPC...");
    const { data: pins, error } = await supabase.rpc('get_locations_geojson');

    if (error) {
      console.error('Error fetching pins via RPC:', error);
      return;
    }

    if (!pins) {
        console.warn('RPC function returned no pins.');
        return;
    }

    console.log('Pins fetched, transforming to GeoJSON FeatureCollection...');
    // This is the transformation step from the original plan
    const geojson = {
      type: 'FeatureCollection',
      features: pins.map(pin => ({
        type: 'Feature',
        geometry: pin.geojson, // Use the geojson geometry object directly from the database
        properties: {
          id: pin.id,
          title: pin.title,
          type: pin.type,
          description: pin.description,
          creator: pin.creator_name,
          tags: JSON.stringify(pin.tags) // Tags are already a JSON array
        }
      }))
    };

    console.log('GeoJSON created, adding to map:', geojson);

    // This adds the data and layers back to the map safely
    map.addSource('user-pins', { 
      type: 'geojson', 
      data: geojson, 
      cluster: true, 
      clusterMaxZoom: 14, 
      clusterRadius: 50 
    });
    
    // Re-add all layers
    map.addLayer({ id: 'clusters', type: 'circle', source: 'user-pins', filter: ['has', 'point_count'], paint: { 'circle-color': '#4a7c4a', 'circle-radius': 20 } });
    map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'user-pins', filter: ['has', 'point_count'], layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12 }, paint: { 'text-color': 'white' } });
    map.addLayer({ id: 'open-camps', type: 'symbol', source: 'user-pins', filter: ['all', ['!', ['has', 'point_count']], ['==', 'type', 'open_camp']], layout: { 'icon-image': 'campfire-icon', 'icon-size': 1.5, 'icon-allow-overlap': true } });
    map.addLayer({ id: 'gatherings', type: 'symbol', source: 'user-pins', filter: ['all', ['!', ['has', 'point_count']], ['==', 'type', 'gathering']], layout: { 'icon-image': 'gathering-icon', 'icon-size': 1.5, 'icon-allow-overlap': true } });
    map.addLayer({ id: 'quiet-places', type: 'symbol', source: 'user-pins', filter: ['all', ['!', ['has', 'point_count']], ['==', 'type', 'quiet_place']], layout: { 'icon-image': 'quiet-icon', 'icon-size': 1.5, 'icon-allow-overlap': true } });
    map.addLayer({ id: 'resources', type: 'symbol', source: 'user-pins', filter: ['all', ['!', ['has', 'point_count']], ['==', 'type', 'resource']], layout: { 'icon-image': 'resource-icon', 'icon-size': 1.5, 'icon-allow-overlap': true } });

    console.log('Map updated with new pins.');
  }, [map]);

  const onMapLoad = useCallback(() => {
    if (!map) return;

    const icons = [
      { name: 'campfire-icon', url: '/campfire-icon.svg' },
      { name: 'gathering-icon', url: '/gathering-icon.svg' },
      { name: 'quiet-icon', url: '/quiet-icon.svg' },
      { name: 'resource-icon', url: '/resource-icon.svg' },
    ];

    let loadedIconCount = 0;
    icons.forEach(icon => {
      map.loadImage(icon.url, (error, image) => {
        if (error) { console.error('Error loading image:', error); return; };
        if (!map.hasImage(icon.name)) {
          map.addImage(icon.name, image, { sdf: true });
        }
        loadedIconCount++;
        if (loadedIconCount === icons.length) {
          loadPins();
        }
      });
    });
  }, [map, loadPins]); // Dependencies for useCallback

  useEffect(() => {
    if (!map) return;

    if (map.isStyleLoaded()) {
      onMapLoad();
    } else {
      map.on('load', onMapLoad);
    }

    const subscription = supabase
      .channel('map-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => loadPins())
      .subscribe();

    // WebGL context loss handling
    const handleContextLost = (e) => {
      e.preventDefault();
      console.warn('WebGL context lost. Attempting to restore...');
    };

    const handleContextRestored = () => {
      console.log('WebGL context restored. Re-initializing map layers.');
      // Re-run the map load logic to re-add sources and layers
      onMapLoad();
    };

    map.on('webglcontextlost', handleContextLost);
    map.on('webglcontextrestored', handleContextRestored);

    return () => {
      subscription.unsubscribe();
      map.off('load', onMapLoad);
      map.off('webglcontextlost', handleContextLost);
      map.off('webglcontextrestored', handleContextRestored);
    };
  }, [map, onMapLoad, loadPins]); // Dependencies for useEffect

  return null;
}
