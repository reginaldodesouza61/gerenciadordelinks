import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useLinkStore } from '@/lib/store/linkStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CredentialManager } from '@/components/credentials/CredentialManager';
import { Link } from '@/types/supabase';
import { Key } from 'lucide-react';

interface LinkFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingLink: Link | null;
}

export function LinkForm({ open, onOpenChange, editingLink }: LinkFormProps) {
  const { user } = useAuthStore();
  const { 
    categorias, 
    subcategorias, 
    addLink, 
    updateLink 
  } = useLinkStore();
  
  const [titulo, setTitulo] = useState('');
  const [url, setUrl] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [subcategoriaId, setSubcategoriaId] = useState<string | null>(null);
  const [descricao, setDescricao] = useState('');
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [savedLinkId, setSavedLinkId] = useState<string | null>(null);
  
  const [availableSubcategorias, setAvailableSubcategorias] = useState(subcategorias);
  
  useEffect(() => {
    if (editingLink) {
      setTitulo(editingLink.titulo);
      setUrl(editingLink.url);
      setCategoriaId(editingLink.categoria_id);
      setSubcategoriaId(editingLink.subcategoria_id);
      setDescricao(editingLink.descricao || '');
    } else {
      resetForm();
    }
  }, [editingLink, open]);
  
  // Update available subcategories when category changes
  useEffect(() => {
    if (categoriaId) {
      setAvailableSubcategorias(
        subcategorias.filter(sub => sub.categoria_id === categoriaId)
      );
    } else {
      setAvailableSubcategorias([]);
    }
    
    // Reset subcategory selection if category changes
    if (categoriaId !== editingLink?.categoria_id) {
      setSubcategoriaId(null);
    }
  }, [categoriaId, subcategorias, editingLink]);
  
  // Auto-fetch metadata when URL is entered and fields are empty
  useEffect(() => {
    const isValidUrl = url && url.startsWith('http');
    const isNewLink = !editingLink;
    const hasEmptyFields = !titulo || !descricao;
    
    if (isValidUrl && isNewLink && hasEmptyFields) {
      const timer = setTimeout(() => {
        fetchUrlMetadata(url);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [url]);
  
  // Function to fetch metadata from URL
  const fetchUrlMetadata = async (urlToFetch: string) => {
    try {
      if (!urlToFetch || !urlToFetch.startsWith('http')) {
        return;
      }
      
      // Use metadata extraction proxy service
      const metadataUrl = `https://api.microlink.io/?url=${encodeURIComponent(urlToFetch)}&audio=false&video=false`;
      
      const response = await fetch(metadataUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data?.status === 'success') {
        // If title is empty, use metadata title
        if (!titulo && data.data.title) {
          setTitulo(data.data.title);
        }
        
        // Build metadata description
        const metadata = [];
        
        if (data.data.description) {
          metadata.push(`📝 Descrição: ${data.data.description}`);
        }
        
        if (data.data.publisher) {
          metadata.push(`🔖 Fonte: ${data.data.publisher}`);
        }
        
        if (data.data.author) {
          metadata.push(`✍️ Autor: ${data.data.author}`);
        }
        
        // Set combined metadata as description
        if (metadata.length > 0 && !descricao) {
          setDescricao(metadata.join('\n\n'));
        }
        
        toast.success('Metadados extraídos com sucesso!');
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
      toast.error('Não foi possível extrair metadados');
    }
  };
  
  const resetForm = () => {
    setTitulo('');
    setUrl('');
    setCategoriaId('');
    setSubcategoriaId(null);
    setDescricao('');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (!url.trim() || !titulo.trim() || !categoriaId) {
      return;
    }
    
    try {
      if (editingLink) {
        await updateLink(editingLink.id, {
          titulo,
          url,
          categoria_id: categoriaId,
          subcategoria_id: subcategoriaId,
          descricao: descricao || null
        });
        // If editing, use existing link ID for credentials
        setSavedLinkId(editingLink.id);
      } else {
        // If adding new link, get the new ID for credentials
        const newLinkId = await addLink({
          titulo,
          url,
          categoria_id: categoriaId,
          subcategoria_id: subcategoriaId,
          descricao: descricao || null,
          user_id: user.id
        });
        setSavedLinkId(newLinkId);
      }
      
      // Ask if user wants to add credentials
      const shouldAddCredentials = window.confirm('Deseja adicionar credenciais para este link?');
      if (shouldAddCredentials) {
        setCredentialsDialogOpen(true);
      } else {
        onOpenChange(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving link:', error);
    }
  };
  
  // Handler for when credentials dialog is closed
  const handleCredentialsDialogClose = (open: boolean) => {
    setCredentialsDialogOpen(open);
    if (!open) {
      onOpenChange(false);
      resetForm();
    }
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{editingLink ? 'Editar Link' : 'Adicionar Novo Link'}</span>
            {editingLink && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center"
                onClick={() => {
                  setSavedLinkId(editingLink.id);
                  setCredentialsDialogOpen(true);
                }}
              >
                <Key className="h-4 w-4 mr-1" />
                <span>Credenciais</span>
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input 
                id="title"
                value={titulo} 
                onChange={(e) => setTitulo(e.target.value)} 
                placeholder="Título do link"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <div className="flex gap-2">
                <Input 
                  id="url"
                  type="url"
                  value={url} 
                  onChange={(e) => setUrl(e.target.value)} 
                  placeholder="https://exemplo.com"
                  required
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fetchUrlMetadata(url)}
                  disabled={!url || !url.startsWith('http')}
                >
                  Extrair
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Clique em "Extrair" para obter automaticamente os metadados do site
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select 
                value={categoriaId} 
                onValueChange={setCategoriaId}
                required
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(categoria => (
                    <SelectItem key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategoria (opcional)</Label>
              <Select 
                value={subcategoriaId || ''} 
                onValueChange={setSubcategoriaId}
              >
                <SelectTrigger id="subcategory" disabled={!categoriaId || availableSubcategorias.length === 0}>
                  <SelectValue placeholder="Selecione uma subcategoria" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubcategorias.map(subcategoria => (
                    <SelectItem key={subcategoria.id} value={subcategoria.id}>
                      {subcategoria.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea 
                id="description"
                value={descricao} 
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Breve descrição do link"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingLink ? 'Salvar alterações' : 'Adicionar link'}
            </Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>

      {/* Credential Manager Dialog */}
      {savedLinkId && (
        <CredentialManager
          open={credentialsDialogOpen}
          onOpenChange={handleCredentialsDialogClose}
          linkId={savedLinkId}
          linkTitle={titulo}
          linkUrl={url}
        />
      )}
    </>
  );
}