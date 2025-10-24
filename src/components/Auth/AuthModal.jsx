import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

const AuthModal = ({ isOpen, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
            },
          },
        });
        if (error) throw error;
        alert('Check your email for the verification link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      onClose(); // Close modal on successful auth
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content p-8">
        <h2 className="text-3xl font-display font-bold mb-6 text-center text-earth-50">
          {isSignUp ? 'Join WildChurch' : 'Welcome Back'}
        </h2>
        
        <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-earth-200 text-sm font-semibold mb-2" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="input w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-earth-200 text-sm font-semibold mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {isSignUp && (
            <div>
              <label className="block text-earth-200 text-sm font-semibold mb-2" htmlFor="firstName">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                className="input w-full"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Log In')}
            </button>
          </div>
          
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-sm text-forest-400 hover:text-forest-300 transition-colors"
          >
            {isSignUp ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-earth-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-earth-800 text-earth-400">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              // Google OAuth logic (same as before)
            }}
            className="mt-4 w-full bg-earth-700 hover:bg-earth-600 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
            disabled={loading}
          >
            {/* Google icon SVG */}
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h6.16c-.25 1.37-.96 2.57-2.07 3.47v2.79h3.58c2.09-1.93 3.31-4.77 3.31-8.11z" />
              <path d="M12 23c3.24 0 5.92-1.07 7.9-2.92l-3.58-2.79c-.94.63-2.15 1-3.32 1-2.69 0-4.94-1.8-5.73-4.22H2.92v2.84C4.91 20.96 8.27 23 12 23z" />
              <path d="M6.27 14.29c-.1-.3-.16-.62-.16-.95s-.06-.65-.16-.95V9.81H2.92c-.34.68-.54 1.4-.54 2.2s.2 1.52.54 2.2l3.35 2.68z" />
              <path d="M12 5.13c1.77 0 3.35.61 4.6 1.8l3.13-3.13C17.92 1.87 15.24.87 12 .87 8.27.87 4.91 2.96 2.92 6.26l3.35 2.68c.79-2.42 3.04-4.22 5.73-4.22z" />
            </svg>
            Sign in with Google
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full btn-secondary"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AuthModal;
