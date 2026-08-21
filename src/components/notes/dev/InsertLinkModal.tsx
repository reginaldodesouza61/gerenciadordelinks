import { useState, useMemo } from 'react';
import { useLinkStore } from '@/lib/store/linkStore';
import { useNoteStore } from '@/lib/store/noteStore';
import { useAuthStore } from '@/lib/store/authStore';
import { Link } from '@/types/supabase';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, Link as LinkIcon, Globe, Folder, Plus, ExternalLink, Key, Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface InsertLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  onInsertCardBlock?: (link: Link) => void;
}

export function InsertLinkModal({
  isOpen,
  onClose,
  pageId,
  onInsertCardBlock,
}: InsertLinkModalProps) {
  const { user } = useAuthStore();
  const { links, categorias, subcategorias, getCredencialByLinkId } = useLinkStore();
  const { relations, fetchNotes } = useNoteStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const relatedLinkIds = useMemo(() => {
    return relations.filter(r => r.note_id === pageId).map(r => r.link_id);
  }, [relations, pageId]);

  const filteredLinks = useMemo(() => {
    return links.filter(l => {
      const matchesSearch = 
        !searchTerm || 
        l.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.descricao && l.descricao.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCat = !selectedCatId || l.categoria_id === selectedCatId;
      return matchesSearch && matchesCat;
    });
  }, [links, searchTerm, selectedCatId]);

  const handleSelectLink = async (link: Link) => {
    // 1. Insert card block on canvas
    if (onInsertCardBlock) {
      onInsertCardBlock(link);
    }

    // 2. Also register relation in note_link_relations if not already related
    if (user && !relatedLinkIds.includes(link.id)) {
      try {
        await supabase
          .from('note_link_relations')
          .insert([{ note_id: pageId, link_id: link.id, user_id: user.id }]);
        fetchNotes(user.id);
      } catch (err) {
        console.error('Error auto-linking relation', err);
      }
    }

    toast.success(`Link "${link.titulo}" inserido na anotação!`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 max-h-[85vh] flex flex-col p-0 overflow-hidden text-slate-800 dark:text-zinc-100">
        <DialogHeader className="p-4 pb-2 border-b border-slate-200 dark:border-zinc-800">
          <DialogTitle className="flex items-center gap-2 text-base text-slate-800 dark:text-zinc-100">
            <LinkIcon size={18} className="text-indigo-600 dark:text-indigo-400" />
            Vincular Link Cadastrado às Anotações
          </DialogTitle>
        </DialogHeader>

        {/* Search & Category Filter */}
        <div className="p-4 pb-2 space-y-3 shrink-0">
          <div className="relative">
            <Input
              placeholder="Buscar por título, URL ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs dark:bg-zinc-800 dark:border-zinc-700"
              autoFocus
            />
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400 dark:text-zinc-500" />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCatId(null)}
              className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                selectedCatId === null 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              Todos ({links.length})
            </button>
            {categorias.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCatId(selectedCatId === c.id ? null : c.id)}
                className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                  selectedCatId === c.id 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                {c.nome}
              </button>
            ))}
          </div>
        </div>

        {/* Links List */}
        <div className="flex-1 overflow-y-auto p-4 pt-1 space-y-2">
          {filteredLinks.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-zinc-500">
              <Globe size={32} className="mx-auto mb-2 opacity-40 text-slate-400 dark:text-zinc-500" />
              <p className="text-xs font-medium text-slate-600 dark:text-zinc-300">Nenhum link encontrado</p>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">Cadastre links no gerenciador para vinculá-los às anotações.</p>
            </div>
          ) : (
            filteredLinks.map((link) => {
              const cat = categorias.find(c => c.id === link.categoria_id);
              const sub = subcategorias.find(s => s.id === link.subcategoria_id);
              const isAlreadyRelated = relatedLinkIds.includes(link.id);
              const cred = getCredencialByLinkId(link.id);

              return (
                <div
                  key={link.id}
                  onClick={() => handleSelectLink(link)}
                  className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 cursor-pointer transition-all flex items-start justify-between gap-3 group bg-white dark:bg-zinc-900"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-100 dark:border-indigo-800">
                      <Globe size={16} />
                    </div>

                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 truncate">
                          {link.titulo}
                        </span>
                        {isAlreadyRelated && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium shrink-0">
                            Já vinculado
                          </span>
                        )}
                        {cred && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium flex items-center gap-0.5 shrink-0" title="Possui credenciais cadastradas">
                            <Key size={10} /> Credencial
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono truncate">
                        {link.url}
                      </p>

                      {cat && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-zinc-500 pt-0.5">
                          <Folder size={10} />
                          <span>{cat.nome}</span>
                          {sub && <span>/ {sub.nome}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white shrink-0 group-hover:border-indigo-500 font-medium gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectLink(link);
                    }}
                  >
                    <Plus size={13} /> Inserir
                  </Button>
                </div>
              );
            })
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
