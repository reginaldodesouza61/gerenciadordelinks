import { useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useLinkStore } from '@/lib/store/linkStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, List, Grid, Menu, X, User } from 'lucide-react';
import { APP_VERSION } from '@/lib/version';

export function Header() {
  const { signOut, user } = useAuthStore();
  const { 
    setViewMode, 
    viewMode, 
    setSearchQuery, 
    searchQuery, 
    searchLinks 
  } = useLinkStore();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleViewMode = () => {
    setViewMode(viewMode === 'lista' ? 'cartoes' : 'lista');
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      searchLinks(user.id);
    }
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    
    // Perform search after a small delay if text is entered
    if (e.target.value.trim()) {
      const timer = setTimeout(() => {
        if (user) {
          searchLinks(user.id);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  };
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-white border-b sticky top-0 z-40">
      <div className="container mx-auto px-3 md:px-4 py-2 md:py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-1 md:space-x-2 min-w-0 flex-1">
            <h1 className="text-lg md:text-xl font-bold text-primary truncate">
              <span className="hidden sm:inline">Gerenciamento de Links</span>
              <span className="sm:hidden">Links</span>
            </h1>
            <span className="text-xs bg-blue-100 text-blue-800 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full font-medium shrink-0">
              v{APP_VERSION}
            </span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-4 flex-1 justify-end">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative flex-1 max-w-xs lg:max-w-md">
              <Input
                type="search"
                placeholder="Buscar links..."
                className="pl-10 text-sm"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            </form>
            
            {/* View mode toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleViewMode}
              title={viewMode === 'lista' ? 'Alternar para visualização em cartões' : 'Alternar para visualização em lista'}
              className="shrink-0"
            >
              {viewMode === 'lista' ? <Grid size={18} /> : <List size={18} />}
            </Button>
            
            {/* User info */}
            {user && (
              <div className="hidden lg:flex items-center space-x-2 px-2 py-1 bg-gray-50 rounded-lg max-w-48">
                <User className="h-4 w-4 text-gray-600 shrink-0" />
                <span className="text-sm text-gray-700 truncate">{user.email}</span>
              </div>
            )}
            
            {/* Logout button */}
            <Button variant="outline" onClick={signOut} size="sm" className="shrink-0">Sair</Button>
          </div>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden flex items-center"
            onClick={toggleMenu}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-3 pb-3 space-y-3">
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="search"
                placeholder="Buscar links..."
                className="pl-10 text-sm"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            </form>
            
            {/* User info mobile */}
            {user && (
              <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                <User className="h-4 w-4 text-gray-600 shrink-0" />
                <span className="text-sm text-gray-700 truncate">{user.email}</span>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
              <Button 
                variant="outline" 
                className="flex items-center justify-center text-sm"
                onClick={toggleViewMode}
                size="sm"
              >
                {viewMode === 'lista' ? (
                  <>
                    <Grid className="mr-2" size={16} />
                    <span className="hidden xs:inline">Visualizar como </span>cartões
                  </>
                ) : (
                  <>
                    <List className="mr-2" size={16} />
                    <span className="hidden xs:inline">Visualizar como </span>lista
                  </>
                )}
              </Button>
              
              <Button variant="outline" onClick={signOut} size="sm">Sair</Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}