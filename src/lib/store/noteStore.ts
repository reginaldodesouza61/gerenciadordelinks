import { create } from 'zustand';
import { supabase } from '../supabase';
import { NoteSection, NotePage, NoteLinkRelation, DeletedNoteItem } from '@/types/notes';
import { toast } from 'sonner';
import { encryptSecretField, decryptSecretField } from '@/lib/encryption';

const TRASH_STORAGE_KEY = 'meuhub_deleted_notes_vault';
const ACTIVE_PAGE_STORAGE_KEY = 'meuhub_active_page_id';
const ACTIVE_SECTION_STORAGE_KEY = 'meuhub_active_section_id';
const SECTION_ORDER_STORAGE_KEY = 'meuhub_section_order';
const PAGE_ORDER_STORAGE_KEY = 'meuhub_page_order';

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
  } catch (e) {
    console.debug('Failed to get active page id from storage', e);
    return null;
  }
}

function getStoredActiveSectionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SECTION_STORAGE_KEY);
  } catch (e) {
    console.debug('Failed to get active section id from storage', e);
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
  } catch (e) {
    console.debug('Failed to save active page id to storage', e);
  }
}

function saveActiveSectionId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_SECTION_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_SECTION_STORAGE_KEY);
    }
  } catch (e) {
    console.debug('Failed to save active section id to storage', e);
  }
}

function getStoredSectionOrder(): string[] {
  try {
    const raw = localStorage.getItem(SECTION_ORDER_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.debug('Failed to get section order from storage', e);
    return [];
  }
}

function saveSectionOrder(ids: string[]) {
  try {
    localStorage.setItem(SECTION_ORDER_STORAGE_KEY, JSON.stringify(ids));
  } catch (e) {
    console.debug('Failed to save section order to storage', e);
  }
}

function getStoredPageOrder(): string[] {
  try {
    const raw = localStorage.getItem(PAGE_ORDER_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.debug('Failed to get page order from storage', e);
    return [];
  }
}

function savePageOrder(ids: string[]) {
  try {
    localStorage.setItem(PAGE_ORDER_STORAGE_KEY, JSON.stringify(ids));
  } catch (e) {
    console.debug('Failed to save page order to storage', e);
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
  
  fetchNotes: (userId: string) => Promise<void>;
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
  
  // Trash and Undo / Recovery actions
  restoreItem: (id: string) => Promise<void>;
  restoreLastDeleted: () => Promise<void>;
  permanentlyDelete: (id: string) => void;
  emptyTrash: () => void;
  
  setActiveSectionId: (id: string | null) => void;
  setActivePageId: (id: string | null) => void;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  sections: [],
  pages: [],
  relations: [],
  deletedItems: getStoredTrash(),
  activeSectionId: getStoredActiveSectionId(),
  activePageId: getStoredActivePageId(),
  isLoading: false,

  fetchNotes: async (userId: string) => {
    set({ isLoading: true });
    try {
      const [sectionsRes, pagesRes, relRes] = await Promise.all([
        supabase.from('note_sections').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('note_pages').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('note_link_relations').select('*').eq('user_id', userId)
      ]);

      if (sectionsRes.error && !['42P01', 'PGRST205'].includes(sectionsRes.error.code)) {
        console.error('Error fetching sections:', sectionsRes.error);
        toast.error('Erro ao buscar seções de notas.');
      } else if (sectionsRes.error && ['42P01', 'PGRST205'].includes(sectionsRes.error.code)) {
        toast.error('Tabelas de notas não existem. Execute o script SQL no Supabase.');
      }

      const rawSections = (sectionsRes.data as NoteSection[]) || [];
      const loadedSections = sortSectionsByStoredOrder(rawSections);

      const rawPages = ((pagesRes.data as NotePage[]) || []).map(p => ({
        ...p,
        conteudo: decryptSecretField(p.conteudo) || p.conteudo
      }));
      const loadedPages = sortPagesByStoredOrder(rawPages);

      // Determine the active page and section to restore across reloads
      const storedPageId = getStoredActivePageId();
      const storedSectionId = getStoredActiveSectionId();

      let targetPageId: string | null = null;
      let targetSectionId: string | null = null;

      if (storedPageId && loadedPages.some(p => p.id === storedPageId)) {
        targetPageId = storedPageId;
        const page = loadedPages.find(p => p.id === storedPageId);
        targetSectionId = page?.section_id || null;
      } else if (storedSectionId && loadedSections.some(s => s.id === storedSectionId)) {
        targetSectionId = storedSectionId;
      } else if (loadedSections.length > 0) {
        targetSectionId = loadedSections[0].id;
      }

      // Sync resolved ids to storage
      if (targetPageId) {
        saveActivePageId(targetPageId);
      }
      if (targetSectionId) {
        saveActiveSectionId(targetSectionId);
      }

      set({
        sections: loadedSections,
        pages: loadedPages,
        relations: relRes.data || [],
        deletedItems: getStoredTrash(),
        activePageId: targetPageId,
        activeSectionId: targetSectionId,
      });
    } catch (error) {
      console.error('Fetch notes error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addSection: async (nome, userId) => {
    const { data, error } = await supabase
      .from('note_sections')
      .insert([{ nome, user_id: userId }])
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar seção');
      return;
    }
    const currentSections = get().sections;
    const updatedSections = [...currentSections, data];
    saveSectionOrder(updatedSections.map(s => s.id));
    set({ sections: updatedSections });
    get().setActiveSectionId(data.id);
    toast.success('Seção criada!');
  },

  updateSection: async (id, nome) => {
    const { error } = await supabase.from('note_sections').update({ nome }).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar seção');
      return;
    }
    set(state => ({
      sections: state.sections.map(s => s.id === id ? { ...s, nome } : s)
    }));
  },

  deleteSection: async (id) => {
    const state = get();
    const sectionToDelete = state.sections.find(s => s.id === id);
    if (!sectionToDelete) return;

    const pagesToDelete = state.pages.filter(p => p.section_id === id);

    // Create trash entry
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

    const remainingPages = state.pages.filter(p => p.section_id !== id);
    savePageOrder(remainingPages.map(p => p.id));

    const isCurrentActiveSection = state.activeSectionId === id;
    const isCurrentActivePage = pagesToDelete.some(p => p.id === state.activePageId);

    if (isCurrentActiveSection) {
      saveActiveSectionId(null);
    }
    if (isCurrentActivePage) {
      saveActivePageId(null);
    }

    // Optimistically remove from state
    set(state => ({
      sections: remainingSections,
      pages: remainingPages,
      deletedItems: nextTrash,
      activeSectionId: isCurrentActiveSection ? null : state.activeSectionId,
      activePageId: isCurrentActivePage ? null : state.activePageId
    }));

    // Delete in Supabase
    const { error } = await supabase.from('note_sections').delete().eq('id', id);
    if (error) {
      console.error('Error deleting section in Supabase:', error);
    }

    toast('Seção enviada para a Lixeira', {
      description: `"${sectionToDelete.nome}" e suas notas associadas.`,
      duration: 8000,
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
    set({ sections: newSections });
  },

  addPage: async (titulo, sectionId, userId, parentId = null) => {
    const initialContent = JSON.stringify([
      {
        id: `block_${Date.now()}`,
        x: 40,
        y: 40,
        width: 600,
        height: 'auto',
        content: `<p></p>`
      }
    ]);

    const encryptedContent = encryptSecretField(initialContent);

    const { data, error } = await supabase
      .from('note_pages')
      .insert([{ titulo, section_id: sectionId, parent_id: parentId, user_id: userId, conteudo: encryptedContent }])
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar página');
      return null;
    }

    const decryptedData = data ? {
      ...data,
      conteudo: decryptSecretField(data.conteudo) || data.conteudo
    } : null;

    saveActivePageId(data.id);
    saveActiveSectionId(sectionId);

    const currentPages = get().pages;
    const updatedPages = decryptedData ? [...currentPages, decryptedData] : currentPages;
    savePageOrder(updatedPages.map(p => p.id));

    set({ pages: updatedPages, activePageId: data.id, activeSectionId: sectionId });
    toast.success('Página criada!');
    return decryptedData;
  },

  updatePage: async (id, updates) => {
    set(state => ({
      pages: state.pages.map(p => p.id === id ? { ...p, ...updates } : p)
    }));

    const payload: Partial<NotePage> = { ...updates };
    if (payload.conteudo && typeof payload.conteudo === 'string') {
      payload.conteudo = encryptSecretField(payload.conteudo);
    }

    const { error } = await supabase.from('note_pages').update(payload).eq('id', id);
    if (error) {
      console.error('Supabase update page error:', error);
      if (['42P01', 'PGRST205'].includes(error.code)) {
        toast.error('Tabela note_pages não encontrada no Supabase.');
      }
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

    // Create trash entry
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

    const isCurrentActivePage = state.activePageId === id || allPagesToDelete.some(dp => dp.id === state.activePageId);
    if (isCurrentActivePage) {
      saveActivePageId(null);
    }

    // Optimistically update UI
    set({
      pages: remainingPages,
      deletedItems: nextTrash,
      activePageId: isCurrentActivePage ? null : state.activePageId
    });

    // Delete in Supabase
    const { error } = await supabase.from('note_pages').delete().eq('id', id);
    if (error) {
      console.error('Error deleting page in Supabase:', error);
    }

    toast('Anotação enviada para a Lixeira', {
      description: `"${pageToDelete.titulo}"`,
      duration: 8000,
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
    set({ pages: newPages });
  },

  movePage: (id: string, direction: 'up' | 'down') => {
    const { pages } = get();
    const targetPage = pages.find(p => p.id === id);
    if (!targetPage) return;

    // Get all sibling pages (same section_id and parent_id)
    const siblings = pages.filter(
      p => p.section_id === targetPage.section_id && p.parent_id === targetPage.parent_id
    );
    const siblingIndex = siblings.findIndex(p => p.id === id);
    if (siblingIndex === -1) return;
    if (direction === 'up' && siblingIndex === 0) return;
    if (direction === 'down' && siblingIndex === siblings.length - 1) return;

    const swapSiblingIndex = direction === 'up' ? siblingIndex - 1 : siblingIndex + 1;
    const swapSibling = siblings[swapSiblingIndex];

    // Find indices in main pages array
    const mainIndexA = pages.findIndex(p => p.id === targetPage.id);
    const mainIndexB = pages.findIndex(p => p.id === swapSibling.id);
    if (mainIndexA === -1 || mainIndexB === -1) return;

    const newPages = [...pages];
    const [removed] = newPages.splice(mainIndexA, 1);
    newPages.splice(mainIndexB, 0, removed);

    const ids = newPages.map(p => p.id);
    savePageOrder(ids);
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

        // 1. Restore section in Supabase
        await supabase.from('note_sections').upsert([section]);

        // 2. Restore pages in Supabase
        if (pages.length > 0) {
          const rootPages = pages.filter(p => !p.parent_id || !pages.some(p2 => p2.id === p.parent_id));
          const childPages = pages.filter(p => p.parent_id && pages.some(p2 => p2.id === p.parent_id));

          const encryptPageContent = (p: NotePage) => ({
            ...p,
            conteudo: encryptSecretField(p.conteudo) || p.conteudo
          });

          if (rootPages.length > 0) {
            await supabase.from('note_pages').upsert(rootPages.map(encryptPageContent));
          }
          if (childPages.length > 0) {
            await supabase.from('note_pages').upsert(childPages.map(encryptPageContent));
          }
        }

        // 3. Update store state
        const remainingTrash = state.deletedItems.filter(item => item.id !== id);
        saveTrashToStorage(remainingTrash);
        saveActiveSectionId(section.id);

        const updatedSections = state.sections.some(s => s.id === section.id) ? state.sections : [...state.sections, section];
        saveSectionOrder(updatedSections.map(s => s.id));

        const updatedPages = [
          ...state.pages.filter(p => !pages.some(rp => rp.id === p.id)),
          ...pages
        ];
        savePageOrder(updatedPages.map(p => p.id));

        set({
          sections: updatedSections,
          pages: updatedPages,
          deletedItems: remainingTrash,
          activeSectionId: section.id
        });

        toast.success(`Seção "${section.nome}" restaurada com sucesso!`);
      } else if (itemToRestore.type === 'page' && itemToRestore.pageData) {
        const page = itemToRestore.pageData;
        const subpages = itemToRestore.subpages || [];
        const allPages = [page, ...subpages];

        // Check if section exists. If not, pick current active or first section, or create one
        let targetSectionId = page.section_id;
        const sectionExists = state.sections.some(s => s.id === targetSectionId);
        if (!sectionExists) {
          if (state.sections.length > 0) {
            targetSectionId = state.activeSectionId || state.sections[0].id;
          } else {
            // Create default section
            const { data: newSec } = await supabase
              .from('note_sections')
              .insert([{ nome: 'Geral', user_id: page.user_id }])
              .select()
              .single();
            if (newSec) {
              const updatedSecs = [...state.sections, newSec];
              saveSectionOrder(updatedSecs.map(s => s.id));
              set(prev => ({ sections: updatedSecs }));
              targetSectionId = newSec.id;
            }
          }
        }

        const normalizedPages = allPages.map(p => ({
          ...p,
          section_id: targetSectionId,
          conteudo: encryptSecretField(p.conteudo) || p.conteudo
        }));

        // Insert root page first
        const rootPages = normalizedPages.filter(p => !p.parent_id || !normalizedPages.some(p2 => p2.id === p.parent_id));
        const childPages = normalizedPages.filter(p => p.parent_id && normalizedPages.some(p2 => p2.id === p.parent_id));

        for (const p of rootPages) {
          await supabase.from('note_pages').upsert([p]);
        }
        for (const p of childPages) {
          await supabase.from('note_pages').upsert([p]);
        }

        const remainingTrash = state.deletedItems.filter(item => item.id !== id);
        saveTrashToStorage(remainingTrash);

        saveActivePageId(page.id);
        saveActiveSectionId(targetSectionId);

        const updatedPages = [
          ...state.pages.filter(p => !normalizedPages.some(np => np.id === p.id)),
          ...normalizedPages
        ];
        savePageOrder(updatedPages.map(p => p.id));

        set({
          pages: updatedPages,
          deletedItems: remainingTrash,
          activeSectionId: targetSectionId,
          activePageId: page.id
        });

        toast.success(`Anotação "${page.titulo}" restaurada com sucesso!`);
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
