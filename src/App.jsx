import React, { useState, useEffect } from 'react';
import Map from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { MAP_CONFIG } from './lib/mapConfig';
import { UserPinLayer } from './components/Map/UserPinLayer';
import { DropPinModal } from './components/Map/DropPinModal';
import { GatheringsBoard } from './components/GatheringsBoard';
import AuthModal from './components/Auth/AuthModal';
import Seo from './components/Seo';
import { supabase } from './lib/supabase';
import { Header } from './components/Header';
import { MapEmptyState } from './components/MapEmptyState';
import { MapControls } from './components/Map/MapControls';

const baseUrl = 'https://wildchurch.netlify.app'; // Base URL for canonical links - Moved to global scope

function AppContent({ user, setUser, showAuthModal, setShowAuthModal }) { // Accept user and auth modal props
  const [showDropPinModal, setShowDropPinModal] = useState(false);
  const [pinLocation, setPinLocation] = useState(null);
  const location = useLocation(); // Get current location for canonical URL

  console.log('User:', user); // Debugging: Check user state
  console.log('showDropPinModal:', showDropPinModal); // Debugging: Check modal visibility state

  const handleMapClick = (e) => {
    console.log('Map clicked', e);
    
    // IMPORTANT: Check if we clicked on a map layer/feature
    // Only query if the map is loaded and layers exist
    if (e.target && e.target.isStyleLoaded && e.target.isStyleLoaded()) {
      try {
        const features = e.target.queryRenderedFeatures(e.point, {
          layers: ['open-camps', 'gatherings', 'quiet-places', 'resources', 'clusters']
        });
        
        if (features.length > 0) {
          // Clicked on an existing pin/cluster, don't open modal
          console.log('Clicked on feature, not opening modal');
          return;
        }
      } catch (error) {
        // Layers don't exist yet, that's OK - continue to open modal
        console.log('Layers not ready yet, opening modal anyway');
      }
    }
    
    // Clicked on empty map - open modal
    console.log('Opening drop pin modal');
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
    <div className="relative w-screen h-screen pt-16"> {/* Added pt-16 for header */}
      <Seo
        title="WildChurch - Church in the wild, wherever you are"
        description="Connect with dispersed Christian communities through crowdsourced mapping, real-time gatherings, and authentic fellowship."
        name="WildChurch"
        type="website"
        canonicalUrl={`${baseUrl}${location.pathname}`}
      />
      <Header 
        user={user}
        onLogout={handleLogout}
        onShowAuth={() => setShowAuthModal(true)}
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
        <MapControls /> {/* Add this */}
      </Map>
      {showDropPinModal && (
        <DropPinModal
            isOpen={showDropPinModal} // Pass isOpen prop
            location={pinLocation}
            user={user} // Pass the user object
            onClose={() => setShowDropPinModal(false)}
            onSuccess={() => {
                setShowDropPinModal(false);
                // Realtime should update the pins automatically
            }}
        />
      )}
      {!user && <MapEmptyState />}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null); // State to store authenticated user
  const [showAuthModal, setShowAuthModal] = useState(false); // State to control AuthModal visibility

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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppContent user={user} setUser={setUser} showAuthModal={showAuthModal} setShowAuthModal={setShowAuthModal} />} />
        <Route path="/proposals" element={
          <>
            <Seo
              title="WildChurch - Proposals"
              description="View and commit to proposed gatherings in the wild."
              name="WildChurch"
              type="website"
              canonicalUrl={`${baseUrl}/proposals`}
            />
            <GatheringsBoard user={user} /> {/* Pass user prop to GatheringsBoard */}
          </>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

