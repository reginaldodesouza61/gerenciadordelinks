import { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Sparkles, Key, CheckCircle2, AlertCircle, Eye, EyeOff, 
  User, Info, RefreshCw, Cpu, ShieldCheck, Check,
  Lock, Fingerprint, Database, KeyRound, Shield, ExternalLink, Trash2
} from 'lucide-react';
import { 
  getGeminiApiKey, setGeminiApiKey, removeGeminiApiKey, testGeminiApiKey, 
  DEFAULT_DEVELOPER_INFO, SYSTEM_INFO 
} from '@/lib/geminiService';
import { toast } from 'sonner';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'gemini' | 'developer' | 'system';
}

export function SettingsModal({ open, onOpenChange, defaultTab = 'gemini' }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (open) {
      const stored = getGeminiApiKey();
      setApiKey(stored);
      setHasStoredKey(Boolean(stored));
      setTestResult(null);
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      toast.error('Por favor, digite uma chave de API antes de salvar.');
      return;
    }
    setGeminiApiKey(apiKey);
    setHasStoredKey(true);
    toast.success('Chave da API Gemini salva com sucesso!');
  };

  const handleRemoveKey = () => {
    removeGeminiApiKey();
    setApiKey('');
    setHasStoredKey(false);
    setTestResult(null);
    toast.info('Chave da API Gemini removida.');
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Informe uma chave para testar.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGeminiApiKey(apiKey);
      setTestResult(res);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch {
      setTestResult({ success: false, message: 'Erro inesperado ao testar a chave.' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center font-bold">
              <Cpu size={20} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Configurações do MeuHub
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                Gerencie a integração de Inteligência Artificial, informações do autor e detalhes do sistema.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 max-h-[75vh] overflow-y-auto">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'gemini' | 'developer' | 'system')} className="w-full">
            <TabsList className="grid grid-cols-3 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl mb-6">
              <TabsTrigger value="gemini" className="rounded-lg text-xs gap-1.5 font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-xs">
                <Sparkles size={14} className="text-indigo-500" />
                <span>IA Gemini</span>
              </TabsTrigger>
              <TabsTrigger value="developer" className="rounded-lg text-xs gap-1.5 font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-xs">
                <User size={14} className="text-blue-500" />
                <span>Desenvolvedor</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="rounded-lg text-xs gap-1.5 font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-xs">
                <Info size={14} className="text-emerald-500" />
                <span>Sobre o Sistema</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: GEMINI AI */}
            <TabsContent value="gemini" className="space-y-5 focus-visible:outline-none">
              <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-semibold text-sm">
                  <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Assistente Gemini para Anotações & Requisitos</span>
                </div>
                <p className="text-xs text-indigo-700/90 dark:text-indigo-300 leading-relaxed">
                  Configure sua chave de API do Google Gemini para desbloquear a elaboração inteligente de textos, geração rápida de levantamento de requisitos (RFs/RNFs), fluxos de processos operacionais e casos de uso em suas anotações.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="gemini-key" className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Key size={14} className="text-slate-400" />
                    Chave de API do Google Gemini (API Key)
                  </Label>
                  {hasStoredKey ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
                      <CheckCircle2 size={12} /> Configurada
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                      <AlertCircle size={12} /> Não configurada
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Input
                    id="gemini-key"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder="Cole sua chave (AIzaSy...)"
                    className="pr-10 font-mono text-xs h-11 bg-white dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                    title={showKey ? 'Ocultar chave' : 'Exibir chave'}
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                  >
                    <ExternalLink size={13} />
                    Obter chave gratuita no Google AI Studio
                  </a>

                  <div className="flex items-center gap-2">
                    {hasStoredKey && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveKey}
                        className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5"
                      >
                        <Trash2 size={13} />
                        Remover
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTestKey}
                      disabled={isTesting || !apiKey.trim()}
                      className="h-8 text-xs gap-1.5 border-slate-200 dark:border-zinc-700 font-medium"
                    >
                      {isTesting ? (
                        <RefreshCw size={13} className="animate-spin text-primary" />
                      ) : (
                        <ShieldCheck size={13} className="text-slate-500" />
                      )}
                      Testar Conexão
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveKey}
                      disabled={!apiKey.trim()}
                      className="h-8 text-xs gap-1.5 font-bold shadow-xs"
                    >
                      <Check size={14} />
                      Salvar Chave
                    </Button>
                  </div>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-start gap-2 animate-in fade-in duration-200 ${
                      testResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-200/70 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-zinc-400 space-y-1">
                <span className="font-semibold text-slate-700 dark:text-zinc-300">Privacidade & Armazenamento Seguro:</span>
                <p>
                  Sua chave do Gemini fica armazenada exclusivamente no armazenamento local do seu navegador (LocalStorage) e nunca é compartilhada ou enviada a servidores externos.
                </p>
              </div>
            </TabsContent>

            {/* TAB 2: DEVELOPER INFO */}
            <TabsContent value="developer" className="space-y-4 focus-visible:outline-none">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 dark:from-zinc-800/60 dark:to-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-md shrink-0">
                  RS
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {DEFAULT_DEVELOPER_INFO.name}
                    </h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                      Autor & Dev
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-600 dark:text-zinc-300">
                    {DEFAULT_DEVELOPER_INFO.role}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed pt-1">
                    {DEFAULT_DEVELOPER_INFO.bio}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: SYSTEM INFO & CRYPTOGRAPHY */}
            <TabsContent value="system" className="space-y-4 focus-visible:outline-none">
              {/* App Meta Card */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900 dark:text-white">{SYSTEM_INFO.name}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-md">
                      {SYSTEM_INFO.version}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-zinc-500">
                    Lançamento {SYSTEM_INFO.releaseDate}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  {SYSTEM_INFO.description}
                </p>
              </div>

              {/* Security & Cryptography Card */}
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                  <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Criptografia & Proteção de Dados (Zero-Knowledge)
                  </h4>
                </div>

                <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
                  O MeuHub implementa uma arquitetura de segurança de padrão militar com criptografia cliente ponta a ponta (Web Crypto API). Todas as credenciais, segredos, senhas e chaves privadas são cifradas no navegador antes de qualquer gravação ou persistência.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Algoritmo de Cifra */}
                  <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-800 dark:text-zinc-200 font-semibold text-xs">
                      <Lock size={13} className="text-emerald-500 shrink-0" />
                      <span>AES-256-GCM (Padrão Militar)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                      Cifra simétrica autenticada com chaves de 256 bits, garantindo confidencialidade absoluta e validação de integridade contra adulteração.
                    </p>
                  </div>

                  {/* Derivação de Chave PBKDF2 */}
                  <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-800 dark:text-zinc-200 font-semibold text-xs">
                      <KeyRound size={13} className="text-blue-500 shrink-0" />
                      <span>PBKDF2 com 100.000 iterações</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                      Derivação de chaves reforçada com HMAC-SHA-256 e 100 mil ciclos de hashing para imunidade contra ataques de dicionário ou força bruta.
                    </p>
                  </div>

                  {/* Vetor de Inicialização & Salt */}
                  <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-800 dark:text-zinc-200 font-semibold text-xs">
                      <Fingerprint size={13} className="text-purple-500 shrink-0" />
                      <span>Salt 128-bit & IV 96-bit Dinâmicos</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                      Entropia criptográfica por registro gerada via <code className="text-[10px] bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">crypto.getRandomValues</code> nativo do navegador.
                    </p>
                  </div>

                  {/* Isolamento Zero-Knowledge */}
                  <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-800 dark:text-zinc-200 font-semibold text-xs">
                      <Shield size={13} className="text-amber-500 shrink-0" />
                      <span>Arquitetura Zero-Knowledge</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                      Segredos em texto puro nunca trafegam em rede desprotegidos. O armazenamento recebe exclusivamente envelopes cifrados.
                    </p>
                  </div>
                </div>
              </div>

              {/* Módulos e Recursos */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Módulos & Recursos Integrados
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SYSTEM_INFO.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/80 text-xs text-slate-700 dark:text-zinc-300">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
