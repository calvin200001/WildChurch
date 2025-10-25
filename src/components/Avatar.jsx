import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from 'lucide-react';

export function Avatar({ url, className }) {
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    if (url) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(url);
      setAvatarUrl(data.publicUrl);
    } else {
      setAvatarUrl(null);
    }
  }, [url]);

  if (!avatarUrl) {
    return (
      <div className={`${className} bg-gray-600 flex items-center justify-center text-gray-400`}>
        <User className="h-5 w-5" />
      </div>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt="Avatar"
      className={className}
    />
  );
}
