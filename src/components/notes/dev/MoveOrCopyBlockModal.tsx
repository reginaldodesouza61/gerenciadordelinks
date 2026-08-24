import { useState, useEffect, useMemo } from 'react';
import { useNoteStore } from '@/lib/store/noteStore';
import { useAuthStore } from '@/lib/store/authStore';
import { CanvasBlock } from '@/types/notes';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Folder, FileText, ArrowRightLeft, Copy, MoveRight, 
  FolderPlus, PlusCircle, Check, Sparkles, ShieldCheck,
  Code2, Image as ImageIcon, Shapes, Network, Link as LinkIcon, Type
} from 'lucide-react';
import { toast } from 'sonner';
import { getBlockTypeLabel, getBlockSummary } from '@/lib/utils/blockClipboard';
import { decryptNoteContent } from '@/lib/encryption';

interface MoveOrCopyBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: CanvasBlock | null;
  currentPageId: string;
  onBlockMoved?: (blockId: string) => void;
  initialAction?: 'move' | 'copy';
}

type DestinationMode = 'existing_page' | 'new_page' | 'new_section';

export function MoveOrCopyBlockModal({
  isOpen,
  onClose,
  block,
  currentPageId,
  onBlockMoved,
  initialAction = 'move',
}: MoveOrCopyBlockModalProps) {
  const { user } = useAuthStore();
  const { 
    sections, 
    pages, 
    addSection, 
    addPage, 
    updatePage, 
    setActiveSectionId, 
    setActivePageId 
  } = useNoteStore();

  const [action, setAction] = useState<'move' | 'copy'>(initialAction);
  const [destMode, setDestMode] = useState<DestinationMode>('existing_page');
  
  // Selection states
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  
  // New Page / Section form fields
  const [newPageTitle, setNewPageTitle] = useState<string>('');
  const [newSectionName, setNewSectionName] = useState<string>('');
  const [navigateAfter, setNavigateAfter] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Current page & section data
  const currentPage = useMemo(() => pages.find((p) => p.id === currentPageId), [pages, currentPageId]);
  const currentSectionId = currentPage?.section_id || (sections.length > 0 ? sections[0].id : '');

  // Reset or initialize fields when modal opens
  useEffect(() => {
    if (isOpen && block) {
      setAction(initialAction);
      setDestMode('existing_page');
      setSelectedSectionId(currentSectionId);
      
      // Default new page title based on block summary
      const summary = getBlockSummary(block);
      const cleanSummaryTitle = summary.title.replace(/[<>]/g, '').trim();
      setNewPageTitle(cleanSummaryTitle ? `${cleanSummaryTitle}` : 'Nova Anotação');
      setNewSectionName('Nova Seção de Projetos');
      setNavigateAfter(true);
      setIsProcessing(false);
    }
  }, [isOpen, block, initialAction, currentSectionId]);

  // Pages in the selected section
  const availablePages = useMemo(() => {
    if (!selectedSectionId) return [];
    return pages.filter((p) => {
      if (p.section_id !== selectedSectionId) return false;
      // If moving and it's the current section, exclude current page so user doesn't move to same page
      if (action === 'move' && p.id === currentPageId) return false;
      return true;
    });
  }, [pages, selectedSectionId, action, currentPageId]);

  // Ensure a page is selected when available pages change
  useEffect(() => {
    if (destMode === 'existing_page') {
      if (availablePages.length > 0) {
        if (!selectedPageId || !availablePages.some((p) => p.id === selectedPageId)) {
          setSelectedPageId(availablePages[0].id);
        }
      } else {
        setSelectedPageId('');
      }
    }
  }, [availablePages, selectedPageId, destMode]);

  if (!block) return null;

  const typeConfig = getBlockTypeLabel(block.type);
  const summary = getBlockSummary(block);

  const getBlockIcon = () => {
    switch (block.type) {
      case 'vault':
        return <ShieldCheck size={16} className="text-amber-500" />;
      case 'script':
        return <Code2 size={16} className="text-emerald-500" />;
      case 'image':
        return <ImageIcon size={16} className="text-sky-500" />;
      case 'whiteboard':
        return <Shapes size={16} className="text-purple-500" />;
      case 'drawio':
        return <Network size={16} className="text-orange-500" />;
      case 'link':
        return <LinkIcon size={16} className="text-indigo-500" />;
      case 'text':
      default:
        return <Type size={16} className="text-slate-600 dark:text-zinc-300" />;
    }
  };

  const handleConfirmTransfer = async () => {
    if (!block) return;
    setIsProcessing(true);

    try {
      const fallbackUserId = user?.id || 'c72212e7-2b6a-4da7-8745-01eb33414af4';
      
      // Clone the block with a fresh ID
      const clonedBlock: CanvasBlock = {
        ...JSON.parse(JSON.stringify(block)),
        id: `${block.type || 'block'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      };

      let targetFinalPageId = '';
      let targetFinalSectionId = '';
      let targetFinalPageTitle = '';

      if (destMode === 'existing_page') {
        if (!selectedPageId) {
          toast.error('Selecione uma página de destino válida.');
          setIsProcessing(false);
          return;
        }

        const targetPage = pages.find((p) => p.id === selectedPageId);
        if (!targetPage) {
          toast.error('Página de destino não encontrada.');
          setIsProcessing(false);
          return;
        }

        targetFinalPageId = targetPage.id;
        targetFinalSectionId = targetPage.section_id;
        targetFinalPageTitle = targetPage.titulo;

        // Parse target page's current blocks
        let targetBlocks: CanvasBlock[] = [];
        if (targetPage.conteudo) {
          try {
            let rawJson = targetPage.conteudo;
            if (rawJson.startsWith('enc:')) {
              rawJson = await decryptNoteContent(rawJson);
            }
            const parsed = JSON.parse(rawJson);
            if (Array.isArray(parsed)) {
              targetBlocks = parsed;
            }
          } catch (e) {
            console.error('Failed to parse target page content:', e);
          }
        }

        // Calculate comfortable spawn coordinate below existing blocks
        const isTargetEmpty = targetBlocks.length === 0 || (targetBlocks.length === 1 && (!targetBlocks[0].content || targetBlocks[0].content === '<p></p>'));
        
        const newX = 40;
        let newY = 40;

        if (!isTargetEmpty) {
          const maxY = targetBlocks.reduce((acc, b) => {
            const h = typeof b.height === 'number' ? b.height : parseInt(String(b.height), 10) || 200;
            return Math.max(acc, b.y + h);
          }, 0);
          newY = Math.max(12, maxY + 30);
        } else {
          // If empty default block exists, remove it
          targetBlocks = [];
        }

        clonedBlock.x = newX;
        clonedBlock.y = Math.max(12, newY);

        const updatedTargetBlocks = [...targetBlocks, clonedBlock];
        await updatePage(targetPage.id, { conteudo: JSON.stringify(updatedTargetBlocks) });

      } else if (destMode === 'new_page') {
        const secId = selectedSectionId || currentSectionId;
        if (!secId) {
          toast.error('Selecione uma seção para a nova página.');
          setIsProcessing(false);
          return;
        }

        const finalTitle = newPageTitle.trim() || 'Nova Página';
        targetFinalSectionId = secId;
        targetFinalPageTitle = finalTitle;

        clonedBlock.x = 40;
        clonedBlock.y = 40;

        const newPage = await addPage(finalTitle, secId, fallbackUserId);
        if (newPage) {
          targetFinalPageId = newPage.id;
          await updatePage(newPage.id, { conteudo: JSON.stringify([clonedBlock]) });
        }

      } else if (destMode === 'new_section') {
        const finalSecName = newSectionName.trim() || 'Nova Seção';
        const finalPageTitle = newPageTitle.trim() || 'Página Inicial';

        // 1. Create new section
        const tempSecId = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await addSection(finalSecName, fallbackUserId);
        
        // Find latest sections from store
        const currentSecs = useNoteStore.getState().sections;
        const foundSec = currentSecs.find((s) => s.nome === finalSecName) || currentSecs[currentSecs.length - 1];
        const newSecId = foundSec?.id || tempSecId;

        targetFinalSectionId = newSecId;
        targetFinalPageTitle = finalPageTitle;

        clonedBlock.x = 40;
        clonedBlock.y = 40;

        // 2. Create new page inside this new section
        const newPage = await addPage(finalPageTitle, newSecId, fallbackUserId);
        if (newPage) {
          targetFinalPageId = newPage.id;
          await updatePage(newPage.id, { conteudo: JSON.stringify([clonedBlock]) });
        }
      }

      // If action is 'move', remove the block from current page
      if (action === 'move') {
        onBlockMoved?.(block.id);
        toast.success(`Bloco movido com sucesso para "${targetFinalPageTitle}"!`, {
          action: navigateAfter ? undefined : {
            label: 'Abrir Página',
            onClick: () => {
              setActiveSectionId(targetFinalSectionId);
              setActivePageId(targetFinalPageId);
            },
          },
        });
      } else {
        toast.success(`Bloco copiado com sucesso para "${targetFinalPageTitle}"!`, {
          action: navigateAfter ? undefined : {
            label: 'Abrir Página',
            onClick: () => {
              setActiveSectionId(targetFinalSectionId);
              setActivePageId(targetFinalPageId);
            },
          },
        });
      }

      // Navigate to destination if requested
      if (navigateAfter && targetFinalPageId) {
        setActiveSectionId(targetFinalSectionId);
        setActivePageId(targetFinalPageId);
      }

      onClose();
    } catch (err) {
      console.error('Error transferring block:', err);
      toast.error('Erro ao transferir o bloco. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-2xl">
        {/* Header with Title and Block Preview */}
        <div className="p-5 pb-4 bg-gradient-to-b from-slate-50 to-white dark:from-zinc-900 dark:to-zinc-950 border-b border-slate-200 dark:border-zinc-800">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                <ArrowRightLeft size={18} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-800 dark:text-zinc-100">
                  {action === 'move' ? 'Mover Bloco de Conteúdo' : 'Copiar Bloco de Conteúdo'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                  Transfira este bloco para outra página, uma nova página ou uma nova seção.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Block Mini Preview Card */}
          <div className="mt-3.5 p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 shrink-0">
                {getBlockIcon()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-800 dark:text-zinc-100 truncate">
                    {summary.title}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium shrink-0 ${typeConfig.badge}`}>
                    {typeConfig.label}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 dark:text-zinc-500 truncate">
                  {summary.subtitle}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4.5">
          {/* Action Selector: Move vs Copy */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 block">
              Operação Desejada
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAction('move')}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  action === 'move'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <MoveRight size={16} className={`mt-0.5 shrink-0 ${action === 'move' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold">Mover (Transferir)</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Remove deste quadro e envia ao destino.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAction('copy')}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  action === 'copy'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <Copy size={16} className={`mt-0.5 shrink-0 ${action === 'copy' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold">Copiar (Duplicar)</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Mantém o original e cria uma cópia.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Destination Type Tabs */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 block">
              Para onde deseja enviar?
            </Label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800/80 rounded-lg">
              <button
                type="button"
                onClick={() => setDestMode('existing_page')}
                className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  destMode === 'existing_page'
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <FileText size={13} />
                <span>Página Existente</span>
              </button>

              <button
                type="button"
                onClick={() => setDestMode('new_page')}
                className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  destMode === 'new_page'
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <PlusCircle size={13} />
                <span>Nova Página</span>
              </button>

              <button
                type="button"
                onClick={() => setDestMode('new_section')}
                className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  destMode === 'new_section'
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <FolderPlus size={13} />
                <span>Nova Seção</span>
              </button>
            </div>
          </div>

          {/* Form Content based on Destination Mode */}
          <div className="space-y-3 p-3.5 rounded-lg bg-slate-50/70 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800">
            {destMode === 'existing_page' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Folder size={13} className="text-amber-500" />
                    <span>Seção de Destino</span>
                  </Label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 dark:text-zinc-100 font-medium"
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome} {s.id === currentSectionId ? '(Seção Atual)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <FileText size={13} className="text-indigo-500" />
                    <span>Página de Destino</span>
                  </Label>
                  {availablePages.length > 0 ? (
                    <select
                      value={selectedPageId}
                      onChange={(e) => setSelectedPageId(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 dark:text-zinc-100 font-medium"
                    >
                      {availablePages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.titulo}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-2.5 rounded border border-dashed border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300">
                      Nenhuma outra página disponível nesta seção. Escolha outra seção ou a opção <strong>"Nova Página"</strong>.
                    </div>
                  )}
                </div>
              </>
            )}

            {destMode === 'new_page' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Folder size={13} className="text-amber-500" />
                    <span>Criar Dentro da Seção</span>
                  </Label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 dark:text-zinc-100 font-medium"
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome} {s.id === currentSectionId ? '(Seção Atual)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Título da Nova Página
                  </Label>
                  <Input
                    type="text"
                    value={newPageTitle}
                    onChange={(e) => setNewPageTitle(e.target.value)}
                    placeholder="Ex: Credenciais de Produção AWS"
                    className="h-8 text-xs bg-white dark:bg-zinc-800"
                  />
                </div>
              </>
            )}

            {destMode === 'new_section' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <FolderPlus size={13} className="text-amber-500" />
                    <span>Nome da Nova Seção</span>
                  </Label>
                  <Input
                    type="text"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="Ex: DevOps & Cloud"
                    className="h-8 text-xs bg-white dark:bg-zinc-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <FileText size={13} className="text-indigo-500" />
                    <span>Título da Página Inicial</span>
                  </Label>
                  <Input
                    type="text"
                    value={newPageTitle}
                    onChange={(e) => setNewPageTitle(e.target.value)}
                    placeholder="Ex: Acessos e Configurações"
                    className="h-8 text-xs bg-white dark:bg-zinc-800"
                  />
                </div>
              </>
            )}
          </div>

          {/* Navigation Option Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="navigateAfterCheck"
              checked={navigateAfter}
              onChange={(e) => setNavigateAfter(e.target.checked)}
              className="rounded border-slate-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
            />
            <label
              htmlFor="navigateAfterCheck"
              className="text-xs text-slate-700 dark:text-zinc-300 font-medium cursor-pointer select-none"
            >
              Abrir a página de destino após {action === 'move' ? 'mover' : 'copiar'}
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-zinc-900/90 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
            className="h-8 text-xs font-medium"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleConfirmTransfer}
            disabled={isProcessing || (destMode === 'existing_page' && !selectedPageId)}
            className="h-8 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg gap-1.5 shadow-xs"
          >
            {isProcessing ? (
              <span>Processando...</span>
            ) : action === 'move' ? (
              <>
                <MoveRight size={14} />
                <span>Mover Bloco</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copiar Bloco</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
