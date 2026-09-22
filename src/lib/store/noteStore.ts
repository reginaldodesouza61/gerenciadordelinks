import { create } from 'zustand';
import { supabase } from '../supabase';
import { NoteSection, NotePage, NoteLinkRelation, DeletedNoteItem } from '@/types/notes';
import { toast } from 'sonner';
import { decryptNoteContent, sanitizeAndEncryptNoteContent } from '@/lib/encryption';
import { offlineDb } from '@/lib/db/offlineDb';
import { validateAndSanitizeBlocks } from '@/lib/validation/blockSchema';
import { auditAndRepairSyncQueue } from '@/lib/storage/syncAudit';

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

export function sanitizeUuid(id: string | null | undefined): string {
  if (!id) return '';
  if (id === 'sec_default_geral_01') return '10000000-0000-0000-0000-000000000001';
  if (id === 'page_default_welcome_01') return '20000000-0000-0000-0000-000000000002';
  if (id === 'sec_default_credenciais_02') return '10000000-0000-0000-0000-000000000002';
  if (id === 'sec_default_dev_03') return '10000000-0000-0000-0000-000000000003';
  return id;
}

export function sanitizeUuidOrNull(id: string | null | undefined): string | null {
  if (!id) return null;
  const cleaned = sanitizeUuid(id);
  if (cleaned === 'null' || cleaned === 'undefined') return null;
  return cleaned;
}

async function migrateLegacyDatabase() {
  try {
    // 1. Migrate LocalStorage active IDs
    const activePage = localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY);
    if (activePage) {
      localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, sanitizeUuid(activePage));
    }
    const activeSec = localStorage.getItem(ACTIVE_SECTION_STORAGE_KEY);
    if (activeSec) {
      localStorage.setItem(ACTIVE_SECTION_STORAGE_KEY, sanitizeUuid(activeSec));
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

function getStoredSectionOrder(): string[] {
  try {
    const raw = localStorage.getItem(SECTION_ORDER_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSectionOrder(ids: string[]) {
  try {
    localStorage.setItem(SECTION_ORDER_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function getStoredPageOrder(): string[] {
  try {
    const raw = localStorage.getItem(PAGE_ORDER_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function savePageOrder(ids: string[]) {
  try {
    localStorage.setItem(PAGE_ORDER_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function sortSectionsByStoredOrder(sections: NoteSection[]): NoteSection[] {
  const order = getStoredSectionOrder();
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

function sortPagesByStoredOrder(pages: NotePage[]): NotePage[] {
  const order = getStoredPageOrder();
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
  addSection: (nome: string, userId: string) => Promise<void>;
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
  sections: DEFAULT_SECTIONS,
  pages: DEFAULT_PAGES,
  relations: [],
  deletedItems: getStoredTrash(),
  activeSectionId: DEFAULT_SECTION_ID,
  activePageId: DEFAULT_PAGE_ID,
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
        try {
          const localPage = await offlineDb.pages.get(pageId);
          if (!localPage && action !== 'delete') {
            // If no local page, clean the orphaned queue item
            if (id) await offlineDb.syncQueue.delete(id);
            continue;
          }

          if (localPage && localPage.syncStatus === 'conflict') {
            // Skip syncing if in conflict, wait for manual resolution
            continue;
          }

          // 1. Optimistic Locking Check (only for updates and deletions)
          if (action !== 'create') {
            const { data: remotePage, error: fetchErr } = await supabase
              .from('note_pages')
              .select('id, titulo, conteudo, created_at')
              .eq('id', pageId)
              .maybeSingle();

            if (fetchErr) throw fetchErr;

            if (remotePage && localPage) {
              let remoteContentDecrypted = null;
              if (remotePage.conteudo) {
                try {
                  remoteContentDecrypted = await decryptNoteContent(remotePage.conteudo);
                } catch {
                  remoteContentDecrypted = null;
                }
              }

              const isRemoteDifferent = remotePage.titulo !== localPage.titulo || (remoteContentDecrypted !== null && remoteContentDecrypted !== localPage.conteudo);
              
              if (isRemoteDifferent && localPage.remoteVersion < localPage.localVersion - 1) {
                // Conflict detected!
                await offlineDb.pages.update(pageId, { syncStatus: 'conflict' });
                set((state) => ({
                  pageSyncStatuses: { ...state.pageSyncStatuses, [pageId]: 'conflict' }
                }));
                toast.error(`Conflito de sincronização detectado na página "${localPage.titulo}". Por favor, selecione qual versão deseja manter.`);
                continue;
              }
            }
          }

          // 2. Encryption & Supabase Sync
          const updatePayload = { ...payload } as Record<string, unknown>;
          delete updatePayload.version;

          if (updatePayload.conteudo) {
            updatePayload.conteudo = await sanitizeAndEncryptNoteContent(updatePayload.conteudo);
          }

          let dbError = null;
          if (action === 'update') {
            const { error } = await supabase.from('note_pages').update(updatePayload).eq('id', pageId);
            dbError = error;
          } else if (action === 'create') {
            const { error } = await supabase.from('note_pages').insert([updatePayload]);
            dbError = error;
          } else if (action === 'delete') {
            const { error } = await supabase.from('note_pages').delete().eq('id', pageId);
            dbError = error;
          }

          if (dbError) throw dbError;

          // 3. Clear Queue Item and Mark Synced
          if (id) await offlineDb.syncQueue.delete(id);
          
          if (localPage) {
            await offlineDb.pages.update(pageId, {
              syncStatus: 'synced',
              remoteVersion: localPage.localVersion
            });

            set((state) => ({
              pageSyncStatuses: { ...state.pageSyncStatuses, [pageId]: 'synced' }
            }));
          }

        } catch (err) {
          console.error(`Failed to process sync item for page ${pageId}:`, err);
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
    
    // Instantly load specific user cached pages/sections/relations
    const sectionsKey = getUserCacheKey(targetUserId, 'note_sections');
    const pagesKey = getUserCacheKey(targetUserId, 'note_pages');
    const relationsKey = getUserCacheKey(targetUserId, 'note_relations');
    
    const cachedSections = getCached<NoteSection[]>(sectionsKey, targetUserId === DEFAULT_USER_ID ? DEFAULT_SECTIONS : []);
    const cachedPages = getCached<NotePage[]>(pagesKey, targetUserId === DEFAULT_USER_ID ? DEFAULT_PAGES : []);
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

    set({
      sections: cachedSections,
      pages: cachedPages,
      relations: cachedRelations,
      activePageId: targetPageId,
      activeSectionId: targetSectionId,
      isLoading: true
    });

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
          loadedSections = sortSectionsByStoredOrder(rawSections);
        } else {
          // If Supabase returned empty and we are guest/official, use cached or defaults
          loadedSections = targetUserId === DEFAULT_USER_ID ? DEFAULT_SECTIONS : [];
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
          loadedPages = sortPagesByStoredOrder(decryptedPages);
        } else {
          loadedPages = targetUserId === DEFAULT_USER_ID ? DEFAULT_PAGES : [];
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

        // Determine active page and section
        const storedPageIdCurrent = getStoredActivePageId();
        const storedSectionIdCurrent = getStoredActiveSectionId();

        let finalPageId: string | null = null;
        let finalSectionId: string | null = null;

        if (storedPageIdCurrent && sanitizedPages.some(p => p.id === storedPageIdCurrent)) {
          finalPageId = storedPageIdCurrent;
          const page = sanitizedPages.find(p => p.id === storedPageIdCurrent);
          finalSectionId = page?.section_id || null;
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
          const initialSyncStatuses: Record<string, 'synced' | 'pending' | 'conflict'> = {};

          reconciledPages = sanitizedPages.map(p => {
            const localMatch = dexieMap.get(p.id);
            if (localMatch) {
              initialSyncStatuses[p.id] = localMatch.syncStatus;
              if (localMatch.syncStatus === 'pending' || localMatch.syncStatus === 'conflict') {
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
    const newSection: NoteSection = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      nome,
      user_id: fallbackUserId,
      created_at: new Date().toISOString()
    };

    const currentSections = get().sections;
    const updatedSections = [...currentSections, newSection];
    saveSectionOrder(updatedSections.map(s => s.id));
    setCached(getUserCacheKey(fallbackUserId, 'note_sections'), updatedSections);

    set({ sections: updatedSections });
    get().setActiveSectionId(newSection.id);
    toast.success('Seção criada!');

    try {
      const { data, error } = await supabase
        .from('note_sections')
        .insert([{ nome, user_id: fallbackUserId }])
        .select()
        .single();

      if (!error && data) {
        // Update temporary ID with Supabase ID
        const syncedSections = get().sections.map(s => s.id === newSection.id ? data : s);
        setCached(getUserCacheKey(fallbackUserId, 'note_sections'), syncedSections);
        set({ sections: syncedSections, activeSectionId: data.id });
      }
    } catch (e) {
      console.debug('Section saved locally, background sync pending:', e);
    }
  },

  updateSection: async (id, nome) => {
    const section = get().sections.find(s => s.id === id);
    const userId = section ? section.user_id : DEFAULT_USER_ID;

    const updated = get().sections.map(s => s.id === id ? { ...s, nome } : s);
    setCached(getUserCacheKey(userId, 'note_sections'), updated);
    set({ sections: updated });

    try {
      await supabase.from('note_sections').update({ nome }).eq('id', id);
    } catch (e) {
      console.debug('Section updated locally:', e);
    }
  },

  deleteSection: async (id) => {
    const state = get();
    const sectionToDelete = state.sections.find(s => s.id === id);
    if (!sectionToDelete) return;

    const userId = sectionToDelete.user_id;
    const pagesToDelete = state.pages.filter(p => p.section_id === id);

    const trashItem: DeletedNoteItem = {
      id: sectionToDelete.id,
      type: 'section',
      title: sectionToDelete.nome,
      deletedAt: new Date().toISOString(),
      sectionData: sectionToDelete,
      sectionPages: pagesToDelete
    };

    const nextTrash = [trashItem, ...state.deletedItems.filter(item => item.id !== id)];
    saveTrashToStorage(nextTrash);

    const remainingSections = state.sections.filter(s => s.id !== id);
    saveSectionOrder(remainingSections.map(s => s.id));
    setCached(getUserCacheKey(userId, 'note_sections'), remainingSections);

    const remainingPages = state.pages.filter(p => p.section_id !== id);
    savePageOrder(remainingPages.map(p => p.id));
    setCached(getUserCacheKey(userId, 'note_pages'), remainingPages);

    const isCurrentActiveSection = state.activeSectionId === id;
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
      await supabase.from('note_sections').delete().eq('id', id);
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
    saveSectionOrder(ids);
    const userId = newSections[0]?.user_id || DEFAULT_USER_ID;
    setCached(getUserCacheKey(userId, 'note_sections'), newSections);
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
    saveSectionOrder(ids);
    const userId = newSections[0]?.user_id || DEFAULT_USER_ID;
    setCached(getUserCacheKey(userId, 'note_sections'), newSections);
    set({ sections: newSections });
  },

  addPage: async (titulo, sectionId, userId, parentId = null) => {
    const fallbackUserId = userId || DEFAULT_USER_ID;
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
      id: `page_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      titulo,
      conteudo: initialContent,
      section_id: sectionId,
      parent_id: parentId,
      user_id: fallbackUserId,
      created_at: new Date().toISOString()
    };

    saveActivePageId(newPage.id);
    saveActiveSectionId(sectionId);

    const currentPages = get().pages;
    const updatedPages = [...currentPages, newPage];
    savePageOrder(updatedPages.map(p => p.id));
    setCached(getUserCacheKey(fallbackUserId, 'note_pages'), updatedPages);

    set({ pages: updatedPages, activePageId: newPage.id, activeSectionId: sectionId });
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
          section_id: sectionId,
          parent_id: parentId,
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
    if (activeAbortControllers.has(id)) {
      activeAbortControllers.get(id)?.abort();
      activeAbortControllers.delete(id);
    }
    const controller = new AbortController();
    activeAbortControllers.set(id, controller);

    const page = get().pages.find(p => p.id === id);
    const userId = page ? page.user_id : DEFAULT_USER_ID;

    // Schema Validation with Zod
    if (updates.conteudo) {
      try {
        const validated = validateAndSanitizeBlocks(updates.conteudo);
        updates.conteudo = JSON.stringify(validated);
      } catch (err) {
        console.error('Zod schema validation failed on updatePage:', err);
        toast.error('Falha na validação de dados antes de salvar.');
        return;
      }
    }

    const previousPages = get().pages;
    const updatedPages = get().pages.map(p => p.id === id ? { ...p, ...updates } : p);
    setCached(getUserCacheKey(userId, 'note_pages'), updatedPages);
    set({ pages: updatedPages });

    try {
      const localPage = await offlineDb.pages.get(id);
      const currentLocalVersion = localPage ? localPage.localVersion + 1 : 1;
      const currentRemoteVersion = localPage ? localPage.remoteVersion : 0;

      const pageData: NotePage = {
        id,
        titulo: updates.titulo ?? (page?.titulo || ''),
        conteudo: updates.conteudo ?? (page?.conteudo || null),
        section_id: updates.section_id ?? (page?.section_id || ''),
        parent_id: updates.parent_id ?? (page?.parent_id || null),
        user_id: userId,
        created_at: page?.created_at || new Date().toISOString()
      };

      await offlineDb.revisions.add({
        pageId: id,
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
        pageSyncStatuses: { ...state.pageSyncStatuses, [id]: 'pending' }
      }));

      await offlineDb.syncQueue.add({
        pageId: id,
        action: 'update',
        payload: { ...updates, version: currentLocalVersion },
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
      if (activeAbortControllers.get(id) === controller) {
        activeAbortControllers.delete(id);
      }
    }
  },

  deletePage: async (id) => {
    const state = get();
    const pageToDelete = state.pages.find(p => p.id === id);
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
    const subpagesToDelete = getSubpages(id);
    const allPagesToDelete = [pageToDelete, ...subpagesToDelete];

    const trashItem: DeletedNoteItem = {
      id: pageToDelete.id,
      type: 'page',
      title: pageToDelete.titulo,
      deletedAt: new Date().toISOString(),
      pageData: pageToDelete,
      subpages: subpagesToDelete
    };

    const nextTrash = [trashItem, ...state.deletedItems.filter(item => item.id !== id)];
    saveTrashToStorage(nextTrash);

    const remainingPages = state.pages.filter(p => !allPagesToDelete.some(dp => dp.id === p.id));
    savePageOrder(remainingPages.map(p => p.id));
    setCached(getUserCacheKey(userId, 'note_pages'), remainingPages);

    const isCurrentActivePage = state.activePageId === id || allPagesToDelete.some(dp => dp.id === state.activePageId);
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
        await offlineDb.pages.delete(p.id);
        await offlineDb.syncQueue.add({
          pageId: p.id,
          action: 'delete',
          payload: {},
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
    savePageOrder(ids);
    setCached(CACHE_KEYS.PAGES, newPages);
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
    savePageOrder(ids);
    setCached(CACHE_KEYS.PAGES, newPages);
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
          await supabase.from('note_sections').upsert([section]);
          if (pages.length > 0) {
            await supabase.from('note_pages').upsert(pages);
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
          await supabase.from('note_pages').upsert(normalizedPages);
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
