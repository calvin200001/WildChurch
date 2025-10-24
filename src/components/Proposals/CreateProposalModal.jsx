import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function CreateProposalModal({ onClose, onSuccess, user, location }) { // Accept location prop
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    proposedStartTime: '',
    proposedEndTime: '',
    proposedLocation: location, // Initialize with passed location
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!user) {
    return (
      <div className="modal p-4 bg-white rounded-lg shadow-lg max-w-md mx-auto my-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Authentication Required</h2>
        <p className="text-gray-700 mb-6">Please log in or sign up to propose a gathering.</p>
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Close
        </button>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // The proposedLocation is now initialized from the prop
      if (!formData.proposedLocation) {
        setError("Proposed location is missing. Please ensure a location is provided.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('meeting_proposals')
        .insert({
          proposed_location: `POINT(${formData.proposedLocation.lng} ${formData.proposedLocation.lat})`,
          proposed_type: 'gathering',
          title: formData.title,
          description: formData.description,
          proposed_start_time: formData.proposedStartTime,
          proposed_end_time: formData.proposedEndTime,
          proposed_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Automatically commit the creator to the proposal
      await supabase.from('proposal_commitments').insert({
        proposal_id: data.id,
        user_id: user.id
      });

      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal p-4 bg-white rounded-lg shadow-lg max-w-md mx-auto my-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Propose a Gathering</h2>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

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

        <label className="block">
          <span className="text-gray-700">Proposed End Time (optional):</span>
          <input
            type="datetime-local"
            value={formData.proposedEndTime}
            onChange={(e) => setFormData({...formData, proposedEndTime: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </label>

        

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
            disabled={loading}
          >
            {loading ? 'Proposing...' : 'Propose Gathering'}
          </button>
        </div>
      </form>
    </div>
  );
}
