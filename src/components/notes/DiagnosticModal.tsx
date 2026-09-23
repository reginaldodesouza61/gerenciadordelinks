import { useState, useEffect } from 'react';
import { useNoteStore, NoteDiagnosticResult } from '@/lib/store/noteStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, RefreshCw, Wrench, ShieldAlert, Database, User, FileText, Folder, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface DiagnosticModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DiagnosticModal({ open, onOpenChange }: DiagnosticModalProps) {
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [data, setData] = useState<NoteDiagnosticResult | null>(null);

  const runDiagnostics = useNoteStore(state => state.runDiagnostics);
  const repairAndRestoreNotes = useNoteStore(state => state.repairAndRestoreNotes);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await runDiagnostics();
      setData(res);
    } catch (err) {
      console.error('Failed to run diagnostics:', err);
      toast.error('Erro ao executar diagnóstico de anotações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const handleRepair = async () => {
    setRepairing(true);
    try {
      await repairAndRestoreNotes();
      toast.success('Reparo de anotações concluído com sucesso!');
      await loadData();
    } catch (err) {
      console.error('Repair failed:', err);
      toast.error('Falha ao tentar reparar anotações.');
    } finally {
      setRepairing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Wrench className="h-5 w-5" />
            <span>Diagnóstico do Sistema de Anotações</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-slate-500 dark:text-zinc-400">Analisando registros da nuvem, cache local e permissões...</p>
          </div>
        ) : data ? (
          <div className="space-y-4 py-2 text-sm text-slate-700 dark:text-zinc-200">
            {/* Status Summary Banner */}
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              data.nullOrInvalidSectionCount > 0 || data.supabaseCountDefaultUser > 0 || data.notesSidebarFilteringIssues.length > 0
                ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'
                : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
            }`}>
              {data.nullOrInvalidSectionCount > 0 || data.supabaseCountDefaultUser > 0 ? (
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <h4 className="font-semibold text-sm">Resumo da Investigação:</h4>
                <p className="text-xs leading-relaxed">{data.rootCauseSummary}</p>
              </div>
            </div>

            {/* Diagnostic Grid Items (10 User Questions) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Item 1: auth.uid() */}
              <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-lg border border-slate-200/60 dark:border-zinc-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  <User className="h-3.5 w-3.5 text-indigo-500" />
                  <span>1. User ID Autenticado (auth.uid)</span>
                </div>
                <div className="font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200 break-all">
                  {data.authUid || 'Anônimo / Não Autenticado'}
                </div>
              </div>

              {/* Item 2: Quantas notas existem na nuvem */}
              <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-lg border border-slate-200/60 dark:border-zinc-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  <Database className="h-3.5 w-3.5 text-indigo-500" />
                  <span>2. Notas no Supabase (Nuvem)</span>
                </div>
                <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  {data.supabaseCountTargetUser} nota(s) vinculadas ao seu ID
                  {data.supabaseCountDefaultUser > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 font-normal ml-1">
                      (+{data.supabaseCountDefaultUser} no ID visitante)
                    </span>
                  )}
                </div>
              </div>

              {/* Item 3: Páginas com section_id nulo */}
              <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-lg border border-slate-200/60 dark:border-zinc-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span>3. Páginas com Seção Nula/Inválida</span>
                </div>
                <div className={`text-xs font-semibold ${data.nullOrInvalidSectionCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-zinc-200'}`}>
                  {data.nullOrInvalidSectionCount === 0 ? 'Nenhuma (Tudo Válido)' : `${data.nullOrInvalidSectionCount} nota(s) sem seção`}
                </div>
              </div>

              {/* Item 4: Páginas carregadas no Zustand */}
              <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-lg border border-slate-200/60 dark:border-zinc-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  <FileText className="h-3.5 w-3.5 text-indigo-500" />
                  <span>4. Páginas Ativas na Memória (Zustand)</span>
                </div>
                <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  {data.zustandPageCount} página(s), {data.zustandSectionCount} seção(ões)
                </div>
              </div>

              {/* Item 5: Páginas no IndexedDB */}
              <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-lg border border-slate-200/60 dark:border-zinc-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  <Database className="h-3.5 w-3.5 text-indigo-500" />
                  <span>5. Páginas no IndexedDB (Offline)</span>
                </div>
                <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  {data.indexedDbPageCount} página(s), {data.indexedDbSectionCount} seção(ões)
                </div>
              </div>

              {/* Item 6: Retorno do fetchNotes */}
              <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-lg border border-slate-200/60 dark:border-zinc-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>6. Retorno de Sincronização (fetchNotes)</span>
                </div>
                <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  {data.fetchNotesReturnedData ? 'Dados Retornados com Sucesso' : 'Sem Dados de Retorno'}
                </div>
              </div>

              {/* Item 7: Filtragem do NotesSidebar */}
              <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-lg border border-slate-200/60 dark:border-zinc-800/60 space-y-1 col-span-1 md:col-span-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  <Eye className="h-3.5 w-3.5 text-indigo-500" />
                  <span>7. Verificação de Ocultação no NotesSidebar</span>
                </div>
                <div className="text-xs text-slate-800 dark:text-zinc-200">
                  {data.notesSidebarFilteringIssues.length === 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Nenhum filtro indevido detectado. Todas as seções e páginas estão visíveis.</span>
                  ) : (
                    <ul className="list-disc pl-4 space-y-0.5 text-rose-600 dark:text-rose-400">
                      {data.notesSidebarFilteringIssues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Item 8 & 9: activeSectionId & activePageId */}
              <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-lg border border-slate-200/60 dark:border-zinc-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  <Folder className="h-3.5 w-3.5 text-indigo-500" />
                  <span>8. Status do activeSectionId</span>
                </div>
                <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                  ID: {data.activeSectionIdStatus.id || 'Nenhum'} ({data.activeSectionIdStatus.isValid ? 'Válido' : 'Inválido / Não Encontrado'})
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-lg border border-slate-200/60 dark:border-zinc-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  <FileText className="h-3.5 w-3.5 text-indigo-500" />
                  <span>9. Status do activePageId</span>
                </div>
                <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                  ID: {data.activePageIdStatus.id || 'Nenhum'} ({data.activePageIdStatus.isValid ? 'Válido' : 'Inválido / Não Encontrado'})
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading || repairing}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Recarregar Diagnóstico
          </Button>

          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium" 
            onClick={handleRepair} 
            disabled={loading || repairing}
          >
            <Wrench className={`h-4 w-4 mr-1.5 ${repairing ? 'animate-spin' : ''}`} />
            {repairing ? 'Reparando...' : 'Reparar e Restaurar Visualização'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
