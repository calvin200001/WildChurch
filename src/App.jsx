import React, { useState } from 'react';
import Map from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { MAP_CONFIG } from './lib/mapConfig';
import { UserPinLayer } from './components/Map/UserPinLayer';
import { DropPinModal } from './components/Map/DropPinModal';
import { GatheringsBoard } from './components/GatheringsBoard';
import 'maplibre-gl/dist/maplibre-gl.css';

function AppContent() {
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
    <div className="relative w-screen h-screen">
      <Map
        mapLib={maplibregl}
        initialViewState={{
            longitude: MAP_CONFIG.center[0],
            latitude: MAP_CONFIG.center[1],
            zoom: MAP_CONFIG.zoom
        }}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        style={{ width: '100%', height: '100%' }}
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
      <div className="absolute top-4 left-4 bg-white p-2 rounded-md shadow-md z-10">
        <Link to="/proposals" className="text-blue-600 hover:underline">View Proposals</Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/proposals" element={<GatheringsBoard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

