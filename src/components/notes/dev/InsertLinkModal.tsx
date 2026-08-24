import { useState, useMemo } from 'react';
import { useLinkStore } from '@/lib/store/linkStore';
import { useNoteStore } from '@/lib/store/noteStore';
import { useAuthStore } from '@/lib/store/authStore';
import { Link } from '@/types/supabase';
import { CanvasBlock } from '@/types/notes';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Search, Link as LinkIcon, Globe, Folder, Plus, ExternalLink, Key, Check,
  Sparkles, Layers, FileText, BookmarkPlus, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface CustomLinkData {
  titulo: string;
  url: string;
  descricao?: string;
  categoria?: string;
  saveToLibrary?: boolean;
}

interface InsertLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  initialTab?: 'registered' | 'custom';
  targetTextBlockId?: string | null;
  allBlocks?: CanvasBlock[];
  onInsertCardBlock?: (link: Link | { id?: string; titulo: string; url: string; descricao?: string; categoria?: string }) => void;
  onInsertInlineLink?: (url: string, title?: string, targetBlockId?: string) => void;
}

export function InsertLinkModal({
  isOpen,
  onClose,
  pageId,
  initialTab = 'registered',
  targetTextBlockId,
  allBlocks = [],
  onInsertCardBlock,
  onInsertInlineLink,
}: InsertLinkModalProps) {
  const { user } = useAuthStore();
  const { links, categorias, subcategorias, getCredencialByLinkId, addLink } = useLinkStore();
  const { relations, fetchNotes } = useNoteStore();
  
  const [activeTab, setActiveTab] = useState<'registered' | 'custom'>(initialTab);
  
  // Tab 1 (Registered) search & filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  // Tab 2 (Custom / Unregistered Link) Form
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customCat, setCustomCat] = useState('');
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [insertMode, setInsertMode] = useState<'card' | 'inline' | 'new_block'>('card');
  const [selectedBlockId, setSelectedBlockId] = useState<string>(targetTextBlockId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter text blocks on canvas for inline target selection
  const textBlocks = useMemo(() => {
    return allBlocks.filter((b) => !b.type || b.type === 'text');
  }, [allBlocks]);

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

  const handleSelectRegisteredLink = async (link: Link) => {
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
        const userId = user?.id || 'c72212e7-2b6a-4da7-8745-01eb33414af4';
        fetchNotes(userId);
      } catch (err) {
        console.error('Error auto-linking relation', err);
      }
    }

    toast.success(`Link "${link.titulo}" inserido na anotação!`);
    onClose();
  };

  const handleInsertCustomLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) {
      toast.error('Informe o endereço URL do link.');
      return;
    }

    let formattedUrl = customUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const titleToUse = customTitle.trim() || formattedUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    setIsSubmitting(true);

    try {
      let createdLinkId: string | undefined;

      // If user checked "Save also to Link Library"
      if (saveToLibrary && user) {
        try {
          createdLinkId = await addLink({
            titulo: titleToUse,
            url: formattedUrl,
            descricao: customDesc.trim() || null,
            categoria_id: null,
            subcategoria_id: null,
            user_id: user.id,
            ordem: 0,
            icone: null,
          });
          toast.success('Link cadastrado no gerenciador com sucesso!');
        } catch (err) {
          console.error('Error saving link to library:', err);
        }
      }

      if (insertMode === 'card') {
        // Insert standalone Card block on canvas
        if (onInsertCardBlock) {
          onInsertCardBlock({
            id: createdLinkId,
            titulo: titleToUse,
            url: formattedUrl,
            descricao: customDesc.trim() || undefined,
            categoria: customCat.trim() || undefined,
          });
        }
        toast.success(`Card de link "${titleToUse}" adicionado ao quadro!`);
      } else if (insertMode === 'inline') {
        // Insert inline inside text block
        if (onInsertInlineLink) {
          onInsertInlineLink(formattedUrl, titleToUse, selectedBlockId || targetTextBlockId || undefined);
        }
        toast.success(`Link inserido no bloco de anotações!`);
      } else if (insertMode === 'new_block') {
        // Create new text block with link
        if (onInsertInlineLink) {
          onInsertInlineLink(formattedUrl, titleToUse, 'new_block');
        }
        toast.success(`Novo bloco criado com o link!`);
      }

      // Reset form
      setCustomTitle('');
      setCustomUrl('');
      setCustomDesc('');
      setCustomCat('');
      setSaveToLibrary(false);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao inserir link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 max-h-[88vh] flex flex-col p-0 overflow-hidden text-slate-800 dark:text-zinc-100 shadow-2xl">
        <DialogHeader className="p-4 pb-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <LinkIcon size={18} />
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Inserir Link nas Anotações
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Adicione links cadastrados no sistema ou insira novos links avulsos/personalizados diretamente na folha.
          </DialogDescription>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('registered')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'registered'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-200/80 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Globe size={13} />
              <span>Links Cadastrados ({links.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'custom'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-200/80 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Plus size={13} />
              <span>Link Avulso (Não Cadastrado)</span>
            </button>
          </div>
        </DialogHeader>

        {/* TAB 1: REGISTERED LINKS */}
        {activeTab === 'registered' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Search & Category Filter */}
            <div className="p-4 pb-2 space-y-2.5 shrink-0 bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800">
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
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 transition-colors ${
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
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 transition-colors ${
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
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredLinks.length === 0 ? (
                <div className="text-center py-10 text-slate-400 dark:text-zinc-500 space-y-2">
                  <Globe size={32} className="mx-auto opacity-40 text-slate-400 dark:text-zinc-500" />
                  <p className="text-xs font-medium text-slate-600 dark:text-zinc-300">Nenhum link cadastrado encontrado</p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                    Você pode inserir um link avulso diretamente na aba <strong className="text-indigo-600 dark:text-indigo-400 cursor-pointer" onClick={() => setActiveTab('custom')}>"Link Avulso"</strong>.
                  </p>
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
                      onClick={() => handleSelectRegisteredLink(link)}
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
                          handleSelectRegisteredLink(link);
                        }}
                      >
                        <Plus size={13} /> Inserir
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOM / UNREGISTERED LINK */}
        {activeTab === 'custom' && (
          <form onSubmit={handleInsertCustomLink} className="flex-1 flex flex-col overflow-y-auto p-5 space-y-4">
            <div className="space-y-3">
              {/* URL Input */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Endereço URL do Link <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] font-normal text-slate-400">ex: https://github.com, docs.docker.com</span>
                </Label>
                <div className="relative mt-1">
                  <Input
                    placeholder="https://exemplo.com.br/artigo"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="pl-8 text-xs font-mono dark:bg-zinc-800 dark:border-zinc-700"
                    autoFocus
                    required
                  />
                  <Globe size={14} className="absolute left-2.5 top-2.5 text-slate-400 dark:text-zinc-500" />
                </div>
              </div>

              {/* Title Input */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Título / Nome de Exibição (Opcional)
                </Label>
                <Input
                  placeholder="ex: Documentação da API, Portal do Cliente, Artigo de Referência"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="mt-1 text-xs dark:bg-zinc-800 dark:border-zinc-700"
                />
              </div>

              {/* Description Input */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Descrição ou Observações (Opcional)
                </Label>
                <Textarea
                  placeholder="Breve nota sobre o conteúdo deste link..."
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  className="mt-1 text-xs dark:bg-zinc-800 dark:border-zinc-700 resize-none"
                  rows={2}
                />
              </div>

              {/* Insert Mode Picker */}
              <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Onde e como inserir este link?
                </Label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Mode: Canvas Card */}
                  <div
                    onClick={() => setInsertMode('card')}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                      insertMode === 'card'
                        ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                    }`}
                  >
                    <Layers size={16} className={`mt-0.5 shrink-0 ${insertMode === 'card' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center justify-between">
                        <span>Card no Quadro</span>
                        {insertMode === 'card' && <CheckCircle2 size={13} className="text-indigo-600 dark:text-indigo-400" />}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                        Cria um card flutuante com título, URL e botão de abrir.
                      </p>
                    </div>
                  </div>

                  {/* Mode: Inside active text block */}
                  <div
                    onClick={() => setInsertMode('inline')}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                      insertMode === 'inline'
                        ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                    }`}
                  >
                    <FileText size={16} className={`mt-0.5 shrink-0 ${insertMode === 'inline' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center justify-between">
                        <span>Dentro do Bloco de Texto</span>
                        {insertMode === 'inline' && <CheckCircle2 size={13} className="text-indigo-600 dark:text-indigo-400" />}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                        Insere como hiperlink formatado dentro do bloco de texto.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* If inline selected and there are multiple text blocks, allow choosing target */}
              {insertMode === 'inline' && textBlocks.length > 1 && (
                <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/50 rounded-lg border border-slate-200 dark:border-zinc-700/80 space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Selecione o bloco de texto de destino:
                  </Label>
                  <select
                    className="w-full text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded px-2 py-1 outline-none"
                    value={selectedBlockId}
                    onChange={(e) => setSelectedBlockId(e.target.value)}
                  >
                    <option value="">Bloco Atualmente Selecionado</option>
                    {textBlocks.map((tb, idx) => (
                      <option key={tb.id} value={tb.id}>
                        Bloco #{idx + 1} ({tb.content?.replace(/<[^>]*>?/gm, '').slice(0, 40) || 'Bloco de texto'}...)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Optional: Save to global link library checkbox */}
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-2.5 cursor-pointer" onClick={() => setSaveToLibrary(!saveToLibrary)}>
                <input
                  type="checkbox"
                  id="saveToLibraryCheck"
                  checked={saveToLibrary}
                  onChange={(e) => setSaveToLibrary(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="text-xs">
                  <label htmlFor="saveToLibraryCheck" className="font-semibold text-slate-800 dark:text-zinc-200 cursor-pointer flex items-center gap-1.5">
                    <BookmarkPlus size={13} className="text-indigo-600 dark:text-indigo-400" />
                    <span>Salvar também no Gerenciador Geral de Links</span>
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                    Permite reutilizar este link facilmente no futuro em qualquer outra anotação ou categoria.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
                Cancelar
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !customUrl.trim()}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5 shadow-sm"
              >
                <Plus size={14} />
                <span>
                  {insertMode === 'card'
                    ? 'Adicionar Card de Link'
                    : 'Inserir Link no Texto'}
                </span>
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Footer for Registered Tab */}
        {activeTab === 'registered' && (
          <DialogFooter className="p-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('custom')}
              className="text-xs gap-1.5 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
            >
              <Plus size={13} />
              <span>Inserir Link Não Cadastrado</span>
            </Button>

            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Fechar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
