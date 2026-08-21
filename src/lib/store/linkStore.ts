import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Categoria, Link, Subcategoria, Credencial } from '@/types/supabase';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { encryptPassword, decryptPassword, isEncrypted } from '@/lib/utils/encryption';

const CACHE_KEYS = {
  CATEGORIAS: 'meuhub_cached_categorias',
  SUBCATEGORIAS: 'meuhub_cached_subcategorias',
  LINKS: 'meuhub_cached_links',
  CREDENCIAIS: 'meuhub_cached_credenciais',
};

const DEFAULT_CATEGORIES: Categoria[] = [
  { id: 'cat-dev', nome: 'Desenvolvimento', created_at: new Date().toISOString() },
  { id: 'cat-ferramentas', nome: 'Ferramentas & Utilitários', created_at: new Date().toISOString() },
  { id: 'cat-produtividade', nome: 'Produtividade', created_at: new Date().toISOString() },
  { id: 'cat-estudos', nome: 'Estudos & Cursos', created_at: new Date().toISOString() },
];

const DEFAULT_SUBCATEGORIES: Subcategoria[] = [
  { id: 'sub-frontend', nome: 'Frontend & UI', categoria_id: 'cat-dev', created_at: new Date().toISOString() },
  { id: 'sub-backend', nome: 'Backend & APIs', categoria_id: 'cat-dev', created_at: new Date().toISOString() },
  { id: 'sub-devops', nome: 'DevOps & Cloud', categoria_id: 'cat-dev', created_at: new Date().toISOString() },
  { id: 'sub-docs', nome: 'Documentações', categoria_id: 'cat-ferramentas', created_at: new Date().toISOString() },
];

function getCached<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.debug(`Error reading ${key} from storage:`, e);
    return fallback;
  }
}

function setCached<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.debug(`Error saving ${key} to storage:`, e);
  }
}

interface LinkState {
  links: Link[];
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  credenciais: Record<string, Credencial>; // Map link_id to credential
  loading: boolean;
  viewMode: 'lista' | 'cartoes';
  searchQuery: string;
  searchResults: Link[];
  selectedCategoryId: string | null;
  selectedSubcategoryId: string | null;
  favoriteIds: string[];
  recentIds: string[];
  activeFilter: 'all' | 'favorites' | 'recent';
  
  // Fetch data
  fetchLinks: (userId: string) => Promise<void>;
  fetchCategorias: () => Promise<void>;
  fetchSubcategorias: () => Promise<void>;
  fetchCredenciais: (userId: string) => Promise<void>;
  
  // Links CRUD
  addLink: (link: Omit<Link, 'id' | 'created_at'>) => Promise<string>;
  updateLink: (id: string, link: Partial<Link>) => Promise<void>;
  deleteLink: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
  trackRecentLink: (id: string) => void;
  
  // Categories CRUD
  addCategoria: (nome: string) => Promise<void>;
  updateCategoria: (id: string, nome: string) => Promise<void>;
  deleteCategoria: (id: string) => Promise<void>;
  
  // Subcategories CRUD
  addSubcategoria: (nome: string, categoriaId: string) => Promise<void>;
  updateSubcategoria: (id: string, nome: string, categoriaId: string) => Promise<void>;
  deleteSubcategoria: (id: string) => Promise<void>;
  
  // Credentials CRUD
  addCredencial: (credencial: Omit<Credencial, 'id' | 'created_at'>) => Promise<void>;
  updateCredencial: (id: string, credencial: Partial<Credencial>) => Promise<void>;
  deleteCredencial: (id: string) => Promise<void>;
  getCredencialByLinkId: (linkId: string) => Credencial | undefined;
  
  // UI state
  setViewMode: (mode: 'lista' | 'cartoes') => void;
  setSearchQuery: (query: string) => void;
  searchLinks: (userId: string) => Promise<void>;
  setSelectedCategoryId: (categoryId: string | null) => void;
  setSelectedSubcategoryId: (subcategoryId: string | null) => void;
  setActiveFilter: (filter: 'all' | 'favorites' | 'recent') => void;
  
  // Link preview
  getLinkPreview: (url: string) => Promise<string | null>;
}

export const useLinkStore = create<LinkState>((set, get) => ({
  links: getCached<Link[]>(CACHE_KEYS.LINKS, []),
  categorias: getCached<Categoria[]>(CACHE_KEYS.CATEGORIAS, DEFAULT_CATEGORIES),
  subcategorias: getCached<Subcategoria[]>(CACHE_KEYS.SUBCATEGORIAS, DEFAULT_SUBCATEGORIES),
  credenciais: getCached<Record<string, Credencial>>(CACHE_KEYS.CREDENCIAIS, {}),
  loading: false,
  viewMode: (localStorage.getItem('meuhub_link_view_mode') as 'lista' | 'cartoes') || 'lista',
  searchQuery: '',
  searchResults: [],
  selectedCategoryId: localStorage.getItem('meuhub_selected_cat_id') || null,
  selectedSubcategoryId: localStorage.getItem('meuhub_selected_subcat_id') || null,
  favoriteIds: JSON.parse(localStorage.getItem('favoriteLinks') || '[]'),
  recentIds: JSON.parse(localStorage.getItem('recentLinks') || '[]'),
  activeFilter: (localStorage.getItem('meuhub_active_filter') as 'all' | 'favorites' | 'recent') || 'all',
  
  fetchLinks: async (userId: string) => {
    set({ loading: true });
    
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      const loadedLinks = (data || []) as Link[];
      set({ links: loadedLinks });
      setCached(CACHE_KEYS.LINKS, loadedLinks);
    } catch (error) {
      console.warn('Network issue fetching links, using cached/local links:', error);
      const cached = getCached<Link[]>(CACHE_KEYS.LINKS, []);
      if (cached.length > 0) {
        set({ links: cached });
      }
    } finally {
      set({ loading: false });
    }
  },
  
  fetchCategorias: async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nome');
        
      if (error) throw error;
      
      const loadedCategorias = (data || []) as Categoria[];
      if (loadedCategorias.length > 0) {
        set({ categorias: loadedCategorias });
        setCached(CACHE_KEYS.CATEGORIAS, loadedCategorias);
      }
    } catch (error) {
      console.warn('Network issue fetching categories, using cached categories:', error);
      const cached = getCached<Categoria[]>(CACHE_KEYS.CATEGORIAS, DEFAULT_CATEGORIES);
      set({ categorias: cached });
    }
  },
  
  fetchSubcategorias: async () => {
    try {
      const { data, error } = await supabase
        .from('subcategorias')
        .select('*')
        .order('nome');
        
      if (error) throw error;
      
      const loadedSubcategorias = (data || []) as Subcategoria[];
      if (loadedSubcategorias.length > 0) {
        set({ subcategorias: loadedSubcategorias });
        setCached(CACHE_KEYS.SUBCATEGORIAS, loadedSubcategorias);
      }
    } catch (error) {
      console.warn('Network issue fetching subcategories, using cached subcategories:', error);
      const cached = getCached<Subcategoria[]>(CACHE_KEYS.SUBCATEGORIAS, DEFAULT_SUBCATEGORIES);
      set({ subcategorias: cached });
    }
  },
  
  addLink: async (link) => {
    set({ loading: true });
    let newLinkId = '';
    
    try {
      // Get link preview
      const imageUrl = await get().getLinkPreview(link.url);
      
      newLinkId = uuidv4();
      const newLink: Link = {
        ...link,
        id: newLinkId,
        imagem_url: imageUrl,
        created_at: new Date().toISOString()
      };
      
      // Optimistic update
      const updatedLinks = [newLink, ...get().links];
      set({ links: updatedLinks });
      setCached(CACHE_KEYS.LINKS, updatedLinks);
      
      try {
        const { error } = await supabase
          .from('links')
          .insert([newLink]);
          
        if (error) {
          console.warn('Supabase link insert issue:', error);
        }
      } catch (err) {
        console.warn('Supabase link insert network offline:', err);
      }
      
      toast.success('Link adicionado com sucesso!');
      return newLinkId;
    } catch (error) {
      console.error('Error adding link:', error);
      toast.error('Erro ao adicionar link');
      return newLinkId;
    } finally {
      set({ loading: false });
    }
  },
  
  updateLink: async (id, linkData) => {
    set({ loading: true });
    
    try {
      if (linkData.url) {
        linkData.imagem_url = await get().getLinkPreview(linkData.url);
      }
      
      const updatedLinks = get().links.map(link => 
        link.id === id ? { ...link, ...linkData } : link
      );
      
      set({ links: updatedLinks });
      setCached(CACHE_KEYS.LINKS, updatedLinks);
      
      try {
        const { error } = await supabase
          .from('links')
          .update(linkData)
          .eq('id', id);
          
        if (error) {
          console.warn('Supabase link update error:', error);
        }
      } catch (err) {
        console.warn('Supabase link update offline:', err);
      }
      
      toast.success('Link atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating link:', error);
      toast.error('Erro ao atualizar link');
    } finally {
      set({ loading: false });
    }
  },
  
  deleteLink: async (id) => {
    set({ loading: true });
    
    try {
      const updatedLinks = get().links.filter(link => link.id !== id);
      set({ links: updatedLinks });
      setCached(CACHE_KEYS.LINKS, updatedLinks);

      try {
        const { error } = await supabase
          .from('links')
          .delete()
          .eq('id', id);
          
        if (error) {
          console.warn('Supabase link delete error:', error);
        }
      } catch (err) {
        console.warn('Supabase link delete offline:', err);
      }
      
      toast.success('Link removido com sucesso!');
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.error('Erro ao remover link');
    } finally {
      set({ loading: false });
    }
  },
  
  toggleFavorite: (id) => {
    const { favoriteIds } = get();
    const newFavorites = favoriteIds.includes(id)
      ? favoriteIds.filter(favId => favId !== id)
      : [id, ...favoriteIds];
    
    set({ favoriteIds: newFavorites });
    localStorage.setItem('favoriteLinks', JSON.stringify(newFavorites));
    
    if (favoriteIds.includes(id)) {
      toast.success('Removido dos favoritos');
    } else {
      toast.success('Adicionado aos favoritos');
    }
  },
  
  trackRecentLink: (id) => {
    const { recentIds } = get();
    const newRecents = [id, ...recentIds.filter(recentId => recentId !== id)].slice(0, 10);
    set({ recentIds: newRecents });
    localStorage.setItem('recentLinks', JSON.stringify(newRecents));
  },
  
  addCategoria: async (nome) => {
    set({ loading: true });
    
    try {
      const newCategoria: Categoria = {
        id: uuidv4(),
        nome,
        created_at: new Date().toISOString()
      };
      
      const updatedCategories = [...get().categorias, newCategoria].sort((a, b) => a.nome.localeCompare(b.nome));
      set({ categorias: updatedCategories });
      setCached(CACHE_KEYS.CATEGORIAS, updatedCategories);
      
      try {
        const { error } = await supabase
          .from('categorias')
          .insert([newCategoria]);
          
        if (error) {
          console.warn('Supabase category insert issue:', error);
        }
      } catch (err) {
        console.warn('Supabase category insert offline:', err);
      }
      
      toast.success('Categoria adicionada com sucesso!');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Erro ao adicionar categoria');
    } finally {
      set({ loading: false });
    }
  },
  
  updateCategoria: async (id, nome) => {
    set({ loading: true });
    
    try {
      const updatedCategories = get().categorias.map(cat => 
        cat.id === id ? { ...cat, nome } : cat
      ).sort((a, b) => a.nome.localeCompare(b.nome));
      
      set({ categorias: updatedCategories });
      setCached(CACHE_KEYS.CATEGORIAS, updatedCategories);
      
      try {
        const { error } = await supabase
          .from('categorias')
          .update({ nome })
          .eq('id', id);
          
        if (error) {
          console.warn('Supabase category update issue:', error);
        }
      } catch (err) {
        console.warn('Supabase category update offline:', err);
      }
      
      toast.success('Categoria atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Erro ao atualizar categoria');
    } finally {
      set({ loading: false });
    }
  },
  
  deleteCategoria: async (id) => {
    set({ loading: true });
    
    try {
      // First check if there are links using this category
      const linksWithCat = get().links.filter(l => l.categoria_id === id);
      if (linksWithCat.length > 0) {
        toast.error('Não é possível excluir uma categoria que possui links associados');
        set({ loading: false });
        return;
      }
      
      // Check if there are subcategories
      const subcatsWithCat = get().subcategorias.filter(s => s.categoria_id === id);
      if (subcatsWithCat.length > 0) {
        toast.error('Não é possível excluir uma categoria que possui subcategorias');
        set({ loading: false });
        return;
      }
      
      const updatedCategories = get().categorias.filter(cat => cat.id !== id);
      set({ categorias: updatedCategories });
      setCached(CACHE_KEYS.CATEGORIAS, updatedCategories);
      
      try {
        const { error } = await supabase
          .from('categorias')
          .delete()
          .eq('id', id);
          
        if (error) {
          console.warn('Supabase category delete issue:', error);
        }
      } catch (err) {
        console.warn('Supabase category delete offline:', err);
      }
      
      toast.success('Categoria removida com sucesso!');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Erro ao remover categoria');
    } finally {
      set({ loading: false });
    }
  },
  
  addSubcategoria: async (nome, categoriaId) => {
    set({ loading: true });
    
    try {
      const newSubcategoria: Subcategoria = {
        id: uuidv4(),
        nome,
        categoria_id: categoriaId,
        created_at: new Date().toISOString()
      };
      
      const updatedSubcategories = [...get().subcategorias, newSubcategoria].sort((a, b) => a.nome.localeCompare(b.nome));
      set({ subcategorias: updatedSubcategories });
      setCached(CACHE_KEYS.SUBCATEGORIAS, updatedSubcategories);
      
      try {
        const { error } = await supabase
          .from('subcategorias')
          .insert([newSubcategoria]);
          
        if (error) {
          console.warn('Supabase subcategory insert issue:', error);
        }
      } catch (err) {
        console.warn('Supabase subcategory insert offline:', err);
      }
      
      toast.success('Subcategoria adicionada com sucesso!');
    } catch (error) {
      console.error('Error adding subcategory:', error);
      toast.error('Erro ao adicionar subcategoria');
    } finally {
      set({ loading: false });
    }
  },
  
  updateSubcategoria: async (id, nome, categoriaId) => {
    set({ loading: true });
    
    try {
      const updatedSubcategories = get().subcategorias.map(sub => 
        sub.id === id ? { ...sub, nome, categoria_id: categoriaId } : sub
      ).sort((a, b) => a.nome.localeCompare(b.nome));
      
      set({ subcategorias: updatedSubcategories });
      setCached(CACHE_KEYS.SUBCATEGORIAS, updatedSubcategories);
      
      try {
        const { error } = await supabase
          .from('subcategorias')
          .update({ nome, categoria_id: categoriaId })
          .eq('id', id);
          
        if (error) {
          console.warn('Supabase subcategory update issue:', error);
        }
      } catch (err) {
        console.warn('Supabase subcategory update offline:', err);
      }
      
      toast.success('Subcategoria atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating subcategory:', error);
      toast.error('Erro ao atualizar subcategoria');
    } finally {
      set({ loading: false });
    }
  },
  
  deleteSubcategoria: async (id) => {
    set({ loading: true });
    
    try {
      // First check if there are links using this subcategory
      const linksWithSubcat = get().links.filter(l => l.subcategoria_id === id);
      if (linksWithSubcat.length > 0) {
        toast.error('Não é possível excluir uma subcategoria que possui links associados');
        set({ loading: false });
        return;
      }
      
      const updatedSubcategories = get().subcategorias.filter(sub => sub.id !== id);
      set({ subcategorias: updatedSubcategories });
      setCached(CACHE_KEYS.SUBCATEGORIAS, updatedSubcategories);
      
      try {
        const { error } = await supabase
          .from('subcategorias')
          .delete()
          .eq('id', id);
          
        if (error) {
          console.warn('Supabase subcategory delete issue:', error);
        }
      } catch (err) {
        console.warn('Supabase subcategory delete offline:', err);
      }
      
      toast.success('Subcategoria removida com sucesso!');
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      toast.error('Erro ao remover subcategoria');
    } finally {
      set({ loading: false });
    }
  },
  
  setViewMode: (mode) => {
    try {
      localStorage.setItem('meuhub_link_view_mode', mode);
    } catch (e) {
      console.debug('Failed to save view mode to storage', e);
    }
    set({ viewMode: mode });
  },
  
  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },
  
  setSelectedCategoryId: (categoryId) => {
    if (categoryId) {
      try {
        localStorage.setItem('meuhub_selected_cat_id', categoryId);
      } catch (e) {
        console.debug('Failed to save category id', e);
      }
    } else {
      try {
        localStorage.removeItem('meuhub_selected_cat_id');
      } catch (e) {
        console.debug('Failed to remove category id', e);
      }
    }
    set({ selectedCategoryId: categoryId });
  },
  
  setSelectedSubcategoryId: (subcategoryId) => {
    if (subcategoryId) {
      try {
        localStorage.setItem('meuhub_selected_subcat_id', subcategoryId);
      } catch (e) {
        console.debug('Failed to save subcategory id', e);
      }
    } else {
      try {
        localStorage.removeItem('meuhub_selected_subcat_id');
      } catch (e) {
        console.debug('Failed to remove subcategory id', e);
      }
    }
    set({ selectedSubcategoryId: subcategoryId });
  },
  
  setActiveFilter: (filter) => {
    try {
      localStorage.setItem('meuhub_active_filter', filter);
    } catch (e) {
      console.debug('Failed to save active filter', e);
    }
    set({ activeFilter: filter });
  },
  
  searchLinks: async (userId: string) => {
    const query = get().searchQuery.toLowerCase().trim();
    
    if (!query) {
      set({ searchResults: [] });
      return;
    }
    
    set({ loading: true });
    
    try {
      // Local fast search first across existing links, categories and subcategories
      const currentLinks = get().links;
      const categorias = get().categorias;
      const subcategorias = get().subcategorias;
      
      const matchingCatIds = new Set(
        categorias.filter(c => c.nome.toLowerCase().includes(query)).map(c => c.id)
      );
      const matchingSubcatIds = new Set(
        subcategorias.filter(s => s.nome.toLowerCase().includes(query)).map(s => s.id)
      );
      
      const localMatches = currentLinks.filter(link => {
        const titleMatch = link.titulo?.toLowerCase().includes(query);
        const descMatch = link.descricao?.toLowerCase().includes(query);
        const urlMatch = link.url?.toLowerCase().includes(query);
        const catMatch = link.categoria_id && matchingCatIds.has(link.categoria_id);
        const subcatMatch = link.subcategoria_id && matchingSubcatIds.has(link.subcategoria_id);
        return titleMatch || descMatch || urlMatch || catMatch || subcatMatch;
      });
      
      set({ searchResults: localMatches });
    } catch (error) {
      console.error('Error searching links:', error);
    } finally {
      set({ loading: false });
    }
  },
  
  fetchCredenciais: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('credenciais')
        .select('*')
        .eq('user_id', userId);
        
      if (error) throw error;
      
      const credsMap: Record<string, Credencial> = {};
      ((data || []) as unknown as Credencial[]).forEach(cred => {
        if (cred.password && isEncrypted(cred.password)) {
          try {
            cred.password = decryptPassword(cred.password, userId);
          } catch (error) {
            console.error('Error decrypting password for credential:', cred.id);
          }
        }

        let parsedCustomFields = cred.custom_fields;
        if (typeof parsedCustomFields === 'string') {
          try {
            parsedCustomFields = JSON.parse(parsedCustomFields);
          } catch {
            parsedCustomFields = [];
          }
        }

        if (cred.notes && cred.notes.startsWith('__CUSTOM_FIELDS_JSON__:')) {
          try {
            const raw = cred.notes.replace('__CUSTOM_FIELDS_JSON__:', '');
            const parsed = JSON.parse(raw);
            if (!parsedCustomFields || parsedCustomFields.length === 0) {
              parsedCustomFields = parsed.custom_fields || [];
            }
            if (!cred.credential_type && parsed.credential_type) {
              cred.credential_type = parsed.credential_type;
            }
            cred.notes = parsed.notes || '';
          } catch {
            // keep default
          }
        }

        if (Array.isArray(parsedCustomFields)) {
          parsedCustomFields = parsedCustomFields.map(f => {
            if (f.type === 'password' && f.value && isEncrypted(f.value)) {
              try {
                return { ...f, value: decryptPassword(f.value, userId) };
              } catch {
                return f;
              }
            }
            return f;
          });
        }

        cred.custom_fields = parsedCustomFields || [];
        credsMap[cred.link_id] = cred as Credencial;
      });
      
      set({ credenciais: credsMap });
      setCached(CACHE_KEYS.CREDENCIAIS, credsMap);
    } catch (error) {
      console.warn('Network issue fetching credenciais, using local/cached credenciais:', error);
      const cached = getCached<Record<string, Credencial>>(CACHE_KEYS.CREDENCIAIS, {});
      if (Object.keys(cached).length > 0) {
        set({ credenciais: cached });
      }
    }
  },
  
  addCredencial: async (credencial) => {
    set({ loading: true });
    
    try {
      const processedCustomFields = credencial.custom_fields || [];
      const encryptedCustomFields = processedCustomFields.map(f => {
        if (f.type === 'password' && f.value) {
          return { ...f, value: encryptPassword(f.value, credencial.user_id) };
        }
        return f;
      });

      const encryptedCredential: Record<string, unknown> = {
        ...credencial,
        password: credencial.password ? encryptPassword(credencial.password, credencial.user_id) : null,
        custom_fields: encryptedCustomFields,
        id: uuidv4(),
        created_at: new Date().toISOString()
      };
      
      const localCredential: Credencial = {
        ...credencial,
        id: encryptedCredential.id as string,
        created_at: encryptedCredential.created_at as string,
        custom_fields: processedCustomFields
      };
      
      const updatedCreds = {
        ...get().credenciais,
        [credencial.link_id]: localCredential
      };
      
      set({ credenciais: updatedCreds });
      setCached(CACHE_KEYS.CREDENCIAIS, updatedCreds);

      try {
        const { error } = await supabase
          .from('credenciais')
          .insert([encryptedCredential]);
          
        if (error && (error.message?.includes('custom_fields') || error.message?.includes('credential_type') || error.code === '42703' || error.message?.includes('column'))) {
          const fallbackCredential = {
            ...encryptedCredential,
            custom_fields: undefined,
            credential_type: undefined,
            notes: `__CUSTOM_FIELDS_JSON__:${JSON.stringify({
              notes: credencial.notes || '',
              credential_type: credencial.credential_type || 'login',
              custom_fields: encryptedCustomFields
            })}`
          };
          delete fallbackCredential.custom_fields;
          delete fallbackCredential.credential_type;
          await supabase.from('credenciais').insert([fallbackCredential]);
        }
      } catch (err) {
        console.warn('Supabase credential insert offline:', err);
      }
      
      toast.success('Credenciais salvas com sucesso! (Criptografadas)');
    } catch (error) {
      console.error('Error adding credential:', error);
      toast.error('Erro ao salvar credenciais');
    } finally {
      set({ loading: false });
    }
  },
  
  updateCredencial: async (id, credencialData) => {
    set({ loading: true });
    
    try {
      const currentCredential = Object.values(get().credenciais).find(cred => cred.id === id);
      if (!currentCredential) {
        throw new Error('Credencial não encontrada');
      }

      const userId = currentCredential.user_id;

      const processedCustomFields = credencialData.custom_fields !== undefined 
        ? credencialData.custom_fields 
        : currentCredential.custom_fields;

      const encryptedCustomFields = processedCustomFields?.map(f => {
        if (f.type === 'password' && f.value) {
          return { ...f, value: encryptPassword(f.value, userId) };
        }
        return f;
      }) || [];
      
      const localData = {
        ...credencialData,
        custom_fields: processedCustomFields
      };
      
      const updatedCredential = { ...currentCredential, ...localData };
      const updatedCreds = {
        ...get().credenciais,
        [updatedCredential.link_id]: updatedCredential as Credencial
      };
      
      set({ credenciais: updatedCreds });
      setCached(CACHE_KEYS.CREDENCIAIS, updatedCreds);

      try {
        const encryptedData: Record<string, unknown> = {
          ...credencialData,
          password: credencialData.password ? encryptPassword(credencialData.password, userId) : credencialData.password,
          custom_fields: encryptedCustomFields
        };
        
        const { error } = await supabase
          .from('credenciais')
          .update(encryptedData)
          .eq('id', id);
          
        if (error && (error.message?.includes('custom_fields') || error.message?.includes('credential_type') || error.code === '42703' || error.message?.includes('column'))) {
          const fallbackData = {
            ...encryptedData,
            custom_fields: undefined,
            credential_type: undefined,
            notes: `__CUSTOM_FIELDS_JSON__:${JSON.stringify({
              notes: credencialData.notes !== undefined ? credencialData.notes : (currentCredential.notes || ''),
              credential_type: credencialData.credential_type || currentCredential.credential_type || 'login',
              custom_fields: encryptedCustomFields
            })}`
          };
          delete fallbackData.custom_fields;
          delete fallbackData.credential_type;
          await supabase.from('credenciais').update(fallbackData).eq('id', id);
        }
      } catch (err) {
        console.warn('Supabase credential update offline:', err);
      }
      
      toast.success('Credenciais atualizadas com sucesso! (Criptografadas)');
    } catch (error) {
      console.error('Error updating credential:', error);
      toast.error('Erro ao atualizar credenciais');
    } finally {
      set({ loading: false });
    }
  },
  
  deleteCredencial: async (id) => {
    set({ loading: true });
    
    try {
      const newCredentials = { ...get().credenciais };
      Object.keys(newCredentials).forEach(linkId => {
        if (newCredentials[linkId].id === id) {
          delete newCredentials[linkId];
        }
      });
      
      set({ credenciais: newCredentials });
      setCached(CACHE_KEYS.CREDENCIAIS, newCredentials);

      try {
        await supabase
          .from('credenciais')
          .delete()
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase credential delete offline:', err);
      }
      
      toast.success('Credenciais removidas com sucesso!');
    } catch (error) {
      console.error('Error deleting credential:', error);
      toast.error('Erro ao remover credenciais');
    } finally {
      set({ loading: false });
    }
  },
  
  getCredencialByLinkId: (linkId: string) => {
    return get().credenciais[linkId];
  },
  
  getLinkPreview: async (url: string): Promise<string | null> => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        const videoId = url.includes('youtu.be/') 
          ? url.split('youtu.be/')[1].split('?')[0]
          : url.includes('v=') 
            ? url.split('v=')[1].split('&')[0] 
            : null;
            
        if (videoId) {
          return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
      }
      
      if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
        return 'https://abs.twimg.com/responsive-web/client-web/icon-ios.b1fc7275.png';
      }
      
      if (hostname.includes('facebook.com')) {
        return 'https://static.xx.fbcdn.net/rsrc.php/y8/r/dF5SId3UHWd.svg';
      }
      
      if (hostname.includes('instagram.com')) {
        return 'https://static.cdninstagram.com/rsrc.php/v3/yR/r/herXYgy4.png';
      }
      
      if (hostname.includes('linkedin.com')) {
        return 'https://static.licdn.com/sc/h/akt4ae504epesldzj74dzred8';
      }
      
      if (hostname.includes('github.com')) {
        return 'https://github.githubassets.com/assets/github-mark-9be88460eaa6.svg';
      }
      
      return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${hostname}&size=128`;
    } catch (error) {
      console.debug('Error generating link preview:', error);
      return null;
    }
  }
}));
