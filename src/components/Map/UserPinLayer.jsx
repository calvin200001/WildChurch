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
    
    console.log('Loading pins from database...');
    
    const { data: pins, error } = await supabase
      .from('locations')
      .select(`
        *,
        profiles:created_by(first_name, avatar_url),
        pin_tags(tag)
      `)
      .eq('visibility', 'public');
    // REMOVED the active_until filter for now to see ALL pins

    console.log('Pins fetched:', pins);
    console.log('Any errors?', error);

    if (error) {
      console.error('Error fetching pins:', error);
      return;
    }

    if (!pins || pins.length === 0) {
      console.warn('No pins found in database');
      return;
    }

    // Convert to GeoJSON
    const geojson = {
      type: 'FeatureCollection',
      features: pins.map(pin => {
        console.log('Processing pin:', pin);
        console.log('Pin location type:', typeof pin.location);
        console.log('Pin location value:', pin.location);
        
        // Handle different PostGIS return formats
        let coordinates;
        
        if (typeof pin.location === 'string') {
          // If it's a string like "POINT(-105 40)", parse it
          const match = pin.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
          if (match) {
            coordinates = [parseFloat(match[1]), parseFloat(match[2])];
          }
        } else if (pin.location && pin.location.coordinates) {
          // If it's already GeoJSON
          coordinates = pin.location.coordinates;
        } else if (pin.location && typeof pin.location === 'object') {
          // If it's a PostGIS object with x/y or lon/lat
          coordinates = [
            pin.location.x || pin.location.lon || pin.location.longitude,
            pin.location.y || pin.location.lat || pin.location.latitude
          ];
        }
        
        console.log('Parsed coordinates:', coordinates);
        
        if (!coordinates || coordinates.length !== 2) {
          console.error('Invalid coordinates for pin:', pin);
          return null;
        }
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: coordinates
          },
          properties: {
            id: pin.id,
            title: pin.title,
            type: pin.type,
            description: pin.description,
            creator: pin.profiles?.first_name || 'Anonymous',
            tags: JSON.stringify(pin.pin_tags?.map(t => t.tag) || [])
          }
        }
      }
).filter(Boolean)
    };

    console.log('GeoJSON created:', geojson);
    
    // Remove existing sources and layers if they exist
    if (map.getSource('user-pins')) {
      if (map.getLayer('resources')) map.removeLayer('resources');
      if (map.getLayer('quiet-places')) map.removeLayer('quiet-places');
      if (map.getLayer('gatherings')) map.removeLayer('gatherings');
      if (map.getLayer('open-camps')) map.removeLayer('open-camps');
      if (map.getLayer('cluster-count')) map.removeLayer('cluster-count');
      if (map.getLayer('clusters')) map.removeLayer('clusters');
      map.removeSource('user-pins');
    }

    // Add source
    map.addSource('user-pins', { 
      type: 'geojson', 
      data: geojson, 
      cluster: true, 
      clusterMaxZoom: 14, 
      clusterRadius: 50 
    });
    
    console.log('Source added to map');

    // Add cluster layers
    map.addLayer({ 
      id: 'clusters', 
      type: 'circle', 
      source: 'user-pins', 
      filter: ['has', 'point_count'], 
      paint: { 
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#4a7c4a', // forest-500
          10,
          '#d97706', // sunset-500
          30,
          '#b45309'  // sunset-600
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          10,
          30,
          30,
          40
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#f8f6f3'
      } 
    });

    map.addLayer({ 
      id: 'cluster-count', 
      type: 'symbol', 
      source: 'user-pins', 
      filter: ['has', 'point_count'], 
      layout: { 
        'text-field': '{point_count_abbreviated}', 
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'], 
        'text-size': 14
      },
      paint: {
        'text-color': '#f8f6f3'
      }
    });

    // Add individual pin layers
    map.addLayer({ 
      id: 'open-camps', 
      type: 'symbol', 
      source: 'user-pins', 
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'open_camp']], 
      layout: { 
        'icon-image': 'campfire-icon', 
        'icon-size': 1.5, 
        'icon-allow-overlap': true, 
        'text-field': ['get', 'title'], 
        'text-offset': [0, 1.5], 
        'text-size': 12 
      }, 
      paint: { 
        'text-color': '#2d5016', 
        'text-halo-color': '#fff', 
        'text-halo-width': 1 
      } 
    });

    map.addLayer({ 
      id: 'gatherings', 
      type: 'symbol', 
      source: 'user-pins', 
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'gathering']], 
      layout: { 
        'icon-image': 'gathering-icon', 
        'icon-size': 1.5, 
        'icon-allow-overlap': true, 
        'text-field': ['get', 'title'], 
        'text-offset': [0, 1.5], 
        'text-size': 12 
      }, 
      paint: { 
        'text-color': '#6b2d5c', 
        'text-halo-color': '#fff', 
        'text-halo-width': 1 
      } 
    });

    map.addLayer({ 
      id: 'quiet-places', 
      type: 'symbol', 
      source: 'user-pins', 
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'quiet_place']], 
      layout: { 
        'icon-image': 'quiet-icon', 
        'icon-size': 1.5, 
        'icon-allow-overlap': true, 
        'text-field': ['get', 'title'], 
        'text-offset': [0, 1.5], 
        'text-size': 12 
      }, 
      paint: { 
        'text-color': '#4a5568', 
        'text-halo-color': '#fff', 
        'text-halo-width': 1 
      } 
    });

    map.addLayer({ 
      id: 'resources', 
      type: 'symbol', 
      source: 'user-pins', 
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'resource']], 
      layout: { 
        'icon-image': 'resource-icon', 
        'icon-size': 1.5, 
        'icon-allow-overlap': true, 
        'text-field': ['get', 'title'], 
        'text-offset': [0, 1.5], 
        'text-size': 12 
      }, 
      paint: { 
        'text-color': '#0000FF', 
        'text-halo-color': '#fff', 
        'text-halo-width': 1 
      } 
    });
    
    console.log('All layers added to map');

    // Click handlers
    map.on('click', 'open-camps', (e) => {
      e.preventDefault();
      handlePinClick(e, map);
    });
    map.on('click', 'gatherings', (e) => {
      e.preventDefault();
      handlePinClick(e, map);
    });
    map.on('click', 'quiet-places', (e) => {
      e.preventDefault();
      handlePinClick(e, map);
    });
    map.on('click', 'resources', (e) => {
      e.preventDefault();
      handlePinClick(e, map);
    });

    // Hover effects
    map.on('mouseenter', 'open-camps', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'open-camps', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', 'gatherings', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'gatherings', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', 'quiet-places', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'quiet-places', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', 'resources', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'resources', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });

    // Cluster click to zoom
    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['clusters']
      });
      
      const clusterId = features[0].properties.cluster_id;
      const source = map.getSource('user-pins');
      
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        
        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom + 0.5
        });
      });
    });
    
    console.log('Pin loading complete!');
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
