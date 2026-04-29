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
import { Key, Link as LinkIcon, Type, Tag, AlignLeft, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [isExtracting, setIsExtracting] = useState(false);
  
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
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [url]);
  
  // Function to fetch metadata from URL
  const fetchUrlMetadata = async (urlToFetch: string) => {
    if (!urlToFetch) return;
    
    // Ensure URL is properly formatted
    let formattedUrl = urlToFetch.trim();
    if (!formattedUrl.startsWith('http')) {
      formattedUrl = `https://${formattedUrl}`;
    }
    
    setIsExtracting(true);
    try {
      // Use Microlink as primary API
      const metadataUrl = `https://api.microlink.io/?url=${encodeURIComponent(formattedUrl)}&audio=false&video=false&palette=false`;
      
      const response = await fetch(metadataUrl);
      const data = await response.json();
      
      if (data?.status === 'success' && data.data) {
        const { title, description } = data.data;
        
        if (title) {
          setTitulo(title);
        }
        
        if (description) {
          setDescricao(description);
        }
        
        toast.success('Informações atualizadas!', {
          icon: <Sparkles className="h-4 w-4 text-amber-500" />
        });
      } else {
        // Fallback to a simpler favicon service if full metadata fails
        throw new Error('Microlink failed');
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
      
      // If full metadata fails, at least we try to fix the URL if it was invalid
      if (!urlToFetch.startsWith('http')) {
        setUrl(formattedUrl);
      }
      
      toast.error('Não foi possível extrair tudo, mas a URL foi validada');
    } finally {
      setIsExtracting(false);
    }
  };
  
  const resetForm = () => {
    setTitulo('');
    setUrl('');
    setCategoriaId('');
    setSubcategoriaId(null);
    setDescricao('');
    setSavedLinkId(null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !url.trim() || !titulo.trim() || !categoriaId) {
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
        setSavedLinkId(editingLink.id);
      } else {
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
      
      const shouldAddCredentials = window.confirm('Deseja associar credenciais (usuário/senha) a este link?');
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
        <DialogContent className="sm:max-w-lg glass-card border-none overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-2xl font-bold tracking-tight">
              <span className="text-gradient">{editingLink ? 'Editar Link' : 'Novo Link'}</span>
              {editingLink && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-2 border-primary/20 hover:bg-primary/5"
                  onClick={() => {
                    setSavedLinkId(editingLink.id);
                    setCredentialsDialogOpen(true);
                  }}
                >
                  <Key className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs">Senhas</span>
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url" className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <LinkIcon className="h-3.5 w-3.5" /> Endereço URL
                </Label>
                <div className="flex gap-2">
                  <Input 
                    id="url"
                    type="url"
                    value={url} 
                    onChange={(e) => setUrl(e.target.value)} 
                    placeholder="https://exemplo.com"
                    className="h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-primary"
                    required
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    className="h-11 px-4 rounded-xl gap-2 font-semibold"
                    onClick={() => fetchUrlMetadata(url)}
                    disabled={!url || !url.startsWith('http') || isExtracting}
                  >
                    {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    <span className="hidden sm:inline">Auto</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <Type className="h-3.5 w-3.5" /> Título do Link
                </Label>
                <Input 
                  id="title"
                  value={titulo} 
                  onChange={(e) => setTitulo(e.target.value)} 
                  placeholder="Ex: Documentação React"
                  className="h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-primary"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" /> Categoria
                  </Label>
                  <Select value={categoriaId} onValueChange={setCategoriaId} required>
                    <SelectTrigger id="category" className="h-11 rounded-xl bg-muted/30 border-none">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      {categorias.map(categoria => (
                        <SelectItem key={categoria.id} value={categoria.id} className="rounded-lg">
                          {categoria.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subcategory" className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <Tag className="h-3.5 w-3.5 opacity-50" /> Subcategoria
                  </Label>
                  <Select value={subcategoriaId || ''} onValueChange={setSubcategoriaId}>
                    <SelectTrigger id="subcategory" disabled={!categoriaId || availableSubcategorias.length === 0} className="h-11 rounded-xl bg-muted/30 border-none">
                      <SelectValue placeholder="Opcional..." />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      {availableSubcategorias.map(subcategoria => (
                        <SelectItem key={subcategoria.id} value={subcategoria.id} className="rounded-lg">
                          {subcategoria.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <AlignLeft className="h-3.5 w-3.5" /> Descrição
                </Label>
                <Textarea 
                  id="description"
                  value={descricao} 
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Sobre o que é este link?"
                  rows={3}
                  className="rounded-xl bg-muted/30 border-none focus-visible:ring-primary resize-none"
                />
              </div>
            </div>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                type="button"
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                className="rounded-xl font-semibold"
              >
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl font-bold px-8 shadow-lg shadow-primary/20">
                {editingLink ? 'Salvar Alterações' : 'Criar Link'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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