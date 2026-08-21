import { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sparkles, RefreshCw, Check, ArrowDownToLine, Copy, AlertTriangle, 
  Settings, FileText, GitPullRequest, Target, TableProperties, ListChecks, Wand2
} from 'lucide-react';
import { 
  getGeminiApiKey, runGeminiAssistant, AiActionType 
} from '@/lib/geminiService';
import { toast } from 'sonner';

interface AiAssistantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteTitle?: string;
  selectedText?: string;
  fullBlockText?: string;
  onApplyContent: (html: string, mode: 'replace' | 'append') => void;
  onOpenSettings: () => void;
}

const AI_ACTIONS = [
  {
    id: 'improve_text' as AiActionType,
    label: 'Melhorar Texto',
    desc: 'Refina clareza, pontuação e fluidez profissional',
    icon: Wand2,
    color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800',
  },
  {
    id: 'requirements_spec' as AiActionType,
    label: 'Levantamento de Requisitos',
    desc: 'Gera RFs, RNFs, Regras de Negócio e Critérios de Aceite',
    icon: ListChecks,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
  },
  {
    id: 'process_flow' as AiActionType,
    label: 'Fluxo de Processo',
    desc: 'Estrutura etapas, entradas, saídas e desvios',
    icon: GitPullRequest,
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
  },
  {
    id: 'use_cases' as AiActionType,
    label: 'Casos de Uso',
    desc: 'Especifica Atores, Fluxo Principal e Alternativos',
    icon: Target,
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
  },
  {
    id: 'convert_table' as AiActionType,
    label: 'Converter em Tabela',
    desc: 'Organiza dados em linhas e colunas estruturadas',
    icon: TableProperties,
    color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800',
  },
  {
    id: 'summarize' as AiActionType,
    label: 'Resumo em Tópicos',
    desc: 'Sintetiza pontos-chave e itens de ação',
    icon: FileText,
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800',
  },
];

export function AiAssistantModal({
  open,
  onOpenChange,
  noteTitle = '',
  selectedText = '',
  fullBlockText = '',
  onApplyContent,
  onOpenSettings,
}: AiAssistantModalProps) {
  const [hasKey, setHasKey] = useState(false);
  const [selectedAction, setSelectedAction] = useState<AiActionType>('improve_text');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [previewMode, setPreviewMode] = useState<'rendered' | 'html'>('rendered');

  const contextText = selectedText || fullBlockText || '';

  useEffect(() => {
    if (open) {
      const key = getGeminiApiKey();
      setHasKey(Boolean(key));
      setGeneratedHtml('');
      setCustomPrompt('');
    }
  }, [open]);

  // Handle generation
  const handleExecute = async (actionToRun?: AiActionType) => {
    const action = actionToRun || selectedAction;
    const key = getGeminiApiKey();

    if (!key) {
      setHasKey(false);
      return;
    }

    setIsGenerating(true);
    try {
      const html = await runGeminiAssistant({
        action,
        noteTitle,
        selectedText,
        fullBlockText,
        customInstruction: customPrompt,
      });

      setGeneratedHtml(html);
      toast.success('Conteúdo gerado com sucesso pelo Gemini!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'CHAVE_NAO_CONFIGURADA') {
        setHasKey(false);
        toast.error('Configure sua chave de API do Gemini nas configurações.');
      } else {
        toast.error(`Erro ao gerar conteúdo: ${msg}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedHtml) return;
    navigator.clipboard.writeText(generatedHtml);
    toast.success('Código HTML copiado!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 p-0 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-md">
                <Sparkles size={18} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Assistente Gemini IA
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                    2.5 Flash
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                  {noteTitle ? `Anotação: "${noteTitle}"` : 'Elabore requisitos, fluxos, casos de uso e aprimore textos com IA.'}
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onOpenSettings();
              }}
              className="text-xs h-8 gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100"
              title="Abrir configurações de API Key"
            >
              <Settings size={14} />
              <span>Chave API</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Missing API Key Alert */}
          {!hasKey && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
              <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={18} />
              <div className="space-y-1.5 flex-1">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Chave do Gemini não configurada
                </h4>
                <p className="text-xs text-amber-800/90 dark:text-amber-300">
                  Para utilizar os recursos de inteligência artificial nas notas, cadastre gratuitamente sua chave de API do Gemini no menu de configurações.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenSettings();
                  }}
                  className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white mt-1 gap-1.5"
                >
                  <Settings size={13} />
                  Configurar Chave do Gemini Agora
                </Button>
              </div>
            </div>
          )}

          {/* Quick Action Chips */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              O que você deseja que a IA elabore?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {AI_ACTIONS.map((act) => {
                const Icon = act.icon;
                const isCurrent = selectedAction === act.id && !customPrompt.trim();
                return (
                  <button
                    key={act.id}
                    type="button"
                    disabled={isGenerating || !hasKey}
                    onClick={() => {
                      setSelectedAction(act.id);
                      setCustomPrompt('');
                      handleExecute(act.id);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-1.5 group ${
                      isCurrent
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/40 hover:border-indigo-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border ${act.color}`}>
                        <Icon size={15} />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {act.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 leading-tight">
                      {act.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Instruction Box */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Ou digite uma instrução personalizada para a IA:</span>
              {contextText && (
                <span className="text-[11px] text-slate-400 font-normal">
                  (Usando o conteúdo da caixa de texto como contexto)
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <Textarea
                placeholder="Ex: Crie critérios de aceite em formato BDD (Dado/Quando/Então) para a funcionalidade acima..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                disabled={isGenerating || !hasKey}
                rows={2}
                className="text-xs resize-none bg-white dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700"
              />
              <Button
                type="button"
                onClick={() => {
                  setSelectedAction('custom');
                  handleExecute('custom');
                }}
                disabled={isGenerating || !hasKey || !customPrompt.trim()}
                className="h-auto px-4 font-bold text-xs gap-1.5 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Gerar
              </Button>
            </div>
          </div>

          {/* Result Output Preview */}
          {generatedHtml && (
            <div className="space-y-2 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 bg-slate-50/70 dark:bg-zinc-900/80">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    Resultado Gerado
                  </span>
                  <div className="flex bg-slate-200 dark:bg-zinc-800 rounded-lg p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('rendered')}
                      className={`px-2 py-0.5 rounded font-medium ${
                        previewMode === 'rendered'
                          ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      Visualização
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('html')}
                      className={`px-2 py-0.5 rounded font-medium ${
                        previewMode === 'html'
                          ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      Código HTML
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-7 text-xs gap-1 text-slate-600 dark:text-zinc-400"
                    title="Copiar HTML"
                  >
                    <Copy size={13} />
                    Copiar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExecute()}
                    disabled={isGenerating}
                    className="h-7 text-xs gap-1 text-slate-600 dark:text-zinc-400"
                    title="Regerar conteúdo"
                  >
                    <RefreshCw size={13} className={isGenerating ? 'animate-spin' : ''} />
                    Regerar
                  </Button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto p-3 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs">
                {previewMode === 'rendered' ? (
                  <div 
                    className="prose dark:prose-invert prose-sm max-w-none [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_th]:p-1.5 [&_td]:border [&_td]:border-slate-300 [&_td]:p-1.5"
                    dangerouslySetInnerHTML={{ __html: generatedHtml }}
                  />
                ) : (
                  <pre className="font-mono text-[11px] whitespace-pre-wrap text-slate-700 dark:text-zinc-300">
                    {generatedHtml}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-3.5 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Fechar
          </Button>

          {generatedHtml && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onApplyContent(generatedHtml, 'append');
                  onOpenChange(false);
                  toast.success('Novo bloco inserido na nota!');
                }}
                className="h-9 text-xs font-semibold gap-1.5 border-slate-200 dark:border-zinc-700"
              >
                <ArrowDownToLine size={14} className="text-slate-500" />
                Inserir como Novo Bloco
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onApplyContent(generatedHtml, 'replace');
                  onOpenChange(false);
                  toast.success('Bloco atual atualizado!');
                }}
                className="h-9 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                <Check size={14} />
                Substituir Bloco Selecionado
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
