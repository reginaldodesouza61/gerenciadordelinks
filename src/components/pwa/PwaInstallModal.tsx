import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Download,
  Smartphone,
  Laptop,
  WifiOff,
  Zap,
  CheckCircle2,
  Share,
  PlusSquare,
  ShieldCheck,
} from 'lucide-react';
import { usePwaInstall } from '@/lib/pwa/usePwaInstall';
import { toast } from 'sonner';

interface PwaInstallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PwaInstallModal({ open, onOpenChange }: PwaInstallModalProps) {
  const { isInstalled, isIOS, hasPrompt, installApp } = usePwaInstall();

  const handleInstall = async () => {
    const result = await installApp();
    if (result === 'accepted') {
      onOpenChange(false);
    } else if (result === 'unavailable' && !isIOS) {
      toast.info(
        'Se o prompt automático não aparecer, você pode instalar clicando no ícone de instalação (computador/seta para baixo) na barra de endereços do seu navegador.'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
              <Download size={20} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Instalar Atlas Workspace
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                Execute o Atlas como aplicativo nativo em seu Computador ou Celular
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Status Alert */}
          {isInstalled ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Aplicativo já instalado!
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Você já está executando o Atlas Workspace no modo de aplicativo nativo.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/60 text-center flex flex-col items-center justify-center">
                <Zap className="h-5 w-5 text-amber-500 mb-1.5" />
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Ultra Rápido</span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">Sem barra de navegação</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/60 text-center flex flex-col items-center justify-center">
                <WifiOff className="h-5 w-5 text-indigo-500 mb-1.5" />
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Cache Offline</span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">Carregamento instantâneo</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/60 text-center flex flex-col items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-emerald-500 mb-1.5" />
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">100% Seguro</span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">Dados criptografados</span>
              </div>
            </div>
          )}

          {/* iOS Instructions or One-click Install */}
          {isIOS && !isInstalled ? (
            <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
              <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <Smartphone size={15} /> Como instalar no iPhone / iPad:
              </p>
              <ol className="text-xs text-indigo-900 dark:text-indigo-300 space-y-2 pl-4 list-decimal">
                <li>
                  No navegador Safari, toque no ícone de <strong className="font-semibold inline-flex items-center gap-1"><Share size={12} /> Compartilhar</strong> na barra inferior.
                </li>
                <li>
                  Role para baixo e selecione a opção <strong className="font-semibold inline-flex items-center gap-1"><PlusSquare size={12} /> Adicionar à Tela de Início</strong>.
                </li>
                <li>
                  Confirme tocando em <strong>Adicionar</strong> no canto superior direito.
                </li>
              </ol>
            </div>
          ) : !isInstalled ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-xs text-slate-600 dark:text-zinc-300 space-y-1.5">
                <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Laptop size={14} className="text-indigo-500" /> Compatibilidade Multiplataforma
                </p>
                <p className="text-[11px] leading-relaxed">
                  Compatível com <strong>Windows, macOS, Linux, ChromeOS e Android</strong> via Google Chrome, Microsoft Edge, Brave e Opera.
                </p>
              </div>

              <Button
                onClick={handleInstall}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 h-11 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
              >
                <Download size={16} />
                {hasPrompt ? 'Instalar Aplicativo Agora' : 'Instalar no Meu Dispositivo'}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="px-6 py-3 bg-slate-50 dark:bg-zinc-800/80 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
