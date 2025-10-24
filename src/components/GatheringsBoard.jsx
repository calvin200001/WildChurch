import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { CreateProposalModal } from '@/components/Proposals/CreateProposalModal'; // Import CreateProposalModal
import { Link } from 'react-router-dom';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// Helper component to render threaded comments
const CommentThread = ({ comments, parentId = null, proposalId, user, onAddReply }) => {
  const [replyContent, setReplyContent] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState(null);

  const filteredComments = comments.filter(comment => comment.parent_id === parentId);

  const handleReplySubmit = async (commentId) => {
    if (!user || !replyContent.trim()) return;
    await onAddReply(proposalId, commentId, replyContent);
    setReplyContent('');
    setShowReplyForm(false);
    setActiveReplyId(null);
  };

  return (
    <div className="space-y-3 mt-2">
      {filteredComments.map(comment => (
        <div 
          key={comment.id} 
          className={`rounded-lg p-4 transition-colors ${ 
            parentId ? 'bg-earth-700/50 border-l-2 border-forest-700 ml-6' : 'bg-earth-700'
          }`}
        >
          <div className="flex items-start space-x-3">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-forest-700 flex-shrink-0 flex items-center justify-center text-sm font-semibold text-earth-100">
              {comment.profiles?.first_name?.charAt(0).toUpperCase() || '?'}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-semibold text-earth-200">
                  {comment.profiles?.first_name || 'Anonymous'}
                </span>
                <span className="text-xs text-earth-500">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              
              <p className="text-earth-300 text-sm leading-relaxed">
                {comment.content}
              </p>
              
              {user && (
                <button 
                  onClick={() => {
                    setActiveReplyId(comment.id);
                    setShowReplyForm(prev => !prev);
                  }}
                  className="text-xs text-forest-400 hover:text-forest-300 mt-2 font-medium"
                >
                  {showReplyForm && activeReplyId === comment.id ? '✕ Cancel' : '↩ Reply'}
                </button>
              )}

              {showReplyForm && activeReplyId === comment.id && user && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    rows="2"
                    className="textarea w-full"
                  ></textarea>
                  <button
                    onClick={() => handleReplySubmit(comment.id)}
                    className="btn-primary text-sm"
                  >
                    Post Reply
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Nested replies */}
          <CommentThread 
            comments={comments} 
            parentId={comment.id} 
            proposalId={proposalId} 
            user={user} 
            onAddReply={onAddReply}
          />
        </div>
      ))}
    </div>
  );
};

export function GatheringsBoard({ user }) { // Accept user prop
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false); // State for create proposal modal

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('meeting_proposals')
      .select(`
        *,
        proposed_by_profile:proposed_by(first_name, avatar_url),
        commitments:proposal_commitments(
          user_id,
          profiles:user_id(first_name, avatar_url)
        ),
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
  }, [fetchProposals]);

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

  return (
    <div className="min-h-screen bg-earth-900 pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-display font-bold text-earth-50 mb-2">
              Gathering Proposals
            </h1>
            <p className="text-earth-400">
              Commit to gatherings that need {4} people to confirm
            </p>
          </div>
          {user && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              + Propose Gathering
            </button>
          )}
        </div>
        
        {loading ? (
          <LoadingSpinner />
        ) : proposals.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-earth-300 text-lg">
              No active proposals yet. Be the first! 🕊️
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-display font-semibold text-forest-400 mb-2">
                      {proposal.title}
                    </h2>
                    <p className="text-earth-300 text-sm">
                      Proposed by <span className="font-medium text-earth-200">
                        {proposal.proposed_by_profile?.first_name || 'Anonymous'}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-forest-500">
                      {proposal.commitments.length}/4
                    </div>
                    <div className="text-xs text-earth-400">committed</div>
                  </div>
                </div>
                
                <p className="text-earth-200 mb-4">
                  {proposal.description}
                </p>
                
                <div className="flex items-center space-x-4 text-sm text-earth-400 mb-4">
                  <span>📅 {new Date(proposal.proposed_start_time).toLocaleString()}</span>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-earth-300">
                      Progress to Confirmation
                    </span>
                    <span className="text-lg font-bold text-forest-400">
                      {proposal.commitments.length}/4
                    </span>
                  </div>
                  <div className="w-full bg-earth-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-forest-600 to-forest-500 h-full transition-all duration-500 ease-out"
                      style={{ width: `${(proposal.commitments.length / 4) * 100}%` }}
                    ></div>
                  </div>
                  {proposal.commitments.length >= 4 && (
                    <p className="text-sm text-green-400 mt-2 font-semibold">
                      ✅ Confirmed! This gathering will appear on the map.
                    </p>
                  )}
                </div>

                {proposal.commitments.length > 0 && (
                  <div className="flex items-center space-x-2 mt-3">
                    <span className="text-sm text-earth-400">Committed:</span>
                    <div className="flex -space-x-2">
                      {proposal.commitments.map((commitment, index) => (
                        <div 
                          key={index}
                          className="w-8 h-8 rounded-full bg-forest-700 border-2 border-earth-800 flex items-center justify-center text-xs font-semibold text-earth-100"
                          title={commitment.profiles?.first_name || 'Anonymous'}
                        >
                          {commitment.profiles?.avatar_url ? (
                            <img 
                              src={commitment.profiles.avatar_url} 
                              alt={commitment.profiles.first_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            commitment.profiles?.first_name?.charAt(0).toUpperCase() || '?'
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => handleCommit(proposal.id)}
                  disabled={!user || proposal.commitments.some(c => c.user_id === user?.id)}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${ 
                    proposal.commitments.some(c => c.user_id === user?.id)
                      ? 'bg-earth-700 text-earth-400 cursor-not-allowed'
                      : 'bg-forest-700 hover:bg-forest-600 text-earth-50'
                  }`}
                >
                  {proposal.commitments.some(c => c.user_id === user?.id) 
                    ? '✅ You\'re Committed!' 
                    : '🙏 Commit to Join'}
                </button>

                {/* Comments Section */}
                <div className="mt-6 pt-6 border-t border-earth-700">
                  <h3 className="text-lg font-semibold text-earth-200 mb-4">
                    💬 Discussion
                  </h3>
                  {proposal.comments && proposal.comments.length > 0 ? (
                    <CommentThread 
                      comments={proposal.comments} 
                      proposalId={proposal.id} 
                      user={user} 
                      onAddReply={handleAddComment}
                    />
                  ) : (
                    <p className="text-sm text-earth-300">No comments yet. Be the first to start a discussion!</p>
                  )}

                  {user && (
                    <div className="mt-4">
                      <textarea
                        value={newCommentContent}
                        onChange={(e) => setNewCommentContent(e.target.value)}
                        placeholder="Add a comment..."
                        rows="3"
                        className="textarea w-full"
                      ></textarea>
                      <button
                        onClick={() => handleAddComment(proposal.id, null, newCommentContent)}
                        className="btn-primary mt-2"
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
        
        {/* Back to Map Button */}
        <div className="mt-8 text-center">
          <Link to="/" className="btn-secondary inline-flex items-center">
            ← Back to Map
          </Link>
        </div>
      </div>
    </div>
  );
}
