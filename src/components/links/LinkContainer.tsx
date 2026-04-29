import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useLinkStore } from '@/lib/store/linkStore';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { LinkCard } from './LinkCard';
import { LinkListItem } from './LinkListItem';
import { LinkForm } from './LinkForm';
import { Link } from '@/types/supabase';

export function LinkContainer() {
  const { user } = useAuthStore();
  const { 
    links, 
    categorias, 
    subcategorias, 
    fetchLinks,
    viewMode,
    searchQuery,
    searchResults,
    selectedCategoryId,
    selectedSubcategoryId,
    activeFilter,
    favoriteIds,
    recentIds
  } = useLinkStore();
  
  const [isLinkFormOpen, setIsLinkFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  
  // Get base links based on active filter
  let baseLinks = links;
  if (activeFilter === 'favorites') {
    baseLinks = links.filter(link => favoriteIds.includes(link.id));
  } else if (activeFilter === 'recent') {
    // Sort by recentIds order
    baseLinks = links
      .filter(link => recentIds.includes(link.id))
      .sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id));
  }

  // Apply search query if present
  let displayLinks = searchQuery ? searchResults : baseLinks;
  
  // Filter by selected category if any (only if not searching)
  if (!searchQuery && selectedCategoryId) {
    displayLinks = displayLinks.filter(link => link.categoria_id === selectedCategoryId);
  }
  
  // Filter by selected subcategory if any (only if not searching)
  if (!searchQuery && selectedSubcategoryId) {
    displayLinks = displayLinks.filter(link => link.subcategoria_id === selectedSubcategoryId);
  }
  
  useEffect(() => {
    if (user) {
      fetchLinks(user.id);
    }
  }, [user, fetchLinks]);
  
  const handleAddLink = () => {
    setEditingLink(null);
    setIsLinkFormOpen(true);
  };
  
  const handleEditLink = (link: Link) => {
    setEditingLink(link);
    setIsLinkFormOpen(true);
  };
  
  // Find categoria and subcategoria for a link
  const getCategoriaForLink = (categoriaId: string) => {
    return categorias.find(cat => cat.id === categoriaId);
  };
  
  const getSubcategoriaForLink = (subcategoriaId: string | null) => {
    if (!subcategoriaId) return undefined;
    return subcategorias.find(sub => sub.id === subcategoriaId);
  };

  const getHeaderTitle = () => {
    if (searchQuery) return `Resultados para "${searchQuery}"`;
    if (activeFilter === 'favorites') return 'Links Favoritos';
    if (activeFilter === 'recent') return 'Acessados Recentemente';
    
    if (selectedCategoryId && selectedSubcategoryId) {
      const cat = categorias.find(cat => cat.id === selectedCategoryId);
      const sub = subcategorias.find(sub => sub.id === selectedSubcategoryId);
      return `${cat?.nome || ''} > ${sub?.nome || ''}`;
    }
    
    if (selectedCategoryId) {
      const cat = categorias.find(cat => cat.id === selectedCategoryId);
      return cat?.nome || 'Categoria';
    }
    
    return 'Todos os Links';
  };
  
  return (
    <div className="h-full flex flex-col bg-zinc-50/30">
      <div className="p-4 md:p-8 glass flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/50">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {getHeaderTitle()}
          </h2>
          <p className="text-sm font-medium text-zinc-400 mt-1">
            {displayLinks.length} {displayLinks.length === 1 ? 'link encontrado' : 'links encontrados'}
          </p>
        </div>
        <Button 
          onClick={handleAddLink} 
          className="shadow-sm rounded-xl px-8 h-12 font-bold bg-primary hover:bg-primary/90 text-white transition-all transform hover:-translate-y-0.5 border-none"
        >
          <Plus className="h-5 w-5 mr-2" /> Adicionar Link
        </Button>
      </div>
      
      <div className="flex-grow overflow-auto p-4 md:p-6">
        {displayLinks.length === 0 ? (
          <div className="text-center py-20 animate-in fade-in zoom-in duration-500">
            <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {searchQuery ? 'Nenhum resultado' : 'Nada por aqui ainda'}
            </h3>
            <p className="text-muted-foreground max-w-xs mx-auto mt-2">
              {searchQuery 
                ? `Não encontramos nada para "${searchQuery}". Tente outros termos.`
                : activeFilter === 'favorites' 
                  ? 'Você ainda não favoritou nenhum link.'
                  : 'Sua lista está vazia. Comece adicionando seu primeiro link!'
              }
            </p>
            {!searchQuery && (
              <Button 
                variant="outline"
                className="mt-6 rounded-xl"
                onClick={handleAddLink}
              >
                <Plus className="h-4 w-4 mr-2" /> Novo link
              </Button>
            )}
          </div>
        ) : (
          viewMode === 'lista' ? (
            <div className="space-y-3 max-w-5xl mx-auto">
              {displayLinks.map(link => (
                <LinkListItem 
                  key={link.id} 
                  link={link}
                  categoria={getCategoriaForLink(link.categoria_id)}
                  subcategoria={getSubcategoriaForLink(link.subcategoria_id)}
                  onEdit={handleEditLink}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
              {displayLinks.map(link => (
                <LinkCard 
                  key={link.id} 
                  link={link}
                  categoria={getCategoriaForLink(link.categoria_id)}
                  subcategoria={getSubcategoriaForLink(link.subcategoria_id)}
                  onEdit={handleEditLink}
                />
              ))}
            </div>
          )
        )}
      </div>
      
      <LinkForm 
        open={isLinkFormOpen}
        onOpenChange={setIsLinkFormOpen}
        editingLink={editingLink}
      />
    </div>
  );
}