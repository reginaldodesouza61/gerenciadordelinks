import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { LinkContainer } from '@/components/links/LinkContainer';
import { useLinkStore } from '@/lib/store/linkStore';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export default function Dashboard() {
  const { fetchCategorias, fetchSubcategorias, fetchCredenciais } = useLinkStore();
  const { user } = useAuthStore();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  useEffect(() => {
    fetchCategorias();
    fetchSubcategorias();
    
    // Fetch credentials if user is logged in
    if (user) {
      fetchCredenciais(user.id);
    }
  }, [fetchCategorias, fetchSubcategorias, fetchCredenciais, user]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />
      
      {/* Mobile sidebar toggle button */}
      <div className="md:hidden bg-white border-b px-4 py-2">
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
      
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block h-full">
          <Sidebar />
        </div>
        
        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMobileSidebarOpen(false)}>
            <div className="bg-white h-full w-80 max-w-[85vw] shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-3 border-b flex justify-between items-center">
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
      </div>
      <Footer />
    </div>
  );
}