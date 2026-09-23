import Dexie, { Table } from 'dexie';
import { NotePage, NoteSection } from '../../types/notes';

export interface LocalNotePage extends NotePage {
  localVersion: number;
  remoteVersion: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
  lastUpdatedAt: number;
}

export interface SyncQueueItem {
  id?: number;
  pageId: string;
  action: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  timestamp: number;
  attempts: number;
}

export interface PageRevision {
  id?: number;
  pageId: string;
  version: number;
  titulo: string;
  conteudo: string | null;
  timestamp: number;
}

export interface ImageBlobCacheItem {
  url: string;
  blob: Blob;
  mimeType: string;
  size: number;
  pageId?: string;
  fetchedAt: number;
  hitCount: number;
}

export interface EgressLogItem {
  id?: number;
  timestamp: number;
  type: 'image_download' | 'storage_list' | 'get_public_url' | 'fetch_notes' | 'sync_queue' | 'update_page';
  url?: string;
  sizeBytes: number;
  noteId?: string;
  trigger: string;
  cached: boolean;
}

export interface TombstoneItem {
  id: string;
  type: 'page' | 'section';
  userId?: string;
  deletedAt: number;
}

class OfflineDatabase extends Dexie {
  pages!: Table<LocalNotePage, string>;
  sections!: Table<NoteSection, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  revisions!: Table<PageRevision, number>;
  imageBlobCache!: Table<ImageBlobCacheItem, string>;
  egressLogs!: Table<EgressLogItem, number>;
  tombstones!: Table<TombstoneItem, string>;

  constructor() {
    super('AtlasOfflineDB');
    this.version(1).stores({
      pages: 'id, section_id, user_id, syncStatus',
      syncQueue: '++id, pageId, action, timestamp',
      revisions: '++id, [pageId+version], timestamp',
    });
    this.version(2).stores({
      pages: 'id, section_id, user_id, syncStatus',
      sections: 'id, user_id, nome',
      syncQueue: '++id, pageId, action, timestamp',
      revisions: '++id, [pageId+version], timestamp',
    });
    this.version(3).stores({
      pages: 'id, section_id, user_id, syncStatus',
      sections: 'id, user_id, nome',
      syncQueue: '++id, pageId, action, timestamp',
      revisions: '++id, [pageId+version], timestamp',
      imageBlobCache: 'url, pageId, size, fetchedAt',
      egressLogs: '++id, timestamp, type, noteId, cached',
    });
    this.version(4).stores({
      pages: 'id, section_id, user_id, syncStatus',
      sections: 'id, user_id, nome',
      syncQueue: '++id, pageId, action, timestamp',
      revisions: '++id, [pageId+version], timestamp',
      imageBlobCache: 'url, pageId, size, fetchedAt',
      egressLogs: '++id, timestamp, type, noteId, cached',
      tombstones: 'id, type, userId, deletedAt',
    });
  }
}

export const offlineDb = new OfflineDatabase();
