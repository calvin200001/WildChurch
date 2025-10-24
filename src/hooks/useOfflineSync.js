import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase';
import { offlineStorage } from '@/lib/offlineStorage';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const supabase = useSupabase();

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      syncOfflineActions();
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function syncOfflineActions() {
    setSyncing(true);
    const queue = await offlineStorage.getActionQueue();

    for (const action of queue) {
      try {
        switch (action.type) {
          case 'create_pin':
            await supabase.from('locations').insert(action.data);
            break;
          case 'create_comment':
            await supabase.from('pin_comments').insert(action.data);
            break;
          case 'send_message':
            await supabase.from('messages').insert(action.data);
            break;
        }
      } catch (error) {
        console.error('Failed to sync action:', action, error);
      }
    }

    await offlineStorage.clearActionQueue();
    setSyncing(false);
  }

  return { isOnline, syncing };
}
