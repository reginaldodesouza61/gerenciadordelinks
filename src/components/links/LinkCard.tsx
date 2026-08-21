import { useState } from 'react';
import { useLinkStore } from '@/lib/store/linkStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash, Share2, Globe, Star, ExternalLink, MoreVertical, Key } from 'lucide-react';
import { toast } from 'sonner';
import { Link, Categoria, Subcategoria } from '@/types/supabase';
import { cn } from '@/lib/utils';
import { CredentialManager } from '@/components/credentials/CredentialManager';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LinkCardProps {
  link: Link;
  categoria: Categoria | undefined;
  subcategoria: Subcategoria | undefined;
  onEdit: (link: Link) => void;
}

export function LinkCard({ link, categoria, subcategoria, onEdit }: LinkCardProps) {
  const { deleteLink, toggleFavorite, favoriteIds, trackRecentLink, getCredencialByLinkId } = useLinkStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  const isFavorite = favoriteIds.includes(link.id);
  const hasCredentials = Boolean(getCredencialByLinkId(link.id));

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteLink(link.id);
    } finally {
      setIsDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  const handleOpenLink = () => {
    trackRecentLink(link.id);
    window.open(link.url, '_blank');
  };
  
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success('Link copiado!');
      
      if (navigator.share) {
        await navigator.share({
          title: link.titulo,
          text: link.descricao || '',
          url: link.url
        });
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
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
      <Card 
        className="group overflow-hidden h-full flex flex-col glass-card hover:ring-2 hover:ring-primary/50 transition-all duration-300 cursor-pointer"
        onClick={handleOpenLink}
      >
        <div className="relative pt-[45%] bg-muted/30 overflow-hidden">
          {link.imagem_url ? (
            <img 
              src={link.imagem_url} 
              alt={link.titulo}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://placehold.co/400x200/2563eb/ffffff?text=${encodeURIComponent(link.titulo)}`;
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <Globe className="h-10 w-10 text-primary/20" />
            </div>
          )}
          
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="secondary"
              className={cn("h-8 w-8 rounded-full glass shadow-lg", hasCredentials && "text-indigo-600 dark:text-indigo-400")}
              onClick={(e) => {
                e.stopPropagation();
                setCredentialsDialogOpen(true);
              }}
              title="Credenciais & Chaves"
            >
              <Key className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-full glass shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(link.id);
              }}
            >
              <Star className={cn("h-4 w-4", isFavorite ? "fill-zinc-900 text-zinc-900" : "text-zinc-400")} />
            </Button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
             <span className="text-[10px] text-white font-medium flex items-center gap-1">
               Acessar agora <ExternalLink className="h-2.5 w-2.5" />
             </span>
          </div>
        </div>
        
        <CardContent className="flex-grow p-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold leading-tight line-clamp-2 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors text-zinc-900 dark:text-zinc-100">
                {link.titulo}
              </h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(link); }} className="gap-2">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setCredentialsDialogOpen(true); }} className={cn("gap-2", hasCredentials && "text-indigo-600 dark:text-indigo-400 font-medium")}>
                    <Key className="h-3.5 w-3.5" /> Credenciais & Chaves
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShare} className="gap-2">
                    <Share2 className="h-3.5 w-3.5" /> Compartilhar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setConfirmDeleteOpen(true); }} className="gap-2 text-destructive focus:text-destructive">
                    <Trash className="h-3.5 w-3.5" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center text-[10px] text-muted-foreground dark:text-zinc-400 font-medium">
              <img 
                src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${link.url}&size=16`} 
                className="h-3 w-3 mr-1.5 rounded-sm"
                alt=""
                onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
              />
              <span className="truncate">{formatUrl(link.url)}</span>
            </div>

            {link.descricao && (
              <p className="text-xs text-muted-foreground dark:text-zinc-400 line-clamp-2 leading-relaxed">
                {link.descricao}
              </p>
            )}

            <div className="flex flex-wrap gap-1.5 pt-1">
              {categoria && (
                <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-full text-[9px] font-bold">
                  {categoria.nome}
                </span>
              )}
              {subcategoria && (
                <span className="px-2 py-0.5 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 rounded-full text-[9px] font-bold border border-zinc-100 dark:border-zinc-700/60">
                  {subcategoria.nome}
                </span>
              )}
              {hasCredentials && (
                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full text-[9px] font-bold border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1">
                  <Key size={10} /> Credenciais
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <CredentialManager
        open={credentialsDialogOpen}
        onOpenChange={setCredentialsDialogOpen}
        linkId={link.id}
        linkTitle={link.titulo}
        linkUrl={link.url}
      />

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Link?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o link &quot;{link.titulo}&quot;? Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-medium">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-bold"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}