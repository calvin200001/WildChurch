import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MessageInput } from './MessageInput';
import { LoadingSpinner } from '../LoadingSpinner';
import { User } from 'lucide-react'; // For default avatar

export function ConversationView({ user, profile }) {
  const { conversationId } = useParams();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!conversationId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:sender_id (
              id,
              username,
              avatar_url
            )
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        // Transform the data to match expected structure
        const messagesWithProfiles = data.map(msg => ({
          ...msg,
          sender: msg.sender // This is now the full profile object
        }));
        
        setMessages(messagesWithProfiles);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages.');
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Realtime subscription for new messages
    const messagesSubscription = supabase
      .channel(`conversation_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          // Fetch sender profile for the new message
          supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', payload.new.sender_id)
            .single()
            .then(({ data: senderProfile, error: profileError }) => {
              if (profileError) {
                console.error('Error fetching sender profile for new message:', profileError);
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
      messagesSubscription.unsubscribe();
    };
  }, [conversationId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content) => {
    if (!user || !conversationId || !content) return;

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content,
    });

    if (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message.');
    }
    // Realtime will handle updating the messages state
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