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

class OfflineDatabase extends Dexie {
  pages!: Table<LocalNotePage, string>;
  sections!: Table<NoteSection, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  revisions!: Table<PageRevision, number>;

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
  }
}

export const offlineDb = new OfflineDatabase();
