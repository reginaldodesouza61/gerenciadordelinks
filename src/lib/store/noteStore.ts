import { create } from 'zustand';
import { supabase } from '../supabase';
import { NoteSection, NotePage, NoteLinkRelation } from '@/types/notes';
import { toast } from 'sonner';

interface NoteState {
  sections: NoteSection[];
  pages: NotePage[];
  relations: NoteLinkRelation[];
  activeSectionId: string | null;
  activePageId: string | null;
  isLoading: boolean;
  
  fetchNotes: (userId: string) => Promise<void>;
  addSection: (nome: string, userId: string) => Promise<void>;
  updateSection: (id: string, nome: string) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  
  addPage: (titulo: string, sectionId: string, userId: string, parentId?: string | null) => Promise<NotePage | null>;
  updatePage: (id: string, updates: Partial<NotePage>) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  
  setActiveSectionId: (id: string | null) => void;
  setActivePageId: (id: string | null) => void;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  sections: [],
  pages: [],
  relations: [],
  activeSectionId: null,
  activePageId: null,
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

      set({
        sections: sectionsRes.data || [],
        pages: pagesRes.data || [],
        relations: relRes.data || [],
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
    set(state => ({ sections: [...state.sections, data] }));
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
    const { error } = await supabase.from('note_sections').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao deletar seção');
      return;
    }
    set(state => ({
      sections: state.sections.filter(s => s.id !== id),
      pages: state.pages.filter(p => p.section_id !== id),
      activeSectionId: state.activeSectionId === id ? null : state.activeSectionId,
      activePageId: get().pages.find(p => p.id === state.activePageId)?.section_id === id ? null : state.activePageId
    }));
    toast.success('Seção deletada');
  },

  addPage: async (titulo, sectionId, userId, parentId = null) => {
    // Initial empty state for the freeform canvas blocks
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

    const { data, error } = await supabase
      .from('note_pages')
      .insert([{ titulo, section_id: sectionId, parent_id: parentId, user_id: userId, conteudo: initialContent }])
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar página');
      return null;
    }
    set(state => ({ pages: [...state.pages, data], activePageId: data.id }));
    toast.success('Página criada!');
    return data;
  },

  updatePage: async (id, updates) => {
    // Optimistically update zustand store immediately
    set(state => ({
      pages: state.pages.map(p => p.id === id ? { ...p, ...updates } : p)
    }));

    const { error } = await supabase.from('note_pages').update(updates).eq('id', id);
    if (error) {
      console.error('Supabase update page error:', error);
      // If error code is table missing, inform the user
      if (['42P01', 'PGRST205'].includes(error.code)) {
        toast.error('Tabela note_pages não encontrada no Supabase.');
      }
    }
  },

  deletePage: async (id) => {
    const { error } = await supabase.from('note_pages').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao deletar página');
      return;
    }
    set(state => ({
      pages: state.pages.filter(p => p.id !== id && p.parent_id !== id),
      activePageId: state.activePageId === id ? null : state.activePageId
    }));
    toast.success('Página deletada');
  },

  setActiveSectionId: (id) => set({ activeSectionId: id }),
  setActivePageId: (id) => set({ activePageId: id })
}));
