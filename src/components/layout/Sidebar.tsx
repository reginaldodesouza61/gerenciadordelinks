import { useState, useEffect } from 'react';
import { useLinkStore } from '@/lib/store/linkStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, Plus, Edit2, Trash, Tag, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const { 
    categorias, subcategorias,
    selectedCategoryId, selectedSubcategoryId,
    fetchCategorias, fetchSubcategorias,
    addCategoria, updateCategoria, deleteCategoria,
    addSubcategoria, updateSubcategoria, deleteSubcategoria,
    setSelectedCategoryId, setSelectedSubcategoryId
  } = useLinkStore();
  
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  
  useEffect(() => {
    fetchCategorias();
    fetchSubcategorias();
  }, [fetchCategorias, fetchSubcategorias]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    );
  };

  const containerClasses = cn(
    'bg-white border-r h-full',
    'md:w-64 w-full fixed md:relative z-50 top-0 left-0 transition-transform',
    isMobileOpen ? 'translate-x-0' : '-translate-x-full',
    'md:translate-x-0'
  );

  return (
    <div className={containerClasses}>
      {/* Close button mobile */}
      {isMobileOpen && onCloseMobile && (
        <div className="flex justify-end p-2 md:hidden">
          <Button variant="ghost" onClick={onCloseMobile} size="icon">
            <X />
          </Button>
        </div>
      )}

      {/* Categorias */}
      <div className="p-4 border-b">
        <h2 className="font-semibold">Categorias</h2>
        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => addCategoria('Nova Categoria')}>
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

      <ScrollArea className="h-[calc(100vh-120px)] p-2">
        {categorias.map(c => (
          <div key={c.id} className="mb-1">
            <div className={cn("flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-gray-100",
              selectedCategoryId === c.id && "bg-primary/10"
            )}>
              <button className="flex items-center flex-1 text-left" onClick={() => toggleCategory(c.id)}>
                {expandedCategories.includes(c.id) ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
                {c.nome}
              </button>
            </div>

            {expandedCategories.includes(c.id) && (
              <div className="ml-6 mt-1 space-y-1">
                {subcategorias.filter(s => s.categoria_id === c.id).map(s => (
                  <div key={s.id} className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-gray-100">
                    <button className="text-left flex-1 truncate" onClick={() => setSelectedSubcategoryId(s.id)}>
                      {s.nome}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
