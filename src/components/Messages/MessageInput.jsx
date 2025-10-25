import React, { useState, forwardRef } from 'react';

export const MessageInput = forwardRef(({ onSendMessage, disabled }, ref) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && onSendMessage) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2 p-4 bg-earth-800 border-t border-earth-700">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        className="flex-grow rounded-md bg-earth-700 border-gray-600 text-white shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2"
        disabled={disabled}
        ref={ref}
      />
      <button
        type="submit"
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        disabled={disabled || !message.trim()}
      >
        Send
      </button>
    </form>
  );
});