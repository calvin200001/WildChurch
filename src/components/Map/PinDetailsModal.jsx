import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { SafetyReview } from '../SafetyReview';
import { X, MapPin, User, Calendar, Eye } from 'lucide-react';

export function PinDetailsModal({ isOpen, onClose, pinId, user }) {
  const [pinDetails, setPinDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPinDetails = useCallback(async () => {
    if (!pinId) return;
    setLoading(true);
    setError(null);
    console.log('PinDetailsModal: Fetching details for pinId:', pinId);
    
    try {
      // Use the get_pins_json RPC and filter by ID
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/get_pins_json`,
        {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ search: null })
        }
      );

      const data = await response.json();
      console.log('PinDetailsModal: RPC response:', data);

      if (!response.ok) {
        throw new Error('Failed to fetch pin details');
      }

      // Find the specific pin by ID
      const pin = data.features?.find(f => f.properties.id === pinId);
      
      if (!pin) {
        setError('Pin not found.');
        setPinDetails(null);
        return;
      }

      // Get creator profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, first_name, avatar_url')
        .eq('id', pin.properties.created_by)
        .single();

      setPinDetails({
        ...pin.properties,
        creator_name: profile?.username || profile?.first_name || 'Anonymous',
        creator_avatar: profile?.avatar_url,
        coordinates: pin.geometry.coordinates
      });
      
      console.log('PinDetailsModal: Successfully set pin details');
    } catch (err) {
      console.error('PinDetailsModal: Error fetching pin details:', err);
      setError('Failed to load pin details.');
      setPinDetails(null);
    } finally {
      setLoading(false);
    }
  }, [pinId]);

  useEffect(() => {
    if (isOpen) {
      fetchPinDetails();
    }
  }, [isOpen, fetchPinDetails]);

  if (!isOpen) return null;

  const typeEmojis = {
    'open_camp': '🏕️',
    'gathering': '🙏',
    'quiet_place': '🌲',
    'resource': '📍'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-earth-800 rounded-xl shadow-2xl max-w-lg w-full relative border border-earth-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-earth-400 hover:text-earth-200 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="p-6">
          <h2 className="text-2xl font-display font-bold text-earth-50 mb-6 pr-8">
            Pin Details
          </h2>
          
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest-500 mx-auto"></div>
              <p className="text-earth-300 mt-4">Loading...</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
              {error}
            </div>
          )}
          
          {pinDetails && (
            <div className="space-y-4">
              {/* Title with Type Icon */}
              <div className="flex items-center space-x-3">
                <span className="text-4xl">{typeEmojis[pinDetails.type] || '📍'}</span>
                <div>
                  <h3 className="text-xl font-semibold text-earth-50">{pinDetails.title}</h3>
                  <span className="text-sm text-earth-400 capitalize">
                    {pinDetails.type.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Description */}
              {pinDetails.description && (
                <div className="bg-earth-700/50 rounded-lg p-4">
                  <p className="text-earth-200 leading-relaxed">{pinDetails.description}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                {/* Creator */}
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-earth-400" />
                  <div>
                    <p className="text-xs text-earth-400">Created by</p>
                    <p className="text-sm text-earth-200">{pinDetails.creator_name}</p>
                  </div>
                </div>

                {/* Visibility */}
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-earth-400" />
                  <div>
                    <p className="text-xs text-earth-400">Visibility</p>
                    <p className="text-sm text-earth-200 capitalize">{pinDetails.visibility}</p>
                  </div>
                </div>

                {/* Coordinates */}
                <div className="flex items-center space-x-2 col-span-2">
                  <MapPin className="h-4 w-4 text-earth-400" />
                  <div>
                    <p className="text-xs text-earth-400">Location</p>
                    <p className="text-sm text-earth-200 font-mono">
                      {pinDetails.coordinates[1].toFixed(4)}, {pinDetails.coordinates[0].toFixed(4)}
                    </p>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center space-x-2 col-span-2">
                  <Calendar className="h-4 w-4 text-earth-400" />
                  <div>
                    <p className="text-xs text-earth-400">Created</p>
                    <p className="text-sm text-earth-200">
                      {new Date(pinDetails.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Safety Review Section */}
              <div className="mt-6 pt-6 border-t border-earth-700">
                <SafetyReview 
                  locationId={pinId} 
                  user={user} 
                  onReviewSubmitted={fetchPinDetails} 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}