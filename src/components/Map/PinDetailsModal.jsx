import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; // Adjust path as needed

export function PinDetailsModal({ isOpen, onClose, pinId }) {
  const [pinDetails, setPinDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !pinId) {
      setPinDetails(null);
      setLoading(false);
      return;
    }

    const fetchPinDetails = async () => {
      setLoading(true);
      setError(null);
      console.log('PinDetailsModal: Fetching details for pinId:', pinId);
      try {
        const { data, error } = await supabase
          .from('locations')
          .select(`
            *,
            profiles(username, avatar_url)
          `)
          .eq('id', pinId)
          .single();

        console.log('PinDetailsModal: Supabase query data:', data, 'error:', error);

        if (error) {
          throw error;
        }
        if (!data) {
          setError('Pin not found.');
          setPinDetails(null);
          return;
        }
        setPinDetails(data);
        console.log('PinDetailsModal: Successfully set pin details:', data);
      } catch (err) {
        console.error('PinDetailsModal: Error fetching pin details:', err);
        setError('Failed to load pin details.');
        setPinDetails(null);
      } finally {
        setLoading(false);
        console.log('PinDetailsModal: Loading finished. Loading state:', false);
      }
    };

    fetchPinDetails();
  }, [isOpen, pinId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-earth-800 p-6 rounded-lg shadow-lg max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-200 text-2xl"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold text-white mb-4">Pin Details</h2>
        {loading && <p className="text-gray-300">Loading...</p>}
        {error && <p className="text-red-400">{error}</p>}
        {pinDetails && (
          <div>
            <p className="text-gray-300"><strong>Title:</strong> {pinDetails.title}</p>
            <p className="text-gray-300"><strong>Type:</strong> {pinDetails.type}</p>
            <p className="text-gray-300"><strong>Description:</strong> {pinDetails.description || 'N/A'}</p>
            <p className="text-gray-300"><strong>Creator:</strong> {pinDetails.creator_name || 'Anonymous'}</p>
            {/* Add more details as needed */}
          </div>
        )}
      </div>
    </div>
  );
}