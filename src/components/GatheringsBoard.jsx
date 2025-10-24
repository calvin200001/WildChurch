import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function GatheringsBoard() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    fetchUser();
  }, []);

  useEffect(() => {
    async function fetchProposals() {
      setLoading(true);
      const { data, error } = await supabase
        .from('meeting_proposals')
        .select(`
          *,
          proposed_by_profile:proposed_by(first_name, avatar_url),
          commitments:proposal_commitments(user_id)
        `)
        .eq('status', 'proposed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching proposals:', error);
      } else {
        setProposals(data);
      }
      setLoading(false);
    }

    fetchProposals();

    const subscription = supabase
      .channel('proposals-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'meeting_proposals' },
        () => fetchProposals()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'proposal_commitments' },
        () => fetchProposals()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleCommit = async (proposalId) => {
    if (!user) {
      alert('You must be logged in to commit to a proposal.');
      return;
    }
    const { error } = await supabase
      .from('proposal_commitments')
      .insert({ proposal_id: proposalId, user_id: user.id });

    if (error) {
      if (error.code === '23505') { // Unique violation code
        alert('You have already committed to this proposal.');
      } else {
        console.error('Error committing to proposal:', error);
      }
    } else {
      alert('Successfully committed to the proposal!');
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading proposals...</div>;
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Gathering Proposals</h1>
      {proposals.length === 0 ? (
        <p className="text-gray-600">No active proposals at the moment. Be the first to propose one!</p>
      ) : (
        <div className="space-y-6">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h2 className="text-2xl font-semibold text-indigo-700 mb-2">{proposal.title}</h2>
              <p className="text-gray-700 mb-4">{proposal.description}</p>
              <p className="text-sm text-gray-500 mb-2">
                Proposed by: <span className="font-medium">{proposal.proposed_by_profile?.first_name || 'Anonymous'}</span>
              </p>
              <p className="text-sm text-gray-500 mb-2">
                Proposed for: <span className="font-medium">{new Date(proposal.proposed_start_time).toLocaleString()}</span>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Commitments: <span className="font-bold text-indigo-600">{proposal.commitments.length} / 4</span>
              </p>
              <button
                onClick={() => handleCommit(proposal.id)}
                disabled={!user || proposal.commitments.some(c => c.user_id === user.id)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {proposal.commitments.some(c => c.user_id === user.id) ? 'Committed!' : 'Commit to Join'}
              </button>
              {/* TODO: Add comments section here */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
