import React, { useState } from 'react';
import Map from 'react-map-gl';
import { MAP_CONFIG } from './lib/mapConfig';
import { UserPinLayer } from './components/Map/UserPinLayer';
import { DropPinModal } from './components/Map/DropPinModal';
import 'maplibre-gl/dist/maplibre-gl.css';

function App() {
  const [showDropPinModal, setShowDropPinModal] = useState(false);
  const [pinLocation, setPinLocation] = useState(null);

  const handleMapClick = (e) => {
    // Prevent modal from opening when clicking a pin/layer
    if (e.defaultPrevented) return;
    setPinLocation(e.lngLat);
    setShowDropPinModal(true);
  };

  // Define viewPinDetails on the window object so the popup can call it
  window.viewPinDetails = (pinId) => {
    alert(`Viewing details for pin: ${pinId}`);
  };

  return (
    <>
      <Map
        initialViewState={{
            longitude: MAP_CONFIG.center[0],
            latitude: MAP_CONFIG.center[1],
            zoom: MAP_CONFIG.zoom
        }}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        style={{ width: '100vw', height: '100vh' }}
        mapStyle={MAP_CONFIG.style}
        onClick={handleMapClick}
      >
        <UserPinLayer />
      </Map>
      {showDropPinModal && (
        <DropPinModal
            location={pinLocation}
            onClose={() => setShowDropPinModal(false)}
            onSuccess={() => {
                setShowDropPinModal(false);
                // Realtime should update the pins automatically
            }}
        />
      )}
    </>
  );
}

export default App;
