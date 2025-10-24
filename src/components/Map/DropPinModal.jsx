import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function DropPinModal({ location, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    type: 'open_camp',
    title: '',
    description: '',
    tags: [],
    activeUntilOrProposedEndTime: null,
    proposedStartTime: null
  });

  async function handleSubmit(e) {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error('User not logged in');
        return;
    }

    let data, error;

    if (formData.type === 'gathering') {
      // Create a meeting proposal
      ({ data, error } = await supabase
        .from('meeting_proposals')
        .insert({
          proposed_location: `POINT(${location.lng} ${location.lat})`,
          proposed_type: 'gathering',
          title: formData.title,
          description: formData.description,
          proposed_start_time: formData.proposedStartTime,
          proposed_end_time: formData.activeUntilOrProposedEndTime,
          proposed_by: user.id
        })
        .select()
        .single());

      if (!error) {
        // Automatically commit the creator to the proposal
        await supabase.from('proposal_commitments').insert({
          proposal_id: data.id,
          user_id: user.id
        });
      }

    } else {
      // Create a regular location pin (open_camp, quiet_place, resource)
      ({ data, error } = await supabase
        .from('locations')
        .insert({
          location: `POINT(${location.lng} ${location.lat})`,
          type: formData.type,
          title: formData.title,
          description: formData.description,
          active_until: formData.activeUntilOrProposedEndTime,
          created_by: user.id
        })
        .select()
        .single());

      if (!error && formData.tags.length > 0) {
        // Add tags to the new location
        await supabase
          .from('pin_tags')
          .insert(
            formData.tags.map(tag => ({
              location_id: data.id,
              tag
            }))
          );
      }
    }

    if (error) {
      console.error('Error creating pin/proposal:', error);
      return;
    }

    onSuccess(data);
    onClose();
  }

  return (
    <div className="modal p-4 bg-white rounded-lg shadow-lg max-w-md mx-auto my-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Drop a Pin</h2>
        
        <label className="block">
          <span className="text-gray-700">Type:</span>
          <select 
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option value="open_camp">Open Camp</option>
            <option value="gathering">Gathering (Proposal)</option>
            <option value="quiet_place">Quiet Place</option>
            <option value="resource">Resource</option>
          </select>
        </label>

        <label className="block">
          <span className="text-gray-700">Title:</span>
          <input 
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder="e.g., Sunset Worship Circle"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </label>

        <label className="block">
          <span className="text-gray-700">Description:</span>
          <textarea 
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Tell others what to expect..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </label>

        {formData.type === 'gathering' && (
          <label className="block">
            <span className="text-gray-700">Proposed Start Time:</span>
            <input 
              type="datetime-local"
              value={formData.proposedStartTime}
              onChange={(e) => setFormData({...formData, proposedStartTime: e.target.value})}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </label>
        )}

        <label className="block">
          <span className="text-gray-700">Active Until / Proposed End Time (optional):</span>
          <input 
            type="datetime-local"
            value={formData.activeUntilOrProposedEndTime}
            onChange={(e) => setFormData({...formData, activeUntilOrProposedEndTime: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </label>

        {(formData.type !== 'gathering') && (
          <label className="block">
            <span className="text-gray-700">Tags:</span>
            <div className="tag-selector mt-1 grid grid-cols-2 gap-2">
              {['worship_tonight', 'bring_food', 'guitar_circle', 'intercession', 
                'sunrise_prayer', 'communion', 'bible_study', 'water_source', 'firewood', 'foraging', 'house_church', 'food_pantry'].map(tag => (
                <label key={tag} className="inline-flex items-center">
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
                    className="form-checkbox"
                  />
                  <span className="ml-2 text-gray-700 text-sm">{tag.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </label>
        )}

        <div className="button-group flex justify-end space-x-2">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {formData.type === 'gathering' ? 'Propose Meeting' : 'Drop Pin'}
          </button>
        </div>
      </form>
    </div>
  );
}
