import { useState } from 'react';
import { Rnd } from 'react-rnd';
import { CanvasBlock } from '@/types/notes';
import { useLinkStore } from '@/lib/store/linkStore';
import { 
  Link as LinkIcon, ExternalLink, Copy, Check, Trash2, GripHorizontal, 
  Globe, Key, Shield, Folder
} from 'lucide-react';
import { toast } from 'sonner';

interface LinkCardBlockProps {
  block: CanvasBlock;
  updateBlock: (id: string, updates: Partial<CanvasBlock>) => void;
  removeBlock: (id: string) => void;
  isSelected: boolean;
  setSelectedId: (id: string | null) => void;
}

export function LinkCardBlock({
  block,
  updateBlock,
  removeBlock,
  isSelected,
  setSelectedId,
}: LinkCardBlockProps) {
  const { links, categorias, subcategorias, getCredencialByLinkId } = useLinkStore();
  const [copied, setCopied] = useState(false);
  const [copiedCred, setCopiedCred] = useState<'user' | 'pass' | null>(null);

  // Match link from store if linkId is present, or use snapshot data
  const linkId = block.linkId;
  const storeLink = linkId ? links.find(l => l.id === linkId) : null;

  const title = storeLink?.titulo || block.linkTitle || 'Link Relacionado';
  const url = storeLink?.url || block.linkUrl || 'https://';
  const description = storeLink?.descricao || block.linkDescription;
  const categoryId = storeLink?.categoria_id;
  const subcategoryId = storeLink?.subcategoria_id;

  const categoryName = categoryId ? categorias.find(c => c.id === categoryId)?.nome : block.linkCategory;
  const subcategoryName = subcategoryId ? subcategorias.find(s => s.id === subcategoryId)?.nome : block.linkSubcategory;

  const credential = linkId ? getCredencialByLinkId(linkId) : undefined;

  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = url;
  }

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('URL copiada!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar URL');
    }
  };

  const handleCopyCredential = async (type: 'user' | 'pass', value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopiedCred(type);
      toast.success(type === 'user' ? 'Usuário copiado!' : 'Senha copiada!');
      setTimeout(() => setCopiedCred(null), 2000);
    } catch {
      toast.error('Erro ao copiar credencial');
    }
  };

  return (
    <Rnd
      size={{ width: block.width || 380, height: block.height || 190 }}
      position={{ x: block.x, y: block.y }}
      onDragStop={(_, d) => updateBlock(block.id, { x: d.x, y: d.y })}
      onResizeStop={(_, __, ref, ___, position) => {
        updateBlock(block.id, {
          width: ref.style.width,
          height: ref.style.height,
          ...position,
        });
      }}
      bounds="parent"
      minWidth={280}
      minHeight={150}
      dragHandleClassName="link-drag-handle"
      className={`group ${isSelected ? 'z-20' : 'z-10'}`}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedId(block.id);
      }}
    >
      <div 
        className={`flex flex-col h-full rounded-xl overflow-hidden border bg-white dark:bg-zinc-900 shadow-md transition-all ${
          isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-xs shrink-0 select-none">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="link-drag-handle cursor-grab active:cursor-grabbing text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
              <LinkIcon size={14} className="shrink-0" />
              <GripHorizontal size={13} className="text-slate-400 dark:text-zinc-500" />
            </div>

            {/* Category / Subcategory badge */}
            {categoryName && (
              <span className="flex items-center gap-1 text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.2 rounded truncate">
                <Folder size={10} />
                {categoryName}
                {subcategoryName && ` / ${subcategoryName}`}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="p-1 rounded text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
              title="Copiar URL do link"
            >
              {copied ? <Check size={13} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={13} />}
            </button>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
              title="Abrir link em nova aba"
            >
              <ExternalLink size={13} />
            </a>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeBlock(block.id);
              }}
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Excluir card de link"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-3 flex flex-col justify-between overflow-hidden bg-white dark:bg-zinc-900">
          <div className="space-y-1.5">
            {/* Title & Domain */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-sm text-slate-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline flex items-start gap-1.5 line-clamp-2"
            >
              <Globe size={15} className="text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0" />
              <span>{title}</span>
            </a>

            <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-zinc-500 font-mono truncate pl-5">
              <span className="truncate">{url}</span>
            </div>

            {/* Description if present */}
            {description && (
              <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 pl-5 pt-0.5">
                {description}
              </p>
            )}
          </div>

          {/* Connected Credentials Footer (if available in linkStore) */}
          {credential && (credential.username || credential.password) && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px] bg-slate-50 dark:bg-zinc-800/60 px-2 py-1 rounded">
              <div className="flex items-center gap-1 text-slate-600 dark:text-zinc-300 font-medium">
                <Key size={11} className="text-amber-600 dark:text-amber-400" />
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">Credenciais:</span>
                {credential.username && (
                  <span className="font-mono text-slate-700 dark:text-zinc-300 truncate max-w-[90px]">{credential.username}</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {credential.username && (
                  <button
                    type="button"
                    onClick={(e) => handleCopyCredential('user', credential.username!, e)}
                    className="px-1.5 py-0.2 rounded border dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[10px] hover:bg-slate-100 dark:hover:bg-zinc-700 font-mono text-slate-700 dark:text-zinc-200"
                    title="Copiar usuário"
                  >
                    {copiedCred === 'user' ? '✓' : 'Copiar user'}
                  </button>
                )}
                {credential.password && (
                  <button
                    type="button"
                    onClick={(e) => handleCopyCredential('pass', credential.password!, e)}
                    className="px-1.5 py-0.2 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-[10px] hover:bg-amber-100 dark:hover:bg-amber-900 font-mono text-amber-800 dark:text-amber-300 font-medium"
                    title="Copiar senha"
                  >
                    {copiedCred === 'pass' ? '✓' : 'Copiar senha'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Rnd>
  );
}
