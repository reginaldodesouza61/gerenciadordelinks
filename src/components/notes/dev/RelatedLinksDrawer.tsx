import { useState, useMemo } from 'react';
import { useNoteStore } from '@/lib/store/noteStore';
import { useLinkStore } from '@/lib/store/linkStore';
import { useAuthStore } from '@/lib/store/authStore';
import { Link } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  Link as LinkIcon, Search, Plus, Trash2, ExternalLink, Copy, Check, 
  Globe, Folder, Key, X, LayoutGrid
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface RelatedLinksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  onInsertCardBlock?: (link: Link) => void;
}

export function RelatedLinksDrawer({
  isOpen,
  onClose,
  pageId,
  onInsertCardBlock,
}: RelatedLinksDrawerProps) {
  const { user } = useAuthStore();
  const { relations, fetchNotes } = useNoteStore();
  const { links, categorias, subcategorias, getCredencialByLinkId } = useLinkStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isLinkingNew, setIsLinkingNew] = useState(false);
  const [newLinkSearch, setNewLinkSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const relatedLinkIds = useMemo(() => {
    return relations.filter(r => r.note_id === pageId).map(r => r.link_id);
  }, [relations, pageId]);

  const relatedLinks = useMemo(() => {
    return links.filter(l => 
      relatedLinkIds.includes(l.id) &&
      (!searchTerm || l.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || l.url.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [links, relatedLinkIds, searchTerm]);

  const availableToLink = useMemo(() => {
    return links.filter(l => 
      !relatedLinkIds.includes(l.id) &&
      (!newLinkSearch || l.titulo.toLowerCase().includes(newLinkSearch.toLowerCase()) || l.url.toLowerCase().includes(newLinkSearch.toLowerCase()))
    );
  }, [links, relatedLinkIds, newLinkSearch]);

  const addRelation = async (link: Link) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('note_link_relations')
      .insert([{ note_id: pageId, link_id: link.id, user_id: user.id }]);
      
    if (error) {
      toast.error('Erro ao relacionar link');
    } else {
      toast.success(`"${link.titulo}" relacionado com sucesso!`);
      const userId = user?.id || 'c72212e7-2b6a-4da7-8745-01eb33414af4';
      fetchNotes(userId);
    }
  };

  const removeRelation = async (linkId: string) => {
    const relation = relations.find(r => r.note_id === pageId && r.link_id === linkId);
    if (!relation) return;
    
    const { error } = await supabase
      .from('note_link_relations')
      .delete()
      .eq('id', relation.id);
      
    if (error) {
      toast.error('Erro ao desvincular link');
    } else {
      toast.success('Vínculo removido');
      const userId = user?.id || 'c72212e7-2b6a-4da7-8745-01eb33414af4';
      fetchNotes(userId);
    }
  };

  const copyUrl = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success('URL copiada!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 max-h-[85vh] flex flex-col p-0 overflow-hidden text-slate-800 dark:text-zinc-100">
        <DialogHeader className="p-4 pb-2 border-b border-slate-200 dark:border-zinc-800 flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-base text-slate-800 dark:text-zinc-100">
            <LinkIcon size={18} className="text-indigo-600 dark:text-indigo-400" />
            Links Relacionados a esta Nota ({relatedLinkIds.length})
          </DialogTitle>
        </DialogHeader>

        {/* Tab / Sub-header bar */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Filtrar links relacionados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-white dark:bg-zinc-800 dark:border-zinc-700"
            />
            <Search size={14} className="absolute left-2.5 top-2 text-slate-400 dark:text-zinc-500" />
          </div>

          <Button
            size="sm"
            onClick={() => setIsLinkingNew(!isLinkingNew)}
            className={`h-8 text-xs gap-1 ${
              isLinkingNew 
                ? 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-300 dark:hover:bg-zinc-700' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isLinkingNew ? <X size={13} /> : <Plus size={13} />}
            <span>{isLinkingNew ? 'Ver Vinculados' : 'Vincular Novo Link'}</span>
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isLinkingNew ? (
            /* Add New Relations Mode */
            <div className="space-y-3">
              <div className="relative">
                <Input
                  placeholder="Buscar link cadastrado para vincular..."
                  value={newLinkSearch}
                  onChange={(e) => setNewLinkSearch(e.target.value)}
                  className="pl-8 h-8 text-xs dark:bg-zinc-800 dark:border-zinc-700"
                  autoFocus
                />
                <Search size={14} className="absolute left-2.5 top-2 text-slate-400 dark:text-zinc-500" />
              </div>

              <div className="space-y-2">
                {availableToLink.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 dark:text-zinc-500 text-xs">
                    Nenhum outro link disponível para vincular.
                  </div>
                ) : (
                  availableToLink.map((link) => {
                    const cat = categorias.find(c => c.id === link.categoria_id);
                    return (
                      <div
                        key={link.id}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 flex items-center justify-between gap-3 transition-colors bg-white dark:bg-zinc-900"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Globe size={16} className="text-indigo-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">{link.titulo}</p>
                            <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono truncate">{link.url}</p>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addRelation(link)}
                          className="h-7 text-xs border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white shrink-0 gap-1 font-medium bg-white dark:bg-zinc-800"
                        >
                          <Plus size={12} /> Vincular
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* Currently Related Links */
            <div>
              {relatedLinks.length === 0 ? (
                <div className="text-center py-10 text-slate-400 dark:text-zinc-500">
                  <LinkIcon size={32} className="mx-auto mb-2 opacity-30 text-slate-400 dark:text-zinc-500" />
                  <p className="text-xs font-medium text-slate-600 dark:text-zinc-300">Nenhum link vinculado a esta página</p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 max-w-sm mx-auto">
                    Conecte documentações, endpoints, repositórios e serviços salvos para acessá-los direto desta nota.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setIsLinkingNew(true)}
                    className="mt-3 h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                  >
                    <Plus size={13} /> Vincular Primeiro Link
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {relatedLinks.map((link) => {
                    const cat = categorias.find(c => c.id === link.categoria_id);
                    const sub = subcategorias.find(s => s.id === link.subcategoria_id);
                    const cred = getCredencialByLinkId(link.id);
                    const isCopied = copiedId === link.id;

                    return (
                      <div
                        key={link.id}
                        className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700 shadow-xs flex flex-col justify-between gap-2 group"
                      >
                        <div>
                          {/* Title and remove button */}
                          <div className="flex items-start justify-between gap-2">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-xs text-slate-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline line-clamp-1"
                            >
                              {link.titulo}
                            </a>
                            <button
                              type="button"
                              onClick={() => removeRelation(link.id)}
                              className="text-slate-400 hover:text-rose-600 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                              title="Desvincular da nota"
                            >
                              <X size={13} />
                            </button>
                          </div>

                          <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono truncate mt-0.5">
                            {link.url}
                          </p>

                          {cat && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 px-1.5 py-0.2 rounded font-medium mt-1.5">
                              <Folder size={10} />
                              {cat.nome}
                              {sub && ` / ${sub.nome}`}
                            </span>
                          )}
                        </div>

                        {/* Card bottom actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs">
                          <div className="flex items-center gap-1">
                            {/* Copy URL */}
                            <button
                              type="button"
                              onClick={() => copyUrl(link.url, link.id)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Copiar URL"
                            >
                              {isCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            </button>

                            {/* Open */}
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Abrir em nova aba"
                            >
                              <ExternalLink size={13} />
                            </a>

                            {cred && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1 rounded flex items-center gap-0.5 border border-amber-200 dark:border-amber-800" title="Possui credenciais salvas">
                                <Key size={10} /> Credencial
                              </span>
                            )}
                          </div>

                          {/* Embed on canvas as block button */}
                          {onInsertCardBlock && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                onInsertCardBlock(link);
                                toast.success(`Card inserido no quadro da nota!`);
                              }}
                              className="h-6 text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-1.5 gap-1"
                              title="Colocar como card no quadro"
                            >
                              <LayoutGrid size={12} /> Colocar no Quadro
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
