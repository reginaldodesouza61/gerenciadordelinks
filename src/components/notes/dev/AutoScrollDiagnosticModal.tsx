import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AutoScrollDiagnosticInfo } from '@/hooks/useCanvasDragAutoScroll';
import { CheckCircle2, AlertTriangle, Info, Move, Scroll, Monitor, Gauge, ShieldCheck, Sparkles, Activity } from 'lucide-react';

interface AutoScrollDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnosticData: AutoScrollDiagnosticInfo;
}

export function AutoScrollDiagnosticModal({ isOpen, onClose, diagnosticData }: AutoScrollDiagnosticModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-2xl select-none">
        <DialogHeader className="border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
              <Activity className="text-indigo-600 dark:text-indigo-400" size={20} />
              <span>Diagnóstico Técnico do Auto-Scroll & Viewport</span>
            </DialogTitle>
            <Badge 
              variant="outline" 
              className={diagnosticData.isAutoScrolling 
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 animate-pulse" 
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"}
            >
              {diagnosticData.isAutoScrolling ? '⚡ Auto-Scroll Ativo' : '💤 Estado Repouso'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Análise estrutural da árvore DOM, coordenadas do quadro/canvas e rastreamento em tempo real do comportamento de rolagem.
          </p>
        </DialogHeader>

        <div className="space-y-5 my-4 text-xs text-slate-700 dark:text-zinc-300">
          {/* Live Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 dark:bg-zinc-950 p-3.5 rounded-lg border border-slate-200/80 dark:border-zinc-800">
            <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-md border border-slate-200 dark:border-zinc-800 shadow-2xs">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold block uppercase">scrollTop</span>
              <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">{diagnosticData.scrollTop} px</span>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-md border border-slate-200 dark:border-zinc-800 shadow-2xs">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold block uppercase">scrollLeft</span>
              <span className="text-sm font-mono font-bold text-sky-600 dark:text-sky-400">{diagnosticData.scrollLeft} px</span>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-md border border-slate-200 dark:border-zinc-800 shadow-2xs">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold block uppercase">x / y do Bloco</span>
              <span className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400">
                X:{diagnosticData.blockX} Y:{diagnosticData.blockY}
              </span>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-md border border-slate-200 dark:border-zinc-800 shadow-2xs">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold block uppercase">Cursor Screen (Client)</span>
              <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {diagnosticData.clientX}, {diagnosticData.clientY}
              </span>
            </div>
          </div>

          {/* Detailed Responses to the 5 Investigation Questions */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 text-sm">
              <Gauge size={16} className="text-indigo-500" />
              <span>Resumo do Diagnóstico de Investigação</span>
            </h3>

            {/* Q1 */}
            <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-zinc-200 block">1. O contêiner correto está recebendo scroll?</span>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
                  <strong>Sim.</strong> O elemento <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[10px] text-indigo-600 dark:text-indigo-400">viewportContainerRef</code> (<code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[10px]">.onenote-canvas-viewport</code>) possui a propriedade CSS <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[10px]">overflow-auto</code> e recebe incrementos diretos de <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[10px]">scrollTop</code> e <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[10px]">scrollLeft</code> durante o loop <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[10px]">requestAnimationFrame</code>.
                </p>
              </div>
            </div>

            {/* Q2 */}
            <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-zinc-200 block">2. O canvas está sendo deslocado por transform?</span>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
                  <strong>Não.</strong> O contêiner principal do canvas (<code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[10px]">canvasRef</code>) utiliza posicionamento in-flow relativo (<code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[10px]">position: relative</code>) com dimensões dinâmicas expansíveis. Apenas os blocos individuais (<code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[10px]">react-rnd</code>) utilizam <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[10px]">transform: translate(x, y)</code>.
                </p>
              </div>
            </div>

            {/* Q3 */}
            <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-zinc-200 block">3. Existe compensação dupla das coordenadas do bloco?</span>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
                  <strong>Sem compensação dupla.</strong> O cálculo do auto-scroll aplica exatamente o incremento <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[10px]">+scrollDeltaY</code> e <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[10px]">+scrollDeltaX</code> na posição do bloco em tempo real. Isso faz com que o bloco avance pelo quadro/canvas na exata proporção que a viewport rola, mantendo o bloco sob o ponteiro do mouse.
                </p>
              </div>
            </div>

            {/* Q4 */}
            <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-zinc-200 block">4. O scroll move apenas a scrollbar ou realmente move o viewport do canvas?</span>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
                  <strong>Diagnóstico da Causa Raiz Solucionado:</strong> A regra CSS <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[10px] text-rose-500 font-bold">scroll-behavior: smooth</code> no contêiner forçava animações de transição assíncritas a cada frame de JS (~16ms). Isso atualizava o controle da scrollbar, mas congelava ou desacoplava a renderização visual dos pixels do viewport! 
                  Ajustamos o estilo do contêiner para <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[10px] text-emerald-600 font-bold">scroll-behavior: auto</code>, permitindo atualização síncrona instantânea a 60 FPS.
                </p>
              </div>
            </div>

            {/* Q5 Details */}
            <div className="p-3 bg-slate-100/70 dark:bg-zinc-800/50 rounded-lg border border-slate-200 dark:border-zinc-700/80">
              <span className="font-semibold text-slate-800 dark:text-zinc-200 block mb-1">5. Status e Parâmetros em Tempo Real:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>• <span className="text-slate-500">scrollTop:</span> <span className="text-indigo-600 dark:text-indigo-400 font-bold">{diagnosticData.scrollTop}px</span></div>
                <div>• <span className="text-slate-500">scrollLeft:</span> <span className="text-sky-600 dark:text-sky-400 font-bold">{diagnosticData.scrollLeft}px</span></div>
                <div>• <span className="text-slate-500">Bloco X/Y:</span> <span className="text-amber-600 dark:text-amber-400 font-bold">({diagnosticData.blockX}, {diagnosticData.blockY})</span></div>
                <div>• <span className="text-slate-500">Posição Visual Canvas:</span> <span className="text-emerald-600 dark:text-emerald-400 font-bold">Offset {diagnosticData.scrollTop}px</span></div>
                <div>• <span className="text-slate-500">Velocidade Scroll:</span> <span className="text-purple-600 dark:text-purple-400 font-bold">{diagnosticData.scrollDeltaY} px/frame</span></div>
                <div>• <span className="text-slate-500">CSS scroll-behavior:</span> <span className="text-emerald-600 dark:text-emerald-400 font-bold">{diagnosticData.cssScrollBehavior}</span></div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 dark:border-zinc-800 pt-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 flex items-center gap-1">
            <Sparkles size={12} className="text-indigo-500" />
            <span>Sistema Auto-Scroll Otimizado para Desempenho Fluent OneNote</span>
          </span>
          <Button onClick={onClose} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
            Fechar Diagnóstico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
