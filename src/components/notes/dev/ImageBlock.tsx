import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { CanvasBlock } from '@/types/notes';
import { 
  GripHorizontal, Trash2, Maximize2, Download, Copy, 
  Camera, Check, ZoomIn, Type, MessageSquare, 
  ChevronDown, ChevronUp, Sparkles, ArrowRightLeft, Plus
} from 'lucide-react';
import { BlockActionMenu } from '@/components/notes/dev/BlockActionMenu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ImageBlockProps {
  block: CanvasBlock;
  updateBlock: (id: string, updates: Partial<CanvasBlock>) => void;
  removeBlock: (id: string) => void;
  isSelected: boolean;
  setSelectedId: (id: string | null) => void;
  onMoveOrCopy?: (block: CanvasBlock, action?: 'move' | 'copy') => void;
  onDuplicate?: (blockId: string) => void;
  onCopyClipboard?: (block: CanvasBlock) => void;
  onConvertToTextBlock?: (blockId: string) => void;
  onOpenInsertToTextBlockModal?: (block: CanvasBlock) => void;
}

export function ImageBlock({
  block,
  updateBlock,
  removeBlock,
  isSelected,
  setSelectedId,
  onMoveOrCopy,
  onDuplicate,
  onCopyClipboard,
  onConvertToTextBlock,
  onOpenInsertToTextBlockModal,
}: ImageBlockProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(!!block.imageNotes);

  const title = block.imageTitle || 'Captura de Tela';
  const imageUrl = block.imageUrl || '';
  const dateStr = block.capturedAt || '';
  const notes = block.imageNotes || '';

  const handleCopyImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!imageUrl) return;

    try {
      if (imageUrl.startsWith('data:image/')) {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob }),
          ]);
          setCopied(true);
          toast.success('Imagem copiada para a área de transferência!');
          setTimeout(() => setCopied(false), 2000);
          return;
        }
      }
      
      // Fallback copy url
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      toast.success('Link da imagem copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar a imagem diretamente.');
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!imageUrl) return;

    try {
      const a = document.createElement('a');
      a.href = imageUrl;
      const sanitizedName = title.toLowerCase().replace(/[^a-z0-9_-]/gi, '_');
      a.download = `${sanitizedName || 'captura_meuhub'}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Download do print iniciado!');
    } catch {
      toast.error('Falha ao baixar imagem.');
    }
  };

  const handleDirectConvertToTextBlock = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onConvertToTextBlock) {
      onConvertToTextBlock(block.id);
    } else {
      let html = `<p><strong>${title}</strong></p><p><img src="${imageUrl}" alt="${title}" class="rounded-lg max-w-full my-2" /></p>`;
      if (block.imageCaption) {
        html += `<p><em>${block.imageCaption}</em></p>`;
      }
      if (notes) {
        html += `<p>${notes.replace(/\n/g, '<br/>')}</p>`;
      } else {
        html += `<p>✍️ <em>Adicione seus comentários e anotações aqui...</em></p>`;
      }
      updateBlock(block.id, {
        type: 'text',
        content: html,
        width: Math.max(typeof block.width === 'number' ? block.width : 480, 500),
      });
      toast.success('Convertido para bloco de anotações com texto!');
    }
  };

  return (
    <>
      <Rnd
        size={{
          width: typeof block.width === 'number' ? block.width : parseInt(String(block.width), 10) || 480,
          height: typeof block.height === 'number' ? block.height : parseInt(String(block.height), 10) || 340,
        }}
        position={{
          x: block.x,
          y: Math.max(12, block.y),
        }}
        style={{
          zIndex: isSelected ? 40 : 12,
        }}
        onDragStart={(_e) => {
          setSelectedId(block.id);
        }}
        onDragStop={(_e, d) => {
          updateBlock(block.id, { x: Math.max(0, d.x), y: Math.max(12, d.y) });
        }}
        enableResizing={{
          top: false,
          right: true,
          bottom: true,
          left: false,
          topRight: false,
          bottomRight: true,
          bottomLeft: false,
          topLeft: false,
        }}
        resizeHandleStyles={{
          right: { cursor: 'ew-resize', width: '8px', right: '-4px', zIndex: 35 },
          bottom: { cursor: 'ns-resize', height: '8px', bottom: '-4px', zIndex: 35 },
          bottomRight: { cursor: 'nwse-resize', width: '14px', height: '14px', right: '-4px', bottom: '-4px', zIndex: 36 },
        }}
        onResizeStop={(_e, direction, ref, _delta, position) => {
          updateBlock(block.id, {
            width: ref.offsetWidth,
            height: ref.offsetHeight,
            x: Math.max(0, position.x),
            y: Math.max(12, position.y),
          });
        }}
        bounds="parent"
        dragHandleClassName="image-drag-handle"
        minWidth={280}
        minHeight={180}
        className={`group select-none ${isSelected ? 'z-40' : 'hover:z-30 z-10'}`}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedId(block.id);
        }}
      >
        <div
          className={`w-full h-full flex flex-col rounded-xl overflow-hidden shadow-sm transition-all border ${
            isSelected
              ? 'ring-2 ring-indigo-500/40 border-indigo-400 dark:border-indigo-600 bg-white dark:bg-zinc-900'
              : 'border-slate-200/90 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 hover:border-slate-300 dark:hover:border-zinc-700'
          }`}
        >
          {/* Top Bar / Drag Handle */}
          <div
            className="image-drag-handle flex items-center justify-between px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-800/80 border-b border-slate-200/80 dark:border-zinc-800 cursor-move text-slate-600 dark:text-zinc-300 shrink-0 select-none"
            title="Arrastar captura de tela"
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
              <GripHorizontal size={13} className="text-slate-400 dark:text-zinc-500 shrink-0" />
              
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 shrink-0">
                <Camera size={11} />
                <span>Captura</span>
              </div>

              <input
                className="text-xs font-semibold bg-transparent border-none outline-none text-slate-800 dark:text-zinc-100 truncate w-full min-w-0 placeholder-slate-400 dark:placeholder-zinc-500 focus:bg-white dark:focus:bg-zinc-800 px-1 py-0.5 rounded"
                value={title}
                onChange={(e) => updateBlock(block.id, { imageTitle: e.target.value })}
                placeholder="Título da captura..."
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Quick convert to rich text block button */}
              <button
                type="button"
                onClick={handleDirectConvertToTextBlock}
                className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 flex items-center gap-1 transition-colors"
                title="Transformar em Bloco de Anotações com Texto (Permite escrever comentários, tabelas e notas)"
              >
                <Type size={12} className="text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">Virar Anotação</span>
              </button>

              {/* Move or merge into existing text block */}
              {onOpenInsertToTextBlockModal && (
                <button
                  type="button"
                  onClick={() => onOpenInsertToTextBlockModal(block)}
                  className="p-1 rounded text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 hover:bg-slate-200/70 dark:hover:bg-zinc-700 transition-colors"
                  title="Inserir / Mover imagem para dentro de outro bloco de texto..."
                >
                  <ArrowRightLeft size={12} />
                </button>
              )}

              {/* Toggle Notes / Comments */}
              <button
                type="button"
                onClick={() => setShowNotesPanel((prev) => !prev)}
                className={`p-1 rounded transition-colors ${
                  showNotesPanel || notes
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
                    : 'text-slate-500 hover:text-indigo-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-zinc-700'
                }`}
                title={showNotesPanel ? 'Ocultar comentários' : 'Adicionar / ver comentários e anotações'}
              >
                <MessageSquare size={12} />
              </button>

              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="p-1 rounded text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 hover:bg-slate-200/70 dark:hover:bg-zinc-700 transition-colors"
                title="Visualizar em tela cheia (Zoom)"
              >
                <Maximize2 size={12} />
              </button>

              <button
                type="button"
                onClick={handleCopyImage}
                className="p-1 rounded text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 hover:bg-slate-200/70 dark:hover:bg-zinc-700 transition-colors"
                title="Copiar imagem"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="p-1 rounded text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-200/70 dark:hover:bg-zinc-700 transition-colors"
                title="Baixar imagem (.png)"
              >
                <Download size={12} />
              </button>

              {/* Move / Copy / Duplicate / Remove Block Action Menu */}
              <BlockActionMenu
                block={block}
                onMoveOrCopy={onMoveOrCopy}
                onDuplicate={onDuplicate}
                onCopyClipboard={onCopyClipboard}
                onRemove={removeBlock}
                showMoveButtonDirectly={false}
              />

              <button
                type="button"
                onClick={() => removeBlock(block.id)}
                className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors ml-0.5"
                title="Excluir captura"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Image Display Body */}
          <div 
            className="flex-1 w-full min-h-[120px] relative overflow-hidden bg-slate-950/5 dark:bg-black/40 flex items-center justify-center cursor-pointer group/img"
            onClick={() => setIsPreviewOpen(true)}
          >
            {imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt={title}
                  className="w-full h-full object-contain p-1 rounded select-none pointer-events-none"
                  loading="lazy"
                />
                
                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                  <div className="px-2.5 py-1 rounded-full bg-black/70 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg backdrop-blur-xs">
                    <ZoomIn size={13} />
                    <span>Clique para ampliar</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-4 text-slate-400 text-xs flex flex-col items-center">
                <Camera size={24} className="opacity-40 mb-1" />
                <span>Nenhuma imagem carregada</span>
              </div>
            )}
          </div>

          {/* Inline Multi-Line Comments & Notes Section (if toggled or has notes) */}
          {showNotesPanel && (
            <div
              className="p-2 bg-slate-50/95 dark:bg-zinc-800/90 border-t border-slate-200 dark:border-zinc-700/80 shrink-0 space-y-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                  <MessageSquare size={11} className="text-indigo-500" />
                  <span>Comentários & Anotações</span>
                </span>
                <button
                  type="button"
                  onClick={handleDirectConvertToTextBlock}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-0.5"
                  title="Converter para editor de texto com suporte a tabelas, negrito, listas e IA"
                >
                  <Sparkles size={10} />
                  <span>Editor Completo</span>
                </button>
              </div>

              <textarea
                className="w-full text-xs text-slate-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-md p-1.5 outline-none resize-none focus:border-indigo-400 placeholder-slate-400"
                rows={2}
                value={notes}
                onChange={(e) => updateBlock(block.id, { imageNotes: e.target.value })}
                placeholder="Escreva anotações, instruções, contexto ou observações deste print..."
              />
            </div>
          )}

          {/* Bottom optional caption input */}
          <div 
            className="px-2.5 py-1 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800/80 shrink-0 flex items-center justify-between gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              className="w-full text-[11px] text-slate-500 dark:text-zinc-400 bg-transparent border-none outline-none placeholder-slate-300 dark:placeholder-zinc-600 focus:text-slate-800 dark:focus:text-zinc-200"
              value={block.imageCaption || ''}
              onChange={(e) => updateBlock(block.id, { imageCaption: e.target.value })}
              placeholder="Adicionar legenda rápida..."
            />

            {!showNotesPanel && !notes && (
              <button
                type="button"
                onClick={() => setShowNotesPanel(true)}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 font-medium flex items-center gap-0.5"
              >
                <Plus size={11} />
                <span>Comentar</span>
              </button>
            )}
          </div>
        </div>
      </Rnd>

      {/* Fullscreen High-Resolution Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl bg-slate-900/95 border-zinc-800 text-white p-0 overflow-hidden backdrop-blur-md max-h-[92vh] flex flex-col">
          <DialogHeader className="px-4 py-3 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Camera size={16} className="text-sky-400 shrink-0" />
              <DialogTitle className="text-sm font-semibold truncate text-zinc-100">
                {title}
              </DialogTitle>
              {dateStr && (
                <span className="text-xs text-zinc-400 ml-2 hidden sm:inline">
                  • {dateStr}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDirectConvertToTextBlock}
                className="h-7 px-2 text-xs bg-indigo-600/80 hover:bg-indigo-600 text-white gap-1.5"
              >
                <Type size={13} />
                <span>Converter em Bloco de Texto</span>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyImage}
                className="h-7 px-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1.5"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>Copiar</span>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleDownload}
                className="h-7 px-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1.5"
              >
                <Download size={13} />
                <span>Baixar PNG</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40 min-h-[300px]">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={title}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl border border-zinc-800/60"
              />
            )}
          </div>

          {(block.imageCaption || notes) && (
            <div className="px-4 py-2.5 bg-zinc-950/80 border-t border-zinc-800/80 text-xs text-zinc-300 space-y-1">
              {block.imageCaption && (
                <div>
                  <span className="font-semibold text-zinc-400 mr-1.5">Legenda:</span>
                  {block.imageCaption}
                </div>
              )}
              {notes && (
                <div>
                  <span className="font-semibold text-zinc-400 mr-1.5">Comentários:</span>
                  {notes}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

