import { offlineDb, EgressLogItem } from '@/lib/db/offlineDb';

export interface EgressStats {
  totalEgressBytes: number;
  totalSavedByCacheBytes: number;
  downloadsByNote: Record<string, { noteTitle: string; downloadsCount: number; bytes: number }>;
  downloadsByImage: Record<string, { url: string; downloadsCount: number; bytes: number; cachedHits: number }>;
  syncFrequency: {
    fetchNotesCount: number;
    syncQueueCount: number;
    updatePageCount: number;
    storageListCount: number;
    tabFocusTriggersCount: number;
  };
  routeRanking: Array<{ route: string; bytes: number; requestsCount: number }>;
  auditPeriodDays: number;
}

const MEMORY_LOGS: EgressLogItem[] = [];
let memoryBytesCount = 0;
let memorySavedBytes = 0;

/**
 * Tracks a Supabase network / egress request in memory and IndexedDB.
 */
export async function trackEgressEvent(event: Omit<EgressLogItem, 'id' | 'timestamp'>) {
  const item: EgressLogItem = {
    ...event,
    timestamp: Date.now(),
  };

  MEMORY_LOGS.push(item);
  if (MEMORY_LOGS.length > 500) {
    MEMORY_LOGS.shift();
  }

  if (item.cached) {
    memorySavedBytes += item.sizeBytes;
  } else {
    memoryBytesCount += item.sizeBytes;
  }

  try {
    if (offlineDb.egressLogs) {
      await offlineDb.egressLogs.add(item);
    }
  } catch (err) {
    console.debug('[EgressTracker] Failed to record egress log to IndexedDB:', err);
  }
}

/**
 * Calculates complete Egress & Traffic Audit metrics from recorded logs.
 */
export async function calculateEgressStats(): Promise<EgressStats> {
  let logs: EgressLogItem[] = [];
  try {
    if (offlineDb.egressLogs) {
      logs = await offlineDb.egressLogs.toArray();
    }
  } catch {
    logs = MEMORY_LOGS;
  }

  if (logs.length === 0) {
    logs = MEMORY_LOGS;
  }

  const downloadsByNote: Record<string, { noteTitle: string; downloadsCount: number; bytes: number }> = {};
  const downloadsByImage: Record<string, { url: string; downloadsCount: number; bytes: number; cachedHits: number }> = {};
  const syncFrequency = {
    fetchNotesCount: 0,
    syncQueueCount: 0,
    updatePageCount: 0,
    storageListCount: 0,
    tabFocusTriggersCount: 0,
  };
  const routeMap: Record<string, { bytes: number; requestsCount: number }> = {
    'Supabase Storage (/object/public/note-assets)': { bytes: 0, requestsCount: 0 },
    'Supabase REST API (/rest/v1/note_pages)': { bytes: 0, requestsCount: 0 },
    'Supabase REST API (/rest/v1/note_sections)': { bytes: 0, requestsCount: 0 },
    'Supabase Auth (/auth/v1/user)': { bytes: 0, requestsCount: 0 },
  };

  let totalEgressBytes = 0;
  let totalSavedByCacheBytes = 0;

  // Read local pages for title mapping
  const pageTitles: Record<string, string> = {};
  try {
    const pages = await offlineDb.pages.toArray();
    pages.forEach((p) => {
      pageTitles[p.id] = p.titulo || 'Sem Título';
    });
  } catch {
    // fallback
  }

  logs.forEach((log) => {
    if (log.cached) {
      totalSavedByCacheBytes += log.sizeBytes;
    } else {
      totalEgressBytes += log.sizeBytes;
    }

    // Sync frequency counters
    if (log.type === 'fetch_notes') {
      syncFrequency.fetchNotesCount++;
      routeMap['Supabase REST API (/rest/v1/note_pages)'].requestsCount++;
      routeMap['Supabase REST API (/rest/v1/note_pages)'].bytes += log.cached ? 0 : log.sizeBytes;
    } else if (log.type === 'sync_queue') {
      syncFrequency.syncQueueCount++;
      routeMap['Supabase REST API (/rest/v1/note_pages)'].requestsCount++;
      routeMap['Supabase REST API (/rest/v1/note_pages)'].bytes += log.cached ? 0 : log.sizeBytes;
    } else if (log.type === 'update_page') {
      syncFrequency.updatePageCount++;
      routeMap['Supabase REST API (/rest/v1/note_pages)'].requestsCount++;
      routeMap['Supabase REST API (/rest/v1/note_pages)'].bytes += log.cached ? 0 : log.sizeBytes;
    } else if (log.type === 'storage_list') {
      syncFrequency.storageListCount++;
      routeMap['Supabase Storage (/object/public/note-assets)'].requestsCount++;
      routeMap['Supabase Storage (/object/public/note-assets)'].bytes += log.cached ? 0 : log.sizeBytes;
    }

    if (log.trigger?.includes('visibility') || log.trigger?.includes('focus') || log.trigger?.includes('tab_return')) {
      syncFrequency.tabFocusTriggersCount++;
    }

    // Downloads per note & image
    if (log.type === 'image_download' && log.url) {
      routeMap['Supabase Storage (/object/public/note-assets)'].requestsCount++;
      if (!log.cached) {
        routeMap['Supabase Storage (/object/public/note-assets)'].bytes += log.sizeBytes;
      }

      const noteId = log.noteId || 'geral_desconhecido';
      const noteTitle = pageTitles[noteId] || (noteId === 'geral_desconhecido' ? 'Visão Geral do Workspace' : `Nota ${noteId.slice(0, 8)}`);

      if (!downloadsByNote[noteId]) {
        downloadsByNote[noteId] = { noteTitle, downloadsCount: 0, bytes: 0 };
      }
      if (!log.cached) {
        downloadsByNote[noteId].downloadsCount++;
        downloadsByNote[noteId].bytes += log.sizeBytes;
      }

      const cleanUrl = log.url.split('?')[0];
      const filename = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1) || cleanUrl;

      if (!downloadsByImage[filename]) {
        downloadsByImage[filename] = { url: cleanUrl, downloadsCount: 0, bytes: 0, cachedHits: 0 };
      }
      if (log.cached) {
        downloadsByImage[filename].cachedHits++;
      } else {
        downloadsByImage[filename].downloadsCount++;
        downloadsByImage[filename].bytes += log.sizeBytes;
      }
    }
  });

  const routeRanking = Object.entries(routeMap)
    .map(([route, data]) => ({ route, ...data }))
    .sort((a, b) => b.bytes - a.bytes);

  return {
    totalEgressBytes,
    totalSavedByCacheBytes,
    downloadsByNote,
    downloadsByImage,
    syncFrequency,
    routeRanking,
    auditPeriodDays: 1,
  };
}

/**
 * Clears recorded egress logs.
 */
export async function clearEgressLogs() {
  MEMORY_LOGS.length = 0;
  memoryBytesCount = 0;
  memorySavedBytes = 0;
  try {
    if (offlineDb.egressLogs) {
      await offlineDb.egressLogs.clear();
    }
  } catch {
    // ignore
  }
}
