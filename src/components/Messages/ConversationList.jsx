import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { User } from 'lucide-react'; // For default avatar
import { LoadingSpinner } from '../LoadingSpinner';
import { ProfileLoading } from '../ProfileLoading'; // New import

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
      
      try {
        // Step 1: Get all conversations for this user
        const { data: participantData, error: participantError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id);

        if (participantError) throw participantError;
        
        if (!participantData || participantData.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        const conversationIds = participantData.map(p => p.conversation_id);

        // Step 2: Get conversation details
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .in('id', conversationIds);

        if (convError) throw convError;

        // Step 3: For each conversation, get the OTHER participant
        const conversationsWithParticipants = await Promise.all(
          convData.map(async (conv) => {
            const { data: participants, error: partError } = await supabase
              .from('conversation_participants')
              .select(`
                user_id,
                profiles:user_id (
                  id,
                  username,
                  avatar_url
                )
              `)
              .eq('conversation_id', conv.id)
              .neq('user_id', user.id) // Get the OTHER user
              .single();

            if (partError) {
              console.error('Error fetching participant:', partError);
              return null;
            }

            return {
              id: conv.id,
              last_message_at: conv.last_message_at,
              otherParticipant: participants.profiles
            };
          })
        );

        // Filter out any failed fetches and sort
        const validConversations = conversationsWithParticipants
          .filter(c => c !== null)
          .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

        setConversations(validConversations);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError('Failed to load conversations.');
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    // Realtime subscription - simpler approach
    const subscription = supabase
      .channel('conversations_list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          // Any message change triggers refetch
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]); // Only depend on user.id, not the whole user object

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <ProfileLoading />
        <ProfileLoading />
        <ProfileLoading />
      </div>
    );
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