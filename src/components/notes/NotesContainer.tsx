import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useNoteStore } from '@/lib/store/noteStore';
import { NotesSidebar } from './NotesSidebar';
import { NoteEditor } from './NoteEditor';
import { Menu, X, ChevronLeft, ChevronRight, PanelLeftOpen, PanelLeftClose, Folder, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'meuhub_notes_sidebar_collapsed';

export function NotesContainer() {
  const { user } = useAuthStore();
  const { fetchNotes, activePageId, isLoading } = useNoteStore();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [sidebarWidth, setSidebarWidth] = useState(288); // Default 288px (w-72)
  const [isResizing, setIsResizing] = useState(false);

  const toggleSidebarCollapse = (collapsed: boolean) => {
    setIsDesktopSidebarCollapsed(collapsed);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
    } catch (e) {
      console.debug('Failed to save sidebar collapsed state', e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotes(user.id);
    }
  }, [user, fetchNotes]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      e.preventDefault();
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 800) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
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
          <NotesSidebar onCollapse={() => toggleSidebarCollapse(true)} />
        </div>
      </div>
      
      {/* Resizer Handle (when expanded) */}
      {!isDesktopSidebarCollapsed && (
        <div 
          className="hidden md:block w-1.5 hover:w-2.5 -ml-1 hover:-ml-1.5 z-30 cursor-col-resize hover:bg-indigo-400 transition-all shrink-0 active:bg-indigo-600 group relative"
          onMouseDown={() => setIsResizing(true)}
          title="Arraste para redimensionar a largura do menu"
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
              <NotesSidebar />
            </div>
          </div>
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#f9f9fb] dark:bg-zinc-950">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
          </div>
        ) : activePageId ? (
          <div className="flex-1 overflow-hidden h-full w-full">
            <NoteEditor 
              pageId={activePageId} 
              isSidebarCollapsed={isDesktopSidebarCollapsed}
              onToggleSidebar={() => toggleSidebarCollapse(!isDesktopSidebarCollapsed)}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50/50 dark:bg-zinc-950/50 p-4">
            <div className="text-center max-w-md mx-auto">
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col items-center">
                <div className="h-14 w-14 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-4 shadow-xs">
                  <FileText className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-2">Espaço de Anotações</h3>
                <p className="text-gray-500 dark:text-zinc-400 text-sm mb-5 leading-relaxed">
                  Selecione uma anotação no menu lateral ou crie uma nova para começar a editar no quadro livre.
                </p>
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
        )}
      </div>
    </div>
  );
}
