import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useNoteStore } from '@/lib/store/noteStore';
import { NotesSidebar } from './NotesSidebar';
import { NoteEditor } from './NoteEditor';
import { GlobalNotesSearchModal } from './GlobalNotesSearchModal';
import { 
  Menu, X, ChevronLeft, ChevronRight, PanelLeftOpen, PanelLeftClose, 
  Folder, FileText, Search, Plus 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'meuhub_notes_sidebar_collapsed';
const SIDEBAR_WIDTH_STORAGE_KEY = 'meuhub_notes_sidebar_width';
const DEFAULT_SIDEBAR_WIDTH = 320; // 320px gives comfortable space so section names aren't cut off

export function NotesContainer() {
  console.count('[Render] NotesContainer');
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  
  const fetchNotes = useNoteStore((state) => state.fetchNotes);
  const sections = useNoteStore((state) => state.sections);
  const activeSectionId = useNoteStore((state) => state.activeSectionId);
  const activePageId = useNoteStore((state) => state.activePageId);
  const setActivePageId = useNoteStore((state) => state.setActivePageId);
  const addPage = useNoteStore((state) => state.addPage);
  const isLoading = useNoteStore((state) => state.isLoading);
  const pages = useNoteStore((state) => state.pages);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
      if (saved !== null) {
        return saved === 'true';
      }
      return false; // Default: expanded as preferred by user
    } catch {
      return false;
    }
  });

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 240 && parsed <= 800) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_SIDEBAR_WIDTH;
  });

  const sidebarWidthRef = useRef(sidebarWidth);
  sidebarWidthRef.current = sidebarWidth;

  const [isResizing, setIsResizing] = useState(false);

  // Active section entity
  const activeSection = sections.find((s) => s.id === activeSectionId);

  // Filter pages that belong to the active section (or all pages if no section selected)
  const currentSectionPages = activeSectionId
    ? pages.filter((p) => p.section_id === activeSectionId)
    : pages;

  // Derive effective active page strictly scoped to the active section
  const effectiveActivePageId = (() => {
    if (activePageId && currentSectionPages.some((p) => p.id === activePageId)) {
      return activePageId;
    }
    if (currentSectionPages.length > 0) {
      const rootPage = currentSectionPages.find((p) => !p.parent_id) || currentSectionPages[0];
      return rootPage.id;
    }
    return null;
  })();

  useEffect(() => {
    if (!isLoading && effectiveActivePageId && effectiveActivePageId !== activePageId) {
      setActivePageId(effectiveActivePageId);
    }
  }, [effectiveActivePageId, activePageId, setActivePageId, isLoading]);

  // Global keyboard shortcut for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSidebarCollapse = (collapsed: boolean) => {
    setIsDesktopSidebarCollapsed(collapsed);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
    } catch (e) {
      console.debug('Failed to save sidebar collapsed state', e);
    }
  };

  useEffect(() => {
    if (!initialized) return;
    const userId = user?.id || 'c72212e7-2b6a-4da7-8745-01eb33414af4';
    if (lastFetchedUserIdRef.current !== userId) {
      lastFetchedUserIdRef.current = userId;
      fetchNotes(userId);
    }
  }, [user?.id, initialized, fetchNotes]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      e.preventDefault();
      const newWidth = Math.max(240, Math.min(800, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        try {
          localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidthRef.current));
        } catch (err) {
          console.debug('Failed to save sidebar width', err);
        }
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="flex h-full overflow-hidden bg-[#fafafa] dark:bg-zinc-950 transition-colors relative">
      {/* Mobile sidebar toggle button */}
      <div className="md:hidden absolute top-16 left-0 z-40 bg-white dark:bg-zinc-900 border-b border-r border-border px-2 py-2 rounded-br-lg shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="flex items-center text-xs h-8"
        >
          {isMobileSidebarOpen ? <X className="h-3 w-3 mr-1" /> : <Menu className="h-3 w-3 mr-1" />}
          Seções
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <div 
        className={`hidden md:block shrink-0 shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-10 bg-white dark:bg-zinc-900 border-r border-border relative transition-all duration-200 ease-in-out ${
          isDesktopSidebarCollapsed ? 'w-0 overflow-hidden opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ width: isDesktopSidebarCollapsed ? 0 : sidebarWidth }}
      >
        <div style={{ width: sidebarWidth }} className="h-full">
          <NotesSidebar 
            onCollapse={() => toggleSidebarCollapse(true)} 
            onOpenSearch={() => setIsSearchModalOpen(true)}
          />
        </div>
      </div>
      
      {/* Resizer Handle (when expanded) */}
      {!isDesktopSidebarCollapsed && (
        <div 
          className="hidden md:block w-1.5 hover:w-2.5 -ml-1 hover:-ml-1.5 z-30 cursor-col-resize hover:bg-indigo-400 transition-all shrink-0 active:bg-indigo-600 group relative"
          onMouseDown={() => setIsResizing(true)}
          onDoubleClick={() => {
            const nextWidth = sidebarWidthRef.current === DEFAULT_SIDEBAR_WIDTH ? 420 : DEFAULT_SIDEBAR_WIDTH;
            setSidebarWidth(nextWidth);
            try {
              localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(nextWidth));
            } catch {
              // ignore
            }
          }}
          title="Arraste para redimensionar a largura do menu (clique duplo para alternar largura)"
        />
      )}

      {/* Visible Slim Dock Bar (when collapsed) */}
      {isDesktopSidebarCollapsed && (
        <div 
          className="hidden md:flex flex-col items-center justify-between py-3 px-1 border-r border-border bg-white dark:bg-zinc-900/90 hover:bg-indigo-50/50 dark:hover:bg-zinc-800/80 transition-all duration-200 cursor-pointer w-10 shrink-0 z-20 group select-none shadow-xs"
          onClick={() => toggleSidebarCollapse(false)}
          title="Clique para expandir o menu lateral de seções"
        >
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs transition-all"
              title="Expandir menu lateral"
              onClick={(e) => {
                e.stopPropagation();
                toggleSidebarCollapse(false);
              }}
            >
              <PanelLeftOpen size={16} />
            </button>

            <button
              type="button"
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-indigo-600 hover:text-white border border-slate-200 dark:border-zinc-700 shadow-xs transition-all mt-1"
              title="Pesquisar em tudo (Ctrl+K)"
              onClick={(e) => {
                e.stopPropagation();
                setIsSearchModalOpen(true);
              }}
            >
              <Search size={15} />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center my-4">
            <span className="[writing-mode:vertical-lr] text-[11px] font-bold text-slate-400 dark:text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 tracking-wider uppercase transition-colors">
              Seções & Notas
            </span>
          </div>

          <div className="h-6 w-6 rounded-full flex items-center justify-center text-slate-400 dark:text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            <ChevronRight size={16} />
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)}>
          <div className="bg-white dark:bg-zinc-900 h-full w-72 max-w-[85vw] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b border-border flex justify-between items-center bg-gray-50 dark:bg-zinc-800">
              <h2 className="font-semibold text-sm text-gray-700 dark:text-zinc-200">Anotações</h2>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={() => setIsMobileSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="h-[calc(100%-53px)]">
              <NotesSidebar onOpenSearch={() => setIsSearchModalOpen(true)} />
            </div>
          </div>
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#f9f9fb] dark:bg-zinc-950">
        {isLoading && pages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
          </div>
        ) : effectiveActivePageId ? (
          <div className="flex-1 overflow-hidden h-full w-full">
            <NoteEditor 
              key={effectiveActivePageId}
              pageId={effectiveActivePageId} 
              isSidebarCollapsed={isDesktopSidebarCollapsed}
              onToggleSidebar={() => toggleSidebarCollapse(!isDesktopSidebarCollapsed)}
              onOpenSearch={() => setIsSearchModalOpen(true)}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50/50 dark:bg-zinc-950/50 p-4">
            <div className="text-center max-w-md mx-auto">
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col items-center">
                <div className="h-14 w-14 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-4 shadow-xs">
                  <FileText className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-2">
                  {activeSection ? activeSection.nome : 'Espaço de Anotações'}
                </h3>
                <p className="text-gray-500 dark:text-zinc-400 text-sm mb-5 leading-relaxed">
                  {activeSection 
                    ? 'Esta seção ainda não possui anotações. Crie a primeira página para começar.'
                    : 'Selecione uma anotação no menu lateral ou crie uma nova para começar a editar no quadro livre.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {activeSection && (
                    <Button
                      onClick={() => addPage(activeSection.id, null, 'Sem título', user?.id)}
                      className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs"
                    >
                      <Plus className="h-4 w-4" />
                      Criar Nova Nota nesta Seção
                    </Button>
                  )}
                  <Button
                    onClick={() => setIsSearchModalOpen(true)}
                    variant="outline"
                    className="gap-2 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 font-semibold rounded-xl shadow-xs"
                  >
                    <Search className="h-4 w-4 text-indigo-600" />
                    Pesquisar em Tudo
                    <kbd className="px-1.5 py-0.5 text-[9px] bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded font-mono text-slate-500">
                      Ctrl+K
                    </kbd>
                  </Button>
                  {isDesktopSidebarCollapsed && (
                    <Button
                      onClick={() => toggleSidebarCollapse(false)}
                      className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs"
                    >
                      <PanelLeftOpen className="h-4 w-4" />
                      Abrir Menu de Seções
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Search Modal fallback for when no active page is open */}
      <GlobalNotesSearchModal
        open={isSearchModalOpen}
        onOpenChange={setIsSearchModalOpen}
      />
    </div>
  );
}
