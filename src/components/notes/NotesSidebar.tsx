import { useState, useEffect } from 'react';
import { useNoteStore } from '@/lib/store/noteStore';
import { Button } from '@/components/ui/button';
import { 
  Plus, Edit2, Trash, ChevronDown, ChevronRight, FileText, Folder, 
  ChevronLeft, Trash2, RotateCcw, GripVertical, ChevronUp, PanelLeftClose,
  Search
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';
import { NotePage } from '@/types/notes';
import { TrashModal } from './TrashModal';
import { GlobalNotesSearchModal } from './GlobalNotesSearchModal';

interface NotesSidebarProps {
  onCollapse?: () => void;
}

export function NotesSidebar({ onCollapse }: NotesSidebarProps) {
  const { user } = useAuthStore();
  const { 
    sections, pages, 
    activeSectionId, activePageId, 
    deletedItems,
    setActiveSectionId, setActivePageId, 
    addSection, updateSection, deleteSection, 
    reorderSections, moveSection,
    addPage, updatePage, deletePage,
    reorderPages, movePage,
    restoreLastDeleted
  } = useNoteStore();

  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [expandedPages, setExpandedPages] = useState<string[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Drag and drop state for sections
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const [dropSectionPosition, setDropSectionPosition] = useState<'before' | 'after' | null>(null);

  // Drag and drop state for pages
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [dragOverPageId, setDragOverPageId] = useState<string | null>(null);
  const [dropPagePosition, setDropPagePosition] = useState<'before' | 'after' | null>(null);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
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

  // Drag and Drop handlers for section reordering
  const handleSectionDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', `section:${id}`);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedSectionId(id);
  };

  const handleSectionDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedSectionId || draggedSectionId === id) return;

    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';

    if (dragOverSectionId !== id || dropSectionPosition !== pos) {
      setDragOverSectionId(id);
      setDropSectionPosition(pos);
    }
  };

  const handleSectionDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedSectionId || draggedSectionId === targetId) {
      setDraggedSectionId(null);
      setDragOverSectionId(null);
      setDropSectionPosition(null);
      return;
    }

    const currentSections = [...sections];
    const sourceIndex = currentSections.findIndex(s => s.id === draggedSectionId);
    const targetIndex = currentSections.findIndex(s => s.id === targetId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const [moved] = currentSections.splice(sourceIndex, 1);
      let insertionIndex = currentSections.findIndex(s => s.id === targetId);
      if (dropSectionPosition === 'after') {
        insertionIndex += 1;
      }
      currentSections.splice(insertionIndex, 0, moved);
      reorderSections(currentSections);
    }

    setDraggedSectionId(null);
    setDragOverSectionId(null);
    setDropSectionPosition(null);
  };

  const handleSectionDragEnd = () => {
    setDraggedSectionId(null);
    setDragOverSectionId(null);
    setDropSectionPosition(null);
  };

  // Drag and Drop handlers for page/subpage reordering
  const handlePageDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', `page:${id}`);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedPageId(id);
  };

  const handlePageDragOver = (e: React.DragEvent, targetPage: NotePage) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedPageId || draggedPageId === targetPage.id) return;

    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';

    if (dragOverPageId !== targetPage.id || dropPagePosition !== pos) {
      setDragOverPageId(targetPage.id);
      setDropPagePosition(pos);
    }
  };

  const handlePageDrop = (e: React.DragEvent, targetPage: NotePage) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedPageId || draggedPageId === targetPage.id) {
      setDraggedPageId(null);
      setDragOverPageId(null);
      setDropPagePosition(null);
      return;
    }

    const draggedPage = pages.find(p => p.id === draggedPageId);
    if (!draggedPage) {
      setDraggedPageId(null);
      setDragOverPageId(null);
      setDropPagePosition(null);
      return;
    }

    // Reorder pages in the full list
    const currentPages = [...pages];
    const sourceIndex = currentPages.findIndex(p => p.id === draggedPageId);
    if (sourceIndex === -1) return;

    const [moved] = currentPages.splice(sourceIndex, 1);
    
    // If dragging to a different parent or section, adopt the target's parent and section
    moved.section_id = targetPage.section_id;
    moved.parent_id = targetPage.parent_id;

    let insertionIndex = currentPages.findIndex(p => p.id === targetPage.id);
    if (dropPagePosition === 'after') {
      insertionIndex += 1;
    }
    currentPages.splice(insertionIndex, 0, moved);

    // Save in store & database if parent/section changed
    if (draggedPage.section_id !== targetPage.section_id || draggedPage.parent_id !== targetPage.parent_id) {
      updatePage(moved.id, { section_id: targetPage.section_id, parent_id: targetPage.parent_id });
    }
    reorderPages(currentPages);

    setDraggedPageId(null);
    setDragOverPageId(null);
    setDropPagePosition(null);
  };

  const handlePageDragEnd = () => {
    setDraggedPageId(null);
    setDragOverPageId(null);
    setDropPagePosition(null);
  };

  // Render a page and its nested subpages recursively
  const renderPage = (page: NotePage, depth = 0, siblingsList: NotePage[] = []) => {
    const subpages = pages.filter(p => p.parent_id === page.id);
    const hasSubpages = subpages.length > 0;
    const isExpanded = expandedPages.includes(page.id);
    const isActive = activePageId === page.id;

    // Check sibling index to enable/disable up and down buttons
    const siblingIndex = siblingsList.findIndex(p => p.id === page.id);
    const isFirstSibling = siblingIndex === 0;
    const isLastSibling = siblingIndex === siblingsList.length - 1;

    const isDraggingThisPage = draggedPageId === page.id;
    const isOverThisPage = dragOverPageId === page.id;

    return (
      <div 
        key={page.id} 
        className={cn(
          "space-y-0.5 w-full transition-all duration-150 relative",
          isDraggingThisPage && "opacity-40 scale-[0.98]",
          isOverThisPage && dropPagePosition === 'before' && "border-t-2 border-indigo-500 pt-0.5",
          isOverThisPage && dropPagePosition === 'after' && "border-b-2 border-indigo-500 pb-0.5"
        )}
        draggable
        onDragStart={(e) => handlePageDragStart(e, page.id)}
        onDragOver={(e) => handlePageDragOver(e, page)}
        onDrop={(e) => handlePageDrop(e, page)}
        onDragEnd={handlePageDragEnd}
      >
        <div 
          className={cn(
            "group/page flex items-center justify-between rounded-md px-1.5 py-1 cursor-pointer transition-colors text-sm w-full select-none",
            isActive 
              ? "bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 font-medium" 
              : "hover:bg-gray-100 dark:hover:bg-zinc-800/60 text-gray-600 dark:text-zinc-300"
          )}
          style={{ paddingLeft: `${Math.max(4, depth * 12 + 4)}px` }}
          onClick={() => { 
            setActiveSectionId(page.section_id); 
            setActivePageId(page.id); 
          }}
        >
          <div className="flex items-center gap-1 flex-1 min-w-0 mr-1">
            {/* Grip handle for page drag */}
            <span
              className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-zinc-600 hover:text-slate-600 dark:hover:text-zinc-300 p-0.5 rounded transition-colors shrink-0"
              title="Arraste para reordenar esta anotação"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical size={12} />
            </span>

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
              <div className="w-[15px] shrink-0" />
            )}
            <FileText size={13} className={isActive ? "text-indigo-500 shrink-0" : "text-gray-400 dark:text-zinc-500 shrink-0"} />
            <span className="text-[13px] truncate" title={page.titulo}>{page.titulo}</span>
          </div>

          <div className="flex items-center shrink-0 gap-0.5 opacity-0 group-hover/page:opacity-100 focus-within:opacity-100 transition-opacity">
            {/* Move Up / Down Buttons for Pages */}
            <button 
              type="button"
              disabled={isFirstSibling}
              className={cn(
                "h-4 w-4 rounded flex items-center justify-center transition-colors text-gray-400 dark:text-zinc-500",
                isFirstSibling ? "opacity-20 cursor-not-allowed" : "hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-zinc-200"
              )}
              onClick={(e) => { 
                e.stopPropagation(); 
                movePage(page.id, 'up'); 
              }} 
              title="Mover anotação para cima"
            >
              <ChevronUp size={11} />
            </button>
            <button 
              type="button"
              disabled={isLastSibling}
              className={cn(
                "h-4 w-4 rounded flex items-center justify-center transition-colors text-gray-400 dark:text-zinc-500",
                isLastSibling ? "opacity-20 cursor-not-allowed" : "hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-zinc-200"
              )}
              onClick={(e) => { 
                e.stopPropagation(); 
                movePage(page.id, 'down'); 
              }} 
              title="Mover anotação para baixo"
            >
              <ChevronDown size={11} />
            </button>

            <div className="w-px h-3 bg-gray-200 dark:bg-zinc-700 mx-0.5" />

            <button 
              type="button"
              className="h-4 w-4 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 flex items-center justify-center transition-colors" 
              onClick={(e) => { 
                e.stopPropagation(); 
                openDialog('page', 'create', page.section_id, '', page.id); 
              }} 
              title="Criar subpágina"
            >
              <Plus size={12} />
            </button>
            <button 
              type="button"
              className="h-4 w-4 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 flex items-center justify-center transition-colors" 
              onClick={(e) => { 
                e.stopPropagation(); 
                openDialog('page', 'edit', page.id, page.titulo); 
              }} 
              title="Editar"
            >
              <Edit2 size={11} />
            </button>
            <button 
              type="button"
              className="h-4 w-4 rounded hover:bg-red-100 dark:hover:bg-red-950/60 hover:text-red-600 dark:hover:text-red-400 text-gray-500 dark:text-zinc-400 flex items-center justify-center transition-colors" 
              onClick={(e) => handleDeleteClick(e, 'page', page.id)}
              title="Excluir"
            >
              <Trash size={11} />
            </button>
          </div>
        </div>

        {/* Nested Subpages list */}
        {hasSubpages && isExpanded && (
          <div className="space-y-0.5 ml-2 border-l border-gray-100 dark:border-zinc-800 pl-0.5">
            {subpages.map(subpage => renderPage(subpage, depth + 1, subpages))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col glass-card border-y-0 border-l-0 border-r border-border bg-white/50 dark:bg-zinc-900/50">
      <div className="p-3 pb-2 flex-shrink-0 border-b border-border flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button 
            className="flex-1 shadow-sm rounded-xl font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all border-none h-9 text-xs"
            onClick={() => openDialog('section', 'create')}
          >
            <Plus className="h-4 w-4" /> Nova Seção
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsTrashOpen(true)}
            className="h-9 w-9 rounded-xl border-border bg-white dark:bg-zinc-800 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 shrink-0 shadow-2xs"
            title="Lixeira de páginas e seções excluídas"
          >
            <Trash2 size={15} />
          </Button>
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl shrink-0"
              onClick={onCollapse}
              title="Recolher menu lateral de seções"
            >
              <PanelLeftClose size={17} />
            </Button>
          )}
        </div>
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
            {sections.map((section, idx) => {
              const isDraggingThis = draggedSectionId === section.id;
              const isOverThis = dragOverSectionId === section.id;
              const isFirst = idx === 0;
              const isLast = idx === sections.length - 1;
              const rootPages = pages.filter(p => p.section_id === section.id && !p.parent_id);

              return (
                <div 
                  key={section.id} 
                  className={cn(
                    "space-y-1 w-full transition-all duration-150 relative",
                    isDraggingThis && "opacity-40 scale-[0.98]",
                    isOverThis && dropSectionPosition === 'before' && "border-t-2 border-indigo-500 pt-1",
                    isOverThis && dropSectionPosition === 'after' && "border-b-2 border-indigo-500 pb-1"
                  )}
                  draggable
                  onDragStart={(e) => handleSectionDragStart(e, section.id)}
                  onDragOver={(e) => handleSectionDragOver(e, section.id)}
                  onDrop={(e) => handleSectionDrop(e, section.id)}
                  onDragEnd={handleSectionDragEnd}
                >
                  {/* Section Header */}
                  <div 
                    className={cn(
                      "group flex items-center justify-between rounded-lg px-1.5 py-1.5 cursor-pointer transition-colors w-full select-none",
                      activeSectionId === section.id 
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300" 
                        : "hover:bg-gray-100 dark:hover:bg-zinc-800/60 text-gray-700 dark:text-zinc-200"
                    )}
                    onClick={() => {
                      setActiveSectionId(section.id);
                      toggleSection(section.id);
                    }}
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
                      {/* Drag Handle Grip */}
                      <span
                        className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-zinc-600 hover:text-slate-600 dark:hover:text-zinc-300 group-hover:opacity-100 p-0.5 -ml-0.5 rounded transition-colors"
                        title="Arraste para reordenar esta seção"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical size={13} />
                      </span>

                      <button
                        type="button"
                        className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSection(section.id);
                        }}
                      >
                        {expandedSections.includes(section.id) ? (
                          <ChevronDown size={14} className="shrink-0" />
                        ) : (
                          <ChevronRight size={14} className="shrink-0" />
                        )}
                      </button>

                      <Folder size={14} className={activeSectionId === section.id ? "text-indigo-500 shrink-0" : "text-gray-400 dark:text-zinc-500 shrink-0"} />
                      <span className="text-sm font-semibold truncate" title={section.nome}>{section.nome}</span>
                    </div>

                    <div className="flex items-center shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      {/* Move Up / Down Buttons */}
                      <button 
                        type="button"
                        disabled={isFirst}
                        className={cn(
                          "h-5 w-5 rounded flex items-center justify-center transition-colors text-gray-400 dark:text-zinc-500",
                          isFirst ? "opacity-30 cursor-not-allowed" : "hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-zinc-200"
                        )}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          moveSection(section.id, 'up'); 
                        }} 
                        title="Mover seção para cima"
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button 
                        type="button"
                        disabled={isLast}
                        className={cn(
                          "h-5 w-5 rounded flex items-center justify-center transition-colors text-gray-400 dark:text-zinc-500",
                          isLast ? "opacity-30 cursor-not-allowed" : "hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-zinc-200"
                        )}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          moveSection(section.id, 'down'); 
                        }} 
                        title="Mover seção para baixo"
                      >
                        <ChevronDown size={13} />
                      </button>

                      <div className="w-px h-3.5 bg-gray-200 dark:bg-zinc-700 mx-0.5" />

                      <button 
                        type="button"
                        className="h-5 w-5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-zinc-400 flex items-center justify-center transition-colors" 
                        onClick={(e) => { e.stopPropagation(); openDialog('page', 'create', section.id); }} 
                        title="Nova página"
                      >
                        <Plus size={13} />
                      </button>
                      <button 
                        type="button"
                        className="h-5 w-5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-zinc-400 flex items-center justify-center transition-colors" 
                        onClick={(e) => { e.stopPropagation(); openDialog('section', 'edit', section.id, section.nome); }} 
                        title="Editar"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        type="button"
                        className="h-5 w-5 rounded hover:bg-red-100 dark:hover:bg-red-950/60 hover:text-red-600 dark:hover:text-red-400 text-gray-600 dark:text-zinc-400 flex items-center justify-center transition-colors" 
                        onClick={(e) => handleDeleteClick(e, 'section', section.id)} 
                        title="Excluir"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Pages List (Recursive) */}
                  {expandedSections.includes(section.id) && (
                    <div className="ml-5 space-y-0.5 border-l-2 border-gray-100 dark:border-zinc-800 pl-1 overflow-hidden">
                      {rootPages.length === 0 ? (
                        <div className="text-[11px] text-gray-400 dark:text-zinc-500 italic px-2 py-1">Sem páginas</div>
                      ) : (
                        rootPages.map(page => renderPage(page, 0, rootPages))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sidebar Footer with Lixeira / Trash button */}
      <div className="p-3 border-t border-border bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg gap-2"
          onClick={() => setIsTrashOpen(true)}
        >
          <Trash2 size={14} className="text-slate-400 dark:text-zinc-500" />
          <span>Lixeira & Recuperação</span>
          {deletedItems.length > 0 && (
            <span className="ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              {deletedItems.length}
            </span>
          )}
        </Button>
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
            <DialogTitle className="text-slate-800 dark:text-zinc-100">Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-slate-600 dark:text-zinc-300 space-y-2">
            <p>
              Deseja mover esta {deleteType === 'section' ? 'seção' : 'página'} para a lixeira?
            </p>
            <p className="text-xs text-muted-foreground">
              Você poderá desfazê-la imediatamente ou restaurá-la a qualquer momento na Lixeira.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>Mover para Lixeira</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trash / Deleted Notes Modal */}
      <TrashModal open={isTrashOpen} onOpenChange={setIsTrashOpen} />

      {/* Global Notes Search Modal */}
      <GlobalNotesSearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </div>
  );
}
