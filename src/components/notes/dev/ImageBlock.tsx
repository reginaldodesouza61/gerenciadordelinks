import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { CanvasBlock } from '@/types/notes';
import { 
  GripHorizontal, Trash2, Maximize2, Download, Copy, 
  Camera, Check, ZoomIn, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ImageBlockProps {
  block: CanvasBlock;
  updateBlock: (id: string, updates: Partial<CanvasBlock>) => void;
  removeBlock: (id: string) => void;
  isSelected: boolean;
  setSelectedId: (id: string | null) => void;
}

export function ImageBlock({
  block,
  updateBlock,
  removeBlock,
  isSelected,
  setSelectedId,
}: ImageBlockProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const title = block.imageTitle || 'Captura de Tela';
  const imageUrl = block.imageUrl || '';
  const dateStr = block.capturedAt || '';

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

  return (
    <>
      <Rnd
        size={{
          width: typeof block.width === 'number' ? block.width : parseInt(String(block.width), 10) || 480,
          height: typeof block.height === 'number' ? block.height : parseInt(String(block.height), 10) || 320,
        }}
        position={{
          x: block.x,
          y: block.y,
        }}
        style={{
          zIndex: isSelected ? 35 : 12,
        }}
        onDragStart={(_e) => {
          setSelectedId(block.id);
        }}
        onDragStop={(_e, d) => {
          updateBlock(block.id, { x: d.x, y: d.y });
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
            ...(direction.includes('left') ? { x: position.x } : {}),
            ...(direction.includes('top') ? { y: position.y } : {}),
          });
        }}
        bounds="parent"
        dragHandleClassName="image-drag-handle"
        minWidth={280}
        minHeight={180}
        className={`z-10 group select-none ${isSelected ? 'z-20' : ''}`}
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
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {dateStr && (
                <span className="hidden sm:inline text-[10px] text-slate-400 dark:text-zinc-500 mr-1.5">
                  {dateStr}
                </span>
              )}

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
            className="flex-1 w-full h-full relative overflow-hidden bg-slate-950/5 dark:bg-black/40 flex items-center justify-center cursor-pointer group/img"
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

          {/* Bottom optional caption input */}
          <div 
            className="px-2.5 py-1 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800/80 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              className="w-full text-[11px] text-slate-500 dark:text-zinc-400 bg-transparent border-none outline-none placeholder-slate-300 dark:placeholder-zinc-600 focus:text-slate-800 dark:focus:text-zinc-200"
              value={block.imageCaption || ''}
              onChange={(e) => updateBlock(block.id, { imageCaption: e.target.value })}
              placeholder="Adicionar nota ou legenda para este print..."
            />
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

          {block.imageCaption && (
            <div className="px-4 py-2.5 bg-zinc-950/80 border-t border-zinc-800/80 text-xs text-zinc-300">
              <span className="font-semibold text-zinc-400 mr-1.5">Legenda:</span>
              {block.imageCaption}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
