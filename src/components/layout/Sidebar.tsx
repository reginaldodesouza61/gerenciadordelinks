import { useState, useEffect } from 'react';
import { useLinkStore } from '@/lib/store/linkStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, Plus, Edit2, Trash, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Categoria, Subcategoria } from '@/types/supabase';

export function Sidebar() {
  const { 
    categorias, 
    subcategorias, 
    selectedCategoryId,
    selectedSubcategoryId,
    fetchCategorias, 
    fetchSubcategorias,
    addCategoria,
    updateCategoria,
    deleteCategoria,
    addSubcategoria,
    updateSubcategoria,
    deleteSubcategoria,
    setSelectedCategoryId,
    setSelectedSubcategoryId
  } = useLinkStore();
  
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  
  // State for category dialog
  const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
  
  // State for subcategory dialog
  const [isSubcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [subcategoryName, setSubcategoryName] = useState('');
  const [subcategoryCategoryId, setSubcategoryCategoryId] = useState<string>('');
  const [isEditingSubcategory, setIsEditingSubcategory] = useState(false);
  const [currentSubcategoryId, setCurrentSubcategoryId] = useState<string | null>(null);
  
  useEffect(() => {
    fetchCategorias();
    fetchSubcategorias();
  }, [fetchCategorias, fetchSubcategorias]);
  
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };
  
  // Category dialog handlers
  const openCategoryDialog = (isEditing = false, category?: Categoria) => {
    setIsEditingCategory(isEditing);
    setCategoryName(isEditing && category ? category.nome : '');
    setCurrentCategoryId(isEditing && category ? category.id : null);
    setCategoryDialogOpen(true);
  };
  
  const handleCategorySubmit = async () => {
    if (!categoryName.trim()) return;
    
    if (isEditingCategory && currentCategoryId) {
      await updateCategoria(currentCategoryId, categoryName);
    } else {
      await addCategoria(categoryName);
    }
    
    setCategoryDialogOpen(false);
    setCategoryName('');
    setCurrentCategoryId(null);
  };
  
  const handleDeleteCategory = async (categoryId: string) => {
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      await deleteCategoria(categoryId);
    }
  };
  
  // Subcategory dialog handlers
  const openSubcategoryDialog = (isEditing = false, subcategory?: Subcategoria, categoryId?: string) => {
    setIsEditingSubcategory(isEditing);
    setSubcategoryName(isEditing && subcategory ? subcategory.nome : '');
    setSubcategoryCategoryId(
      isEditing && subcategory 
        ? subcategory.categoria_id 
        : categoryId || ''
    );
    setCurrentSubcategoryId(isEditing && subcategory ? subcategory.id : null);
    setSubcategoryDialogOpen(true);
  };
  
  const handleSubcategorySubmit = async () => {
    if (!subcategoryName.trim() || !subcategoryCategoryId) return;
    
    if (isEditingSubcategory && currentSubcategoryId) {
      await updateSubcategoria(currentSubcategoryId, subcategoryName, subcategoryCategoryId);
    } else {
      await addSubcategoria(subcategoryName, subcategoryCategoryId);
    }
    
    setSubcategoryDialogOpen(false);
    setSubcategoryName('');
    setSubcategoryCategoryId('');
    setCurrentSubcategoryId(null);
  };
  
  const handleDeleteSubcategory = async (subcategoryId: string) => {
    if (confirm('Tem certeza que deseja excluir esta subcategoria?')) {
      await deleteSubcategoria(subcategoryId);
    }
  };
  
  return (
    <>
      <div className="bg-white border-r h-full w-full md:w-64">
        <div className="p-3 md:p-4 border-b">
          <h2 className="font-semibold text-sm md:text-base">Categorias</h2>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2 text-xs md:text-sm"
            onClick={() => openCategoryDialog()}
          >
            <Plus className="h-4 w-4 mr-2" /> Nova categoria
          </Button>
          {(selectedCategoryId || selectedSubcategoryId) && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={() => {
                setSelectedCategoryId(null);
                setSelectedSubcategoryId(null);
              }}
            >
              Mostrar todos os links
            </Button>
          )}
        </div>
        
        <ScrollArea className="flex-1 h-full">
          <div className="p-2 md:p-3">
            {categorias.map(categoria => (
              <div key={categoria.id} className="mb-1">
                <div 
                  className={cn(
                    "flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-gray-100",
                    selectedCategoryId === categoria.id && "bg-primary/10"
                  )}
                >
                  <button 
                    className="flex items-center text-left flex-1" 
                    onClick={() => toggleCategory(categoria.id)}
                  >
                    {expandedCategories.includes(categoria.id) ? (
                      <ChevronDown className="h-4 w-4 mr-1" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-1" />
                    )}
                    <span>{categoria.nome}</span>
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategoryId(selectedCategoryId === categoria.id ? null : categoria.id);
                      }}
                    >
                      <Tag className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={(e) => {
                        e.stopPropagation();
                        openCategoryDialog(true, categoria);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(categoria.id);
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {expandedCategories.includes(categoria.id) && (
                  <div className="ml-6 mt-1 space-y-1">
                    {subcategorias
                      .filter(sub => sub.categoria_id === categoria.id)
                      .map(subcategoria => (
                        <div 
                          key={subcategoria.id} 
                          className={cn(
                            "flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-gray-100",
                            selectedSubcategoryId === subcategoria.id && "bg-primary/10"
                          )}
                        >
                          <button 
                            className="text-left flex-1 truncate"
                            onClick={() => setSelectedSubcategoryId(selectedSubcategoryId === subcategoria.id ? null : subcategoria.id)}
                          >
                            {subcategoria.nome}
                          </button>
                          
                          <div className="flex items-center space-x-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6" 
                              onClick={() => openSubcategoryDialog(true, subcategoria)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6" 
                              onClick={() => handleDeleteSubcategory(subcategoria.id)}
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    }
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-xs justify-start"
                      onClick={() => openSubcategoryDialog(false, undefined, categoria.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Nova subcategoria
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nome da categoria</Label>
              <Input 
                id="category-name"
                value={categoryName} 
                onChange={(e) => setCategoryName(e.target.value)} 
                placeholder="Ex: Trabalho, Estudos, Pessoal"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCategoryDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCategorySubmit}>
              {isEditingCategory ? 'Salvar alterações' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Subcategory Dialog */}
      <Dialog open={isSubcategoryDialogOpen} onOpenChange={setSubcategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditingSubcategory ? 'Editar Subcategoria' : 'Nova Subcategoria'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="subcategory-name">Nome da subcategoria</Label>
              <Input 
                id="subcategory-name"
                value={subcategoryName} 
                onChange={(e) => setSubcategoryName(e.target.value)} 
                placeholder="Ex: Frontend, Backend, Livros"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category-select">Categoria</Label>
              <Select 
                value={subcategoryCategoryId} 
                onValueChange={setSubcategoryCategoryId}
              >
                <SelectTrigger id="category-select">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(categoria => (
                    <SelectItem key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSubcategoryDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubcategorySubmit}>
              {isEditingSubcategory ? 'Salvar alterações' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}