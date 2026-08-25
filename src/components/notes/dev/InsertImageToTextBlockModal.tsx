import { useState, useMemo } from 'react';
import { CanvasBlock } from '@/types/notes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Type,
  ArrowRight,
  PlusCircle,
  Sparkles,
  FileText,
  Copy,
  Trash2,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';

interface InsertImageToTextBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageBlock: CanvasBlock;
  allBlocks: CanvasBlock[];
  onConvertToTextBlock: (imageBlockId: string) => void;
  onInsertIntoExistingTextBlock: (
    targetBlockId: string,
    imageHtml: string,
    position: 'start' | 'end',
    removeOriginalImageBlock: boolean
  ) => void;
  onCreateNewTextBlockWithImage: (
    imageHtml: string,
    removeOriginalImageBlock: boolean
  ) => void;
}

export function InsertImageToTextBlockModal({
  isOpen,
  onClose,
  imageBlock,
  allBlocks = [],
  onConvertToTextBlock,
  onInsertIntoExistingTextBlock,
  onCreateNewTextBlockWithImage,
}: InsertImageToTextBlockModalProps) {
  const [mode, setMode] = useState<'convert' | 'existing' | 'new'>('convert');
  const [selectedTargetBlockId, setSelectedTargetBlockId] = useState<string>('');
  const [insertPosition, setInsertPosition] = useState<'end' | 'start'>('end');
  const [removeOriginal, setRemoveOriginal] = useState<boolean>(true);

  // Filter text blocks on this page
  const textBlocks = useMemo(() => {
    const blocks = Array.isArray(allBlocks) ? allBlocks : [];
    return blocks.filter((b) => !b.type || b.type === 'text');
  }, [allBlocks]);

  // Set default selected text block
  useState(() => {
    if (textBlocks.length > 0 && !selectedTargetBlockId) {
      setSelectedTargetBlockId(textBlocks[0].id);
    }
  });

  const title = imageBlock.imageTitle || 'Captura de Tela';
  const url = imageBlock.imageUrl || '';
  const caption = imageBlock.imageCaption || '';
  const notes = imageBlock.imageNotes || '';

  const generatedImageHtml = useMemo(() => {
    let html = `<p><img src="${url}" alt="${title.replace(/"/g, '&quot;')}" class="rounded-lg max-w-full my-2" /></p>`;
    if (caption) {
      html += `<p><em>${caption}</em></p>`;
    }
    if (notes) {
      html += `<p>${notes.replace(/\n/g, '<br/>')}</p>`;
    }
    return html;
  }, [url, title, caption, notes]);

  const handleConfirm = () => {
    if (mode === 'convert') {
      onConvertToTextBlock(imageBlock.id);
      toast.success('Imagem convertida para bloco de anotações com texto!');
      onClose();
    } else if (mode === 'existing') {
      if (!selectedTargetBlockId) {
        toast.error('Selecione um bloco de texto existente.');
        return;
      }
      onInsertIntoExistingTextBlock(
        selectedTargetBlockId,
        generatedImageHtml,
        insertPosition,
        removeOriginal
      );
      toast.success(
        removeOriginal
          ? 'Imagem movida para o bloco de anotações!'
          : 'Imagem copiada para o bloco de anotações!'
      );
      onClose();
    } else if (mode === 'new') {
      onCreateNewTextBlockWithImage(generatedImageHtml, removeOriginal);
      toast.success(
        removeOriginal
          ? 'Novo bloco de anotações criado com a imagem!'
          : 'Novo bloco de anotações criado (imagem original mantida)!'
      );
      onClose();
    }
  };

  const getCleanPreview = (content?: string) => {
    if (!content) return 'Bloco de anotações vazio';
    const tmp = document.createElement('div');
    tmp.innerHTML = content;
    const text = tmp.textContent || tmp.innerText || '';
    return text.trim() ? text.trim().slice(0, 70) + (text.length > 70 ? '...' : '') : 'Bloco de anotações com formatação';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <ImageIcon size={18} />
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Mover ou Copiar Imagem para Bloco de Texto
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Integre esta imagem dentro de um bloco de anotações para poder escrever comentários, adicionar tabelas, tópicos e notas de texto.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Mini Preview of Image being moved */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80">
            <div className="w-16 h-12 bg-black/20 rounded overflow-hidden flex items-center justify-center shrink-0 border border-slate-300 dark:border-zinc-700">
              {url ? (
                <img src={url} alt={title} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={16} className="text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">{title}</p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                {caption || notes || 'Imagem pronta para inserção com anotações e comentários.'}
              </p>
            </div>
          </div>

          {/* Mode Selection Cards */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Como você deseja integrar esta imagem?
            </Label>

            {/* Option 1: Convert current block to text block */}
            <div
              onClick={() => setMode('convert')}
              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                mode === 'convert'
                  ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                  : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
              }`}
            >
              <div className={`p-1.5 rounded-md mt-0.5 shrink-0 ${mode === 'convert' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}>
                <Type size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 dark:text-zinc-100 flex items-center justify-between">
                  <span>Transformar este bloco em Bloco de Anotações</span>
                  {mode === 'convert' && <CheckCircle2 size={15} className="text-indigo-600 dark:text-indigo-400" />}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Converte o bloco solto em um bloco rico com a imagem dentro, liberando imediatamente o editor de texto para fazer anotações, comentários, listas e tabelas.
                </p>
              </div>
            </div>

            {/* Option 2: Insert into existing text block */}
            <div
              onClick={() => setMode('existing')}
              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                mode === 'existing'
                  ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                  : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
              }`}
            >
              <div className={`p-1.5 rounded-md mt-0.5 shrink-0 ${mode === 'existing' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}>
                <FileText size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 dark:text-zinc-100 flex items-center justify-between">
                  <span>Inserir em Bloco de Texto Existente na Página</span>
                  {mode === 'existing' && <CheckCircle2 size={15} className="text-indigo-600 dark:text-indigo-400" />}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Adiciona esta imagem dentro de um dos blocos de anotações já existentes neste quadro.
                </p>
              </div>
            </div>

            {/* Option 3: Create new text block */}
            <div
              onClick={() => setMode('new')}
              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                mode === 'new'
                  ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                  : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
              }`}
            >
              <div className={`p-1.5 rounded-md mt-0.5 shrink-0 ${mode === 'new' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}>
                <PlusCircle size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 dark:text-zinc-100 flex items-center justify-between">
                  <span>Criar Novo Bloco de Anotações com a Imagem</span>
                  {mode === 'new' && <CheckCircle2 size={15} className="text-indigo-600 dark:text-indigo-400" />}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Cria um novo bloco com a imagem incorporada e espaço pronto para digitação.
                </p>
              </div>
            </div>
          </div>

          {/* If existing block selected: Target block picker */}
          {mode === 'existing' && (
            <div className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-lg border border-slate-200 dark:border-zinc-700/80 space-y-3">
              <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Selecione o bloco de anotações de destino:
              </Label>

              {textBlocks.length === 0 ? (
                <div className="text-xs text-amber-600 dark:text-amber-400 p-2 bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-200 dark:border-amber-800">
                  Nenhum bloco de texto encontrado nesta página. Você pode usar a opção "Transformar este bloco" ou "Criar Novo Bloco".
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {textBlocks.map((tb, idx) => (
                    <div
                      key={tb.id}
                      onClick={() => setSelectedTargetBlockId(tb.id)}
                      className={`p-2 rounded-md border text-xs cursor-pointer flex items-center justify-between ${
                        selectedTargetBlockId === tb.id
                          ? 'border-indigo-500 bg-white dark:bg-zinc-800 font-semibold text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-400'
                          : 'border-slate-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/70 hover:bg-slate-100 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{getCleanPreview(tb.content)}</span>
                      </div>
                      {selectedTargetBlockId === tb.id && (
                        <CheckCircle2 size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-zinc-700">
                <div>
                  <Label className="text-[11px] text-slate-500 dark:text-zinc-400">Posição no bloco:</Label>
                  <select
                    className="mt-1 w-full text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded px-2 py-1 outline-none"
                    value={insertPosition}
                    onChange={(e) => setInsertPosition(e.target.value as 'end' | 'start')}
                  >
                    <option value="end">No Final (Abaixo do texto)</option>
                    <option value="start">No Início (Acima do texto)</option>
                  </select>
                </div>

                <div>
                  <Label className="text-[11px] text-slate-500 dark:text-zinc-400">Ação com imagem original:</Label>
                  <select
                    className="mt-1 w-full text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded px-2 py-1 outline-none"
                    value={removeOriginal ? 'remove' : 'keep'}
                    onChange={(e) => setRemoveOriginal(e.target.value === 'remove')}
                  >
                    <option value="remove">Mover (Excluir bloco solto)</option>
                    <option value="keep">Copiar (Manter bloco solto)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* If new block selected: options */}
          {mode === 'new' && (
            <div className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-lg border border-slate-200 dark:border-zinc-700/80">
              <Label className="text-[11px] text-slate-500 dark:text-zinc-400">Ação com imagem original:</Label>
              <select
                className="mt-1 w-full text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded px-2 py-1 outline-none"
                value={removeOriginal ? 'remove' : 'keep'}
                onChange={(e) => setRemoveOriginal(e.target.value === 'remove')}
              >
                <option value="remove">Mover (Excluir bloco solto original)</option>
                <option value="keep">Copiar (Manter bloco solto original)</option>
              </select>
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/40 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cancelar
          </Button>

          <Button
            size="sm"
            onClick={handleConfirm}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-semibold"
          >
            <Sparkles size={13} />
            <span>
              {mode === 'convert'
                ? 'Converter para Bloco de Anotações'
                : mode === 'existing'
                ? removeOriginal
                  ? 'Mover para Bloco Selecionado'
                  : 'Copiar para Bloco Selecionado'
                : removeOriginal
                ? 'Criar Novo Bloco (Mover)'
                : 'Criar Novo Bloco (Copiar)'}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
