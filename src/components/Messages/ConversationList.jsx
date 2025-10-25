import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { User } from 'lucide-react'; // For default avatar
import { LoadingSpinner } from '../LoadingSpinner';

export function ConversationList({ user, profile, onSelectConversation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const fetchConversations = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations(last_message_at),
          participant:profiles(id, username, avatar_url)
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching conversations:', error);
        setError('Failed to load conversations.');
        setConversations([]);
      } else {
        // Filter out the current user from participants and sort by last message
        const formattedConversations = data
          .map(cp => ({
            id: cp.conversation_id,
            last_message_at: cp.conversations.last_message_at,
            otherParticipant: cp.participant.filter(p => p.id !== user.id)[0] // Assuming 1-on-1 chat
          }))
          .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
        setConversations(formattedConversations);
      }
      setLoading(false);
    };

    fetchConversations();

    // Realtime subscription for conversation updates (e.g., new messages)
    const conversationsSubscription = supabase
      .channel('conversations_list')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'conversations',
          filter: `id=in.(${conversations.map(c => c.id).join(',')})` // Only listen for relevant conversations
        },
        (payload) => {
          // Re-fetch conversations to get updated last_message_at and sort
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Listen for new messages to update last_message_at
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}` // Only listen for messages sent by current user
        },
        (payload) => {
          // Re-fetch conversations to get updated last_message_at and sort
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      conversationsSubscription.unsubscribe();
    };
  }, [user, conversations.length]); // Re-run if user changes or conversation count changes

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-400 p-4">{error}</div>;
  }

  if (conversations.length === 0 && !loading) {
    return (
      <div className="p-4 text-gray-400 text-center">
        You have no conversations yet. Find users to start chatting!
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-earth-900 border-r border-earth-700">
      <h2 className="text-2xl font-bold p-4 text-white border-b border-earth-700">Conversations</h2>
      <div className="flex-grow overflow-y-auto">
        {conversations.map((conversation) => (
          <Link
            to={`/messages/${conversation.id}`}
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className="flex items-center p-4 space-x-3 hover:bg-earth-700 transition-colors border-b border-earth-800"
          >
            {conversation.otherParticipant?.avatar_url ? (
              <img
                src={supabase.storage.from('avatars').getPublicUrl(conversation.otherParticipant.avatar_url).data.publicUrl}
                alt="Avatar"
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-gray-400">
                <User className="h-5 w-5" />
              </div>
            )}
            <div>
              <p className="font-medium text-white">
                {conversation.otherParticipant?.username || 'Unknown User'}
              </p>
              <p className="text-sm text-gray-400">
                {conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleString() : 'No messages yet'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}