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
  
  new maplibregl.Popup()
    .setLngLat(coordinates)
    .setHTML(`
      <div class="pin-popup p-2 rounded-lg shadow-md bg-white max-w-xs">
        <h3 class="text-lg font-bold text-gray-800">${title}</h3>
        <span class="text-sm text-gray-600 capitalize">${type.replace('_', ' ')}</span>
        <p class="text-gray-700 mt-2">${description || ''}</p>
        <p class="text-xs text-gray-500 mt-2">Posted by ${creator}</p>
        ${tags && JSON.parse(tags).length > 0 ? `
          <div class="tags mt-2">
            ${JSON.parse(tags).map(tag => `<span class="tag bg-gray-200 text-gray-700 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">${tag.replace('_',' ')}</span>`).join('')}
          </div>
        ` : ''}
        <button class="mt-2 w-full bg-blue-500 text-white rounded-md p-1" onclick="window.viewPinDetails('${id}')">View Details</button>
      </div>
    `)
    .addTo(map);
}

export function UserPinLayer() {
  const { current: map } = useMap();

  const loadPins = useCallback(async () => {
    if (!map) return;
    const { data: pins } = await supabase
      .from('locations')
      .select(`
        *,
        profiles:created_by(first_name, avatar_url),
        pin_tags(tag)
      `)
      .eq('visibility', 'public')
      .filter('active_until', 'gte', new Date().toISOString());

    const geojson = {
      type: 'FeatureCollection',
      features: pins.map(pin => ({
        type: 'Feature',
        geometry: pin.location,
        properties: {
          id: pin.id,
          title: pin.title,
          type: pin.type,
          description: pin.description,
          creator: pin.profiles?.first_name,
          tags: JSON.stringify(pin.pin_tags.map(t => t.tag))
        }
      }))
    };

    if (!map.getSource('user-pins')) {
      map.addSource('user-pins', { type: 'geojson', data: geojson, cluster: true, clusterMaxZoom: 14, clusterRadius: 50 });
      map.addLayer({ id: 'clusters', type: 'circle', source: 'user-pins', filter: ['has', 'point_count'], paint: { 'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 10, '#f1f075', 30, '#f28cb1'], 'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 30, 40] } });
      map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'user-pins', filter: ['has', 'point_count'], layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'], 'text-size': 12 } });
      map.addLayer({ id: 'open-camps', type: 'symbol', source: 'user-pins', filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'open_camp']], layout: { 'icon-image': 'campfire-icon', 'icon-size': 1.5, 'icon-allow-overlap': true, 'text-field': ['get', 'title'], 'text-offset': [0, 1.5], 'text-size': 12 }, paint: { 'text-color': '#2d5016', 'text-halo-color': '#fff', 'text-halo-width': 1 } });
      map.addLayer({ id: 'gatherings', type: 'symbol', source: 'user-pins', filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'gathering']], layout: { 'icon-image': 'gathering-icon', 'icon-size': 1.5, 'icon-allow-overlap': true, 'text-field': ['get', 'title'], 'text-offset': [0, 1.5], 'text-size': 12 }, paint: { 'text-color': '#6b2d5c', 'text-halo-color': '#fff', 'text-halo-width': 1 } });
      map.addLayer({ id: 'quiet-places', type: 'symbol', source: 'user-pins', filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'quiet_place']], layout: { 'icon-image': 'quiet-icon', 'icon-size': 1.5, 'icon-allow-overlap': true, 'text-field': ['get', 'title'], 'text-offset': [0, 1.5], 'text-size': 12 }, paint: { 'text-color': '#4a5568', 'text-halo-color': '#fff', 'text-halo-width': 1 } });
      map.addLayer({ id: 'resources', type: 'symbol', source: 'user-pins', filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'resource']], layout: { 'icon-image': 'resource-icon', 'icon-size': 1.5, 'icon-allow-overlap': true, 'text-field': ['get', 'title'], 'text-offset': [0, 1.5], 'text-size': 12 }, paint: { 'text-color': '#0000FF', 'text-halo-color': '#fff', 'text-halo-width': 1 } });

      map.on('click', 'open-camps', (e) => handlePinClick(e, map));
      map.on('click', 'gatherings', (e) => handlePinClick(e, map));
      map.on('click', 'quiet-places', (e) => handlePinClick(e, map));
      map.on('click', 'resources', (e) => handlePinClick(e, map));
    } else {
      map.getSource('user-pins').setData(geojson);
    }
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const onMapLoad = () => {
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
    };

    if (map.isStyleLoaded()) {
      onMapLoad();
    } else {
      map.on('load', onMapLoad);
    }

    const subscription = supabase
      .channel('map-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => loadPins())
      .subscribe();

    return () => {
      subscription.unsubscribe();
      map.off('load', onMapLoad);
    };
  }, [map, loadPins]);

  return null;
}
