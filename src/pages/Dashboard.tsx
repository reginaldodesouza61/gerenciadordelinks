import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { LinkContainer } from '@/components/links/LinkContainer';
import { NotesContainer } from '@/components/notes/NotesContainer';
import { useLinkStore } from '@/lib/store/linkStore';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { Menu, X, Link as LinkIcon, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { fetchCategorias, fetchSubcategorias, fetchCredenciais } = useLinkStore();
  const { user } = useAuthStore();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'links' | 'notes'>(() => {
    try {
      const saved = localStorage.getItem('meuhub_active_tab');
      if (saved === 'notes' || saved === 'links') return saved;
    } catch (err) {
      console.warn('Failed to read active tab from localStorage', err);
    }
    return 'links';
  });

  const handleTabChange = (tab: 'links' | 'notes') => {
    setActiveTab(tab);
    try {
      localStorage.setItem('meuhub_active_tab', tab);
    } catch (err) {
      console.warn('Failed to save active tab to localStorage', err);
    }
  };
  
  useEffect(() => {
    fetchCategorias();
    fetchSubcategorias();
    
    // Fetch credentials if user is logged in
    if (user) {
      fetchCredenciais(user.id);
    }

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchCategorias, fetchSubcategorias, fetchCredenciais, user]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-zinc-950 text-foreground transition-colors duration-200">
      <Header activeTab={activeTab} setActiveTab={handleTabChange} />
      
      {/* Mobile sidebar toggle button (Only for Links view) */}
      {activeTab === 'links' && (
        <div className="md:hidden bg-white dark:bg-zinc-900 border-b border-border px-4 py-2 flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="flex items-center"
          >
            {isMobileSidebarOpen ? <X className="h-4 w-4 mr-2" /> : <Menu className="h-4 w-4 mr-2" />}
            {isMobileSidebarOpen ? 'Fechar' : 'Categorias'}
          </Button>
        </div>
      )}
      
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'links' ? (
          <>
            {/* Desktop Sidebar */}
            <div className="hidden md:block h-full">
              <Sidebar />
            </div>
            
            {/* Mobile Sidebar Overlay */}
            {isMobileSidebarOpen && (
              <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs" onClick={() => setIsMobileSidebarOpen(false)}>
                <div className="bg-white dark:bg-zinc-900 h-full w-80 max-w-[85vw] shadow-xl" onClick={(e) => e.stopPropagation()}>
                  <div className="p-3 border-b border-border flex justify-between items-center">
                    <h2 className="font-semibold text-base">Categorias</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMobileSidebarOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Sidebar />
                </div>
              </div>
            )}
            
            {/* Main content */}
            <div className="flex-1 overflow-auto">
              <LinkContainer />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-hidden">
            <NotesContainer />
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}