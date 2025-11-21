import { useState } from 'react';
import { useLinkStore } from '@/lib/store/linkStore';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash, Share2, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { Link, Categoria, Subcategoria } from '@/types/supabase';

interface LinkCardProps {
  link: Link;
  categoria: Categoria | undefined;
  subcategoria: Subcategoria | undefined;
  onEdit: (link: Link) => void;
}

export function LinkCard({ link, categoria, subcategoria, onEdit }: LinkCardProps) {
  const { deleteLink } = useLinkStore();
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir este link?')) {
      setIsDeleting(true);
      try {
        await deleteLink(link.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  const handleShare = async () => {
    try {
      // Fallback to clipboard first since Web Share API might cause errors in some browsers
      await navigator.clipboard.writeText(link.url);
      toast.success('Link copiado para a área de transferência!');
      
      // Try to use the Web Share API if available and user confirms
      if (navigator.share && window.confirm('Deseja compartilhar este link usando as opções do sistema?')) {
        await navigator.share({
          title: link.titulo,
          text: link.descricao || '',
          url: link.url
        });
      }
    } catch (err) {
      console.error('Error sharing:', err);
      
      // Even if sharing fails, try clipboard again as ultimate fallback
      try {
        const tempInput = document.createElement('input');
        tempInput.value = link.url;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        toast.success('Link copiado para a área de transferência!');
      } catch (clipErr) {
        toast.error('Erro ao compartilhar link');
      }
    }
  };
  
  // Format URL for display
  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };
  
  return (
    <Card className="overflow-hidden h-full flex flex-col shadow-sm hover:shadow-md transition-shadow max-w-[220px] text-xs">
      <div className="relative pt-[28%] bg-gray-100">
        {link.imagem_url ? (
          <img 
            src={link.imagem_url} 
            alt={link.titulo}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/400x200?text=Sem+Imagem';
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <Globe className="h-6 w-6 text-gray-300" />
          </div>
        )}
      </div>
      
      <CardContent className="flex-grow py-1 px-2">
        <div className="space-y-0.5">
          <h3 className="text-xs font-semibold line-clamp-1">{link.titulo}</h3>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center text-[9px] text-gray-500">
              <Globe className="h-2.5 w-2.5 mr-1" />
              <span className="truncate">{formatUrl(link.url)}</span>
            </div>
            <div className="flex items-center text-[9px] text-gray-400">
              <span>Adicionado: {new Date(link.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          {link.descricao && (
            <p className="text-[10px] text-gray-600 line-clamp-2 mt-0.5">
              {link.descricao}
            </p>
          )}
          <div className="flex flex-wrap gap-0.5 mt-0.5">
            {categoria && (
              <span className="px-1 py-0.5 bg-primary/10 text-primary rounded-md text-[9px]">
                {categoria.nome}
              </span>
            )}
            {subcategoria && (
              <span className="px-1 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[9px]">
                {subcategoria.nome}
              </span>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 pb-1 px-2">
        <div className="flex justify-between w-full">
          <Button 
            size="icon" 
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => onEdit(link)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <div className="flex gap-0.5">
            <Button 
              size="icon" 
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={handleShare}
            >
              <Share2 className="h-3 w-3" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost"
              className="text-red-600 hover:bg-red-50 h-6 w-6 p-0"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}