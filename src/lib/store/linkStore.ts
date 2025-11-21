import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Categoria, Link, Subcategoria, Credencial } from '@/types/supabase';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { encryptPassword, decryptPassword, isEncrypted } from '@/lib/utils/encryption';

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
  
  // Fetch data
  fetchLinks: (userId: string) => Promise<void>;
  fetchCategorias: () => Promise<void>;
  fetchSubcategorias: () => Promise<void>;
  fetchCredenciais: (userId: string) => Promise<void>;
  
  // Links CRUD
  addLink: (link: Omit<Link, 'id' | 'created_at'>) => Promise<string>;
  updateLink: (id: string, link: Partial<Link>) => Promise<void>;
  deleteLink: (id: string) => Promise<void>;
  
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
  
  // Link preview
  getLinkPreview: (url: string) => Promise<string | null>;
}

export const useLinkStore = create<LinkState>((set, get) => ({
  links: [],
  categorias: [],
  subcategorias: [],
  credenciais: {},
  loading: false,
  viewMode: 'lista',
  searchQuery: '',
  searchResults: [],
  selectedCategoryId: null,
  selectedSubcategoryId: null,
  
  fetchLinks: async (userId: string) => {
    set({ loading: true });
    
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      set({ links: data as Link[] });
    } catch (error) {
      console.error('Error fetching links:', error);
      toast.error('Erro ao carregar links');
    } finally {
      set({ loading: false });
    }
  },
  
  fetchCategorias: async () => {
    set({ loading: true });
    
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nome');
        
      if (error) throw error;
      
      set({ categorias: data as Categoria[] });
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Erro ao carregar categorias');
    } finally {
      set({ loading: false });
    }
  },
  
  fetchSubcategorias: async () => {
    set({ loading: true });
    
    try {
      const { data, error } = await supabase
        .from('subcategorias')
        .select('*')
        .order('nome');
        
      if (error) throw error;
      
      set({ subcategorias: data as Subcategoria[] });
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      toast.error('Erro ao carregar subcategorias');
    } finally {
      set({ loading: false });
    }
  },
  
  addLink: async (link) => {
    set({ loading: true });
    let newLinkId = '';
    
    try {
      // Get link preview
      const imageUrl = await get().getLinkPreview(link.url);
      
      newLinkId = uuidv4();
      const newLink = {
        ...link,
        id: newLinkId,
        imagem_url: imageUrl,
        created_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('links')
        .insert([newLink]);
        
      if (error) throw error;
      
      set(state => ({ 
        links: [newLink as Link, ...state.links] 
      }));
      
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
      // If URL changed, update preview image
      if (linkData.url) {
        linkData.imagem_url = await get().getLinkPreview(linkData.url);
      }
      
      const { error } = await supabase
        .from('links')
        .update(linkData)
        .eq('id', id);
        
      if (error) throw error;
      
      set(state => ({
        links: state.links.map(link => 
          link.id === id ? { ...link, ...linkData } : link
        )
      }));
      
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
      const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      set(state => ({
        links: state.links.filter(link => link.id !== id)
      }));
      
      toast.success('Link removido com sucesso!');
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.error('Erro ao remover link');
    } finally {
      set({ loading: false });
    }
  },
  
  addCategoria: async (nome) => {
    set({ loading: true });
    
    try {
      const newCategoria = {
        id: uuidv4(),
        nome,
        created_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('categorias')
        .insert([newCategoria]);
        
      if (error) throw error;
      
      set(state => ({ 
        categorias: [...state.categorias, newCategoria as Categoria].sort((a, b) => a.nome.localeCompare(b.nome))
      }));
      
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
      const { error } = await supabase
        .from('categorias')
        .update({ nome })
        .eq('id', id);
        
      if (error) throw error;
      
      set(state => ({
        categorias: state.categorias.map(cat => 
          cat.id === id ? { ...cat, nome } : cat
        ).sort((a, b) => a.nome.localeCompare(b.nome))
      }));
      
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
      const { data: linksData, error: linksError } = await supabase
        .from('links')
        .select('id')
        .eq('categoria_id', id);
        
      if (linksError) throw linksError;
      
      if (linksData && linksData.length > 0) {
        toast.error('Não é possível excluir uma categoria que possui links associados');
        set({ loading: false });
        return;
      }
      
      // Check if there are subcategories
      const { data: subData, error: subError } = await supabase
        .from('subcategorias')
        .select('id')
        .eq('categoria_id', id);
        
      if (subError) throw subError;
      
      if (subData && subData.length > 0) {
        toast.error('Não é possível excluir uma categoria que possui subcategorias');
        set({ loading: false });
        return;
      }
      
      // Delete the category
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      set(state => ({
        categorias: state.categorias.filter(cat => cat.id !== id)
      }));
      
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
      const newSubcategoria = {
        id: uuidv4(),
        nome,
        categoria_id: categoriaId,
        created_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('subcategorias')
        .insert([newSubcategoria]);
        
      if (error) throw error;
      
      set(state => ({ 
        subcategorias: [...state.subcategorias, newSubcategoria as Subcategoria].sort((a, b) => a.nome.localeCompare(b.nome))
      }));
      
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
      const { error } = await supabase
        .from('subcategorias')
        .update({ nome, categoria_id: categoriaId })
        .eq('id', id);
        
      if (error) throw error;
      
      set(state => ({
        subcategorias: state.subcategorias.map(sub => 
          sub.id === id ? { ...sub, nome, categoria_id: categoriaId } : sub
        ).sort((a, b) => a.nome.localeCompare(b.nome))
      }));
      
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
      const { data, error: linksError } = await supabase
        .from('links')
        .select('id')
        .eq('subcategoria_id', id);
        
      if (linksError) throw linksError;
      
      if (data && data.length > 0) {
        toast.error('Não é possível excluir uma subcategoria que possui links associados');
        set({ loading: false });
        return;
      }
      
      // Delete the subcategory
      const { error } = await supabase
        .from('subcategorias')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      set(state => ({
        subcategorias: state.subcategorias.filter(sub => sub.id !== id)
      }));
      
      toast.success('Subcategoria removida com sucesso!');
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      toast.error('Erro ao remover subcategoria');
    } finally {
      set({ loading: false });
    }
  },
  
  setViewMode: (mode) => {
    set({ viewMode: mode });
  },
  
  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },
  
  setSelectedCategoryId: (categoryId) => {
    set({ 
      selectedCategoryId: categoryId,
      // Clear subcategory selection when changing category
      selectedSubcategoryId: null
    });
  },
  
  setSelectedSubcategoryId: (subcategoryId) => {
    set({ selectedSubcategoryId: subcategoryId });
  },
  
  searchLinks: async (userId: string) => {
    const query = get().searchQuery.toLowerCase().trim();
    
    if (!query) {
      set({ searchResults: [] });
      return;
    }
    
    set({ loading: true });
    
    try {
      // Using Supabase's full-text search capabilities
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', userId)
        .or(`titulo.ilike.%${query}%,descricao.ilike.%${query}%`)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Get categories and subcategories for further filtering
      const categorias = get().categorias;
      const subcategorias = get().subcategorias;
      
      // Further filter by categoria and subcategoria
      const results = data as Link[];
      
      // Filter by category/subcategory name if query matches
      const matchingCategorias = categorias.filter(cat => 
        cat.nome.toLowerCase().includes(query)
      );
      
      const matchingSubcategorias = subcategorias.filter(sub => 
        sub.nome.toLowerCase().includes(query)
      );
      
      // Add links that match by category/subcategory
      if (matchingCategorias.length > 0 || matchingSubcategorias.length > 0) {
        const { data: additionalLinks, error: additionalError } = await supabase
          .from('links')
          .select('*')
          .eq('user_id', userId)
          .in('categoria_id', matchingCategorias.map(c => c.id))
          .order('created_at', { ascending: false });
          
        if (!additionalError && additionalLinks) {
          // Add links that weren't already in results
          const existingIds = new Set(results.map(link => link.id));
          additionalLinks.forEach(link => {
            if (!existingIds.has(link.id)) {
              results.push(link as Link);
              existingIds.add(link.id);
            }
          });
        }
        
        // Add links by subcategory
        if (matchingSubcategorias.length > 0) {
          const { data: subLinks, error: subError } = await supabase
            .from('links')
            .select('*')
            .eq('user_id', userId)
            .in('subcategoria_id', matchingSubcategorias.map(s => s.id))
            .order('created_at', { ascending: false });
            
          if (!subError && subLinks) {
            // Add links that weren't already in results
            const existingIds = new Set(results.map(link => link.id));
            subLinks.forEach(link => {
              if (!existingIds.has(link.id)) {
                results.push(link as Link);
                existingIds.add(link.id);
              }
            });
          }
        }
      }
      
      set({ searchResults: results });
    } catch (error) {
      console.error('Error searching links:', error);
      toast.error('Erro ao pesquisar links');
    } finally {
      set({ loading: false });
    }
  },
  
  fetchCredenciais: async (userId: string) => {
    set({ loading: true });
    
    try {
      const { data, error } = await supabase
        .from('credenciais')
        .select('*')
        .eq('user_id', userId);
        
      if (error) throw error;
      
      const credsMap: Record<string, Credencial> = {};
      (data as Credencial[]).forEach(cred => {
        // Descriptografar senha se estiver criptografada
        if (cred.password && isEncrypted(cred.password)) {
          try {
            cred.password = decryptPassword(cred.password, userId);
          } catch (error) {
            console.error('Error decrypting password for credential:', cred.id);
            // Manter a senha criptografada se não conseguir descriptografar
          }
        }
        credsMap[cred.link_id] = cred;
      });
      
      set({ credenciais: credsMap });
    } catch (error) {
      console.error('Error fetching credenciais:', error);
      toast.error('Erro ao carregar credenciais');
    } finally {
      set({ loading: false });
    }
  },
  
  addCredencial: async (credencial) => {
    set({ loading: true });
    
    try {
      // Criptografar a senha antes de salvar
      const encryptedCredential = {
        ...credencial,
        password: credencial.password ? encryptPassword(credencial.password, credencial.user_id) : null,
        id: uuidv4(),
        created_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('credenciais')
        .insert([encryptedCredential]);
        
      if (error) throw error;
      
      // Manter a senha descriptografada no estado local
      const localCredential = {
        ...encryptedCredential,
        password: credencial.password // Senha original para o estado local
      };
      
      set(state => ({ 
        credenciais: { 
          ...state.credenciais, 
          [credencial.link_id]: localCredential as Credencial 
        } 
      }));
      
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
      // Encontrar a credencial atual para obter o user_id
      const currentCredential = Object.values(get().credenciais).find(cred => cred.id === id);
      if (!currentCredential) {
        throw new Error('Credencial não encontrada');
      }
      
      // Criptografar a senha se foi fornecida
      const encryptedData = {
        ...credencialData,
        password: credencialData.password ? encryptPassword(credencialData.password, currentCredential.user_id) : credencialData.password
      };
      
      const { error } = await supabase
        .from('credenciais')
        .update(encryptedData)
        .eq('id', id);
        
      if (error) throw error;
      
      // Manter a senha descriptografada no estado local
      const localData = {
        ...credencialData // Dados originais para o estado local
      };
      
      set(state => {
        const updatedCredential = { ...currentCredential, ...localData };
        return {
          credenciais: { 
            ...state.credenciais, 
            [updatedCredential.link_id]: updatedCredential as Credencial 
          }
        };
      });
      
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
      const { error } = await supabase
        .from('credenciais')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      set(state => {
        const newCredentials = { ...state.credenciais };
        // Find and remove credential by id
        Object.keys(newCredentials).forEach(linkId => {
          if (newCredentials[linkId].id === id) {
            delete newCredentials[linkId];
          }
        });
        return { credenciais: newCredentials };
      });
      
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
      // Instead of trying to fetch the actual page (which may fail due to CORS),
      // use common patterns to generate a preview
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // Common patterns for favicons and logos
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        // For YouTube links, extract video ID and use thumbnail
        const videoId = url.includes('youtu.be/') 
          ? url.split('youtu.be/')[1].split('?')[0]
          : url.includes('v=') 
            ? url.split('v=')[1].split('&')[0] 
            : null;
            
        if (videoId) {
          return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
      }
      
      // Check for common social media sites
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
      
      // For general sites, try to use a service that generates website previews
      return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${hostname}&size=128`;
      
    } catch (error) {
      console.error('Error generating link preview:', error);
      return null;
    }
  }
}));