import React, { useState, useEffect } from 'react';
import Map from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { MAP_CONFIG } from './lib/mapConfig';
import { UserPinLayer } from './components/Map/UserPinLayer';
import { DropPinModal } from './components/Map/DropPinModal';
import { PinDetailsModal } from './components/Map/PinDetailsModal'; // New import
import { GatheringsBoard } from './components/GatheringsBoard';
import AuthModal from './components/Auth/AuthModal';
import { UserProfileModal } from './components/Auth/UserProfileModal'; // New import
import Seo from './components/Seo';
import { supabase } from './lib/supabase';
import { Header } from './components/Header';
import { MapEmptyState } from './components/MapEmptyState';
import { MapControls } from './components/Map/MapControls';
import { UserSearch } from './components/UserSearch'; // New import
import { MessagingPage } from './components/Messages/MessagingPage'; // New import

const baseUrl = 'https://wildchurch.netlify.app'; // Base URL for canonical links - Moved to global scope

function AppContent({ user, setUser, profile, getProfile, handleLogout, showAuthModal, setShowAuthModal }) { // Accept user, profile, and auth modal props
  const [showDropPinModal, setShowDropPinModal] = useState(false);
  const [pinLocation, setPinLocation] = useState(null);
  const [showPinDetailsModal, setShowPinDetailsModal] = useState(false); // New state for pin details modal
  const [selectedPinId, setSelectedPinId] = useState(null); // New state for selected pin ID
  const [showUserProfileModal, setShowUserProfileModal] = useState(false); // New state for user profile modal
  const location = useLocation(); // Get current location for canonical URL

  console.log('User:', user); // Debugging: Check user state
  console.log('showDropPinModal:', showDropPinModal); // Debugging: Check modal visibility state

  const handleMapClick = (e) => {
    console.log('Map clicked', e);
    
    // Defensively check if an existing feature was clicked
    const layerIds = ['open-camps', 'gatherings', 'quiet-places', 'resources', 'clusters'];
    const map = e.target; // Get a reference to the map instance

    // First, check if the layers actually exist before querying them
    const existingLayers = layerIds.filter(id => map.getLayer(id));

    if (existingLayers.length > 0) {
        const features = map.queryRenderedFeatures(e.point, {
            layers: existingLayers
        });
        
        if (features.length > 0) {
            // Clicked on an existing, visible pin/cluster. Do nothing.
            console.log('Clicked on a feature, aborting modal open.');
            return;
        }
    }
    
    // Clicked on empty map - open modal
    console.log('Opening drop pin modal');
    setPinLocation(e.lngLat);
    setShowDropPinModal(true);
  };

  

  // Define viewPinDetails on the window object so the popup can call it
  window.viewPinDetails = (pinId) => {
    console.log(`Viewing details for pin: ${pinId}`); // Add a console log instead of alert
    setSelectedPinId(pinId);
    setShowPinDetailsModal(true);
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
        onShowUserProfile={() => setShowUserProfileModal(true)} // New prop
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
      {showPinDetailsModal && ( // Conditional rendering for PinDetailsModal
        <PinDetailsModal
          isOpen={showPinDetailsModal}
          pinId={selectedPinId}
          onClose={() => setShowPinDetailsModal(false)}
        />
      )}
      {user && ( // Only show if user is logged in
        <UserProfileModal
          isOpen={showUserProfileModal}
          onClose={() => setShowUserProfileModal(false)}
          user={user}
          onUpdateProfile={() => getProfile(user.id)}
        />
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null); // State to store authenticated user
  const [profile, setProfile] = useState(null); // New state for user profile
  const [showAuthModal, setShowAuthModal] = useState(false); // State to control AuthModal visibility

  // Function to fetch user profile
  const getProfile = async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile for header:', error);
      setProfile(null);
    } else {
      setProfile(data);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
    } else {
      setUser(null);
      setProfile(null); // Clear profile on logout
      console.log('User logged out');
    }
  };

  useEffect(() => {
    // Set initial user session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        getProfile(session.user.id);
      }
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session); // Added console log
        setUser(session?.user || null);
        if (session?.user) {
          getProfile(session.user.id);
        } else {
          setProfile(null); // Clear profile if user logs out
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppContent user={user} setUser={setUser} profile={profile} getProfile={getProfile} handleLogout={handleLogout} showAuthModal={showAuthModal} setShowAuthModal={setShowAuthModal} />} />
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
        <Route path="/users" element={ // New route for user search
          <>
            <Seo
              title="WildChurch - Find Users"
              description="Search for other users by interests, beliefs, and location."
              name="WildChurch"
              type="website"
              canonicalUrl={`${baseUrl}/users`}
            />
            <Header
              user={user}
              onLogout={handleLogout}
              onShowAuth={() => setShowAuthModal(true)}
              onShowUserProfile={() => setShowUserProfileModal(true)}
            />
            <div className="pt-16"> {/* Offset for fixed header */}
              <UserSearch user={user} />
            </div>
          </>
        } />
        <Route path="/messages" element={ // Main messages page
          <>
            <Header
              user={user}
              profile={profile}
              onLogout={handleLogout}
              onShowAuth={() => setShowAuthModal(true)}
              onShowUserProfile={() => setShowUserProfileModal(true)}
            />
            <MessagingPage user={user} profile={profile} />
          </>
        } />
        <Route path="/messages/:conversationId" element={ // Specific conversation view
          <>
            <Header
              user={user}
              profile={profile}
              onLogout={handleLogout}
              onShowAuth={() => setShowAuthModal(true)}
              onShowUserProfile={() => setShowUserProfileModal(true)}
            />
            <MessagingPage user={user} profile={profile} />
          </>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

