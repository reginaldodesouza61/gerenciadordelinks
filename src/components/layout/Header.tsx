import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useLinkStore } from '@/lib/store/linkStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, List, Grid, Menu, X, User, Sun, Moon, LogOut, Link as LinkIcon, FileText, Settings, Sparkles } from 'lucide-react';
import { useTheme } from 'next-themes';
import { APP_VERSION } from '@/lib/version';
import { cn } from '@/lib/utils';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { getGeminiApiKey } from '@/lib/geminiService';

interface HeaderProps {
  activeTab?: 'links' | 'notes';
  setActiveTab?: (tab: 'links' | 'notes') => void;
}

export function Header({ activeTab = 'links', setActiveTab }: HeaderProps) {
  const { signOut, user } = useAuthStore();
  const { 
    setViewMode, 
    viewMode, 
    setSearchQuery, 
    searchQuery, 
    searchLinks 
  } = useLinkStore();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch & listen for key updates
  useEffect(() => {
    setMounted(true);
    setHasGeminiKey(Boolean(getGeminiApiKey()));

    const handleKeyUpdated = () => {
      setHasGeminiKey(Boolean(getGeminiApiKey()));
    };

    window.addEventListener('meuhub_gemini_key_updated', handleKeyUpdated);
    return () => window.removeEventListener('meuhub_gemini_key_updated', handleKeyUpdated);
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
          <div className="flex items-center space-x-2 min-w-0 md:flex-none">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <Grid className="text-white h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gradient truncate">
              <span>MeuHub</span>
            </h1>
          </div>
          
          {/* Main Navigation Tabs */}
          {setActiveTab && (
            <div className="hidden md:flex flex-1 justify-center px-4">
              <div className="bg-secondary/50 dark:bg-zinc-800/60 p-1 rounded-full flex gap-1 border border-border/50">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={cn("rounded-full px-4 h-8 text-sm gap-2 transition-all", activeTab === 'links' ? "bg-white dark:bg-zinc-700 shadow-sm text-primary dark:text-zinc-100 font-semibold" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => setActiveTab('links')}
                >
                  <LinkIcon size={14} /> Links
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={cn("rounded-full px-4 h-8 text-sm gap-2 transition-all", activeTab === 'notes' ? "bg-white dark:bg-zinc-700 shadow-sm text-primary dark:text-zinc-100 font-semibold" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => setActiveTab('notes')}
                >
                  <FileText size={14} /> Anotações
                </Button>
              </div>
            </div>
          )}
          
          {/* Desktop Utilities */}
          <div className="hidden md:flex items-center space-x-3 md:flex-none justify-end">
            {/* Search - only visible in links mode */}
            {activeTab === 'links' && (
              <form onSubmit={handleSearch} className="relative w-48 lg:w-64">
                <Input
                  type="search"
                  placeholder="Buscar links..."
                  className="pl-8 h-9 text-xs bg-background/50 border-white/20 focus-visible:ring-primary focus-visible:bg-background transition-all rounded-full"
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              </form>
            )}
            
            <div className="flex items-center space-x-1 pl-2 border-l border-border/50">
              {/* Settings / Configurações & Gemini AI Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSettingsOpen(true)}
                title="Configurações (Desenvolvedor, Gemini IA e Sistema)"
                className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground transition-colors relative"
              >
                <Settings size={17} />
                {hasGeminiKey && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
                )}
              </Button>

              {/* Dark Mode Toggle Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleTheme}
                title={mounted && theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro (Dark)'}
                className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                {mounted && theme === 'dark' ? (
                  <Sun size={17} className="text-amber-400 hover:rotate-45 transition-transform" />
                ) : (
                  <Moon size={17} className="text-zinc-600 dark:text-zinc-300" />
                )}
              </Button>

              {/* View mode toggle */}
              {activeTab === 'links' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleViewMode}
                  title={viewMode === 'lista' ? 'Visualização em cartões' : 'Visualização em lista'}
                  className="h-9 w-9 rounded-full"
                >
                  {viewMode === 'lista' ? <Grid size={16} /> : <List size={16} />}
                </Button>
              )}
              
              {/* User info */}
              {user && (
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-secondary/50 hover:bg-secondary dark:bg-zinc-800/80 rounded-full border border-border/50 transition-colors max-w-[180px] cursor-default ml-2">
                  <div className="h-6 w-6 rounded-full bg-zinc-600 dark:bg-zinc-700 flex items-center justify-center text-[10px] text-white font-bold">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium truncate dark:text-zinc-200">{user.email}</span>
                </div>
              )}
              
              {/* Logout button */}
              <Button variant="ghost" onClick={signOut} size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut size={16} />
              </Button>
            </div>
          </div>
            
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2 ml-auto">
            {/* Mobile quick settings */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSettingsOpen(true)}
              className="h-9 w-9 rounded-full text-muted-foreground"
              title="Configurações"
            >
              <Settings size={17} />
            </Button>

            {/* Mobile quick theme toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme}
              className="h-9 w-9 rounded-full text-muted-foreground"
              title={mounted && theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            >
              {mounted && theme === 'dark' ? (
                <Sun size={17} className="text-amber-400" />
              ) : (
                <Moon size={17} className="text-zinc-600 dark:text-zinc-300" />
              )}
            </Button>

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
            {setActiveTab && (
              <div className="grid grid-cols-2 gap-2 p-1 bg-secondary/50 dark:bg-zinc-800/60 rounded-xl border border-border/50">
                <Button 
                  variant="ghost" 
                  className={cn("h-10 text-xs gap-2 rounded-lg", activeTab === 'links' ? "bg-white dark:bg-zinc-700 shadow-sm text-primary dark:text-zinc-100" : "text-muted-foreground")}
                  onClick={() => { setActiveTab('links'); setIsMenuOpen(false); }}
                >
                  <LinkIcon size={14} /> Links
                </Button>
                <Button 
                  variant="ghost" 
                  className={cn("h-10 text-xs gap-2 rounded-lg", activeTab === 'notes' ? "bg-white dark:bg-zinc-700 shadow-sm text-primary dark:text-zinc-100" : "text-muted-foreground")}
                  onClick={() => { setActiveTab('notes'); setIsMenuOpen(false); }}
                >
                  <FileText size={14} /> Anotações
                </Button>
              </div>
            )}

            {activeTab === 'links' && (
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
            )}
            
            <div className="flex flex-col gap-2">
              {user && (
                <div className="flex items-center space-x-3 p-3 bg-secondary/50 dark:bg-zinc-800/80 rounded-xl border border-border/50">
                  <div className="h-8 w-8 rounded-full bg-zinc-600 flex items-center justify-center text-white font-bold text-xs">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-semibold truncate text-zinc-700 dark:text-zinc-200">{user.email}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">Usuário Logado</span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  className="w-full h-10 text-xs gap-2 rounded-xl"
                  onClick={() => { setIsSettingsOpen(true); setIsMenuOpen(false); }}
                >
                  <Settings size={14} />
                  Configurações
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full h-10 text-xs gap-2 rounded-xl"
                  onClick={toggleTheme}
                >
                  {mounted && theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
                  {mounted && theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                </Button>

                {activeTab === 'links' && (
                  <Button 
                    variant="outline" 
                    className="w-full h-10 text-xs gap-2 rounded-xl"
                    onClick={() => { toggleViewMode(); setIsMenuOpen(false); }}
                  >
                    {viewMode === 'lista' ? <Grid size={14} /> : <List size={14} />}
                    {viewMode === 'lista' ? 'Cartões' : 'Lista'}
                  </Button>
                )}
                
                <Button variant="outline" onClick={signOut} className={cn("h-10 text-xs gap-2 rounded-xl text-destructive hover:bg-destructive/10", activeTab === 'links' ? "col-span-2" : "")}>
                  <LogOut size={14} />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <SettingsModal 
        open={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
      />
    </header>
  );
}