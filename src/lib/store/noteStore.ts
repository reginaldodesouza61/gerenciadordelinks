import { create } from 'zustand';
import { supabase } from '../supabase';
import { NoteSection, NotePage, NoteLinkRelation, DeletedNoteItem } from '@/types/notes';
import { toast } from 'sonner';
import { decryptNoteContent, sanitizeAndEncryptNoteContent } from '@/lib/encryption';

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
const DEFAULT_SECTION_ID = 'sec_default_geral_01';
const DEFAULT_PAGE_ID = 'page_default_welcome_01';

const DEFAULT_SECTIONS: NoteSection[] = [
  {
    id: DEFAULT_SECTION_ID,
    nome: 'Geral',
    user_id: DEFAULT_USER_ID,
    created_at: new Date().toISOString()
  },
  {
    id: 'sec_default_credenciais_02',
    nome: 'Cofre & Credenciais',
    user_id: DEFAULT_USER_ID,
    created_at: new Date().toISOString()
  },
  {
    id: 'sec_default_dev_03',
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
    return JSON.parse(raw);
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
    return localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getStoredActiveSectionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SECTION_STORAGE_KEY);
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

// Initial state loaded synchronously from localStorage
const initialSections = sortSectionsByStoredOrder(getCached<NoteSection[]>(CACHE_KEYS.SECTIONS, DEFAULT_SECTIONS));
const initialPages = sortPagesByStoredOrder(getCached<NotePage[]>(CACHE_KEYS.PAGES, DEFAULT_PAGES));
const initialActivePageId = getStoredActivePageId() || (initialPages.length > 0 ? initialPages[0].id : null);
const initialActiveSectionId = getStoredActiveSectionId() || (initialSections.length > 0 ? initialSections[0].id : null);

export const useNoteStore = create<NoteState>((set, get) => ({
  sections: initialSections,
  pages: initialPages,
  relations: getCached<NoteLinkRelation[]>(CACHE_KEYS.RELATIONS, []),
  deletedItems: getStoredTrash(),
  activeSectionId: initialActiveSectionId,
  activePageId: initialActivePageId,
  isLoading: false,

  fetchNotes: async (userId?: string) => {
    set({ isLoading: true });
    try {
      // Use a timeout race so database queries never hang indefinitely
      const queryPromise = Promise.all([
        supabase.from('note_sections').select('*').order('created_at', { ascending: true }),
        supabase.from('note_pages').select('*').order('created_at', { ascending: true }),
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
          // If Supabase returned empty, use cached or default sections
          const cachedSections = getCached<NoteSection[]>(CACHE_KEYS.SECTIONS, DEFAULT_SECTIONS);
          loadedSections = cachedSections.length > 0 ? cachedSections : DEFAULT_SECTIONS;
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
          // If Supabase returned empty, use cached or default pages
          const cachedPages = getCached<NotePage[]>(CACHE_KEYS.PAGES, DEFAULT_PAGES);
          loadedPages = cachedPages.length > 0 ? cachedPages : DEFAULT_PAGES;
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
        const storedPageId = getStoredActivePageId();
        const storedSectionId = getStoredActiveSectionId();

        let targetPageId: string | null = null;
        let targetSectionId: string | null = null;

        if (storedPageId && sanitizedPages.some(p => p.id === storedPageId)) {
          targetPageId = storedPageId;
          const page = sanitizedPages.find(p => p.id === storedPageId);
          targetSectionId = page?.section_id || null;
        } else if (storedSectionId && loadedSections.some(s => s.id === storedSectionId)) {
          targetSectionId = storedSectionId;
          const firstPage = sanitizedPages.find(p => p.section_id === targetSectionId);
          targetPageId = firstPage?.id || (sanitizedPages.length > 0 ? sanitizedPages[0].id : null);
        } else if (loadedSections.length > 0) {
          targetSectionId = loadedSections[0].id;
          const firstPage = sanitizedPages.find(p => p.section_id === targetSectionId);
          targetPageId = firstPage?.id || (sanitizedPages.length > 0 ? sanitizedPages[0].id : null);
        }

        if (targetPageId) saveActivePageId(targetPageId);
        if (targetSectionId) saveActiveSectionId(targetSectionId);

        setCached(CACHE_KEYS.SECTIONS, loadedSections);
        setCached(CACHE_KEYS.PAGES, sanitizedPages);
        if (relRes?.data) setCached(CACHE_KEYS.RELATIONS, relRes.data);

        set({
          sections: loadedSections,
          pages: sanitizedPages,
          relations: relRes?.data || get().relations,
          deletedItems: getStoredTrash(),
          activePageId: targetPageId,
          activeSectionId: targetSectionId,
        });
      }
    } catch (error) {
      console.warn('Fetch notes network issue, using cached sections/pages:', error);
      const cachedSections = getCached<NoteSection[]>(CACHE_KEYS.SECTIONS, DEFAULT_SECTIONS);
      const cachedPages = getCached<NotePage[]>(CACHE_KEYS.PAGES, DEFAULT_PAGES);
      set({
        sections: cachedSections,
        pages: cachedPages,
      });
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
    setCached(CACHE_KEYS.SECTIONS, updatedSections);

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
        setCached(CACHE_KEYS.SECTIONS, syncedSections);
        set({ sections: syncedSections, activeSectionId: data.id });
      }
    } catch (e) {
      console.debug('Section saved locally, background sync pending:', e);
    }
  },

  updateSection: async (id, nome) => {
    const updated = get().sections.map(s => s.id === id ? { ...s, nome } : s);
    setCached(CACHE_KEYS.SECTIONS, updated);
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
    setCached(CACHE_KEYS.SECTIONS, remainingSections);

    const remainingPages = state.pages.filter(p => p.section_id !== id);
    savePageOrder(remainingPages.map(p => p.id));
    setCached(CACHE_KEYS.PAGES, remainingPages);

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
    setCached(CACHE_KEYS.SECTIONS, newSections);
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
    setCached(CACHE_KEYS.SECTIONS, newSections);
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
    setCached(CACHE_KEYS.PAGES, updatedPages);

    set({ pages: updatedPages, activePageId: newPage.id, activeSectionId: sectionId });
    toast.success('Página criada!');

    try {
      const { data, error } = await supabase
        .from('note_pages')
        .insert([{ titulo, section_id: sectionId, parent_id: parentId, user_id: fallbackUserId, conteudo: initialContent }])
        .select()
        .single();

      if (!error && data) {
        const syncedPages = get().pages.map(p => p.id === newPage.id ? data : p);
        setCached(CACHE_KEYS.PAGES, syncedPages);
        set({ pages: syncedPages, activePageId: data.id });
        return data;
      }
    } catch (e) {
      console.debug('Page saved locally, background sync pending:', e);
    }

    return newPage;
  },

  updatePage: async (id, updates) => {
    const updatedPages = get().pages.map(p => p.id === id ? { ...p, ...updates } : p);
    setCached(CACHE_KEYS.PAGES, updatedPages);
    set({ pages: updatedPages });

    try {
      const payload: Partial<NotePage> = { ...updates };
      if (updates.conteudo) {
        payload.conteudo = await sanitizeAndEncryptNoteContent(updates.conteudo);
      }

      await supabase.from('note_pages').update(payload).eq('id', id);
    } catch (e) {
      console.debug('Page updated locally:', e);
    }
  },

  deletePage: async (id) => {
    const state = get();
    const pageToDelete = state.pages.find(p => p.id === id);
    if (!pageToDelete) return;

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
    setCached(CACHE_KEYS.PAGES, remainingPages);

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
      await supabase.from('note_pages').delete().eq('id', id);
    } catch (e) {
      console.debug('Page deleted locally:', e);
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
