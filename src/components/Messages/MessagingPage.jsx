import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';

export function MessagingPage({ user, profile }) {
  const { conversationId: routeConversationId } = useParams();
  const [selectedConversationId, setSelectedConversationId] = useState(routeConversationId);
  const navigate = useNavigate();

  useEffect(() => {
    setSelectedConversationId(routeConversationId);
  }, [routeConversationId]);

  const handleSelectConversation = (id) => {
    setSelectedConversationId(id);
    navigate(`/messages/${id}`);
  };

  return (
    <div className="flex h-full pt-16 bg-earth-900 text-white"> {/* pt-16 for header offset */}
      <div className="w-1/3 border-r border-earth-700">
        <ConversationList
          user={user}
          profile={profile}
          onSelectConversation={handleSelectConversation}
        />
      </div>
      <div className="w-2/3">
        {selectedConversationId ? (
          <ConversationView user={user} profile={profile} />
        ) : (
          <div className="p-4 text-gray-400 text-center flex items-center justify-center h-full">
            <p>Select a conversation from the left, or start a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}