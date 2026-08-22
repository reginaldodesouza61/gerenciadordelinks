import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNoteStore } from '@/lib/store/noteStore';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  FileText, 
  Folder, 
  Code2, 
  ShieldCheck, 
  Shapes, 
  Table2, 
  Link as LinkIcon, 
  ImageIcon, 
  ArrowRight, 
  CornerDownLeft, 
  X,
  Sparkles,
  Layers,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotePage, CanvasBlock } from '@/types/notes';

export interface SearchResultItem {
  id: string;
  type: 'page' | 'section' | 'text' | 'table' | 'script' | 'vault' | 'whiteboard' | 'link_card' | 'image';
  title: string;
  subtitle: string;
  snippet?: string;
  matchContext?: string;
  sectionId: string;
  sectionName: string;
  pageId: string;
  pageTitle: string;
  blockId?: string;
  extraMeta?: string;
}

interface GlobalNotesSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToBlock?: (pageId: string, blockId?: string) => void;
}

type FilterCategory = 'all' | 'pages' | 'text' | 'scripts' | 'vault' | 'drawings';

export function GlobalNotesSearchModal({
  open,
  onOpenChange,
  onNavigateToBlock,
}: GlobalNotesSearchModalProps) {
  const { sections, pages, setActiveSectionId, setActivePageId } = useNoteStore();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Auto focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Section name lookup map
  const sectionMap = useMemo(() => {
    const map = new Map<string, string>();
    sections.forEach((s) => map.set(s.id, s.nome));
    return map;
  }, [sections]);

  // Strip HTML tags for clean text search
  const stripHtml = (html: string): string => {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Helper to extract highlighted snippet
  const extractSnippet = (fullText: string, searchTerm: string): string => {
    if (!searchTerm || !fullText) return fullText.slice(0, 100);
    const lowerText = fullText.toLowerCase();
    const lowerTerm = searchTerm.toLowerCase();
    const index = lowerText.indexOf(lowerTerm);
    if (index === -1) return fullText.slice(0, 100);

    const start = Math.max(0, index - 40);
    const end = Math.min(fullText.length, index + searchTerm.length + 60);
    let snippet = fullText.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < fullText.length) snippet = snippet + '...';
    return snippet;
  };

  // Deep Search across all pages, sections, and block contents
  const allResults = useMemo<SearchResultItem[]>(() => {
    const term = query.trim().toLowerCase();
    const list: SearchResultItem[] = [];

    // Search through sections
    sections.forEach((section) => {
      const matchName = !term || section.nome.toLowerCase().includes(term);
      if (matchName) {
        // Find first page of section if any
        const firstPage = pages.find((p) => p.section_id === section.id);
        list.push({
          id: `sec_${section.id}`,
          type: 'section',
          title: section.nome,
          subtitle: 'Seção de Anotações',
          snippet: `Seção contendo ${pages.filter((p) => p.section_id === section.id).length} páginas`,
          sectionId: section.id,
          sectionName: section.nome,
          pageId: firstPage?.id || '',
          pageTitle: firstPage?.titulo || '',
          extraMeta: 'Seção',
        });
      }
    });

    // Search through pages & block contents
    pages.forEach((page) => {
      const sectionName = sectionMap.get(page.section_id) || 'Sem Seção';
      const pageTitleLower = (page.titulo || '').toLowerCase();
      const isPageTitleMatch = !term || pageTitleLower.includes(term);

      if (isPageTitleMatch) {
        list.push({
          id: `page_${page.id}`,
          type: 'page',
          title: page.titulo || 'Sem Título',
          subtitle: `Página em "${sectionName}"`,
          snippet: `Anotação com data de criação ${page.created_at ? new Date(page.created_at).toLocaleDateString('pt-BR') : 'recente'}`,
          sectionId: page.section_id,
          sectionName: sectionName,
          pageId: page.id,
          pageTitle: page.titulo,
          extraMeta: page.parent_id ? 'Subpágina' : 'Página',
        });
      }

      // Parse JSON canvas blocks inside page.conteudo
      if (page.conteudo) {
        try {
          const parsed = JSON.parse(page.conteudo);
          if (Array.isArray(parsed)) {
            parsed.forEach((block: CanvasBlock, index) => {
              // 1. Text & Table Blocks
              if (block.type === 'text' || !block.type) {
                const plainText = stripHtml(block.content || '');
                const hasMatch = term && plainText.toLowerCase().includes(term);

                if (hasMatch) {
                  list.push({
                    id: `block_${block.id || index}`,
                    type: 'text',
                    title: `Bloco de Texto em "${page.titulo}"`,
                    subtitle: `${sectionName} > ${page.titulo}`,
                    snippet: extractSnippet(plainText, term),
                    sectionId: page.section_id,
                    sectionName: sectionName,
                    pageId: page.id,
                    pageTitle: page.titulo,
                    blockId: block.id,
                    extraMeta: 'Texto',
                  });
                }

                // Search tables inside text block
                if (block.tableData) {
                  const headers = block.tableData.headers || [];
                  const rows = block.tableData.rows || [];
                  const tableText = [...headers, ...rows.flat()].join(' ');
                  if (term && tableText.toLowerCase().includes(term)) {
                    list.push({
                      id: `table_${block.id || index}`,
                      type: 'table',
                      title: `Tabela de Dados em "${page.titulo}"`,
                      subtitle: `${sectionName} > ${page.titulo}`,
                      snippet: extractSnippet(tableText, term),
                      sectionId: page.section_id,
                      sectionName: sectionName,
                      pageId: page.id,
                      pageTitle: page.titulo,
                      blockId: block.id,
                      extraMeta: `${headers.length} colunas / ${rows.length} linhas`,
                    });
                  }
                }
              }

              // 2. Script / Code Blocks
              else if (block.type === 'script') {
                const title = block.scriptTitle || 'Script de Código';
                const code = block.scriptCode || '';
                const lang = block.scriptLanguage || 'código';
                const fullScriptText = `${title} ${lang} ${code}`;

                if (term && fullScriptText.toLowerCase().includes(term)) {
                  list.push({
                    id: `script_${block.id || index}`,
                    type: 'script',
                    title: title,
                    subtitle: `Código (${lang.toUpperCase()}) em "${page.titulo}"`,
                    snippet: extractSnippet(code, term) || `Linguagem: ${lang.toUpperCase()}`,
                    sectionId: page.section_id,
                    sectionName: sectionName,
                    pageId: page.id,
                    pageTitle: page.titulo,
                    blockId: block.id,
                    extraMeta: lang.toUpperCase(),
                  });
                }
              }

              // 3. Vault / Credentials Blocks
              else if (block.type === 'vault') {
                const title = block.vaultTitle || 'Cofre de Credenciais';
                const secretsList = (block.secrets || (block as unknown as { vaultCredentials?: Record<string, unknown>[] }).vaultCredentials || []) as Record<string, unknown>[];
                const credsText = secretsList
                  .map((c) => `${c.key || c.service || ''} ${c.username || ''} ${c.notes || ''} ${c.url || ''} ${c.bankName || ''} ${c.clientId || ''}`)
                  .join(' ');
                const fullVaultText = `${title} ${credsText}`;

                if (term && fullVaultText.toLowerCase().includes(term)) {
                  const matchedCred = secretsList.find(
                    (c) =>
                      String(c.key || c.service || '').toLowerCase().includes(term) ||
                      String(c.username || '').toLowerCase().includes(term) ||
                      String(c.notes || '').toLowerCase().includes(term) ||
                      String(c.url || '').toLowerCase().includes(term)
                  );

                  const credSnippet = matchedCred
                    ? `Serviço: ${matchedCred.key || matchedCred.service || 'Sem nome'}${matchedCred.username ? ` | Usuário: ${matchedCred.username}` : ''}${matchedCred.notes ? ` | Obs: ${matchedCred.notes}` : ''}`
                    : `Cofre com ${secretsList.length} credenciais cadastradas`;

                  list.push({
                    id: `vault_${block.id || index}`,
                    type: 'vault',
                    title: title,
                    subtitle: `Cofre de Credenciais em "${page.titulo}"`,
                    snippet: credSnippet,
                    sectionId: page.section_id,
                    sectionName: sectionName,
                    pageId: page.id,
                    pageTitle: page.titulo,
                    blockId: block.id,
                    extraMeta: `${secretsList.length} logins/chaves`,
                  });
                }
              }

              // 4. Whiteboard / Flowchart Drawing Blocks
              else if (block.type === 'whiteboard') {
                const title = block.drawingTitle || 'Quadro de Diagramas & Fluxo';
                const elements = block.elements || [];
                const elementsText = elements
                  .map((el) => `${el.text || ''} ${el.label || ''} ${el.type || ''}`)
                  .join(' ');
                const fullDrawText = `${title} ${elementsText}`;

                if (term && fullDrawText.toLowerCase().includes(term)) {
                  const matchedElement = elements.find(
                    (el) =>
                      el.text?.toLowerCase().includes(term) ||
                      el.label?.toLowerCase().includes(term)
                  );

                  const drawSnippet = matchedElement
                    ? `Item do fluxo: "${matchedElement.text || matchedElement.label}" (${matchedElement.type})`
                    : `Quadro com ${elements.length} formas e conectores desenhados`;

                  list.push({
                    id: `draw_${block.id || index}`,
                    type: 'whiteboard',
                    title: title,
                    subtitle: `Diagrama / Fluxograma em "${page.titulo}"`,
                    snippet: drawSnippet,
                    sectionId: page.section_id,
                    sectionName: sectionName,
                    pageId: page.id,
                    pageTitle: page.titulo,
                    blockId: block.id,
                    extraMeta: `${elements.length} elementos`,
                  });
                }
              }

              // 5. Link Card Blocks
              else if (block.type === 'link_card') {
                const title = block.linkCardTitle || 'Link Registrado';
                const url = block.linkCardUrl || '';
                const desc = block.linkCardDescription || '';
                const fullLinkText = `${title} ${url} ${desc}`;

                if (term && fullLinkText.toLowerCase().includes(term)) {
                  list.push({
                    id: `linkcard_${block.id || index}`,
                    type: 'link_card',
                    title: title,
                    subtitle: `Link salvo em "${page.titulo}"`,
                    snippet: url || desc,
                    sectionId: page.section_id,
                    sectionName: sectionName,
                    pageId: page.id,
                    pageTitle: page.titulo,
                    blockId: block.id,
                    extraMeta: 'Link',
                  });
                }
              }

              // 6. Image Blocks
              else if (block.type === 'image') {
                const caption = block.imageCaption || '';
                if (term && caption.toLowerCase().includes(term)) {
                  list.push({
                    id: `img_${block.id || index}`,
                    type: 'image',
                    title: `Imagem em "${page.titulo}"`,
                    subtitle: `${sectionName} > ${page.titulo}`,
                    snippet: caption || 'Imagem capturada/carregada',
                    sectionId: page.section_id,
                    sectionName: sectionName,
                    pageId: page.id,
                    pageTitle: page.titulo,
                    blockId: block.id,
                    extraMeta: 'Imagem',
                  });
                }
              }
            });
          }
        } catch {
          // Ignore parse errors on raw strings
        }
      }
    });

    return list;
  }, [query, sections, pages, sectionMap]);

  // Filtered by category
  const filteredResults = useMemo(() => {
    if (activeCategory === 'all') return allResults;
    if (activeCategory === 'pages') return allResults.filter((r) => r.type === 'page' || r.type === 'section');
    if (activeCategory === 'text') return allResults.filter((r) => r.type === 'text' || r.type === 'table');
    if (activeCategory === 'scripts') return allResults.filter((r) => r.type === 'script');
    if (activeCategory === 'vault') return allResults.filter((r) => r.type === 'vault');
    if (activeCategory === 'drawings') return allResults.filter((r) => r.type === 'whiteboard');
    return allResults;
  }, [allResults, activeCategory]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults.length, activeCategory]);

  // Handle select action
  const handleSelectResult = (item: SearchResultItem) => {
    if (item.sectionId) {
      setActiveSectionId(item.sectionId);
    }
    if (item.pageId) {
      setActivePageId(item.pageId);
    }

    if (item.blockId) {
      if (onNavigateToBlock) {
        onNavigateToBlock(item.pageId, item.blockId);
      } else {
        // Dispatch global event for note editor to scroll and highlight block
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('meuhub_scroll_to_block', {
              detail: { pageId: item.pageId, blockId: item.blockId },
            })
          );
        }, 120);
      }
    }

    onOpenChange(false);
  };

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : prev));
      scrollActiveItemIntoView(selectedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      scrollActiveItemIntoView(selectedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        handleSelectResult(filteredResults[selectedIndex]);
      }
    }
  };

  const scrollActiveItemIntoView = (index: number) => {
    const el = document.getElementById(`search-result-item-${index}`);
    el?.scrollIntoView({ block: 'nearest' });
  };

  const renderIcon = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'section':
        return <Folder className="h-4 w-4 text-amber-500 shrink-0" />;
      case 'page':
        return <FileText className="h-4 w-4 text-indigo-500 shrink-0" />;
      case 'text':
        return <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />;
      case 'table':
        return <Table2 className="h-4 w-4 text-blue-500 shrink-0" />;
      case 'script':
        return <Code2 className="h-4 w-4 text-emerald-500 shrink-0" />;
      case 'vault':
        return <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'whiteboard':
        return <Shapes className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />;
      case 'link_card':
        return <LinkIcon className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />;
      case 'image':
        return <ImageIcon className="h-4 w-4 text-sky-500 shrink-0" />;
      default:
        return <Search className="h-4 w-4 text-muted-foreground shrink-0" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-border bg-white dark:bg-zinc-900 rounded-2xl">
        <DialogHeader className="hidden">
          <DialogTitle>Pesquisar em Anotações</DialogTitle>
          <DialogDescription>Buscar por texto, seções, códigos, fluxos e credenciais</DialogDescription>
        </DialogHeader>

        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-border bg-slate-50/70 dark:bg-zinc-800/40 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Search size={18} />
          </div>
          <div className="flex-1 flex items-center relative">
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pesquisar em qualquer seção, página, código, credencial ou diagrama..."
              className="border-none shadow-none focus-visible:ring-0 text-sm md:text-base px-1 h-10 bg-transparent placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                title="Limpar busca"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground bg-white dark:bg-zinc-800 px-2 py-1 rounded-md border border-border shrink-0">
            <span className="font-mono font-semibold">ESC</span> para fechar
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="px-4 py-2 border-b border-border/60 bg-white dark:bg-zinc-900/90 flex items-center gap-1.5 overflow-x-auto select-none no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1",
              activeCategory === 'all'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            )}
          >
            Tudo
            <span className="text-[10px] opacity-80 ml-0.5">({allResults.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('pages')}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1",
              activeCategory === 'pages'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            )}
          >
            <FileText size={12} /> Páginas & Seções
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('text')}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1",
              activeCategory === 'text'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            )}
          >
            <Table2 size={12} /> Texto & Tabelas
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('scripts')}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1",
              activeCategory === 'scripts'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            )}
          >
            <Code2 size={12} /> Scripts & SQL
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('vault')}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1",
              activeCategory === 'vault'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            )}
          >
            <ShieldCheck size={12} /> Credenciais
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('drawings')}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1",
              activeCategory === 'drawings'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            )}
          >
            <Shapes size={12} /> Diagramas & Fluxo
          </button>
        </div>

        {/* Results List */}
        <div 
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto max-h-[50vh] p-2 divide-y divide-border/40"
        >
          {filteredResults.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 flex items-center justify-center mb-3 text-slate-400">
                <Search size={22} />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
                Nenhum resultado encontrado para "{query}"
              </p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 max-w-sm">
                Tente buscar por palavras-chave de scripts, senhas, títulos de páginas ou trechos de anotações.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredResults.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    id={`search-result-item-${index}`}
                    key={item.id}
                    onClick={() => handleSelectResult(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "p-2.5 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 group select-none",
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/80 shadow-xs"
                        : "hover:bg-slate-50 dark:hover:bg-zinc-800/60 border border-transparent"
                    )}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={cn(
                        "p-2 rounded-lg shrink-0 mt-0.5 transition-colors",
                        isSelected 
                          ? "bg-white dark:bg-zinc-800 shadow-2xs" 
                          : "bg-slate-100 dark:bg-zinc-800/70"
                      )}>
                        {renderIcon(item.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={cn(
                            "text-sm font-bold truncate transition-colors",
                            isSelected ? "text-indigo-950 dark:text-indigo-100" : "text-slate-800 dark:text-zinc-100"
                          )}>
                            {item.title}
                          </h4>
                          {item.extraMeta && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 shrink-0">
                              {item.extraMeta}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium truncate mt-0.5">
                          {item.subtitle}
                        </div>

                        {item.snippet && (
                          <div className={cn(
                            "text-xs mt-1 line-clamp-2 leading-relaxed transition-colors",
                            isSelected ? "text-slate-700 dark:text-zinc-300" : "text-slate-500 dark:text-zinc-400"
                          )}>
                            {item.snippet}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 self-center shrink-0">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1 transition-all",
                        isSelected 
                          ? "bg-indigo-600 text-white shadow-2xs opacity-100" 
                          : "opacity-0 group-hover:opacity-100 text-slate-400 bg-slate-100 dark:bg-zinc-800"
                      )}>
                        <span>Abrir</span>
                        <CornerDownLeft size={11} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer with Keyboard Shortcuts info */}
        <div className="p-3 bg-slate-50 dark:bg-zinc-800/80 border-t border-border flex items-center justify-between text-xs text-muted-foreground select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-border rounded text-[10px] font-mono shadow-2xs font-semibold">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-border rounded text-[10px] font-mono shadow-2xs font-semibold">↓</kbd>
              Navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-border rounded text-[10px] font-mono shadow-2xs font-semibold">Enter</kbd>
              Selecionar
            </span>
          </div>

          <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
            {filteredResults.length} {filteredResults.length === 1 ? 'resultado' : 'resultados'}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
