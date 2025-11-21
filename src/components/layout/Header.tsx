import { useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useLinkStore } from '@/lib/store/linkStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, List, Grid, Menu, X, User } from 'lucide-react';
import { APP_VERSION } from '@/lib/version';

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const { signOut, user } = useAuthStore();
  const { viewMode, setViewMode, searchQuery, setSearchQuery, searchLinks } = useLinkStore();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleViewMode = () => {
    setViewMode(viewMode === 'lista' ? 'cartoes' : 'lista');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim() && user) {
      setTimeout(() => searchLinks(user.id), 500);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) searchLinks(user.id);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!isMobileMenuOpen);
    toggleSidebar();
  };

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="container mx-auto px-3 md:px-4 py-2 md:py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <h1 className="text-lg md:text-xl font-bold text-primary truncate">
            <span className="hidden sm:inline">Gerenciamento de Links</span>
            <span className="sm:hidden">Links</span>
          </h1>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium shrink-0">
            v{APP_VERSION}
          </span>
        </div>

        {/* Desktop controls */}
        <div className="hidden md:flex items-center space-x-2 lg:space-x-4 flex-1 justify-end">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xs lg:max-w-md">
            <Input
              type="search"
              placeholder="Buscar links..."
              className="pl-10 text-sm"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          </form>

          <Button variant="ghost" size="icon" onClick={toggleViewMode}>
            {viewMode === 'lista' ? <Grid size={18} /> : <List size={18} />}
          </Button>

          {user && (
            <div className="hidden lg:flex items-center space-x-2 px-2 py-1 bg-gray-50 rounded-lg max-w-48">
              <User className="h-4 w-4 text-gray-600 shrink-0" />
              <span className="text-sm text-gray-700 truncate">{user.email}</span>
            </div>
          )}

          <Button variant="outline" onClick={signOut} size="sm">
            Sair
          </Button>
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden flex items-center" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </header>
  );
}
