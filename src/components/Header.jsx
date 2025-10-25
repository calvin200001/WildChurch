import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, MapPin, User, LogOut } from 'lucide-react';
import { useState } from 'react';

import { supabase } from '../lib/supabase'; // Import supabase to get public URL for avatar

export function Header({
  user,
  profile,
  profileLoading, // Add this prop
  onLogout,
  onShowAuth,
  onShowUserProfile
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Show loading state while profile is fetching
  const displayName = profileLoading
    ? 'Loading...'
    : profile?.username || user?.email || 'User';

  return (
    <header className="absolute top-0 left-0 right-0 z-20 bg-earth-900/95 backdrop-blur-sm border-b border-earth-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <MapPin className="text-forest-500 h-8 w-8" />
            <h1 className="text-2xl font-display font-bold text-earth-50">
              WildChurch
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className="text-earth-200 hover:text-forest-500 transition-colors font-medium"
            >
              Map
            </Link>
            <Link 
              to="/proposals" 
              className="text-earth-200 hover:text-forest-500 transition-colors font-medium"
            >
              Proposals
            </Link>
            <Link 
              to="/users" 
              className="text-earth-200 hover:text-forest-500 transition-colors font-medium"
            >
              Find Users
            </Link>
            <Link 
              to="/messages" 
              className="text-earth-200 hover:text-forest-500 transition-colors font-medium"
            >
              Messages
            </Link>
            
            {user ? (
              <div className="flex items-center space-x-4">
                {profileLoading ? (
                  <div className="w-8 h-8 rounded-full bg-earth-700 animate-pulse" />
                ) : profile?.avatar_url ? (
                  <img
                    src={supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => {
                      // Fallback if image fails to load
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <User className="h-8 w-8 text-earth-300" style={{ display: profile?.avatar_url ? 'none' : 'block' }} />
                <span className="text-earth-300 text-sm">{displayName}</span>
                <button
                  onClick={onShowUserProfile}
                  className="flex items-center space-x-2 btn-secondary text-sm"
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </button>
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-2 btn-danger text-sm"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onShowAuth}
                className="btn-primary text-sm"
              >
                Sign In
              </button>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-earth-200 hover:text-forest-500"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-earth-700">
            <div className="flex flex-col space-y-3">
              <Link 
                to="/" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-earth-200 hover:text-forest-500 transition-colors py-2"
              >
                Map
              </Link>
              <Link 
                to="/proposals" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-earth-200 hover:text-forest-500 transition-colors py-2"
              >
                Proposals
              </Link>
              <Link 
                to="/users" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-earth-200 hover:text-forest-500 transition-colors py-2"
              >
                Find Users
              </Link>
              <Link 
                to="/messages" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-earth-200 hover:text-forest-500 transition-colors py-2"
              >
                Messages
              </Link>
              
              {user ? (
                <>
                  <div className="flex items-center space-x-2 py-2">
                    {profileLoading ? (
                      <div className="w-8 h-8 rounded-full bg-earth-700 animate-pulse" />
                    ) : profile?.avatar_url ? (
                      <img
                        src={supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : null}
                    <User className="h-8 w-8 text-earth-300" style={{ display: profile?.avatar_url ? 'none' : 'block' }} />
                    <span className="text-earth-300 text-sm">
                      {displayName}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onShowUserProfile();
                      setMobileMenuOpen(false);
                    }}
                    className="btn-secondary text-sm justify-start"
                  >
                    <User className="h-4 w-4 mr-2" />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="btn-danger text-sm justify-start"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>Log Out</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    onShowAuth();
                    setMobileMenuOpen(false);
                  }}
                  className="btn-primary text-sm"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}