import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { MessageInput } from './Messages/MessageInput';
import { LoadingSpinner } from './LoadingSpinner';
import { User, Plus } from 'lucide-react'; // For default avatar and plus icon

export function MessageBoard({ user, profile, locationId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const commentsEndRef = useRef(null);
  const messageInputRef = useRef(null); // Ref for MessageInput

  const handleAddCommentClick = () => {
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!locationId || !user) { // Use locationId
      setComments([]);
      setLoading(false);
      return;
    }

    const fetchComments = async () => { // Renamed function for clarity
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('pin_comments') // Changed table
          .select(`
            *,
            profiles ( username, avatar_url ) // Changed select clause
          `)
          .eq('pin_id', locationId) // Changed filter column and value
          .order('created_at', { ascending: true });

        if (error) throw error;

        const commentsWithProfiles = data.map(comment => ({ // Renamed for clarity
          ...comment,
          sender: comment.profiles // Assuming 'profiles' is the joined data
        }));

        setComments(commentsWithProfiles); // Use setComments
      } catch (err) {
        console.error('Error fetching pin comments:', err); // Updated error message
        setError('Failed to load pin comments.');
        setComments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchComments(); // Call the new function

    // Realtime subscription for new comments
    const commentsSubscription = supabase // Renamed subscription
      .channel(`pin_comments_${locationId}`) // Changed channel name
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pin_comments', // Changed table
          filter: `pin_id=eq.${locationId}` // Changed filter
        },
        (payload) => {
          // Fetch sender profile for the new comment
          supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', payload.new.user_id) // Changed to user_id
            .single()
            .then(({ data: senderProfile, error: profileError }) => {
              if (profileError) {
                console.error('Error fetching sender profile for new comment:', profileError);
              }
              setComments((prevComments) => [ // Use setComments
                ...prevComments,
                { ...payload.new, sender: senderProfile || { username: 'Unknown', avatar_url: null } }
              ]);
            });
        }
      )
      .subscribe();

    return () => {
      commentsSubscription.unsubscribe(); // Unsubscribe from new channel
    };
  }, [locationId, user]); // Dependency array updated

  useEffect(() => {
    scrollToBottom();
  }, [comments]); // Use comments state

  const handleSendMessage = async (content) => {
    if (!user || !locationId || !content) return; // Use locationId

    const { error } = await supabase.from('pin_comments').insert({ // Changed table
      pin_id: locationId, // Changed to pin_id
      user_id: user.id, // Changed to user_id
      content: content,
    });

    if (error) {
      console.error('Error sending comment:', error); // Updated error message
      setError('Failed to send comment.');
    }
    // Realtime will handle updating the comments state
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-400 p-4">{error}</div>;
  }

  if (comments.length === 0 && !loading) {
    return (
      <div className="p-4 text-gray-400 text-center">
        {user ? (
          <button
            onClick={handleAddCommentClick}
            className="flex flex-col items-center justify-center text-gray-500 hover:text-indigo-400 transition-colors"
          >
            <Plus size={36} strokeWidth={1.5} />
            <span className="mt-2 text-lg">Add the first comment</span>
          </button>
        ) : (
          <p>No comments yet. Log in to share your thoughts!</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-earth-900">
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {comments.map((comment) => ( // Use comments state
          <div
            key={comment.id}
            className={`flex items-start ${
              comment.user_id === user.id ? 'justify-end' : 'justify-start'
            }`}
          >
            {comment.user_id !== user.id && ( // Use user_id
              <div className="flex-shrink-0 mr-3">
                {comment.sender?.avatar_url ? (
                  <img
                    src={supabase.storage.from('avatars').getPublicUrl(comment.sender.avatar_url).data.publicUrl}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-gray-400">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            )}
            <div
              className={`max-w-xs p-3 rounded-lg ${
                comment.user_id === user.id // Use user_id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-earth-700 text-gray-100'
              }`}
            >
              <p className="font-semibold text-sm mb-1">
                {comment.sender?.username || 'Unknown'}
              </p>
              <p>{comment.content}</p>
              <span className="block text-xs text-xs text-gray-300 mt-1">
                {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {comment.user_id === user.id && (
              <div className="flex-shrink-0 ml-3">
                {comment.sender?.avatar_url ? (
                  <img
                    src={supabase.storage.from('avatars').getPublicUrl(comment.sender.avatar_url).data.publicUrl}
                    alt="Your Avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-gray-400">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={commentsEndRef} />
      </div>
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={!user}
        ref={messageInputRef}
      />
    </div>
  );
}