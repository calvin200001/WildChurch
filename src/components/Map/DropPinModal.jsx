import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MapPin } from 'lucide-react';
import { checkRateLimit } from '../../lib/rateLimit';

export function DropPinModal({ isOpen, location, onClose, onSuccess, user }) {
  const [formData, setFormData] = useState({
    type: 'open_camp',
    title: '',
    description: '',
    tags: [],
    activeUntilOrProposedEndTime: null,
    proposedStartTime: null
  });

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    
    console.log('Submitting pin with location:', location);
    console.log('Form data:', formData);

    if (!user) {
      alert('You must be logged in to create a pin.');
      return;
    }

    // Rate limiting check
    const { allowed, remaining } = await checkRateLimit(
      supabase,
      user.id,
      'create_pin',
      5, // Max 5 pins per hour
      60 // Per hour
    );

    if (!allowed) {
      alert(`Rate limit exceeded. You can only create 5 pins per hour. Please wait before creating more. Remaining: ${remaining}`);
      return;
    }

    let data, error;

    if (formData.type === 'gathering') {
      console.log('Creating meeting proposal...');
      
      // Use RPC for PostGIS point creation
      const { data: proposalData, error: proposalError } = await supabase.rpc('create_meeting_proposal', {
        p_lng: location.lng,
        p_lat: location.lat,
        p_title: formData.title,
        p_description: formData.description,
        p_proposed_start_time: formData.proposedStartTime,
        p_proposed_end_time: formData.activeUntilOrProposedEndTime,
        p_proposed_by: user.id
      });

      data = proposalData;
      error = proposalError;

      console.log('Proposal result:', { data, error });

      if (!error && data) {
        await supabase.from('proposal_commitments').insert({
          proposal_id: data.id,
          user_id: user.id
        });
      }

    } else {
      console.log('Creating location pin...');
      
      // Use RPC for PostGIS point creation
      const { data: locationData, error: locationError } = await supabase.rpc('create_location_pin', {
        p_lng: location.lng,
        p_lat: location.lat,
        p_type: formData.type,
        p_title: formData.title,
        p_description: formData.description,
        p_active_until: formData.activeUntilOrProposedEndTime,
        p_created_by: user.id
      });

      data = locationData;
      error = locationError;

      console.log('Location insert result:', { data, error });

      if (!error && data && formData.tags.length > 0) {
        console.log('Adding tags...');
        const tagsResult = await supabase
          .from('pin_tags')
          .insert(
            formData.tags.map(tag => ({
              location_id: data.id,
              tag
            }))
          );
        console.log('Tags result:', tagsResult);
      }
    }

    if (error) {
      console.error('Error creating pin/proposal:', error);
      alert(`Error: ${error.message}`);
      return;
    }

    console.log('Success! Pin created:', data);
    onSuccess(data);
    onClose();
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6">
        {!user ? (
          <>
            <h2 className="text-2xl font-display font-bold text-earth-50 mb-4">
              Authentication Required
            </h2>
            <p className="text-earth-300 mb-6">
              Please log in or sign up to drop a pin or propose a gathering.
            </p>
            <button onClick={onClose} className="btn-secondary w-full">
              Close
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-display font-bold text-earth-50">
              Drop a Pin
            </h2>
            
            <div className="bg-earth-700/50 border border-earth-600 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2 text-sm text-earth-300">
                <MapPin className="h-4 w-4 text-forest-400" />
                <span>
                  Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-earth-200 text-sm font-semibold mb-2">
                Type:
              </label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="input w-full"
              >
                <option value="open_camp">🏕️ Open Camp</option>
                <option value="gathering">🙏 Gathering (Proposal)</option>
                <option value="quiet_place">🌲 Quiet Place</option>
                <option value="resource">📍 Resource</option>
              </select>
            </div>

            <div>
              <label className="block text-earth-200 text-sm font-semibold mb-2">
                Title:
              </label>
              <input 
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Sunset Worship Circle"
                required
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-earth-200 text-sm font-semibold mb-2">
                Description:
              </label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Tell others what to expect..."
                rows="4"
                className="textarea w-full"
              />
            </div>

            {formData.type === 'gathering' && (
              <div>
                <label className="block text-earth-200 text-sm font-semibold mb-2">
                  Proposed Start Time:
                </label>
                <input 
                  type="datetime-local"
                  value={formData.proposedStartTime}
                  onChange={(e) => setFormData({...formData, proposedStartTime: e.target.value})}
                  required
                  className="input w-full"
                />
              </div>
            )}

            <div>
              <label className="block text-earth-200 text-sm font-semibold mb-2">
                {formData.type === 'gathering' ? 'Proposed End Time' : 'Active Until'} (optional):
              </label>
              <input 
                type="datetime-local"
                value={formData.activeUntilOrProposedEndTime}
                onChange={(e) => setFormData({...formData, activeUntilOrProposedEndTime: e.target.value})}
                className="input w-full"
              />
            </div>

            {formData.type !== 'gathering' && (
              <div>
                <label className="block text-earth-200 text-sm font-semibold mb-2">
                  Tags:
                </label>
                <div className="flex flex-wrap gap-2">
                  {['worship_tonight', 'bring_food', 'guitar_circle', 'intercession', 
                    'sunrise_prayer', 'communion', 'bible_study', 'water_source', 
                    'firewood', 'foraging', 'house_church', 'food_pantry'].map(tag => (
                    <label key={tag} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.tags.includes(tag)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({...formData, tags: [...formData.tags, tag]});
                          } else {
                            setFormData({...formData, tags: formData.tags.filter(t => t !== tag)});
                          }
                        }}
                        className="form-checkbox h-4 w-4 text-forest-600 border-earth-600 bg-earth-700 rounded focus:ring-forest-500"
                      />
                      <span className="ml-2 text-earth-200 text-sm">
                        {tag.replace('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button 
                type="button" 
                onClick={onClose}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="btn-primary flex-1"
              >
                {formData.type === 'gathering' ? '🙏 Propose Meeting' : '📍 Drop Pin'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}