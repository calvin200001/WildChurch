import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, MapPin, User, LogOut } from 'lucide-react';
import { useState } from 'react';

import { supabase } from '../lib/supabase';

export function Header({
  user,
  profile,
  profileLoading,
  onLogout,
  onShowAuth,
  onShowUserProfile
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const displayName = profileLoading
    ? 'Loading...'
    : profile?.first_name || profile?.username || user?.email?.split('@')[0] || 'User';

  const getAvatarUrl = () => {
    if (!profile?.avatar_url) {
      console.log('Header: profile.avatar_url is null or undefined');
      return null;
    }
    console.log('Header: profile.avatar_url:', profile.avatar_url);
    return supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl;
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-20 bg-earth-900/95 backdrop-blur-md border-b border-earth-700/50 shadow-earth">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/app" className="flex items-center space-x-2 group">
            <MapPin className="text-forest-500 h-8 w-8 group-hover:text-forest-400 group-hover:scale-110 transition-all duration-300" />
            <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-earth-50 via-forest-300 to-forest-500 bg-clip-text text-transparent group-hover:from-forest-300 group-hover:to-forest-600 transition-all duration-300">
              WildChurch
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/app" 
              className="text-earth-200 hover:text-forest-400 transition-all duration-200 font-medium relative group py-1"
            >
              <span>Map</span>
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-forest-500 to-forest-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link 
              to="/proposals" 
              className="text-earth-200 hover:text-forest-400 transition-all duration-200 font-medium relative group py-1"
            >
              <span>Proposals</span>
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-forest-500 to-forest-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link 
              to="/users" 
              className="text-earth-200 hover:text-forest-400 transition-all duration-200 font-medium relative group py-1"
            >
              <span>Find Users</span>
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-forest-500 to-forest-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link 
              to="/messages" 
              className="text-earth-200 hover:text-forest-400 transition-all duration-200 font-medium relative group py-1"
            >
              <span>Messages</span>
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-forest-500 to-forest-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            
            {user ? (
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-earth-700">
                <button
                  onClick={onShowUserProfile}
                  className="flex items-center space-x-3 hover:bg-earth-800/50 rounded-lg px-3 py-2 transition-all duration-200 group"
                >
                  {profileLoading ? (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-earth-700 to-earth-600 animate-pulse shadow-md" />
                  ) : getAvatarUrl() ? (
                    <img
                      src={getAvatarUrl()}
                      alt="Avatar"
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-forest-700/50 group-hover:ring-forest-500 transition-all duration-200 shadow-md"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-earth-700 to-forest-800 flex items-center justify-center ring-2 ring-forest-700/50 group-hover:ring-forest-500 transition-all duration-200 shadow-md">
                      <User className="h-5 w-5 text-earth-300" />
                    </div>
                  )}
                  {getAvatarUrl() && (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-earth-700 to-forest-800 items-center justify-center ring-2 ring-forest-700/50 group-hover:ring-forest-500 transition-all duration-200 shadow-md" style={{ display: 'none' }}>
                      <User className="h-5 w-5 text-earth-300" />
                    </div>
                  )}
                  <span className="text-earth-200 group-hover:text-forest-400 text-sm font-medium transition-colors duration-200 max-w-[120px] truncate">
                    {displayName}
                  </span>
                </button>
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-2 text-earth-300 hover:text-red-400 hover:bg-red-900/20 px-3 py-2 rounded-lg transition-all duration-200 group"
                  title="Log Out"
                >
                  <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-sm font-medium">Log Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onShowAuth}
                className="btn-primary text-sm ml-4"
              >
                Sign In
              </button>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-earth-200 hover:text-forest-400 hover:bg-earth-800/50 p-2 rounded-lg transition-all duration-200"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-earth-700/50 animate-slide-up">
            <div className="flex flex-col space-y-2">
              <Link 
                to="/" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-earth-200 hover:text-forest-400 hover:bg-earth-800/50 transition-all duration-200 py-3 px-4 rounded-lg"
              >
                Map
              </Link>
              <Link 
                to="/proposals" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-earth-200 hover:text-forest-400 hover:bg-earth-800/50 transition-all duration-200 py-3 px-4 rounded-lg"
              >
                Proposals
              </Link>
              <Link 
                to="/users" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-earth-200 hover:text-forest-400 hover:bg-earth-800/50 transition-all duration-200 py-3 px-4 rounded-lg"
              >
                Find Users
              </Link>
              <Link 
                to="/messages" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-earth-200 hover:text-forest-400 hover:bg-earth-800/50 transition-all duration-200 py-3 px-4 rounded-lg"
              >
                Messages
              </Link>
              
              {user ? (
                <>
                  <div className="flex items-center space-x-3 py-3 px-4 mt-2 border-t border-earth-700/50">
                    {profileLoading ? (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-earth-700 to-earth-600 animate-pulse shadow-md" />
                    ) : getAvatarUrl() ? (
                      <img
                        src={getAvatarUrl()}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-forest-700/50 shadow-md"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-earth-700 to-forest-800 flex items-center justify-center ring-2 ring-forest-700/50 shadow-md">
                        <User className="h-5 w-5 text-earth-300" />
                      </div>
                    )}
                    {getAvatarUrl() && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-earth-700 to-forest-800 items-center justify-center ring-2 ring-forest-700/50 shadow-md" style={{ display: 'none' }}>
                        <User className="h-5 w-5 text-earth-300" />
                      </div>
                    )}
                    <span className="text-earth-200 text-sm font-medium">
                      {displayName}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onShowUserProfile();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center space-x-2 text-earth-200 hover:text-forest-400 hover:bg-earth-800/50 transition-all duration-200 py-3 px-4 rounded-lg"
                  >
                    <User className="h-5 w-5" />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center space-x-2 text-earth-200 hover:text-red-400 hover:bg-red-900/20 transition-all duration-200 py-3 px-4 rounded-lg"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Log Out</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    onShowAuth();
                    setMobileMenuOpen(false);
                  }}
                  className="btn-primary text-sm mt-2"
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