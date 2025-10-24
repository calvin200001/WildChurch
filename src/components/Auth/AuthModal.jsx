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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isSignUp ? 'Sign Up' : 'Log In'}
        </h2>
        <form onSubmit={handleAuth}>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {isSignUp && (
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="firstName">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={loading}
            >
              {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Log In')}
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
            >
              {isSignUp ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="mb-3 text-gray-600">- OR -</p>
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: window.location.origin, // Redirects back to the app after OAuth
                  },
                });
                if (error) throw error;
              } catch (err) {
                setError(err.message);
              } finally {
                setLoading(false);
              }
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center"
            disabled={loading}
          >
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
          className="mt-4 w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AuthModal;
