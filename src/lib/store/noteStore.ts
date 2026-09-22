import { create } from 'zustand';
import { supabase } from '../supabase';
import { NoteSection, NotePage, NoteLinkRelation, DeletedNoteItem } from '@/types/notes';
import { toast } from 'sonner';
import { decryptNoteContent, sanitizeAndEncryptNoteContent } from '@/lib/encryption';
import { offlineDb } from '@/lib/db/offlineDb';
import { validateAndSanitizeBlocks } from '@/lib/validation/blockSchema';
import { auditAndRepairSyncQueue } from '@/lib/storage/syncAudit';
import { useAuthStore } from './authStore';

let isSyncingQueue = false;

const TRASH_STORAGE_KEY = 'meuhub_deleted_notes_vault';
const ACTIVE_PAGE_STORAGE_KEY = 'meuhub_active_page_id';
const ACTIVE_SECTION_STORAGE_KEY = 'meuhub_active_section_id';
const SECTION_ORDER_STORAGE_KEY = 'meuhub_section_order';
const PAGE_ORDER_STORAGE_KEY = 'meuhub_page_order';

const CACHE_KEYS = {
  SECTIONS: 'meuhub_cached_note_sections',
  PAGES: 'meuhub_cached_note_pages',
  RELATIONS: 'meuhub_cached_note_relations'
};

const DEFAULT_USER_ID = 'c72212e7-2b6a-4da7-8745-01eb33414af4';
const DEFAULT_SECTION_ID = '10000000-0000-0000-0000-000000000001';
const DEFAULT_PAGE_ID = '20000000-0000-0000-0000-000000000002';

export function isValidUuid(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function sanitizeUuid(id: string | null | undefined): string {
  if (!id) return '';
  const trimmed = id.trim();
  if (isValidUuid(trimmed)) return trimmed.toLowerCase();

  // Known legacy constant mappings
  if (trimmed === 'sec_default_geral_01') return '10000000-0000-0000-0000-000000000001';
  if (trimmed === 'page_default_welcome_01') return '20000000-0000-0000-0000-000000000002';
  if (trimmed === 'sec_default_credenciais_02') return '10000000-0000-0000-0000-000000000002';
  if (trimmed === 'sec_default_dev_03') return '10000000-0000-0000-0000-000000000003';

  // Deterministically hash any arbitrary non-UUID string into a valid RFC-4122 v4 UUID
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x61c88647, h4 = 0x9e3779b9;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 3812015801);
    h4 = Math.imul(h4 ^ ch, 2718281829);
  }
  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const fullHex = (toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4)).slice(0, 32);
  return `${fullHex.slice(0, 8)}-${fullHex.slice(8, 12)}-4${fullHex.slice(13, 16)}-a${fullHex.slice(17, 20)}-${fullHex.slice(20, 32)}`;
}

export function sanitizeUuidOrNull(id: string | null | undefined): string | null {
  if (!id) return null;
  const trimmed = id.trim();
  if (trimmed === 'null' || trimmed === 'undefined' || trimmed === '') return null;
  return sanitizeUuid(trimmed);
}

async function migrateLegacyDatabase() {
  try {
    // 1. Migrate LocalStorage active IDs and cached lists
    const activePage = localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY);
    if (activePage) {
      localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, sanitizeUuid(activePage));
    }
    const activeSec = localStorage.getItem(ACTIVE_SECTION_STORAGE_KEY);
    if (activeSec) {
      localStorage.setItem(ACTIVE_SECTION_STORAGE_KEY, sanitizeUuid(activeSec));
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.includes('page_order') || key.includes('section_order')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
              localStorage.setItem(key, JSON.stringify(arr.map(id => sanitizeUuid(id))));
            }
          }
        } catch { /* ignore */ }
      }
      if (key.includes('cached_note_pages')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const pages = JSON.parse(raw);
            if (Array.isArray(pages)) {
              const updated = pages.map((p: Partial<NotePage>) => ({
                ...p,
                id: sanitizeUuid(p.id),
                section_id: sanitizeUuid(p.section_id),
                parent_id: sanitizeUuidOrNull(p.parent_id)
              }));
              localStorage.setItem(key, JSON.stringify(updated));
            }
          }
        } catch { /* ignore */ }
      }
      if (key.includes('cached_note_sections')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const secs = JSON.parse(raw);
            if (Array.isArray(secs)) {
              const updated = secs.map((s: Partial<NoteSection>) => ({
                ...s,
                id: sanitizeUuid(s.id)
              }));
              localStorage.setItem(key, JSON.stringify(updated));
            }
          }
        } catch { /* ignore */ }
      }
    }

    // 2. Migrate IndexedDB pages
    const localPages = await offlineDb.pages.toArray();
    for (const page of localPages) {
      const sanitizedId = sanitizeUuid(page.id);
      const sanitizedSecId = sanitizeUuid(page.section_id);
      const sanitizedParentId = sanitizeUuidOrNull(page.parent_id);

      if (page.id !== sanitizedId || page.section_id !== sanitizedSecId || page.parent_id !== sanitizedParentId) {
        await offlineDb.pages.delete(page.id);
        await offlineDb.pages.put({
          ...page,
          id: sanitizedId,
          section_id: sanitizedSecId,
          parent_id: sanitizedParentId
        });
      }
    }

    // 3. Migrate IndexedDB syncQueue
    const syncItems = await offlineDb.syncQueue.toArray();
    for (const item of syncItems) {
      const sanitizedPageId = sanitizeUuid(item.pageId);
      let payloadChanged = false;
      const newPayload = item.payload ? { ...item.payload } : {};
      
      if (newPayload.id) {
        const orig = newPayload.id;
        newPayload.id = sanitizeUuid(String(orig));
        if (newPayload.id !== orig) payloadChanged = true;
      }
      if (newPayload.section_id) {
        const orig = newPayload.section_id;
        newPayload.section_id = sanitizeUuid(String(orig));
        if (newPayload.section_id !== orig) payloadChanged = true;
      }
      if (newPayload.parent_id) {
        const orig = newPayload.parent_id;
        newPayload.parent_id = sanitizeUuidOrNull(String(orig));
        if (newPayload.parent_id !== orig) payloadChanged = true;
      }

      if (item.pageId !== sanitizedPageId || payloadChanged) {
        await offlineDb.syncQueue.update(item.id!, {
          pageId: sanitizedPageId,
          payload: newPayload
        });
      }
    }

    // 4. Migrate IndexedDB revisions
    const revs = await offlineDb.revisions.toArray();
    for (const rev of revs) {
      const sanitizedPageId = sanitizeUuid(rev.pageId);
      if (rev.pageId !== sanitizedPageId) {
        await offlineDb.revisions.delete(rev.id!);
        await offlineDb.revisions.put({
          ...rev,
          pageId: sanitizedPageId
        });
      }
    }

    console.log('[Migration] Legacy non-UUID IDs successfully migrated to valid UUID format.');
  } catch (err) {
    console.warn('[Migration] Error migrating database from legacy non-UUID format:', err);
  }
}

// Run asynchronous migration immediately upon module loading
migrateLegacyDatabase();

const DEFAULT_SECTIONS: NoteSection[] = [
  {
    id: DEFAULT_SECTION_ID,
    nome: 'Geral',
    user_id: DEFAULT_USER_ID,
    created_at: new Date().toISOString()
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    nome: 'Cofre & Credenciais',
    user_id: DEFAULT_USER_ID,
    created_at: new Date().toISOString()
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    nome: 'Desenvolvimento & Scripts',
    user_id: DEFAULT_USER_ID,
    created_at: new Date().toISOString()
  }
];

const DEFAULT_PAGES: NotePage[] = [
  {
    id: DEFAULT_PAGE_ID,
    titulo: 'Bem-vindo ao Atlas Workspace',
    conteudo: JSON.stringify([
      {
        id: 'block_welcome_header',
        x: 40,
        y: 40,
        width: 650,
        height: 'auto',
        type: 'text',
        content: '<h1>🚀 Bem-vindo ao Atlas Workspace</h1><p>Seu workspace centralizado para links, anotações interativas, blocos de código e cofre seguro de credenciais.</p><p>Use a barra lateral para criar novas seções, páginas e subpáginas organizadas.</p>'
      }
    ]),
    section_id: DEFAULT_SECTION_ID,
    parent_id: null,
    user_id: DEFAULT_USER_ID,
    created_at: new Date().toISOString()
  }
];

function getCached<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    
    if (Array.isArray(parsed)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return parsed.map((item: any) => {
        if (item && typeof item === 'object') {
          const newItem = { ...item };
          if (newItem.id) newItem.id = sanitizeUuid(newItem.id);
          if (newItem.section_id) newItem.section_id = sanitizeUuid(newItem.section_id);
          if (newItem.parent_id) newItem.parent_id = sanitizeUuidOrNull(newItem.parent_id);
          return newItem;
        }
        return item;
      }) as unknown as T;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function setCached<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.debug('Failed to cache notes data', e);
  }
}

function getStoredTrash(): DeletedNoteItem[] {
  try {
    const raw = localStorage.getItem(TRASH_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading trash from storage:', e);
    return [];
  }
}

function saveTrashToStorage(items: DeletedNoteItem[]) {
  try {
    localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving trash to storage:', e);
  }
}

function getStoredActivePageId(): string | null {
  try {
    const val = localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY);
    return val ? sanitizeUuid(val) : null;
  } catch {
    return null;
  }
}

function getStoredActiveSectionId(): string | null {
  try {
    const val = localStorage.getItem(ACTIVE_SECTION_STORAGE_KEY);
    return val ? sanitizeUuid(val) : null;
  } catch {
    return null;
  }
}

function saveActivePageId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_PAGE_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function saveActiveSectionId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_SECTION_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_SECTION_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function getStoredSectionOrder(userId?: string): string[] {
  try {
    const effectiveUserId = userId || useAuthStore.getState().user?.id;
    if (effectiveUserId) {
      const userRaw = localStorage.getItem(`${SECTION_ORDER_STORAGE_KEY}_${effectiveUserId}`);
      if (userRaw) {
        const parsed = JSON.parse(userRaw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
    // Also check user_metadata from auth user if available
    const metaOrder = useAuthStore.getState().user?.user_metadata?.note_section_order;
    if (Array.isArray(metaOrder) && metaOrder.length > 0) {
      return metaOrder;
    }
    const raw = localStorage.getItem(SECTION_ORDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSectionOrder(ids: string[], userId?: string) {
  try {
    const effectiveUserId = userId || useAuthStore.getState().user?.id || DEFAULT_USER_ID;
    localStorage.setItem(SECTION_ORDER_STORAGE_KEY, JSON.stringify(ids));
    if (effectiveUserId) {
      localStorage.setItem(`${SECTION_ORDER_STORAGE_KEY}_${effectiveUserId}`, JSON.stringify(ids));
    }
    // Sync to Supabase user metadata if user is authenticated
    const authUser = useAuthStore.getState().user;
    if (authUser && authUser.id && authUser.id !== DEFAULT_USER_ID) {
      supabase.auth.updateUser({
        data: { note_section_order: ids }
      }).catch((err) => {
        console.debug('[Storage] Failed to sync note_section_order to Supabase metadata:', err);
      });
    }
  } catch (e) {
    console.debug('Failed to save section order:', e);
  }
}

function getStoredPageOrder(userId?: string): string[] {
  try {
    const effectiveUserId = userId || useAuthStore.getState().user?.id;
    if (effectiveUserId) {
      const userRaw = localStorage.getItem(`${PAGE_ORDER_STORAGE_KEY}_${effectiveUserId}`);
      if (userRaw) {
        const parsed = JSON.parse(userRaw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
    const metaOrder = useAuthStore.getState().user?.user_metadata?.note_page_order;
    if (Array.isArray(metaOrder) && metaOrder.length > 0) {
      return metaOrder;
    }
    const raw = localStorage.getItem(PAGE_ORDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePageOrder(ids: string[], userId?: string) {
  try {
    const effectiveUserId = userId || useAuthStore.getState().user?.id || DEFAULT_USER_ID;
    localStorage.setItem(PAGE_ORDER_STORAGE_KEY, JSON.stringify(ids));
    if (effectiveUserId) {
      localStorage.setItem(`${PAGE_ORDER_STORAGE_KEY}_${effectiveUserId}`, JSON.stringify(ids));
    }
    const authUser = useAuthStore.getState().user;
    if (authUser && authUser.id && authUser.id !== DEFAULT_USER_ID) {
      supabase.auth.updateUser({
        data: { note_page_order: ids }
      }).catch((err) => {
        console.debug('[Storage] Failed to sync note_page_order to Supabase metadata:', err);
      });
    }
  } catch (e) {
    console.debug('Failed to save page order:', e);
  }
}

function sortSectionsByStoredOrder(sections: NoteSection[], userId?: string): NoteSection[] {
  const order = getStoredSectionOrder(userId);
  if (order.length === 0) return sections;

  const orderMap = new Map<string, number>();
  order.forEach((id, index) => orderMap.set(id, index));

  return [...sections].sort((a, b) => {
    const indexA = orderMap.has(a.id) ? (orderMap.get(a.id) as number) : 9999;
    const indexB = orderMap.has(b.id) ? (orderMap.get(b.id) as number) : 9999;
    if (indexA !== indexB) return indexA - indexB;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

function sortPagesByStoredOrder(pages: NotePage[], userId?: string): NotePage[] {
  const order = getStoredPageOrder(userId);
  if (order.length === 0) return pages;

  const orderMap = new Map<string, number>();
  order.forEach((id, index) => orderMap.set(id, index));

  return [...pages].sort((a, b) => {
    const indexA = orderMap.has(a.id) ? (orderMap.get(a.id) as number) : 9999;
    const indexB = orderMap.has(b.id) ? (orderMap.get(b.id) as number) : 9999;
    if (indexA !== indexB) return indexA - indexB;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

interface NoteState {
  sections: NoteSection[];
  pages: NotePage[];
  relations: NoteLinkRelation[];
  deletedItems: DeletedNoteItem[];
  activeSectionId: string | null;
  activePageId: string | null;
  isLoading: boolean;
  
  // Offline-first Sync Status map
  pageSyncStatuses: Record<string, 'synced' | 'pending' | 'conflict'>;
  resolveConflict: (pageId: string, resolution: 'local' | 'remote') => Promise<void>;
  syncPendingQueue: () => Promise<void>;
  getLocalRevisions: (pageId: string) => Promise<unknown[]>;
  restoreRevision: (pageId: string, revisionId: number) => Promise<void>;
  
  fetchNotes: (userId?: string) => Promise<void>;
  addSection: (nome: string, userId?: string) => Promise<NoteSection>;
  updateSection: (id: string, nome: string) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  reorderSections: (newSections: NoteSection[]) => void;
  moveSection: (id: string, direction: 'up' | 'down') => void;
  
  addPage: (titulo: string, sectionId: string, userId: string, parentId?: string | null) => Promise<NotePage | null>;
  updatePage: (id: string, updates: Partial<NotePage>) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  reorderPages: (newPages: NotePage[]) => void;
  movePage: (id: string, direction: 'up' | 'down') => void;
  
  // Trash and Recovery actions
  restoreItem: (id: string) => Promise<void>;
  restoreLastDeleted: () => Promise<void>;
  permanentlyDelete: (id: string) => void;
  emptyTrash: () => void;
  
  setActiveSectionId: (id: string | null) => void;
  setActivePageId: (id: string | null) => void;
}

const getUserCacheKey = (userId: string, baseKey: string) => {
  return `meuhub_user_${userId}_${baseKey}`;
};

const activeAbortControllers = new Map<string, AbortController>();

export const useNoteStore = create<NoteState>((set, get) => ({
  sections: sortSectionsByStoredOrder(DEFAULT_SECTIONS),
  pages: sortPagesByStoredOrder(DEFAULT_PAGES),
  relations: [],
  deletedItems: getStoredTrash(),
  activeSectionId: sanitizeUuid(getStoredActiveSectionId()) || DEFAULT_SECTION_ID,
  activePageId: sanitizeUuid(getStoredActivePageId()) || DEFAULT_PAGE_ID,
  isLoading: false,
  pageSyncStatuses: {},

  resolveConflict: async (pageId, resolution) => {
    const localPage = await offlineDb.pages.get(pageId);
    if (!localPage) return;

    if (resolution === 'local') {
      // Force local version as correct, clear conflict status, increment version to push
      await offlineDb.pages.update(pageId, { syncStatus: 'pending', localVersion: localPage.localVersion + 1 });
      set((state) => ({
        pageSyncStatuses: { ...state.pageSyncStatuses, [pageId]: 'pending' }
      }));
      // Remove any existing sync queue items for this page to prevent conflicts
      const existing = await offlineDb.syncQueue.where('pageId').equals(pageId).toArray();
      for (const item of existing) {
        if (item.id) await offlineDb.syncQueue.delete(item.id);
      }
      // Insert new update action
      await offlineDb.syncQueue.add({
        pageId,
        action: 'update',
        payload: {
          titulo: localPage.titulo,
          conteudo: localPage.conteudo,
          section_id: localPage.section_id,
          parent_id: localPage.parent_id
        },
        timestamp: Date.now(),
        attempts: 0
      });
      toast.success('Versão local selecionada! Enviando atualizações para a nuvem.');
      get().syncPendingQueue().catch(console.error);
    } else {
      // Keep remote version. Fetch from Supabase, decrypt, and apply to local state
      try {
        const { data: remotePage, error } = await supabase
          .from('note_pages')
          .select('*')
          .eq('id', pageId)
          .single();

        if (error) throw error;

        let decryptedContent = null;
        if (remotePage.conteudo) {
          decryptedContent = await decryptNoteContent(remotePage.conteudo);
        }

        const updatedPage: NotePage = {
          ...remotePage,
          conteudo: decryptedContent
        };

        // Update local memory state
        const updatedPages = get().pages.map(p => p.id === pageId ? updatedPage : p);
        set({ pages: updatedPages });
        setCached(getUserCacheKey(localPage.user_id, 'note_pages'), updatedPages);

        // Update Dexie database
        await offlineDb.pages.put({
          ...updatedPage,
          localVersion: localPage.localVersion + 1,
          remoteVersion: localPage.localVersion + 1,
          syncStatus: 'synced',
          lastUpdatedAt: Date.now()
        });

        set((state) => ({
          pageSyncStatuses: { ...state.pageSyncStatuses, [pageId]: 'synced' }
        }));

        // Clean any sync queue item for this page
        const existing = await offlineDb.syncQueue.where('pageId').equals(pageId).toArray();
        for (const item of existing) {
          if (item.id) await offlineDb.syncQueue.delete(item.id);
        }

        toast.success('Versão remota restaurada com sucesso!');
      } catch (err) {
        console.error('Failed to resolve conflict with remote version:', err);
        toast.error('Não foi possível obter a versão remota do servidor.');
      }
    }
  },

  syncPendingQueue: async () => {
    if (!navigator.onLine) return;

    if (isSyncingQueue) return;
    isSyncingQueue = true;

    try {
      // Run automatic audit & self-repair before syncing (de-duplicates rapid edits, removes dead-letter retries, cleans orphans)
      await auditAndRepairSyncQueue();

      const queue = await offlineDb.syncQueue.toArray();
      if (queue.length === 0) return;

      for (const item of queue) {
        const { id, pageId, action, payload } = item;
        const cleanPageId = sanitizeUuid(pageId);
        if (!cleanPageId || !isValidUuid(cleanPageId)) {
          if (id) await offlineDb.syncQueue.delete(id);
          continue;
        }

        try {
          const localPage = (await offlineDb.pages.get(cleanPageId)) || (await offlineDb.pages.get(pageId));
          if (!localPage && action !== 'delete') {
            // If no local page, clean the orphaned queue item
            if (id) await offlineDb.syncQueue.delete(id);
            continue;
          }

          if (localPage && localPage.syncStatus === 'conflict') {
            // Skip syncing if in conflict, wait for manual resolution
            continue;
          }

          // 1. Encryption & Supabase Sync
          const updatePayload = { ...payload } as Record<string, unknown>;
          delete updatePayload.version;
          updatePayload.id = cleanPageId;

          if (updatePayload.section_id) {
            updatePayload.section_id = sanitizeUuid(updatePayload.section_id as string);
          }
          if (updatePayload.parent_id !== undefined) {
            updatePayload.parent_id = sanitizeUuidOrNull(updatePayload.parent_id as string);
          }

          if (updatePayload.conteudo) {
            updatePayload.conteudo = await sanitizeAndEncryptNoteContent(updatePayload.conteudo);
          }

          let dbError = null;
          if (action === 'update') {
            const { error, count } = await supabase.from('note_pages').update(updatePayload).eq('id', cleanPageId);
            dbError = error;

            // If updated 0 rows and no error, the page may have been created offline or missed insert. Upsert it!
            if (!error && count === 0 && localPage) {
              const upsertData = {
                id: cleanPageId,
                titulo: localPage.titulo,
                conteudo: updatePayload.conteudo || (localPage.conteudo ? await sanitizeAndEncryptNoteContent(localPage.conteudo) : null),
                section_id: sanitizeUuid(localPage.section_id),
                parent_id: sanitizeUuidOrNull(localPage.parent_id),
                user_id: localPage.user_id,
                created_at: localPage.created_at || new Date().toISOString()
              };
              const { error: upsertErr } = await supabase.from('note_pages').upsert([upsertData]);
              dbError = upsertErr;
            }
          } else if (action === 'create') {
            const { error } = await supabase.from('note_pages').upsert([updatePayload]);
            dbError = error;
          } else if (action === 'delete') {
            const { error } = await supabase.from('note_pages').delete().eq('id', cleanPageId);
            dbError = error;
          }

          if (dbError) {
            const postgrestErr = dbError as { code?: string; message?: string };
            const errCode = postgrestErr?.code;
            const errMsg = String(postgrestErr?.message || '');
            if (errCode === '22P02' || errMsg.includes('22P02') || errMsg.includes('invalid input syntax for type uuid')) {
              console.warn(`[Sync] Dropping invalid UUID queue item ${id} due to 22P02:`, dbError);
              if (id) await offlineDb.syncQueue.delete(id);
              continue;
            }
            throw dbError;
          }

          // 2. Clear Queue Item and Mark Synced
          if (id) await offlineDb.syncQueue.delete(id);
          
          if (localPage) {
            await offlineDb.pages.update(localPage.id, {
              syncStatus: 'synced',
              remoteVersion: localPage.localVersion
            });

            set((state) => ({
              pageSyncStatuses: {
                ...state.pageSyncStatuses,
                [cleanPageId]: 'synced',
                [pageId]: 'synced'
              }
            }));
          }

        } catch (err) {
          console.debug(`Silent background sync retry for page ${pageId}:`, err);
          if (id) {
            await offlineDb.syncQueue.update(id, { attempts: item.attempts + 1 });
          }
        }
      }
    } finally {
      isSyncingQueue = false;
    }
  },

  getLocalRevisions: async (pageId) => {
    return await offlineDb.revisions.where('pageId').equals(pageId).reverse().toArray();
  },

  restoreRevision: async (pageId, revisionId) => {
    const revision = await offlineDb.revisions.get(revisionId);
    if (!revision || revision.pageId !== pageId) {
      toast.error('Revisão não encontrada.');
      return;
    }

    await get().updatePage(pageId, {
      titulo: revision.titulo,
      conteudo: revision.conteudo
    });
    toast.success('Revisão restaurada com sucesso!');
  },

  fetchNotes: async (userId?: string) => {
    const targetUserId = userId || DEFAULT_USER_ID;
    const currentPages = get().pages;
    const currentSections = get().sections;
    const hasDataInMemory = currentPages.length > 0 && currentSections.length > 0;
    
    // Instantly load specific user cached pages/sections/relations if memory is empty
    const sectionsKey = getUserCacheKey(targetUserId, 'note_sections');
    const pagesKey = getUserCacheKey(targetUserId, 'note_pages');
    const relationsKey = getUserCacheKey(targetUserId, 'note_relations');
    
    if (!hasDataInMemory) {
      const rawCachedSections = getCached<NoteSection[]>(sectionsKey, targetUserId === DEFAULT_USER_ID ? DEFAULT_SECTIONS : []);
      const cachedSections = sortSectionsByStoredOrder(rawCachedSections, targetUserId);
      const rawCachedPages = getCached<NotePage[]>(pagesKey, targetUserId === DEFAULT_USER_ID ? DEFAULT_PAGES : []);
      const cachedPages = sortPagesByStoredOrder(rawCachedPages, targetUserId);
      const cachedRelations = getCached<NoteLinkRelation[]>(relationsKey, []);
      
      // Determine active page & section
      const storedPageId = getStoredActivePageId();
      const storedSectionId = getStoredActiveSectionId();

      const targetPageId = storedPageId && cachedPages.some(p => p.id === storedPageId)
        ? storedPageId
        : (cachedPages.length > 0 ? cachedPages[0].id : null);
        
      const targetSectionId = storedSectionId && cachedSections.some(s => s.id === storedSectionId)
        ? storedSectionId
        : (cachedSections.length > 0 ? cachedSections[0].id : null);

      const hasCachedData = cachedPages.length > 0 || cachedSections.length > 0;

      set({
        sections: cachedSections,
        pages: cachedPages,
        relations: cachedRelations,
        activePageId: targetPageId,
        activeSectionId: targetSectionId,
        // Only show spinner on cold start when no cached data exists
        isLoading: !hasCachedData
      });
    }

    try {
      // Use a timeout race so database queries never hang indefinitely
      const queryPromise = Promise.all([
        supabase.from('note_sections').select('*').eq('user_id', targetUserId).order('created_at', { ascending: true }),
        supabase.from('note_pages').select('*').eq('user_id', targetUserId).order('created_at', { ascending: true }),
        supabase.from('note_link_relations').select('*')
      ]);

      const timeoutPromise = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 3000)
      );

      const result = await Promise.race([queryPromise, timeoutPromise]);

      if (result) {
        const [sectionsRes, pagesRes, relRes] = result;

        const rawSections = (sectionsRes.data as NoteSection[]) || [];
        const rawPagesData = (pagesRes.data as NotePage[]) || [];

        let loadedSections: NoteSection[] = [];
        let loadedPages: NotePage[] = [];

        if (rawSections.length > 0) {
          loadedSections = sortSectionsByStoredOrder(rawSections, targetUserId);
        } else {
          // If Supabase returned empty and we are guest/official, use cached or defaults with stored sort order
          const fallbackSections = targetUserId === DEFAULT_USER_ID ? DEFAULT_SECTIONS : (get().sections.length > 0 ? get().sections : []);
          loadedSections = sortSectionsByStoredOrder(fallbackSections, targetUserId);
        }

        if (rawPagesData.length > 0) {
          // Quickly process pages without blocking the UI thread
          const decryptedPages = await Promise.all(rawPagesData.map(async p => {
            const rawContent = p.conteudo;
            let finalContent = rawContent || '[]';
            if (rawContent) {
              try {
                finalContent = await decryptNoteContent(rawContent);
              } catch (e) {
                console.warn('Error decrypting note page content:', e);
              }
            }
            return {
              ...p,
              conteudo: finalContent
            };
          }));
          loadedPages = sortPagesByStoredOrder(decryptedPages, targetUserId);
        } else {
          const fallbackPages = targetUserId === DEFAULT_USER_ID ? DEFAULT_PAGES : (get().pages.length > 0 ? get().pages : []);
          loadedPages = sortPagesByStoredOrder(fallbackPages, targetUserId);
        }

        // Sanitize page section_id and parent_id
        const validSectionIds = new Set(loadedSections.map(s => s.id));
        const validPageIds = new Set(loadedPages.map(p => p.id));
        const fallbackSectionId = loadedSections.length > 0 ? loadedSections[0].id : null;

        const sanitizedPages = loadedPages.map(p => {
          let cleanParentId = p.parent_id;
          let cleanSectionId = p.section_id;

          if (!cleanParentId || cleanParentId === 'null' || cleanParentId === 'undefined' || !validPageIds.has(cleanParentId)) {
            cleanParentId = null;
          }

          if ((!cleanSectionId || (validSectionIds.size > 0 && !validSectionIds.has(cleanSectionId))) && fallbackSectionId) {
            cleanSectionId = fallbackSectionId;
          }

          return {
            ...p,
            parent_id: cleanParentId,
            section_id: cleanSectionId
          };
        });

        // Determine active page and section while preserving currently open page
        const currentActivePageId = get().activePageId;
        const currentActiveSectionId = get().activeSectionId;
        const storedPageIdCurrent = getStoredActivePageId();
        const storedSectionIdCurrent = getStoredActiveSectionId();

        let finalPageId: string | null = null;
        let finalSectionId: string | null = null;

        if (currentActivePageId && sanitizedPages.some(p => p.id === currentActivePageId)) {
          finalPageId = currentActivePageId;
          const page = sanitizedPages.find(p => p.id === currentActivePageId);
          finalSectionId = page?.section_id || currentActiveSectionId;
        } else if (storedPageIdCurrent && sanitizedPages.some(p => p.id === storedPageIdCurrent)) {
          finalPageId = storedPageIdCurrent;
          const page = sanitizedPages.find(p => p.id === storedPageIdCurrent);
          finalSectionId = page?.section_id || null;
        } else if (currentActiveSectionId && loadedSections.some(s => s.id === currentActiveSectionId)) {
          finalSectionId = currentActiveSectionId;
          const firstPage = sanitizedPages.find(p => p.section_id === finalSectionId);
          finalPageId = firstPage?.id || (sanitizedPages.length > 0 ? sanitizedPages[0].id : null);
        } else if (storedSectionIdCurrent && loadedSections.some(s => s.id === storedSectionIdCurrent)) {
          finalSectionId = storedSectionIdCurrent;
          const firstPage = sanitizedPages.find(p => p.section_id === finalSectionId);
          finalPageId = firstPage?.id || (sanitizedPages.length > 0 ? sanitizedPages[0].id : null);
        } else if (loadedSections.length > 0) {
          finalSectionId = loadedSections[0].id;
          const firstPage = sanitizedPages.find(p => p.section_id === finalSectionId);
          finalPageId = firstPage?.id || (sanitizedPages.length > 0 ? sanitizedPages[0].id : null);
        }

        if (finalPageId) saveActivePageId(finalPageId);
        if (finalSectionId) saveActiveSectionId(finalSectionId);

        // Reconcile and merge fetched Supabase pages with Dexie IndexedDB
        let reconciledPages = sanitizedPages;
        try {
          const localDexiePages = await offlineDb.pages.toArray();
          const dexieMap = new Map(localDexiePages.map(p => [p.id, p]));
          const pendingQueue = await offlineDb.syncQueue.toArray();
          const pendingPageIds = new Set(pendingQueue.map(item => item.pageId));
          const initialSyncStatuses: Record<string, 'synced' | 'pending' | 'conflict'> = {};

          reconciledPages = sanitizedPages.map(p => {
            const localMatch = dexieMap.get(p.id);
            const isPendingSync = pendingPageIds.has(p.id);

            if (localMatch) {
              initialSyncStatuses[p.id] = isPendingSync ? 'pending' : localMatch.syncStatus;
              // NEVER overwrite pages that have pending offline changes or edits in progress!
              if (isPendingSync || localMatch.syncStatus === 'pending' || localMatch.syncStatus === 'conflict') {
                return {
                  ...p,
                  titulo: localMatch.titulo,
                  conteudo: localMatch.conteudo
                };
              }
              if (localMatch.conteudo !== p.conteudo || localMatch.titulo !== p.titulo) {
                offlineDb.pages.update(p.id, {
                  titulo: p.titulo,
                  conteudo: p.conteudo,
                  lastUpdatedAt: Date.now()
                });
              }
              return p;
            } else {
              offlineDb.pages.put({
                ...p,
                localVersion: 1,
                remoteVersion: 1,
                syncStatus: 'synced',
                lastUpdatedAt: Date.now()
              });
              initialSyncStatuses[p.id] = 'synced';
              return p;
            }
          });

          set({ pageSyncStatuses: initialSyncStatuses });
        } catch (err) {
          console.error('Dexie reconciliation failed inside fetchNotes:', err);
        }

        setCached(sectionsKey, loadedSections);
        setCached(pagesKey, reconciledPages);
        if (relRes?.data) setCached(relationsKey, relRes.data);

        set({
          sections: loadedSections,
          pages: reconciledPages,
          relations: relRes?.data || get().relations,
          deletedItems: getStoredTrash(),
          activePageId: finalPageId,
          activeSectionId: finalSectionId,
        });

        get().syncPendingQueue().catch(console.error);
      }
    } catch (error) {
      console.warn('Fetch notes network issue:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addSection: async (nome, userId) => {
    const fallbackUserId = userId || DEFAULT_USER_ID;
    const newSectionId = generateUuid();
    const newSection: NoteSection = {
      id: newSectionId,
      nome,
      user_id: fallbackUserId,
      created_at: new Date().toISOString()
    };

    const currentSections = get().sections;
    const updatedSections = [...currentSections, newSection];
    saveSectionOrder(updatedSections.map(s => s.id), fallbackUserId);
    setCached(getUserCacheKey(fallbackUserId, 'note_sections'), updatedSections);

    set({ sections: updatedSections });
    get().setActiveSectionId(newSection.id);
    toast.success('Seção criada!');

    try {
      const { data, error } = await supabase
        .from('note_sections')
        .insert([{ id: newSectionId, nome, user_id: fallbackUserId }])
        .select()
        .single();

      if (!error && data) {
        const syncedSections = get().sections.map(s => s.id === newSection.id ? data : s);
        saveSectionOrder(syncedSections.map(s => s.id), fallbackUserId);
        setCached(getUserCacheKey(fallbackUserId, 'note_sections'), syncedSections);
        set({ sections: syncedSections, activeSectionId: data.id });
        return data;
      }
    } catch (e) {
      console.debug('Section saved locally, background sync pending:', e);
    }
    return newSection;
  },

  updateSection: async (id, nome) => {
    const cleanId = sanitizeUuid(id);
    const section = get().sections.find(s => s.id === cleanId || s.id === id);
    const userId = section ? section.user_id : DEFAULT_USER_ID;

    const updated = get().sections.map(s => (s.id === cleanId || s.id === id) ? { ...s, id: cleanId, nome } : s);
    setCached(getUserCacheKey(userId, 'note_sections'), updated);
    set({ sections: updated });

    try {
      await supabase.from('note_sections').update({ nome }).eq('id', cleanId);
    } catch (e) {
      console.debug('Section updated locally:', e);
    }
  },

  deleteSection: async (id) => {
    const cleanId = sanitizeUuid(id);
    const state = get();
    const sectionToDelete = state.sections.find(s => s.id === cleanId || s.id === id);
    if (!sectionToDelete) return;

    const userId = sectionToDelete.user_id;
    const pagesToDelete = state.pages.filter(p => p.section_id === cleanId || p.section_id === id);

    const trashItem: DeletedNoteItem = {
      id: sectionToDelete.id,
      type: 'section',
      title: sectionToDelete.nome,
      deletedAt: new Date().toISOString(),
      sectionData: sectionToDelete,
      sectionPages: pagesToDelete
    };

    const nextTrash = [trashItem, ...state.deletedItems.filter(item => item.id !== cleanId && item.id !== id)];
    saveTrashToStorage(nextTrash);

    const remainingSections = state.sections.filter(s => s.id !== cleanId && s.id !== id);
    saveSectionOrder(remainingSections.map(s => s.id));
    setCached(getUserCacheKey(userId, 'note_sections'), remainingSections);

    const remainingPages = state.pages.filter(p => p.section_id !== cleanId && p.section_id !== id);
    savePageOrder(remainingPages.map(p => p.id));
    setCached(getUserCacheKey(userId, 'note_pages'), remainingPages);

    const isCurrentActiveSection = state.activeSectionId === cleanId || state.activeSectionId === id;
    const isCurrentActivePage = pagesToDelete.some(p => p.id === state.activePageId);

    if (isCurrentActiveSection) {
      const nextSecId = remainingSections.length > 0 ? remainingSections[0].id : null;
      saveActiveSectionId(nextSecId);
    }
    if (isCurrentActivePage) {
      const nextPage = remainingPages.find(p => p.section_id === (remainingSections.length > 0 ? remainingSections[0].id : ''));
      saveActivePageId(nextPage?.id || null);
    }

    set(st => ({
      sections: remainingSections,
      pages: remainingPages,
      deletedItems: nextTrash,
      activeSectionId: isCurrentActiveSection ? (remainingSections.length > 0 ? remainingSections[0].id : null) : st.activeSectionId,
      activePageId: isCurrentActivePage ? (remainingPages.length > 0 ? remainingPages[0].id : null) : st.activePageId
    }));

    try {
      await supabase.from('note_sections').delete().eq('id', cleanId);
    } catch (e) {
      console.debug('Section deleted locally:', e);
    }

    toast('Seção enviada para a Lixeira', {
      description: `"${sectionToDelete.nome}" e suas notas associadas.`,
      duration: 6000,
      action: {
        label: 'Desfazer',
        onClick: () => {
          get().restoreItem(sectionToDelete.id);
        }
      }
    });
  },

  reorderSections: (newSections: NoteSection[]) => {
    const ids = newSections.map(s => s.id);
    const effectiveUserId = useAuthStore.getState().user?.id || DEFAULT_USER_ID;
    saveSectionOrder(ids, effectiveUserId);
    setCached(getUserCacheKey(effectiveUserId, 'note_sections'), newSections);
    newSections.forEach(s => {
      if (s.user_id && s.user_id !== effectiveUserId) {
        setCached(getUserCacheKey(s.user_id, 'note_sections'), newSections);
      }
    });
    set({ sections: newSections });
  },

  moveSection: (id: string, direction: 'up' | 'down') => {
    const { sections } = get();
    const index = sections.findIndex(s => s.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newSections = [...sections];
    const [removed] = newSections.splice(index, 1);
    newSections.splice(targetIndex, 0, removed);

    const ids = newSections.map(s => s.id);
    const effectiveUserId = useAuthStore.getState().user?.id || DEFAULT_USER_ID;
    saveSectionOrder(ids, effectiveUserId);
    setCached(getUserCacheKey(effectiveUserId, 'note_sections'), newSections);
    newSections.forEach(s => {
      if (s.user_id && s.user_id !== effectiveUserId) {
        setCached(getUserCacheKey(s.user_id, 'note_sections'), newSections);
      }
    });
    set({ sections: newSections });
  },

  addPage: async (titulo, sectionId, userId, parentId = null) => {
    const fallbackUserId = userId || DEFAULT_USER_ID;
    const cleanSectionId = sanitizeUuid(sectionId);
    const cleanParentId = sanitizeUuidOrNull(parentId);
    const newPageId = generateUuid();

    const initialContent = JSON.stringify([
      {
        id: `block_${Date.now()}`,
        x: 40,
        y: 40,
        width: 600,
        height: 'auto',
        type: 'text',
        content: `<p></p>`
      }
    ]);

    const newPage: NotePage = {
      id: newPageId,
      titulo,
      conteudo: initialContent,
      section_id: cleanSectionId,
      parent_id: cleanParentId,
      user_id: fallbackUserId,
      created_at: new Date().toISOString()
    };

    saveActivePageId(newPage.id);
    saveActiveSectionId(cleanSectionId);

    const currentPages = get().pages;
    const updatedPages = [...currentPages, newPage];
    savePageOrder(updatedPages.map(p => p.id));
    setCached(getUserCacheKey(fallbackUserId, 'note_pages'), updatedPages);

    set({ pages: updatedPages, activePageId: newPage.id, activeSectionId: cleanSectionId });
    toast.success('Página criada!');

    // Register inside IndexedDB
    try {
      await offlineDb.pages.put({
        ...newPage,
        localVersion: 1,
        remoteVersion: 0,
        syncStatus: 'pending',
        lastUpdatedAt: Date.now()
      });

      await offlineDb.revisions.add({
        pageId: newPage.id,
        version: 1,
        titulo: newPage.titulo,
        conteudo: newPage.conteudo,
        timestamp: Date.now()
      });

      await offlineDb.syncQueue.add({
        pageId: newPage.id,
        action: 'create',
        payload: {
          id: newPage.id,
          titulo,
          section_id: cleanSectionId,
          parent_id: cleanParentId,
          user_id: fallbackUserId,
          conteudo: initialContent
        },
        timestamp: Date.now(),
        attempts: 0
      });

      set((state) => ({
        pageSyncStatuses: { ...state.pageSyncStatuses, [newPage.id]: 'pending' }
      }));

      get().syncPendingQueue().catch(console.error);
    } catch (e) {
      console.error('Dexie add page failed:', e);
    }

    return newPage;
  },

  updatePage: async (id, updates) => {
    const cleanId = sanitizeUuid(id);
    if (activeAbortControllers.has(cleanId)) {
      activeAbortControllers.get(cleanId)?.abort();
      activeAbortControllers.delete(cleanId);
    }
    const controller = new AbortController();
    activeAbortControllers.set(cleanId, controller);

    const cleanUpdates = { ...updates };
    if (cleanUpdates.section_id) {
      cleanUpdates.section_id = sanitizeUuid(cleanUpdates.section_id);
    }
    if (cleanUpdates.parent_id !== undefined) {
      cleanUpdates.parent_id = sanitizeUuidOrNull(cleanUpdates.parent_id);
    }

    const page = get().pages.find(p => p.id === cleanId || p.id === id);
    const userId = page ? page.user_id : DEFAULT_USER_ID;

    // Schema Validation with Zod
    if (cleanUpdates.conteudo) {
      try {
        const validated = validateAndSanitizeBlocks(cleanUpdates.conteudo);
        cleanUpdates.conteudo = JSON.stringify(validated);
      } catch (err) {
        console.error('Zod schema validation failed on updatePage:', err);
        toast.error('Falha na validação de dados antes de salvar.');
        return;
      }
    }

    const previousPages = get().pages;
    const updatedPages = get().pages.map(p => (p.id === cleanId || p.id === id) ? { ...p, ...cleanUpdates, id: cleanId } : p);
    setCached(getUserCacheKey(userId, 'note_pages'), updatedPages);
    set({ pages: updatedPages });

    try {
      const localPage = (await offlineDb.pages.get(cleanId)) || (await offlineDb.pages.get(id));
      const currentLocalVersion = localPage ? localPage.localVersion + 1 : 1;
      const currentRemoteVersion = localPage ? localPage.remoteVersion : 0;

      const pageData: NotePage = {
        id: cleanId,
        titulo: cleanUpdates.titulo ?? (page?.titulo || ''),
        conteudo: cleanUpdates.conteudo ?? (page?.conteudo || null),
        section_id: cleanUpdates.section_id ?? (page?.section_id ? sanitizeUuid(page.section_id) : ''),
        parent_id: cleanUpdates.parent_id !== undefined ? cleanUpdates.parent_id : (page?.parent_id ? sanitizeUuidOrNull(page.parent_id) : null),
        user_id: userId,
        created_at: page?.created_at || new Date().toISOString()
      };

      await offlineDb.revisions.add({
        pageId: cleanId,
        version: currentLocalVersion,
        titulo: pageData.titulo,
        conteudo: pageData.conteudo,
        timestamp: Date.now()
      });

      await offlineDb.pages.put({
        ...pageData,
        localVersion: currentLocalVersion,
        remoteVersion: currentRemoteVersion,
        syncStatus: 'pending',
        lastUpdatedAt: Date.now()
      });

      set((state) => ({
        pageSyncStatuses: { ...state.pageSyncStatuses, [cleanId]: 'pending', [id]: 'pending' }
      }));

      await offlineDb.syncQueue.add({
        pageId: cleanId,
        action: 'update',
        payload: { ...cleanUpdates, id: cleanId, version: currentLocalVersion },
        timestamp: Date.now(),
        attempts: 0
      });

      get().syncPendingQueue().catch((err) => {
        console.debug('Sync postponed:', err);
      });

    } catch (e) {
      console.error('Dexie database update failed, rolling back:', e);
      setCached(getUserCacheKey(userId, 'note_pages'), previousPages);
      set({ pages: previousPages });
      throw e;
    } finally {
      if (activeAbortControllers.get(cleanId) === controller) {
        activeAbortControllers.delete(cleanId);
      }
    }
  },

  deletePage: async (id) => {
    const cleanId = sanitizeUuid(id);
    const state = get();
    const pageToDelete = state.pages.find(p => p.id === cleanId || p.id === id);
    if (!pageToDelete) return;

    const userId = pageToDelete.user_id;

    const getSubpages = (pageId: string): NotePage[] => {
      const children = state.pages.filter(p => p.parent_id === pageId);
      let all: NotePage[] = [...children];
      for (const child of children) {
        all = [...all, ...getSubpages(child.id)];
      }
      return all;
    };
    const subpagesToDelete = getSubpages(pageToDelete.id);
    const allPagesToDelete = [pageToDelete, ...subpagesToDelete];

    const trashItem: DeletedNoteItem = {
      id: pageToDelete.id,
      type: 'page',
      title: pageToDelete.titulo,
      deletedAt: new Date().toISOString(),
      pageData: pageToDelete,
      subpages: subpagesToDelete
    };

    const nextTrash = [trashItem, ...state.deletedItems.filter(item => item.id !== cleanId && item.id !== id)];
    saveTrashToStorage(nextTrash);

    const remainingPages = state.pages.filter(p => !allPagesToDelete.some(dp => dp.id === p.id));
    savePageOrder(remainingPages.map(p => p.id));
    setCached(getUserCacheKey(userId, 'note_pages'), remainingPages);

    const isCurrentActivePage = state.activePageId === cleanId || state.activePageId === id || allPagesToDelete.some(dp => dp.id === state.activePageId);
    if (isCurrentActivePage) {
      const fallbackPage = remainingPages.find(p => p.section_id === pageToDelete.section_id) || (remainingPages.length > 0 ? remainingPages[0] : null);
      saveActivePageId(fallbackPage?.id || null);
    }

    set({
      pages: remainingPages,
      deletedItems: nextTrash,
      activePageId: isCurrentActivePage ? (remainingPages.length > 0 ? remainingPages[0].id : null) : state.activePageId
    });

    try {
      for (const p of allPagesToDelete) {
        const cId = sanitizeUuid(p.id);
        await offlineDb.pages.delete(p.id);
        if (cId !== p.id) await offlineDb.pages.delete(cId);
        await offlineDb.syncQueue.add({
          pageId: cId,
          action: 'delete',
          payload: { id: cId },
          timestamp: Date.now(),
          attempts: 0
        });
      }
      get().syncPendingQueue().catch(console.error);
    } catch (e) {
      console.error('Dexie queue delete failed:', e);
    }

    toast('Anotação enviada para a Lixeira', {
      description: `"${pageToDelete.titulo}"`,
      duration: 6000,
      action: {
        label: 'Desfazer',
        onClick: () => {
          get().restoreItem(pageToDelete.id);
        }
      }
    });
  },

  reorderPages: (newPages: NotePage[]) => {
    const ids = newPages.map(p => p.id);
    const effectiveUserId = useAuthStore.getState().user?.id || DEFAULT_USER_ID;
    savePageOrder(ids, effectiveUserId);
    setCached(getUserCacheKey(effectiveUserId, 'note_pages'), newPages);
    newPages.forEach(p => {
      if (p.user_id && p.user_id !== effectiveUserId) {
        setCached(getUserCacheKey(p.user_id, 'note_pages'), newPages);
      }
    });
    set({ pages: newPages });
  },

  movePage: (id: string, direction: 'up' | 'down') => {
    const { pages } = get();
    const targetPage = pages.find(p => p.id === id);
    if (!targetPage) return;

    const siblings = pages.filter(
      p => p.section_id === targetPage.section_id && p.parent_id === targetPage.parent_id
    );
    const siblingIndex = siblings.findIndex(p => p.id === id);
    if (siblingIndex === -1) return;
    if (direction === 'up' && siblingIndex === 0) return;
    if (direction === 'down' && siblingIndex === siblings.length - 1) return;

    const swapSiblingIndex = direction === 'up' ? siblingIndex - 1 : siblingIndex + 1;
    const swapSibling = siblings[swapSiblingIndex];

    const mainIndexA = pages.findIndex(p => p.id === targetPage.id);
    const mainIndexB = pages.findIndex(p => p.id === swapSibling.id);
    if (mainIndexA === -1 || mainIndexB === -1) return;

    const newPages = [...pages];
    const [removed] = newPages.splice(mainIndexA, 1);
    newPages.splice(mainIndexB, 0, removed);

    const ids = newPages.map(p => p.id);
    const effectiveUserId = useAuthStore.getState().user?.id || DEFAULT_USER_ID;
    savePageOrder(ids, effectiveUserId);
    setCached(getUserCacheKey(effectiveUserId, 'note_pages'), newPages);
    newPages.forEach(p => {
      if (p.user_id && p.user_id !== effectiveUserId) {
        setCached(getUserCacheKey(p.user_id, 'note_pages'), newPages);
      }
    });
    set({ pages: newPages });
  },

  restoreItem: async (id: string) => {
    const state = get();
    const itemToRestore = state.deletedItems.find(item => item.id === id);
    if (!itemToRestore) {
      toast.error('Item não encontrado na lixeira.');
      return;
    }

    try {
      if (itemToRestore.type === 'section' && itemToRestore.sectionData) {
        const section = itemToRestore.sectionData;
        const pages = itemToRestore.sectionPages || [];

        const remainingTrash = state.deletedItems.filter(item => item.id !== id);
        saveTrashToStorage(remainingTrash);
        saveActiveSectionId(section.id);

        const updatedSections = state.sections.some(s => s.id === section.id) ? state.sections : [...state.sections, section];
        saveSectionOrder(updatedSections.map(s => s.id));
        setCached(CACHE_KEYS.SECTIONS, updatedSections);

        const updatedPages = [
          ...state.pages.filter(p => !pages.some(rp => rp.id === p.id)),
          ...pages
        ];
        savePageOrder(updatedPages.map(p => p.id));
        setCached(CACHE_KEYS.PAGES, updatedPages);

        set({
          sections: updatedSections,
          pages: updatedPages,
          deletedItems: remainingTrash,
          activeSectionId: section.id
        });

        toast.success(`Seção "${section.nome}" restaurada com sucesso!`);

        try {
          const cleanSection = { ...section, id: sanitizeUuid(section.id) };
          await supabase.from('note_sections').upsert([cleanSection]);
          if (pages.length > 0) {
            const cleanPages = pages.map(p => ({
              ...p,
              id: sanitizeUuid(p.id),
              section_id: sanitizeUuid(p.section_id),
              parent_id: sanitizeUuidOrNull(p.parent_id)
            }));
            await supabase.from('note_pages').upsert(cleanPages);
          }
        } catch {
          // ignore
        }
      } else if (itemToRestore.type === 'page' && itemToRestore.pageData) {
        const page = itemToRestore.pageData;
        const subpages = itemToRestore.subpages || [];
        const allPages = [page, ...subpages];

        let targetSectionId = page.section_id;
        const sectionExists = state.sections.some(s => s.id === targetSectionId);
        if (!sectionExists) {
          targetSectionId = state.activeSectionId || (state.sections.length > 0 ? state.sections[0].id : DEFAULT_SECTION_ID);
        }

        const normalizedPages = allPages.map(p => ({
          ...p,
          section_id: targetSectionId
        }));

        const remainingTrash = state.deletedItems.filter(item => item.id !== id);
        saveTrashToStorage(remainingTrash);

        saveActivePageId(page.id);
        saveActiveSectionId(targetSectionId);

        const updatedPages = [
          ...state.pages.filter(p => !normalizedPages.some(np => np.id === p.id)),
          ...normalizedPages
        ];
        savePageOrder(updatedPages.map(p => p.id));
        setCached(CACHE_KEYS.PAGES, updatedPages);

        set({
          pages: updatedPages,
          deletedItems: remainingTrash,
          activeSectionId: targetSectionId,
          activePageId: page.id
        });

        toast.success(`Anotação "${page.titulo}" restaurada com sucesso!`);

        try {
          const cleanUpsertPages = normalizedPages.map(p => ({
            ...p,
            id: sanitizeUuid(p.id),
            section_id: sanitizeUuid(p.section_id),
            parent_id: sanitizeUuidOrNull(p.parent_id)
          }));
          await supabase.from('note_pages').upsert(cleanUpsertPages);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('Error restoring item:', err);
      toast.error('Erro ao restaurar anotação.');
    }
  },

  restoreLastDeleted: async () => {
    const { deletedItems, restoreItem } = get();
    if (deletedItems.length === 0) {
      toast.info('Nenhum item recente para restaurar.');
      return;
    }
    await restoreItem(deletedItems[0].id);
  },

  permanentlyDelete: (id: string) => {
    const state = get();
    const nextTrash = state.deletedItems.filter(item => item.id !== id);
    saveTrashToStorage(nextTrash);
    set({ deletedItems: nextTrash });
    toast.success('Item removido da lixeira permanentemente.');
  },

  emptyTrash: () => {
    saveTrashToStorage([]);
    set({ deletedItems: [] });
    toast.success('Lixeira esvaziada.');
  },

  setActiveSectionId: (id) => {
    saveActiveSectionId(id);
    set({ activeSectionId: id });
  },

  setActivePageId: (id) => {
    saveActivePageId(id);
    if (id) {
      const page = get().pages.find(p => p.id === id);
      if (page?.section_id) {
        saveActiveSectionId(page.section_id);
        set({ activePageId: id, activeSectionId: page.section_id });
        return;
      }
    }
    set({ activePageId: id });
  }
}));
