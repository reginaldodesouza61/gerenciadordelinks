import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useLinkStore } from '@/lib/store/linkStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, List, Grid, Menu, X, User, Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
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
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

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

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="glass sticky top-0 z-50 transition-all duration-300">
      <div className="container mx-auto px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <Grid className="text-white h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gradient truncate">
              <span className="hidden sm:inline">LinkManager</span>
              <span className="sm:hidden">Links</span>
            </h1>
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 border border-primary/20">
              v{APP_VERSION}
            </span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-3 flex-1 justify-end">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
              <Input
                type="search"
                placeholder="Buscar links (Ctrl+K)..."
                className="pl-10 h-9 bg-background/50 border-white/20 focus-visible:ring-primary focus-visible:bg-background transition-all"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </form>
            
              <div className="flex items-center space-x-1 pl-2 border-l border-border/50">
                {/* View mode toggle */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleViewMode}
                  title={viewMode === 'lista' ? 'Visualização em cartões' : 'Visualização em lista'}
                  className="h-9 w-9 rounded-full"
                >
                  {viewMode === 'lista' ? <Grid size={18} /> : <List size={18} />}
                </Button>
                
                {/* User info */}
                {user && (
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-secondary/50 hover:bg-secondary rounded-full border border-border/50 transition-colors max-w-[180px] cursor-default ml-2">
                    <div className="h-6 w-6 rounded-full bg-zinc-600 flex items-center justify-center text-[10px] text-white font-bold">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium truncate">{user.email}</span>
                  </div>
                )}
                
                {/* Logout button */}
                <Button variant="ghost" onClick={signOut} size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <LogOut size={18} />
                </Button>
              </div>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-2">
              <button 
                className="p-1 rounded-md text-muted-foreground"
                onClick={toggleMenu}
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
        </div>
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4 animate-in slide-in-from-top duration-300">
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="search"
                placeholder="Buscar links..."
                className="pl-10 h-10 bg-background/50"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            </form>
            
            <div className="flex flex-col gap-2">
              {user && (
                <div className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-xl border border-border/50">
                  <div className="h-8 w-8 rounded-full bg-zinc-600 flex items-center justify-center text-white font-bold text-xs">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-semibold truncate text-zinc-700">{user.email}</span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Usuário Logado</span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  className="w-full h-10 text-xs gap-2 rounded-xl"
                  onClick={toggleViewMode}
                >
                  {viewMode === 'lista' ? <Grid size={14} /> : <List size={14} />}
                  {viewMode === 'lista' ? 'Modo Cartões' : 'Modo Lista'}
                </Button>
                <Button variant="outline" onClick={signOut} className="w-full h-10 text-xs gap-2 rounded-xl text-destructive hover:bg-destructive/10">
                  <LogOut size={14} />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}