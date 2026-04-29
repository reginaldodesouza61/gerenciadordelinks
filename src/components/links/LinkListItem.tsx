import { useState } from 'react';
import { useLinkStore } from '@/lib/store/linkStore';
import { Button } from '@/components/ui/button';
import { Pencil, Trash, Share2, ExternalLink, Key, Globe, Star, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Link, Categoria, Subcategoria } from '@/types/supabase';
import { ShareDialog } from './ShareDialog';
import { CredentialManager } from '@/components/credentials/CredentialManager';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';


interface LinkListItemProps {
  link: Link;
  categoria: Categoria | undefined;
  subcategoria: Subcategoria | undefined;
  onEdit: (link: Link) => void;
}

export function LinkListItem({ link, categoria, subcategoria, onEdit }: LinkListItemProps) {
  const { deleteLink, getCredencialByLinkId, toggleFavorite, favoriteIds, trackRecentLink } = useLinkStore();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  
  const isFavorite = favoriteIds.includes(link.id);
  const hasCredentials = Boolean(getCredencialByLinkId(link.id));
  
  const handleCredentialsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCredentialsDialogOpen(true);
  };
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir este link?')) {
      try {
        await deleteLink(link.id);
      } catch (error) {
        console.error('Error deleting link:', error);
      }
    }
  };
  
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShareDialogOpen(true);
  };

  const handleOpenLink = () => {
    trackRecentLink(link.id);
    window.open(link.url, '_blank');
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(link.id);
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };
  
  return (
    <>
      <div 
        className="bg-white group p-3 md:p-4 hover:ring-1 hover:ring-zinc-300 transition-all duration-300 cursor-pointer rounded-xl border border-zinc-200 shadow-sm"
        onClick={handleOpenLink}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-muted/50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-border/50">
            {link.imagem_url ? (
              <img src={link.imagem_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Globe className="h-6 w-6 text-muted-foreground/30" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm md:text-base truncate group-hover:text-zinc-600 transition-colors text-zinc-900">
                {link.titulo}
              </h3>
              <div className="flex gap-1 shrink-0">
                {categoria && (
                  <span className="px-2 py-0.5 bg-zinc-100 text-zinc-800 rounded-full text-[9px] font-bold border border-zinc-200">
                    {categoria.nome}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center text-[10px] text-muted-foreground dark:text-zinc-400 font-medium">
                <img 
                  src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${link.url}&size=16`} 
                  className="h-3 w-3 mr-1.5 rounded-sm"
                  alt=""
                  onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                />
                <span className="truncate max-w-[200px]">{formatUrl(link.url)}</span>
              </div>
              {link.descricao && (
                <span className="hidden md:inline text-xs text-muted-foreground dark:text-zinc-500 truncate max-w-md">
                  • {link.descricao}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-9 w-9 rounded-full transition-colors",
                isFavorite ? "text-zinc-900 hover:bg-zinc-100" : "text-zinc-400 hover:bg-zinc-50"
              )}
              onClick={handleFavoriteClick}
            >
              <Star className={cn("h-4 w-4", isFavorite && "fill-zinc-900")} />
            </Button>

            <div className="hidden sm:flex items-center gap-1">
              <Button 
                size="icon" 
                variant="ghost"
                className="h-9 w-9 rounded-full text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); onEdit(link); }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost"
                className={cn("h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity", hasCredentials ? "text-primary" : "text-muted-foreground")}
                onClick={handleCredentialsClick}
              >
                <Key className="h-4 w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost"
                className="h-9 w-9 rounded-full text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost"
                className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleDelete}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(link); }} className="gap-2">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCredentialsClick} className={cn("gap-2", hasCredentials && "text-primary")}>
                    <Key className="h-3.5 w-3.5" /> Senhas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShare} className="gap-2">
                    <Share2 className="h-3.5 w-3.5" /> Compartilhar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="gap-2 text-destructive">
                    <Trash className="h-3.5 w-3.5" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
      
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        title={link.titulo}
        url={link.url}
        description={link.descricao || ''}
      />
      
      <CredentialManager
        open={credentialsDialogOpen}
        onOpenChange={setCredentialsDialogOpen}
        linkId={link.id}
        linkTitle={link.titulo}
        linkUrl={link.url}
      />
    </>
  );
}