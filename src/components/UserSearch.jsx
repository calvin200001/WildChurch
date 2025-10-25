import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // New import
import { supabase } from '../lib/supabase'; // Adjust path as needed
import { LoadingSpinner } from './LoadingSpinner'; // Assuming a LoadingSpinner component exists // Assuming a LoadingSpinner component exists
import { MessageSquare, User } from 'lucide-react'; // New import for message icon
import { Avatar } from './Avatar';

export function UserSearch({ user }) { // Accept user prop
  const [searchTerm, setSearchTerm] = useState('');
  const [searchState, setSearchState] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSearchResults([]);

    try {
      // Call a Supabase RPC function for searching profiles
      // This RPC function will need to be created in Supabase
      const { data, error } = await supabase.rpc('search_profiles', {
        search_term: searchTerm,
        state_filter: searchState,
      });

      if (error) {
        throw error;
      }
      setSearchResults(data);
    } catch (err) {
      console.error('Error searching profiles:', err);
      setError('Failed to search profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate(); // Initialize navigate

  const handleMessageUser = async (targetUserId) => {
    if (!user || !targetUserId) return;

    try {
      const { data: conversationId, error } = await supabase.rpc('create_or_get_conversation', {
        p_user_id1: user.id,
        p_user_id2: targetUserId,
      });

      if (error) {
        throw error;
      }

      navigate(`/messages/${conversationId}`);
    } catch (err) {
      console.error('Error creating or getting conversation:', err);
      setError('Failed to start conversation.');
    }
  };

  return (
    <div className="p-4 bg-earth-800 rounded-lg shadow-lg text-white">
      <h2 className="text-2xl font-bold mb-4">Find Other Users</h2>
      <form onSubmit={handleSearch} className="space-y-4">
        <div>
          <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-300">
            Search by Username, Interests, or Beliefs
          </label>
          <input
            id="searchTerm"
            type="text"
            className="mt-1 block w-full rounded-md bg-earth-700 border-gray-600 text-white shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="e.g., nature, meditation, California"
          />
        </div>
        <div>
          <label htmlFor="searchState" className="block text-sm font-medium text-gray-300">
            Filter by State/Region
          </label>
          <input
            id="searchState"
            type="text"
            className="mt-1 block w-full rounded-md bg-earth-700 border-gray-600 text-white shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            value={searchState}
            onChange={(e) => setSearchState(e.target.value)}
            placeholder="e.g., CA, New York"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search Users'}
        </button>
      </form>

      {error && <p className="text-red-400 mt-4">{error}</p>}

      {loading && <LoadingSpinner className="mt-4" />}

      {!loading && searchResults.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-3">Search Results</h3>
          <ul className="space-y-3">
            {searchResults.map((profile) => (
              <li key={profile.id} className="bg-earth-700 p-3 rounded-md flex items-center space-x-3">
                {/* Wrap all content inside <li> with a single div */}
                <div className="flex items-center w-full"> {/* Use w-full to ensure it takes full width */}
                  <div className="flex items-center space-x-3 flex-grow">
                    <Avatar url={profile.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                    {console.log('UserSearch: profile.avatar_url for', profile.username, ':', profile.avatar_url)}
                    <div>
                      <p className="font-medium">{profile.username || 'Anonymous'}</p>
                      {profile.state && <p className="text-sm text-gray-400">{profile.state}</p>}
                      {profile.interests && profile.interests.length > 0 && (
                        <p className="text-xs text-gray-500">Interests: {profile.interests.join(', ')}</p>
                      )}
                      {profile.beliefs && profile.beliefs.length > 0 && (
                        <p className="text-xs text-gray-500">Beliefs: {profile.beliefs.join(', ')}</p>
                      )}
                    </div>
                  </div>
                  {user && user.id !== profile.id && ( // Only show message button if logged in and not self
                    <button
                      onClick={() => handleMessageUser(profile.id)}
                      className="ml-auto px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center space-x-1 text-sm"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Message</span>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && searchResults.length === 0 && searchTerm && (
        <p className="text-gray-400 mt-4">No users found matching your criteria.</p>
      )}
    </div>
  );
}