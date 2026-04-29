import { useState, useEffect } from 'react';
import { useLinkStore } from '@/lib/store/linkStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, Plus, Edit2, Trash, Tag, Star, Clock, Home, Settings, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Categoria, Subcategoria } from '@/types/supabase';
import { Badge } from '@/components/ui/badge';

export function Sidebar() {
  const {
    links,
    categorias,
    subcategorias,
    selectedCategoryId,
    selectedSubcategoryId,
    favoriteIds,
    recentIds,
    fetchCategorias,
    fetchSubcategorias,
    addCategoria,
    updateCategoria,
    deleteCategoria,
    addSubcategoria,
    updateSubcategoria,
    deleteSubcategoria,
    setSelectedCategoryId,
    setSelectedSubcategoryId,
    trackRecentLink,
    activeFilter,
    setActiveFilter
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

  const handleLinkClick = (id: string, url: string) => {
    trackRecentLink(id);
    window.open(url, '_blank');
  };

  const favoriteLinks = links.filter(link => favoriteIds.includes(link.id));
  const recentLinks = links
    .filter(link => recentIds.includes(link.id))
    .sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id));

  const resetFilters = () => {
    setSelectedCategoryId(null);
    setSelectedSubcategoryId(null);
    setActiveFilter('all');
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
      <div className="h-full w-full flex flex-col glass-card border-y-0 border-l-0">
        <div className="p-4 space-y-4 flex-shrink-0">
          <Button
            className="w-full shadow-sm rounded-xl font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-all border-none"
            onClick={() => openCategoryDialog()}
          >
            <Plus className="h-4 w-4" /> Nova categoria
          </Button>

          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start gap-3 rounded-xl h-10 px-3 transition-all",
                activeFilter === 'all' && !selectedCategoryId ? "bg-secondary text-foreground font-bold" : "text-zinc-500 hover:bg-secondary/80"
              )}
              onClick={resetFilters}
            >
              <Home className="h-4 w-4" />
              <span className="text-sm">Todos os Links</span>
              <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 h-4 min-w-[1.25rem] border-none bg-zinc-200 text-zinc-600">
                {links.length}
              </Badge>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start gap-3 rounded-xl h-10 px-3 transition-all",
                activeFilter === 'favorites' ? "bg-secondary text-foreground font-bold" : "text-zinc-500 hover:bg-secondary/80"
              )}
              onClick={() => setActiveFilter('favorites')}
            >
              <Star className={cn("h-4 w-4", activeFilter === 'favorites' && "fill-zinc-600")} />
              <span className="text-sm">Favoritos</span>
              {favoriteLinks.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 h-4 border-none bg-zinc-200 text-zinc-600">
                  {favoriteLinks.length}
                </Badge>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start gap-3 rounded-xl h-10 px-3 transition-all",
                activeFilter === 'recent' ? "bg-secondary text-foreground font-bold" : "text-zinc-500 hover:bg-secondary/80"
              )}
              onClick={() => setActiveFilter('recent')}
            >
              <Clock className="h-4 w-4" />
              <span className="text-sm">Recentes</span>
            </Button>
          </div>
        </div>

        <div className="px-4 py-2 flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-muted-foreground px-2">Categorias</h3>
          <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full" onClick={() => openCategoryDialog()}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2 pb-4">
          <div className="space-y-1">
            {categorias && categorias.length > 0 ? categorias.map(categoria => (
              <div key={categoria.id} className="group">
                <div
                  className={cn(
                    "flex items-center justify-between rounded-xl px-2 py-2 hover:bg-muted/50 transition-all cursor-pointer",
                    selectedCategoryId === categoria.id && "bg-primary/5 text-primary ring-1 ring-primary/10"
                  )}
                  onClick={() => {
                    setSelectedCategoryId(categoria.id);
                    setActiveFilter('all');
                    if (!expandedCategories.includes(categoria.id)) {
                      toggleCategory(categoria.id);
                    }
                  }}
                >
                  <div className="flex items-center text-left flex-1 min-w-0">
                    <button
                      className="p-1 hover:bg-primary/10 rounded-md mr-1 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategory(categoria.id);
                      }}
                    >
                      {expandedCategories.includes(categoria.id) ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <span className="text-sm font-bold truncate dark:text-zinc-200 group-hover:dark:text-white transition-colors">{categoria.nome}</span>
                  </div>

                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCategoryDialog(true, categoria);
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(categoria.id);
                      }}
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {expandedCategories.includes(categoria.id) && (
                  <div className="ml-7 mt-1 space-y-0.5 animate-in slide-in-from-left-2 duration-200">
                    {subcategorias
                      .filter(sub => sub.categoria_id === categoria.id)
                      .map(subcategoria => (
                        <div
                          key={subcategoria.id}
                          className={cn(
                            "flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-all cursor-pointer group/sub",
                            selectedSubcategoryId === subcategoria.id ? "text-primary bg-primary/5 font-medium" : "text-muted-foreground hover:bg-muted/30"
                          )}
                          onClick={() => setSelectedSubcategoryId(subcategoria.id)}
                        >
                          <span className="flex-1 truncate text-xs dark:text-zinc-400 dark:group-hover/sub:text-zinc-200 transition-colors">{subcategoria.nome}</span>

                          <div className="flex items-center opacity-0 group-hover/sub:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-md"
                              onClick={(e) => {
                                e.stopPropagation();
                                openSubcategoryDialog(true, subcategoria);
                              }}
                            >
                              <Edit2 className="h-2.5 w-2.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-md"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubcategory(subcategoria.id);
                              }}
                            >
                              <Trash className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    }

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-[10px] h-7 justify-start text-muted-foreground hover:text-primary rounded-lg"
                      onClick={() => openSubcategoryDialog(false, undefined, categoria.id)}
                    >
                      <Plus className="h-3 w-3 mr-1.5" /> Nova subcategoria
                    </Button>
                  </div>
                )}
              </div>
            )) : (
              <div className="text-center py-8 px-4">
                <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <Tag className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground text-xs font-medium">Nenhuma categoria</p>
                <p className="text-muted-foreground/60 text-[10px] mt-1 italic">Organize seus links criando sua primeira categoria.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {activeFilter === 'recent' && recentLinks.length > 0 && (
          <div className="p-4 border-t bg-muted/20">
            <h4 className="text-[10px] font-bold text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="h-3 w-3" /> Acessados Recentemente
            </h4>
            <div className="space-y-2">
              {recentLinks.slice(0, 5).map(link => (
                <div
                  key={link.id}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer group"
                  onClick={() => handleLinkClick(link.id, link.url)}
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                  <span className="truncate flex-1">{link.titulo}</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100" />
                </div>
              ))}
            </div>
          </div>
        )}
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