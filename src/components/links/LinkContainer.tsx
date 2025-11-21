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
    selectedSubcategoryId
  } = useLinkStore();
  
  const [isLinkFormOpen, setIsLinkFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  
  // Get links to display based on search status and category selection
  let displayLinks = searchQuery ? searchResults : links;
  
  // Filter by selected category if any
  if (selectedCategoryId) {
    displayLinks = displayLinks.filter(link => link.categoria_id === selectedCategoryId);
  }
  
  // Filter by selected subcategory if any
  if (selectedSubcategoryId) {
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
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">
          {searchQuery 
            ? `Resultados para "${searchQuery}" (${displayLinks.length})`
            : selectedCategoryId && selectedSubcategoryId
              ? `${categorias.find(cat => cat.id === selectedCategoryId)?.nome || ''} > ${subcategorias.find(sub => sub.id === selectedSubcategoryId)?.nome || ''} (${displayLinks.length})`
              : selectedCategoryId
                ? `${categorias.find(cat => cat.id === selectedCategoryId)?.nome || ''} (${displayLinks.length})`
                : selectedSubcategoryId
                  ? `${subcategorias.find(sub => sub.id === selectedSubcategoryId)?.nome || ''} (${displayLinks.length})`
                  : 'Seus Links'
          }
        </h2>
        <Button onClick={handleAddLink}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar Link
        </Button>
      </div>
      
      <div className="flex-grow overflow-auto p-4">
        {displayLinks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">
              {searchQuery 
                ? 'Nenhum resultado encontrado para sua busca'
                : 'Você ainda não possui links cadastrados'
              }
            </p>
            {!searchQuery && (
              <Button 
                variant="outline"
                className="mt-4"
                onClick={handleAddLink}
              >
                <Plus className="h-4 w-4 mr-2" /> Adicionar seu primeiro link
              </Button>
            )}
          </div>
        ) : (
          viewMode === 'lista' ? (
            <div className="space-y-4">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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