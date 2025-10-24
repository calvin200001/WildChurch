import React, { useState, useEffect } from 'react';
import Map from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'; // Added useLocation
import { MAP_CONFIG } from './lib/mapConfig';
import { UserPinLayer } from './components/Map/UserPinLayer';
import { DropPinModal } from './components/Map/DropPinModal';
import { GatheringsBoard } from './components/GatheringsBoard';
import AuthModal from './components/Auth/AuthModal'; // Import AuthModal
import Seo from './components/Seo'; // Import Seo component
import { supabase } from './lib/supabase'; // Import supabase client


function AppContent() {
  const [showDropPinModal, setShowDropPinModal] = useState(false);
  const [pinLocation, setPinLocation] = useState(null);
  const [user, setUser] = useState(null); // State to store authenticated user
  const [showAuthModal, setShowAuthModal] = useState(false); // State to control AuthModal visibility
  const location = useLocation(); // Get current location for canonical URL

  const baseUrl = 'https://wildchurch.netlify.app'; // Base URL for canonical links

  useEffect(() => {
    // Set initial user session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleMapClick = (e) => {
    // Prevent modal from opening when clicking a pin/layer
    if (e.defaultPrevented) return;
    setPinLocation(e.lngLat);
    setShowDropPinModal(true);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
    } else {
      setUser(null);
      console.log('User logged out');
    }
  };

  // Define viewPinDetails on the window object so the popup can call it
  window.viewPinDetails = (pinId) => {
    alert(`Viewing details for pin: ${pinId}`);
  };

  return (
    <div className="relative w-screen h-screen">
      <Seo
        title="WildChurch - Church in the wild, wherever you are"
        description="Connect with dispersed Christian communities through crowdsourced mapping, real-time gatherings, and authentic fellowship."
        name="WildChurch"
        type="website"
        canonicalUrl={`${baseUrl}${location.pathname}`}
      />
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
            user={user} // Pass the user object
            onClose={() => setShowDropPinModal(false)}
            onSuccess={() => {
                setShowDropPinModal(false);
                // Realtime should update the pins automatically
            }}
        />
      )}
      <div className="absolute top-4 left-4 bg-white p-2 rounded-md shadow-md z-10 flex items-center space-x-4">
        <Link to="/proposals" className="text-blue-600 hover:underline">View Proposals</Link>
        {user ? (
          <>
            <span className="text-gray-700">Hello, {user.email}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline text-sm"
            >
              Log Out
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline text-sm"
            >
              Sign Up / Log In
            </button>
          </>
        )}
      </div>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/proposals" element={
          <>
            <Seo
              title="WildChurch - Proposals"
              description="View and commit to proposed gatherings in the wild."
              name="WildChurch"
              type="website"
              canonicalUrl={`${baseUrl}/proposals`}
            />
            <GatheringsBoard />
          </>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

