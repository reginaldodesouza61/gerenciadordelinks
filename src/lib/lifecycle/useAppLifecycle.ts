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
    let focusReturnCount = 0;

    // 1. Tab visibility handling
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.group('[Focus Audit] Tab Lost Focus (visibilityState: hidden)');
        console.log('• Triggered: Document visibilitychange -> hidden');
        console.log('• User profile:', useAuthStore.getState().user?.email || 'Guest');
        console.log('• Active page ID:', useNoteStore.getState().activePageId);
        console.log('• Action: Preserving all Zustand memory states and Dexie cache');
        console.groupEnd();
      } else if (document.visibilityState === 'visible') {
        focusReturnCount++;
        console.group(`[Focus Audit] Tab Regained Focus #${focusReturnCount} (visibilityState: visible)`);
        console.log('• Triggered: Document visibilitychange -> visible');
        console.log('• User reference:', useAuthStore.getState().user?.email || 'Guest');
        console.log('• Active page ID:', useNoteStore.getState().activePageId);
        console.log('• Action: Executing silent background queue sync (0 UI re-renders)');

        useNoteStore.getState().syncPendingQueue().then(() => {
          console.log('• Result: Silent queue flush completed successfully.');
        }).catch((err) => {
          console.debug('[Lifecycle] Silent background queue flush on tab return:', err);
        }).finally(() => {
          console.groupEnd();
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
