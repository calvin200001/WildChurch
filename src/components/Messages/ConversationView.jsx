import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageInput } from './MessageInput';
import { LoadingSpinner } from '../LoadingSpinner';
import { User } from 'lucide-react'; // For default avatar

export function ConversationView({ user, profile, locationId }) { // Added locationId prop
  const [messages, setMessages] = useState([]); // Renamed to comments for clarity, but keeping messages for now
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!locationId || !user) { // Use locationId
      setMessages([]);
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

        setMessages(commentsWithProfiles); // Still using setMessages for now
      } catch (err) {
        console.error('Error fetching pin comments:', err); // Updated error message
        setError('Failed to load pin comments.');
        setMessages([]);
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
              setMessages((prevMessages) => [
                ...prevMessages,
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
  }, [messages]);

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

  if (messages.length === 0 && !loading) {
    return (
      <div className="p-4 text-gray-400 text-center">
        No messages yet. Start the conversation!
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-earth-900">
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start ${
              message.sender_id === user.id ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.sender_id !== user.id && (
              <div className="flex-shrink-0 mr-3">
                {message.sender?.avatar_url ? (
                  <img
                    src={supabase.storage.from('avatars').getPublicUrl(message.sender.avatar_url).data.publicUrl}
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
                message.sender_id === user.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-earth-700 text-gray-100'
              }`}
            >
              <p className="font-semibold text-sm mb-1">
                {message.sender?.username || 'Unknown'}
              </p>
              <p>{message.content}</p>
              <span className="block text-xs text-gray-300 mt-1">
                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {message.sender_id === user.id && (
              <div className="flex-shrink-0 ml-3">
                {message.sender?.avatar_url ? (
                  <img
                    src={supabase.storage.from('avatars').getPublicUrl(message.sender.avatar_url).data.publicUrl}
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
        <div ref={messagesEndRef} />
      </div>
      <MessageInput onSendMessage={handleSendMessage} disabled={!user} />
    </div>
  );
}