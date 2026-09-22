import { useEffect } from 'react';
import { useNoteStore } from '@/lib/store/noteStore';
import { useAuthStore } from '@/lib/store/authStore';

/**
 * Enterprise Application Lifecycle & Background Sync Manager
 * 
 * Provides OneNote/Notion-grade stability:
 * 1. Seamless tab switching (no reloads, no store clearing, no UI flashing).
 * 2. Silent background synchronization when returning to the tab or reconnecting online.
 * 3. Preserves all loaded workspaces and in-memory caches.
 */
export function useAppLifecycle() {
  useEffect(() => {
    // 1. Tab visibility handling
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User returned to tab: silently process any pending background sync queue
        useNoteStore.getState().syncPendingQueue().catch((err) => {
          console.debug('[Lifecycle] Silent background queue flush on tab return:', err);
        });
      }
    };

    // 2. Network reconnection handling
    const handleOnline = () => {
      console.debug('[Lifecycle] Network online: triggering silent background queue sync');
      useNoteStore.getState().syncPendingQueue().catch((err) => {
        console.debug('[Lifecycle] Silent background queue flush on reconnect:', err);
      });
    };

    const handleOffline = () => {
      console.debug('[Lifecycle] Network offline: continuing in offline-first mode');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
}
