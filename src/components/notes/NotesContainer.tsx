import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useNoteStore } from '@/lib/store/noteStore';
import { NotesSidebar } from './NotesSidebar';
import { NoteEditor } from './NoteEditor';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotesContainer() {
  const { user } = useAuthStore();
  const { fetchNotes, activePageId, isLoading } = useNoteStore();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(288); // Default 288px (w-72)
  const [isResizing, setIsResizing] = useState(false);

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
    <div className="flex h-full overflow-hidden bg-[#fafafa] dark:bg-zinc-950 transition-colors">
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
        className={`hidden md:block shrink-0 shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-10 bg-white dark:bg-zinc-900 border-r border-border relative ${isDesktopSidebarCollapsed ? 'overflow-hidden transition-all duration-300' : ''}`}
        style={{ width: isDesktopSidebarCollapsed ? 0 : sidebarWidth }}
      >
        <div style={{ width: sidebarWidth }} className="h-full">
          <NotesSidebar onCollapse={() => setIsDesktopSidebarCollapsed(true)} />
        </div>
      </div>
      
      {/* Resizer Handle */}
      {!isDesktopSidebarCollapsed && (
        <div 
          className="hidden md:block w-1 hover:w-2 -ml-0.5 hover:-ml-1 z-30 cursor-col-resize hover:bg-indigo-400 transition-all shrink-0 active:bg-indigo-600"
          onMouseDown={() => setIsResizing(true)}
        />
      )}
      
      {/* Collapse/Expand Toggle for Desktop Sidebar */}
      <div className="hidden md:flex flex-col justify-center border-r border-border bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer w-4 shrink-0 z-20 group relative" onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}>
        <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 bg-white dark:bg-zinc-800 border border-border shadow-sm rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-30">
           {isDesktopSidebarCollapsed ? <ChevronRight size={14} className="text-gray-500 dark:text-zinc-400" /> : <ChevronLeft size={14} className="text-gray-500 dark:text-zinc-400" />}
        </div>
      </div>

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
              onToggleSidebar={() => setIsDesktopSidebarCollapsed(false)}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50/50 dark:bg-zinc-950/50">
            <div className="text-center">
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 max-w-sm mx-auto">
                <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-950 text-indigo-500 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-2">Espaço de Anotações</h3>
                <p className="text-gray-500 dark:text-zinc-400 text-sm">Selecione uma página no menu lateral ou crie uma nova para começar a escrever no quadro livre.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
