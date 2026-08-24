import React from 'react';
import { CanvasBlock } from '@/types/notes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoveRight, Copy, CopyPlus, ClipboardCopy, Trash2, MoreHorizontal, ArrowRightLeft 
} from 'lucide-react';

interface BlockActionMenuProps {
  block: CanvasBlock;
  onMoveOrCopy?: (block: CanvasBlock, action?: 'move' | 'copy') => void;
  onDuplicate?: (blockId: string) => void;
  onCopyClipboard?: (block: CanvasBlock) => void;
  onRemove?: (blockId: string) => void;
  triggerClassName?: string;
  showMoveButtonDirectly?: boolean;
}

export function BlockActionMenu({
  block,
  onMoveOrCopy,
  onDuplicate,
  onCopyClipboard,
  onRemove,
  triggerClassName,
  showMoveButtonDirectly = false,
}: BlockActionMenuProps) {
  return (
    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      {showMoveButtonDirectly && onMoveOrCopy && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveOrCopy(block, 'move');
          }}
          className="p-1 rounded text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 hover:bg-slate-200/70 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1 text-[11px] font-medium"
          title="Mover ou copiar este bloco para outra página ou seção"
        >
          <ArrowRightLeft size={12} className="text-indigo-500" />
          <span className="hidden sm:inline">Mover</span>
        </button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={triggerClassName || "p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/70 dark:hover:bg-zinc-700 transition-colors"}
            title="Opções do bloco (Mover, Copiar, Duplicar)"
          >
            <MoreHorizontal size={13} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-lg">
          {onMoveOrCopy && (
            <>
              <DropdownMenuItem
                onClick={() => onMoveOrCopy(block, 'move')}
                className="text-xs cursor-pointer gap-2 py-1.5 font-medium"
              >
                <MoveRight size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>Mover para Página / Seção...</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onMoveOrCopy(block, 'copy')}
                className="text-xs cursor-pointer gap-2 py-1.5 font-medium"
              >
                <Copy size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>Copiar para Página / Seção...</span>
              </DropdownMenuItem>
            </>
          )}

          {onDuplicate && (
            <DropdownMenuItem
              onClick={() => onDuplicate(block.id)}
              className="text-xs cursor-pointer gap-2 py-1.5 font-medium"
            >
              <CopyPlus size={14} className="text-slate-500" />
              <span>Duplicar neste quadro</span>
            </DropdownMenuItem>
          )}

          {onCopyClipboard && (
            <DropdownMenuItem
              onClick={() => onCopyClipboard(block)}
              className="text-xs cursor-pointer gap-2 py-1.5 font-medium"
            >
              <ClipboardCopy size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Copiar Bloco (Clipboard)</span>
            </DropdownMenuItem>
          )}

          {onRemove && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onRemove(block.id)}
                className="text-xs cursor-pointer gap-2 py-1.5 font-medium text-rose-600 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-950/40"
              >
                <Trash2 size={14} />
                <span>Excluir Bloco</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
