import { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { LinkContainer } from '@/components/links/LinkContainer';
import { useLinkStore } from '@/lib/store/linkStore';

export default function Dashboard() {
  const { fetchCategorias, fetchSubcategorias } = useLinkStore();
  
  useEffect(() => {
    fetchCategorias();
    fetchSubcategorias();
  }, [fetchCategorias, fetchSubcategorias]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - hidden on mobile */}
        <div className="hidden md:block h-full">
          <Sidebar />
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <LinkContainer />
        </div>
      </div>
      <Footer />
    </div>
  );
}