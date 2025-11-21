import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { LinkContainer } from '@/components/links/LinkContainer';
import { useLinkStore } from '@/lib/store/linkStore';

export default function Dashboard() {
  const { fetchCategorias, fetchSubcategorias } = useLinkStore();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch categories and subcategories on mount (once)
  useEffect(() => {
    fetchCategorias();
    fetchSubcategorias();
  }, [fetchCategorias, fetchSubcategorias]);

  const toggleMobileMenu = () => setMobileMenuOpen(prev => !prev);

  const handleLinkClick = () => {
    if (isMobileMenuOpen) setMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <Header toggleMobileMenu={toggleMobileMenu} isMobileMenuOpen={isMobileMenuOpen} />

      <div className="flex-1 flex relative">
        {/* Sidebar */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform
            md:relative md:translate-x-0
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <Sidebar onLinkClick={handleLinkClick} />
        </div>

        {/* Overlay for mobile */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={toggleMobileMenu}
          />
        )}

        {/* Main content */}
        <div className="flex-1 overflow-auto md:ml-64">
          <LinkContainer />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
