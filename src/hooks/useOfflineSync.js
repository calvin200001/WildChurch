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
    console.log('useOfflineSync: Starting offline action sync.');
    const queue = await offlineStorage.getActionQueue();
    console.log('useOfflineSync: Found', queue.length, 'actions in queue.');

    for (const action of queue) {
      try {
        console.log('useOfflineSync: Syncing action:', action.type, action.id);
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
        console.log('useOfflineSync: Successfully synced action:', action.type, action.id);
      } catch (error) {
        console.error('useOfflineSync: Failed to sync action:', action, error);
      }
    }

    await offlineStorage.clearActionQueue();
    console.log('useOfflineSync: Offline action queue cleared. Syncing finished.');
    setSyncing(false);
  }

  return { isOnline, syncing };
}
