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
import { Toast } from './components/Toast';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { MapEmptyState } from './components/MapEmptyState';
import { MapControls } from './components/Map/MapControls';
import { UserSearch } from './components/UserSearch'; // New import
import { MessagingPage } from './components/Messages/MessagingPage'; // New import
import { ErrorBoundary } from './components/ErrorBoundary';

const baseUrl = 'https://wildchurch.netlify.app'; // Base URL for canonical links - Moved to global scope

function AppContent({ user, setUser, profile, profileLoading, getProfile, handleLogout, showAuthModal, setShowAuthModal, showUserProfileModal, setShowUserProfileModal }) { // Accept user, profile, and auth modal props
  const [showDropPinModal, setShowDropPinModal] = useState(false);
  const [pinLocation, setPinLocation] = useState(null);
  const [showPinDetailsModal, setShowPinDetailsModal] = useState(false); // New state for pin details modal
  const [selectedPinId, setSelectedPinId] = useState(null); // New state for selected pin ID
  const location = useLocation(); // Get current location for canonical URL

  console.log('User:', user); // Debugging: Check user state
  console.log('showDropPinModal:', showDropPinModal); // Debugging: Check modal visibility state
  console.log('showUserProfileModal:', showUserProfileModal); // Debugging: Check user profile modal visibility state

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
        profile={profile}
        profileLoading={profileLoading}
        onLogout={handleLogout}
        onShowAuth={() => setShowAuthModal(true)}
        onShowUserProfile={() => setShowUserProfileModal(true)}
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
          user={user}
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
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false); // Moved here

  const [showReloadPrompt, setShowReloadPrompt] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  const { 
    offlineReady: swOfflineReady,
    needRefresh: swNeedRefresh,
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log(`SW Registered: ${r}`);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
    onOfflineReady() {
      setOfflineReady(true);
      console.log('PWA: App is ready to work offline');
    },
    onNeedRefresh() {
      setShowReloadPrompt(true);
      console.log('PWA: New content available, click to reload');
    },
  });

  const closeReloadPrompt = () => {
    setShowReloadPrompt(false);
  };

  const refreshApp = () => {
    updateServiceWorker(true);
    window.location.reload();
  };

  const getProfile = async (userId) => {
    if (!userId) {
      console.log('getProfile: No userId, clearing profile');
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    
    console.log('getProfile: Fetching for userId:', userId);
    setProfileLoading(true); // Start loading
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*') // Get ALL columns, not just username/avatar_url
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle missing profiles gracefully

      if (error) {
        console.error('getProfile: Error:', error);
        setProfile(null);
      } else if (data) {
        console.log('getProfile: Success:', data);
        setProfile(data);
      } else {
        console.log('getProfile: No profile found, creating one...');
        // Auto-create profile if it doesn't exist
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([{ 
            id: userId,
            first_name: user?.user_metadata?.first_name || 'User',
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (insertError) {
          console.error('Failed to create profile:', insertError);
          setProfile(null);
        } else {
          console.log('Auto-created profile:', newProfile);
          setProfile(newProfile);
        }
      }
    } catch (err) {
      console.error('getProfile: Unexpected error:', err);
      setProfile(null);
    } finally {
      setProfileLoading(false); // Always stop loading
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
    } else {
      setUser(null);
      setProfile(null);
      setProfileLoading(false);
      console.log('User logged out');
    }
  };

  useEffect(() => {
    let mounted = true; // Prevent state updates after unmount

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          await getProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setProfileLoading(false);
        }

        // Clear URL hash AFTER processing
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setProfileLoading(false);
        }
      }
    };

    initAuth();

    // Auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth event:', event);
        
        if (session?.user) {
          setUser(session.user);
          await getProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setProfileLoading(false);
        }
      }
    );

    return () => {
      mounted = false; // Cleanup flag
      authListener.subscription.unsubscribe();
    };
  }, []); // Empty deps - run once

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<AppContent user={user} setUser={setUser} profile={profile} profileLoading={profileLoading} getProfile={getProfile} handleLogout={handleLogout} showAuthModal={showAuthModal} setShowAuthModal={setShowAuthModal} showUserProfileModal={showUserProfileModal} setShowUserProfileModal={setShowUserProfileModal} />} />
          <Route path="/proposals" element={
            <>
              <Seo
                title="WildChurch - Proposals"
                description="View and commit to proposed gatherings in the wild."
                name="WildChurch"
                type="website"
                canonicalUrl={`${baseUrl}/proposals`}
              />
              <Header
                user={user}
                profile={profile}
                profileLoading={profileLoading}
                onLogout={handleLogout}
                onShowAuth={() => setShowAuthModal(true)}
                onShowUserProfile={() => setShowUserProfileModal(true)}
              />
              <div className="pt-16"> {/* Offset for fixed header */}
                <GatheringsBoard user={user} /> {/* Pass user prop to GatheringsBoard */}
              </div>
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
                profile={profile}
                profileLoading={profileLoading}
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
                profileLoading={profileLoading}
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
                profileLoading={profileLoading}
                onLogout={handleLogout}
                onShowAuth={() => setShowAuthModal(true)}
                onShowUserProfile={() => setShowUserProfileModal(true)}
              />
              <MessagingPage user={user} profile={profile} />
            </>
          } />
        </Routes>
        {showReloadPrompt && (
          <Toast
            message={
              <div className="flex flex-col items-start">
                <p className="mb-2">New content available, click on reload button to update.</p>
                <button
                  onClick={refreshApp}
                  className="px-3 py-1 bg-forest-600 text-white rounded-md hover:bg-forest-700 transition-colors duration-200"
                >
                  Reload
                </button>
              </div>
            }
            type="info"
            onClose={closeReloadPrompt}
            duration={0} // Keep open until user acts
          />
        )}
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;

