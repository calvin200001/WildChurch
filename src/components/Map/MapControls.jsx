import { Plus, Minus, Maximize2, Navigation } from 'lucide-react';
import { useMap } from 'react-map-gl';

export function MapControls() {
  const { current: map } = useMap();

  const handleZoomIn = () => {
    if (map) map.zoomIn();
  };

  const handleZoomOut = () => {
    if (map) map.zoomOut();
  };

  const handleRecenter = () => {
    if (map) {
      map.flyTo({
        center: [-105, 40],
        zoom: 6,
        essential: true
      });
    }
  };

  const handleFitBounds = () => {
    if (map) {
      // Get all visible pins and fit to their bounds
      const source = map.getSource('user-pins');
      if (source && source._data && source._data.features.length > 0) {
        const bounds = source._data.features.reduce((bounds, feature) => {
          return bounds.extend(feature.geometry.coordinates);
        }, new maplibregl.LngLatBounds());
        
        map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      }
    }
  };

  return (
    <div className="absolute bottom-8 right-4 z-10 flex flex-col space-y-2">
      <button
        onClick={handleZoomIn}
        className="bg-earth-800 hover:bg-earth-700 border border-earth-600 text-earth-100 p-3 rounded-lg shadow-lg transition-colors"
        title="Zoom In"
      >
        <Plus className="h-5 w-5" />
      </button>
      
      <button
        onClick={handleZoomOut}
        className="bg-earth-800 hover:bg-earth-700 border border-earth-600 text-earth-100 p-3 rounded-lg shadow-lg transition-colors"
        title="Zoom Out"
      >
        <Minus className="h-5 w-5" />
      </button>
      
      <button
        onClick={handleFitBounds}
        className="bg-earth-800 hover:bg-earth-700 border border-earth-600 text-earth-100 p-3 rounded-lg shadow-lg transition-colors"
        title="Fit All Pins"
      >
        <Maximize2 className="h-5 w-5" />
      </button>
      
      <button
        onClick={handleRecenter}
        className="bg-earth-800 hover:bg-earth-700 border border-earth-600 text-earth-100 p-3 rounded-lg shadow-lg transition-colors"
        title="Reset View"
      >
        <Navigation className="h-5 w-5" />
      </button>
    </div>
  );
}