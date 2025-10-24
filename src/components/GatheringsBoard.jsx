import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { CreateProposalModal } from '@/components/Proposals/CreateProposalModal'; // Import CreateProposalModal

// Helper component to render threaded comments
const CommentThread = ({ comments, parentId = null, proposalId, user, onAddReply }) => {
  const [replyContent, setReplyContent] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);

  const filteredComments = comments.filter(comment => comment.parent_id === parentId);

  const handleReplySubmit = async (commentId) => {
    if (!user || !replyContent.trim()) return;
    await onAddReply(proposalId, commentId, replyContent);
    setReplyContent('');
    setShowReplyForm(false);
  };

  return (
    <div className="space-y-3 mt-2">
      {filteredComments.map(comment => (
        <div key={comment.id} className="bg-gray-50 p-3 rounded-md border border-gray-200">
          <p className="text-sm font-semibold text-gray-800">{comment.profiles?.first_name || 'Anonymous'}</p>
          <p className="text-gray-700 text-sm mt-1">{comment.content}</p>
          <p className="text-xs text-gray-500 mt-1">{new Date(comment.created_at).toLocaleString()}</p>
          
          {user && (
            <button 
              onClick={() => setShowReplyForm(prev => !prev)}
              className="text-xs text-blue-600 hover:underline mt-1"
            >
              {showReplyForm ? 'Cancel Reply' : 'Reply'}
            </button>
          )}

          {showReplyForm && user && (
            <div className="mt-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                rows="2"
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              ></textarea>
              <button
                onClick={() => handleReplySubmit(comment.id)}
                className="mt-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Post Reply
              </button>
            </div>
          )}

          <div className="ml-4">
            <CommentThread 
              comments={comments} 
              parentId={comment.id} 
              proposalId={proposalId} 
              user={user} 
              onAddReply={onAddReply}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export function GatheringsBoard({ user }) { // Accept user prop
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  // const [user, setUser] = useState(null); // User is now passed as prop
  const [newCommentContent, setNewCommentContent] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false); // State for create proposal modal

  // Removed fetchUser as user is passed as prop
  // const fetchUser = useCallback(async () => {
  //   const { data: { user } } = await supabase.auth.getUser();
  //   setUser(user);
  // }, []);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('meeting_proposals')
      .select(`
        *,
        proposed_by_profile:proposed_by(first_name, avatar_url),
        commitments:proposal_commitments(user_id),
        comments:pin_comments(*, profiles:user_id(first_name, avatar_url))
      `)
      .eq('status', 'proposed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching proposals:', error);
    } else {
      setProposals(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // fetchUser(); // No longer needed as user is passed as prop
    fetchProposals();

    const subscription = supabase
      .channel('proposals-board-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'meeting_proposals' },
        () => fetchProposals()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'proposal_commitments' },
        () => fetchProposals()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pin_comments' },
        () => fetchProposals()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProposals]); // Removed fetchUser from dependencies

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

  const handleAddComment = async (proposalId, parentId = null, content) => {
    if (!user || !content.trim()) return;

    const { error } = await supabase.from('pin_comments').insert({
      proposal_id: proposalId,
      user_id: user.id,
      content: content.trim(),
      parent_id: parentId
    });

    if (error) {
      console.error('Error adding comment:', error);
    } else {
      setNewCommentContent(''); // Clear form if successful
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading proposals...</div>;
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gathering Proposals</h1>
        {user && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
          >
            + Propose a Gathering
          </button>
        )}
      </div>
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
                disabled={!user || proposal.commitments.some(c => c.user_id === user?.id)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {proposal.commitments.some(c => c.user_id === user?.id) ? 'Committed!' : 'Commit to Join'}
              </button>

              {/* Comments Section */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Comments</h3>
                {proposal.comments && proposal.comments.length > 0 ? (
                  <CommentThread 
                    comments={proposal.comments} 
                    proposalId={proposal.id} 
                    user={user} 
                    onAddReply={handleAddComment}
                  />
                ) : (
                  <p className="text-sm text-gray-600">No comments yet. Be the first to start a discussion!</p>
                )}

                {user && (
                  <div className="mt-4">
                    <textarea
                      value={newCommentContent}
                      onChange={(e) => setNewCommentContent(e.target.value)}
                      placeholder="Add a comment..."
                      rows="3"
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    ></textarea>
                    <button
                      onClick={() => handleAddComment(proposal.id, null, newCommentContent)}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Post Comment
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {showCreateModal && (
        <CreateProposalModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchProposals(); // Refresh proposals after creation
          }}
          user={user}
          location={{ lng: 0, lat: 0 }} // Placeholder location for now
        />
      )}
    </div>
  );
}
