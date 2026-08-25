import { useNoteStore } from '@/lib/store/noteStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, RotateCcw, FileText, Folder, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TrashModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrashModal({ open, onOpenChange }: TrashModalProps) {
  const rawDeletedItems = useNoteStore((state) => state.deletedItems);
  const deletedItems = Array.isArray(rawDeletedItems) ? rawDeletedItems : [];
  const restoreItem = useNoteStore((state) => state.restoreItem);
  const permanentlyDelete = useNoteStore((state) => state.permanentlyDelete);
  const emptyTrash = useNoteStore((state) => state.emptyTrash);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch {
      return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Trash2 size={18} />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Lixeira de Anotações</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Recupere páginas ou seções excluídas a qualquer momento.
                </DialogDescription>
              </div>
            </div>
            {deletedItems.length > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                {deletedItems.length} {deletedItems.length === 1 ? 'item' : 'itens'}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-6">
          {deletedItems.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-3 text-slate-400">
                <Trash2 size={22} />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">A lixeira está vazia</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-xs">
                Quando você excluir páginas ou seções de anotações, elas ficarão salvas aqui caso queira recuperá-las.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[360px] pr-3">
              <div className="space-y-2.5">
                {deletedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50/60 dark:bg-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.type === 'section' 
                          ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' 
                          : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {item.type === 'section' ? <Folder size={16} /> : <FileText size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-foreground truncate" title={item.title}>
                            {item.title}
                          </h4>
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                            {item.type === 'section' ? 'Seção' : 'Página'}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Excluído em {formatDate(item.deletedAt)}
                          {item.subpages && item.subpages.length > 0 && ` • ${item.subpages.length} subpáginas`}
                          {item.sectionPages && item.sectionPages.length > 0 && ` • ${item.sectionPages.length} páginas`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 gap-1.5 text-xs font-semibold bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                        onClick={() => restoreItem(item.id)}
                        title="Restaurar esta anotação"
                      >
                        <RotateCcw size={13} />
                        <span>Restaurar</span>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg"
                        onClick={() => permanentlyDelete(item.id)}
                        title="Excluir definitivamente"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="p-4 bg-slate-50 dark:bg-zinc-900 border-t border-border flex items-center justify-between sm:justify-between w-full">
          {deletedItems.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1.5"
              onClick={emptyTrash}
            >
              <Trash2 size={13} />
              Esvaziar Lixeira
            </Button>
          ) : (
            <div />
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
