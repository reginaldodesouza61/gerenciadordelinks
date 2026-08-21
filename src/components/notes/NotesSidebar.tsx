import { useState, useEffect } from 'react';
import { useNoteStore } from '@/lib/store/noteStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit2, Trash, ChevronDown, ChevronRight, FileText, Folder, Link as LinkIcon, ChevronLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';
import { NotePage } from '@/types/notes';

interface NotesSidebarProps {
  onCollapse?: () => void;
}

export function NotesSidebar({ onCollapse }: NotesSidebarProps) {
  const { user } = useAuthStore();
  const { 
    sections, pages, 
    activeSectionId, activePageId, 
    setActiveSectionId, setActivePageId, 
    addSection, updateSection, deleteSection, 
    addPage, updatePage, deletePage 
  } = useNoteStore();

  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [expandedPages, setExpandedPages] = useState<string[]>([]);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'section' | 'page'>('section');
  const [deleteType, setDeleteType] = useState<'section' | 'page'>('page');
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [targetId, setTargetId] = useState<string>(''); // used for sectionId when creating page, or item ID when editing
  const [deleteId, setDeleteId] = useState<string>('');
  const [parentPageId, setParentPageId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  // Expand active section automatically
  useEffect(() => {
    if (activeSectionId && !expandedSections.includes(activeSectionId)) {
      setExpandedSections(prev => [...prev, activeSectionId]);
    }
  }, [activeSectionId]);

  // Expand parent pages recursively if active page is inside a subpage
  useEffect(() => {
    if (activePageId) {
      const activePage = pages.find(p => p.id === activePageId);
      if (activePage && activePage.parent_id) {
        let currentParentId = activePage.parent_id;
        const toExpand: string[] = [];
        while (currentParentId) {
          toExpand.push(currentParentId);
          const parent = pages.find(p => p.id === currentParentId);
          currentParentId = parent?.parent_id || '';
        }
        setExpandedPages(prev => {
          const unique = new Set([...prev, ...toExpand]);
          return Array.from(unique);
        });
      }
    }
  }, [activePageId, pages]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const togglePage = (id: string) => {
    setExpandedPages(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const openDialog = (
    type: 'section' | 'page', 
    mode: 'create' | 'edit', 
    id: string = '', 
    initialValue = '', 
    parentId: string | null = null
  ) => {
    setDialogType(type);
    setDialogMode(mode);
    setTargetId(id);
    setParentPageId(parentId);
    setInputValue(initialValue);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() || !user) return;
    
    if (dialogType === 'section') {
      if (dialogMode === 'create') {
        await addSection(inputValue, user.id);
      } else {
        await updateSection(targetId, inputValue);
      }
    } else {
      if (dialogMode === 'create') {
        const newPage = await addPage(inputValue, targetId, user.id, parentPageId);
        if (newPage) {
          if (parentPageId) {
            if (!expandedPages.includes(parentPageId)) {
              setExpandedPages(prev => [...prev, parentPageId]);
            }
          } else {
            if (!expandedSections.includes(targetId)) toggleSection(targetId);
          }
        }
      } else {
        await updatePage(targetId, { titulo: inputValue });
      }
    }
    
    setDialogOpen(false);
    setParentPageId(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, type: 'section' | 'page', id: string) => {
    e.stopPropagation();
    setDeleteType(type);
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteType === 'section') {
      await deleteSection(deleteId);
    } else {
      await deletePage(deleteId);
    }
    setDeleteDialogOpen(false);
  };

  // Render a page and its nested subpages recursively
  const renderPage = (page: NotePage, depth = 0) => {
    const subpages = pages.filter(p => p.parent_id === page.id);
    const hasSubpages = subpages.length > 0;
    const isExpanded = expandedPages.includes(page.id);
    const isActive = activePageId === page.id;

    return (
      <div key={page.id} className="space-y-0.5 w-full">
        <div 
          className={cn(
            "group/page flex items-center justify-between rounded-md px-2 py-1 cursor-pointer transition-colors text-sm w-full",
            isActive 
              ? "bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 font-medium" 
              : "hover:bg-gray-100 dark:hover:bg-zinc-800/60 text-gray-600 dark:text-zinc-300"
          )}
          style={{ paddingLeft: `${Math.max(8, depth * 12)}px` }}
          onClick={() => { 
            setActiveSectionId(page.section_id); 
            setActivePageId(page.id); 
          }}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
            {hasSubpages ? (
              <button
                type="button"
                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 shrink-0 text-slate-500 dark:text-zinc-400"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePage(page.id);
                }}
              >
                {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </button>
            ) : (
              <div className="w-[19px] shrink-0" />
            )}
            <FileText size={13} className={isActive ? "text-indigo-500 shrink-0" : "text-gray-400 dark:text-zinc-500 shrink-0"} />
            <span className="text-[13px] truncate" title={page.titulo}>{page.titulo}</span>
          </div>

          <div className="flex items-center shrink-0 gap-1 opacity-0 group-hover/page:opacity-100 focus-within:opacity-100 transition-opacity">
            <button 
              type="button"
              className="h-5 w-5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 flex items-center justify-center transition-colors" 
              onClick={(e) => { 
                e.stopPropagation(); 
                openDialog('page', 'create', page.section_id, '', page.id); 
              }} 
              title="Criar subpágina"
            >
              <Plus size={13} />
            </button>
            <button 
              type="button"
              className="h-5 w-5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 flex items-center justify-center transition-colors" 
              onClick={(e) => { 
                e.stopPropagation(); 
                openDialog('page', 'edit', page.id, page.titulo); 
              }} 
              title="Editar"
            >
              <Edit2 size={13} />
            </button>
            <button 
              type="button"
              className="h-5 w-5 rounded hover:bg-red-100 dark:hover:bg-red-950/60 hover:text-red-600 dark:hover:text-red-400 text-gray-500 dark:text-zinc-400 flex items-center justify-center transition-colors" 
              onClick={(e) => handleDeleteClick(e, 'page', page.id)}
              title="Excluir"
            >
              <Trash size={13} />
            </button>
          </div>
        </div>

        {/* Nested Subpages list */}
        {hasSubpages && isExpanded && (
          <div className="space-y-0.5">
            {subpages.map(subpage => renderPage(subpage, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col glass-card border-y-0 border-l-0 border-r border-border bg-white/50 dark:bg-zinc-900/50">
      <div className="p-4 flex-shrink-0 border-b border-border flex items-center gap-2">
        <Button 
          className="flex-1 shadow-sm rounded-xl font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all border-none"
          onClick={() => openDialog('section', 'create')}
        >
          <Plus className="h-4 w-4" /> Nova Seção
        </Button>
        {onCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl"
            onClick={onCollapse}
            title="Recolher menu lateral"
          >
            <ChevronLeft size={20} />
          </Button>
        )}
      </div>

      <div className="flex-1 px-3 py-4 overflow-y-auto overflow-x-hidden">
        {sections.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-zinc-400">
            <Folder className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-zinc-600" />
            <p className="text-sm font-medium">Nenhuma seção criada</p>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Crie uma seção para organizar suas notas.</p>
          </div>
        ) : (
          <div className="space-y-3 w-full">
            {sections.map(section => (
              <div key={section.id} className="space-y-1 w-full">
                {/* Section Header */}
                <div 
                  className={cn(
                    "group flex items-center justify-between rounded-lg px-2 py-1.5 cursor-pointer transition-colors w-full",
                    activeSectionId === section.id 
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300" 
                      : "hover:bg-gray-100 dark:hover:bg-zinc-800/60 text-gray-700 dark:text-zinc-200"
                  )}
                  onClick={() => {
                    setActiveSectionId(section.id);
                    toggleSection(section.id);
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0 mr-1">
                    {expandedSections.includes(section.id) ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
                    <Folder size={14} className={activeSectionId === section.id ? "text-indigo-500 shrink-0" : "text-gray-400 dark:text-zinc-500 shrink-0"} />
                    <span className="text-sm font-semibold truncate" title={section.nome}>{section.nome}</span>
                  </div>
                  <div className="flex items-center shrink-0 gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button 
                      type="button"
                      className="h-6 w-6 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-zinc-400 flex items-center justify-center transition-colors" 
                      onClick={(e) => { e.stopPropagation(); openDialog('page', 'create', section.id); }} 
                      title="Nova página"
                    >
                      <Plus size={14} />
                    </button>
                    <button 
                      type="button"
                      className="h-6 w-6 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-zinc-400 flex items-center justify-center transition-colors" 
                      onClick={(e) => { e.stopPropagation(); openDialog('section', 'edit', section.id, section.nome); }} 
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      type="button"
                      className="h-6 w-6 rounded hover:bg-red-100 dark:hover:bg-red-950/60 hover:text-red-600 dark:hover:text-red-400 text-gray-600 dark:text-zinc-400 flex items-center justify-center transition-colors" 
                      onClick={(e) => handleDeleteClick(e, 'section', section.id)} 
                      title="Excluir"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>

                {/* Pages List (Recursive) */}
                {expandedSections.includes(section.id) && (
                  <div className="ml-5 space-y-0.5 border-l-2 border-gray-100 dark:border-zinc-800 pl-1 overflow-hidden">
                    {pages.filter(p => p.section_id === section.id && !p.parent_id).length === 0 ? (
                      <div className="text-[11px] text-gray-400 dark:text-zinc-500 italic px-2 py-1">Sem páginas</div>
                    ) : (
                      pages.filter(p => p.section_id === section.id && !p.parent_id).map(page => renderPage(page, 0))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reusable Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setParentPageId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Nova ' : 'Editar '}
              {dialogType === 'section' ? 'Seção' : parentPageId ? 'Subpágina' : 'Página'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Nome</Label>
            <Input 
              autoFocus
              value={inputValue} 
              onChange={e => setInputValue(e.target.value)} 
              placeholder={dialogType === 'section' ? 'Minhas Anotações' : 'Nova Ideia...'}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setParentPageId(null); }}>Cancelar</Button>
            <Button onClick={handleSubmit}>{dialogMode === 'create' ? 'Criar' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-slate-800">Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-slate-600">
            Tem certeza que deseja excluir esta {deleteType === 'section' ? 'seção' : 'página'} e todo o seu conteúdo permanentemente? Esta ação não pode ser desfeita.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
