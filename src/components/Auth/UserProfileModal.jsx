import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; // Adjust path as needed
import { LoadingSpinner } from '../LoadingSpinner'; // Assuming a LoadingSpinner component exists

export function UserProfileModal({ isOpen, onClose, user, onUpdateProfile }) {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [interests, setInterests] = useState(''); // Comma-separated string for now
  const [beliefs, setBeliefs] = useState(''); // Comma-separated string for now
  const [profileState, setProfileState] = useState(''); // User's state/region
  const [uploading, setUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      getProfile();
    }
  }, [isOpen, user]);

  async function getProfile() {
  setLoading(true);
  console.log('UserProfileModal: Attempting to fetch profile for user.id:', user.id);
  
  try {
    console.log('UserProfileModal: Executing Supabase query...');
    const { data, error } = await supabase
      .from('profiles')
      .select('username, avatar_url, interests, beliefs, state')
      .eq('id', user.id)
      .maybeSingle(); // ← CHANGED: Use maybeSingle() instead of single()
    
    console.log('UserProfileModal: Query completed. Data:', data, 'Error:', error);

    if (error) {
      // Real error occurred
      console.error('UserProfileModal: Database error:', error);
      // Still allow user to fill in the form
      setUsername('');
      setAvatarUrl('');
      setInterests('');
      setBeliefs('');
      setProfileState('');
      setAvatarPreview('');
    } else if (data) {
      // Profile exists - populate form
      console.log('UserProfileModal: Profile found:', data);
      setUsername(data.username || '');
      setAvatarUrl(data.avatar_url || '');
      setInterests(data.interests ? data.interests.join(', ') : '');
      setBeliefs(data.beliefs ? data.beliefs.join(', ') : '');
      setProfileState(data.state || '');
      if (data.avatar_url) {
        downloadImage(data.avatar_url);
      }
    } else {
      // No profile exists yet - show empty form
      console.log('UserProfileModal: No profile found. User can create one.');
      setUsername('');
      setAvatarUrl('');
      setInterests('');
      setBeliefs('');
      setProfileState('');
      setAvatarPreview('');
    }
  } catch (err) {
    console.error('UserProfileModal: Unexpected error:', err);
    // Still allow form interaction
    setUsername('');
    setAvatarUrl('');
    setInterests('');
    setBeliefs('');
    setProfileState('');
    setAvatarPreview('');
  } finally {
    setLoading(false); // ALWAYS stop loading
    console.log('UserProfileModal: Loading finished. Loading state:', false);
  }
}

  async function downloadImage(path) {
    try {
      const { data, error } = await supabase.storage.from('avatars').download(path);
      if (error) {
        throw error;
      }
      const url = URL.createObjectURL(data);
      setAvatarPreview(url);
    } catch (error) {
      console.error('Error downloading image: ', error.message);
      setAvatarPreview('');
    }
  }

  async function uploadAvatar(event) {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    if (file.size > 1024 * 1024) { // 1MB limit
      setFileError('File size should be less than 1MB.');
      setAvatarFile(null);
      setAvatarPreview('');
      return;
    } else {
      setFileError('');
    }

    setUploading(true);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file)); // Show preview immediately

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      setFileError('Error uploading avatar.');
      setUploading(false);
      return;
    }

    setAvatarUrl(filePath); // Update avatar_url state with the new path
    setUploading(false);
  }

  async function updateProfile(event) {
    event.preventDefault();
    setLoading(true);

    const updates = {
      id: user.id,
      username,
      avatar_url: avatarUrl,
      interests: interests.split(',').map(s => s.trim()).filter(Boolean),
      beliefs: beliefs.split(',').map(s => s.trim()).filter(Boolean),
      state: profileState,
      updated_at: new Date(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);

    if (error) {
      console.error('Error updating profile:', error);
    } else {
      onUpdateProfile(); // Callback to refresh user data in App.jsx if needed
      onClose();
    }
    setLoading(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-earth-800 p-6 rounded-lg shadow-lg max-w-md w-full relative text-white">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-200 text-2xl"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>

        {loading && <LoadingSpinner />}

        {!loading && (
          <form onSubmit={updateProfile}>
            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium text-gray-300">Username</label>
              <input
                id="username"
                type="text"
                className="mt-1 block w-full rounded-md bg-earth-700 border-gray-600 text-white shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="avatar" className="block text-sm font-medium text-gray-300">Avatar</label>
              <div className="flex items-center space-x-4 mt-1">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar Preview" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
                <input
                  type="file"
                  id="avatar"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500 file:text-white hover:file:bg-indigo-600"
                />
              </div>
              {fileError && <p className="text-red-400 text-sm mt-1">{fileError}</p>}
              {uploading && <p className="text-indigo-300 text-sm mt-1">Uploading...</p>}
            </div>

            <div className="mb-4">
              <label htmlFor="interests" className="block text-sm font-medium text-gray-300">Interests (comma-separated)</label>
              <input
                id="interests"
                type="text"
                className="mt-1 block w-full rounded-md bg-earth-700 border-gray-600 text-white shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="beliefs" className="block text-sm font-medium text-gray-300">Beliefs (comma-separated)</label>
              <input
                id="beliefs"
                type="text"
                className="mt-1 block w-full rounded-md bg-earth-700 border-gray-600 text-white shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                value={beliefs}
                onChange={(e) => setBeliefs(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="state" className="block text-sm font-medium text-gray-300">State/Region</label>
              <input
                id="state"
                type="text"
                className="mt-1 block w-full rounded-md bg-earth-700 border-gray-600 text-white shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                value={profileState}
                onChange={(e) => setProfileState(e.target.value)}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                disabled={loading || uploading}
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}