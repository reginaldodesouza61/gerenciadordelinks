import { useState } from 'react';
import { useLinkStore } from '@/lib/store/linkStore';
import { Button } from '@/components/ui/button';
import { Pencil, Trash, Share2, ExternalLink, Key } from 'lucide-react';
import { toast } from 'sonner';
import { Link, Categoria, Subcategoria } from '@/types/supabase';
import { ShareDialog } from './ShareDialog';
import { CredentialManager } from '@/components/credentials/CredentialManager';

interface LinkListItemProps {
  link: Link;
  categoria: Categoria | undefined;
  subcategoria: Subcategoria | undefined;
  onEdit: (link: Link) => void;
}

export function LinkListItem({ link, categoria, subcategoria, onEdit }: LinkListItemProps) {
  const { deleteLink, getCredencialByLinkId } = useLinkStore();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  
  // Check if this link has credentials
  const hasCredentials = Boolean(getCredencialByLinkId(link.id));
  
  const handleCredentialsClick = () => {
    setCredentialsDialogOpen(true);
  };
  
  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir este link?')) {
      try {
        await deleteLink(link.id);
      } catch (error) {
        console.error('Error deleting link:', error);
      }
    }
  };
  
  const handleShare = () => {
    setShareDialogOpen(true);
  };
  
  return (
    <>
      <div className="border rounded-md p-4 bg-white">
        <div className="flex justify-between">
          <div className="space-y-2">
            <div className="flex items-center">
              <h3 className="font-medium mr-2">{link.titulo}</h3>
              {categoria && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs">
                  {categoria.nome}
                </span>
              )}
              {subcategoria && (
                <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs">
                  {subcategoria.nome}
                </span>
              )}
            </div>
            
            {link.descricao && (
              <p className="text-sm text-gray-600">
                {link.descricao}
              </p>
            )}
            
            <a 
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline flex items-center"
            >
              {link.url}
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>
          
          <div className="flex space-x-2 self-start">
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onEdit(link)}
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              className={`${hasCredentials ? 'text-blue-600' : ''}`}
              onClick={handleCredentialsClick}
              title="Gerenciar credenciais"
            >
              <Key className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={handleShare}
              title="Compartilhar"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              onClick={handleDelete}
              title="Excluir"
            >
              <Trash className="h-4 w-4" />
            </Button>
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