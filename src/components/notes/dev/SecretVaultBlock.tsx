import { useState, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { CanvasBlock, SecretItem, SecretType, SecretEnv } from '@/types/notes';
import { useAuthStore } from '@/lib/store/authStore';
import { 
  ShieldCheck, Lock, KeyRound, Eye, EyeOff, Copy, Check, 
  Plus, Trash2, GripHorizontal, FileText, Sparkles, Terminal,
  ExternalLink, Edit3, X, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

const SECRET_TYPES: { id: SecretType; label: string; color: string }[] = [
  { id: 'api_token', label: 'Token de API', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'password', label: 'Senha', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'db_connection', label: 'Conexão DB / URL', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'jwt_secret', label: 'JWT Secret', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'ssh_key', label: 'Chave SSH / Cert', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'webhook_secret', label: 'Webhook Secret', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'env_var', label: 'Variável .ENV', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'custom', label: 'Credencial Geral', color: 'bg-blue-50 text-blue-700 border-blue-200' },
];

const ENVIRONMENTS: { id: SecretEnv; label: string; badge: string }[] = [
  { id: 'prod', label: 'Produção (Prod)', badge: 'bg-red-500/10 text-red-600 border-red-200' },
  { id: 'staging', label: 'Staging / Homolog', badge: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  { id: 'dev', label: 'Desenvolvimento (Dev)', badge: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  { id: 'local', label: 'Ambiente Local', badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  { id: 'global', label: 'Global / Compartilhado', badge: 'bg-slate-500/10 text-slate-600 border-slate-200' },
];

interface SecretVaultBlockProps {
  block: CanvasBlock;
  updateBlock: (id: string, updates: Partial<CanvasBlock>) => void;
  removeBlock: (id: string) => void;
  isSelected: boolean;
  setSelectedId: (id: string | null) => void;
}

export function SecretVaultBlock({
  block,
  updateBlock,
  removeBlock,
  isSelected,
  setSelectedId,
}: SecretVaultBlockProps) {
  const { user } = useAuthStore();
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCopiedEnv, setIsCopiedEnv] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  // Add/Edit Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SecretItem | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formType, setFormType] = useState<SecretType>('api_token');
  const [formEnv, setFormEnv] = useState<SecretEnv>('prod');
  const [formNotes, setFormNotes] = useState('');

  const secrets: SecretItem[] = useMemo(() => {
    if (block.secrets && Array.isArray(block.secrets)) {
      return block.secrets;
    }
    return [];
  }, [block.secrets]);

  const vaultTitle = block.vaultTitle || 'Cofre de Tokens & Credenciais';

  // Toggle reveal
  const toggleReveal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Copy individual secret
  const handleCopySecret = async (item: SecretItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.value);
      setCopiedId(item.id);
      toast.success(`"${item.key}" copiado para a área de transferência!`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Erro ao copiar valor');
    }
  };

  // Copy all secrets as .ENV format
  const handleCopyAsEnv = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (secrets.length === 0) {
      toast.info('Nenhuma credencial cadastrada neste cofre.');
      return;
    }

    try {
      const envText = secrets
        .map(item => {
          const formattedKey = item.key.toUpperCase().replace(/\s+/g, '_');
          return `${formattedKey}="${item.value}"`;
        })
        .join('\n');

      await navigator.clipboard.writeText(envText);
      setIsCopiedEnv(true);
      toast.success(`${secrets.length} credenciais copiadas no formato .env!`);
      setTimeout(() => setIsCopiedEnv(false), 2000);
    } catch {
      toast.error('Erro ao copiar formato .env');
    }
  };

  // Open modal to add or edit
  const openAddModal = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingItem(null);
    setFormKey('');
    setFormValue('');
    setFormType('api_token');
    setFormEnv('prod');
    setFormNotes('');
    setIsDialogOpen(true);
  };

  const openEditModal = (item: SecretItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingItem(item);
    setFormKey(item.key);
    setFormValue(item.value);
    setFormType(item.type);
    setFormEnv(item.env || 'prod');
    setFormNotes(item.notes || '');
    setIsDialogOpen(true);
  };

  // Safe unique ID generator
  const generateId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `sec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  // Save secret item
  const handleSaveItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formKey.trim() || !formValue.trim()) {
      toast.error('Preencha o nome da chave e o valor.');
      return;
    }

    let updatedSecrets: SecretItem[];

    if (editingItem) {
      updatedSecrets = secrets.map((s) =>
        s.id === editingItem.id
          ? {
              ...s,
              key: formKey.trim(),
              value: formValue.trim(),
              type: formType,
              env: formEnv,
              notes: formNotes.trim() || undefined,
            }
          : s
      );
      toast.success('Credencial atualizada!');
    } else {
      const newItem: SecretItem = {
        id: generateId(),
        key: formKey.trim(),
        value: formValue.trim(),
        type: formType,
        env: formEnv,
        notes: formNotes.trim() || undefined,
      };
      updatedSecrets = [...secrets, newItem];
      toast.success('Credencial adicionada ao cofre!');
    }

    updateBlock(block.id, { secrets: updatedSecrets });
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormKey('');
    setFormValue('');
  };

  // Delete secret item
  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = secrets.filter((s) => s.id !== id);
    updateBlock(block.id, { secrets: updated });
    toast.success('Credencial removida do cofre');
  };

  return (
    <>
      <Rnd
        size={{ width: block.width || 480, height: block.height || 310 }}
        position={{ x: block.x, y: block.y }}
        onDragStop={(_, d) => updateBlock(block.id, { x: d.x, y: d.y })}
        onResizeStop={(_, __, ref, ___, position) => {
          updateBlock(block.id, {
            width: ref.style.width,
            height: ref.style.height,
            ...position,
          });
        }}
        bounds="parent"
        minWidth={320}
        minHeight={180}
        dragHandleClassName="vault-drag-handle"
        className={`group ${isSelected ? 'z-20' : 'z-10'}`}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedId(block.id);
        }}
      >
        <div 
          className={`flex flex-col h-full rounded-xl overflow-hidden border bg-white dark:bg-zinc-900 shadow-md transition-all ${
            isSelected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-amber-50/80 via-slate-50 to-amber-50/40 dark:from-amber-950/40 dark:via-zinc-900 dark:to-amber-950/20 border-b border-amber-200/60 dark:border-amber-900/40 shrink-0 select-none">
            {/* Left: Drag Handle & Title */}
            <div className="flex items-center gap-2">
              <div className="vault-drag-handle cursor-grab active:cursor-grabbing text-amber-600/70 hover:text-amber-700 dark:text-amber-500 flex items-center gap-1">
                <ShieldCheck size={16} className="text-amber-600 dark:text-amber-500 shrink-0" />
                <GripHorizontal size={13} />
              </div>

              {/* Editable Title */}
              {isEditingTitle ? (
                <input
                  type="text"
                  value={vaultTitle}
                  autoFocus
                  onChange={(e) => updateBlock(block.id, { vaultTitle: e.target.value })}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                  className="bg-white dark:bg-zinc-800 border border-amber-400 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-zinc-100 font-semibold outline-none w-44 shadow-xs"
                />
              ) : (
                <span 
                  onClick={() => setIsEditingTitle(true)}
                  className="font-semibold text-xs text-slate-800 dark:text-zinc-100 hover:text-amber-900 dark:hover:text-amber-400 cursor-pointer px-1 py-0.5 rounded hover:bg-amber-100/50 dark:hover:bg-amber-950/40 transition-colors truncate max-w-[180px]"
                  title="Clique para renomear cofre"
                >
                  {vaultTitle}
                </span>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5">
              {/* Copy as .ENV */}
              <button
                type="button"
                onClick={handleCopyAsEnv}
                className={`px-2 py-1 rounded text-[11px] font-medium border flex items-center gap-1 transition-all ${
                  isCopiedEnv 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Copiar todas as chaves no formato .env"
              >
                {isCopiedEnv ? <Check size={12} className="text-emerald-600 dark:text-emerald-400" /> : <Terminal size={12} />}
                <span>{isCopiedEnv ? 'Copiado!' : 'Copiar .env'}</span>
              </button>

              {/* Add Key Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={openAddModal}
                className="h-6 px-2 text-[11px] bg-amber-500 hover:bg-amber-600 text-white border-none rounded gap-1 font-medium shadow-xs"
              >
                <Plus size={12} />
                <span className="hidden sm:inline">Chave</span>
              </Button>

              {/* Delete Vault Block */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeBlock(block.id);
                }}
                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-0.5"
                title="Excluir cofre de credenciais"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Secrets List Area */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-[#fcfcfd] dark:bg-zinc-950">
            {secrets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mb-2">
                  <KeyRound size={20} />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200">Nenhum token ou senha cadastrado</p>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 max-w-[240px]">
                  Guarde tokens de API, strings de conexão e senhas com cópia rápida e proteção.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openAddModal}
                  className="mt-3 h-7 text-xs border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1"
                >
                  <Plus size={13} /> Adicionar primeira chave
                </Button>
              </div>
            ) : (
              secrets.map((item) => {
                const isRevealed = !!revealedIds[item.id];
                const isCopied = copiedId === item.id;
                const typeConfig = SECRET_TYPES.find(t => t.id === item.type) || SECRET_TYPES[0];
                const envConfig = ENVIRONMENTS.find(e => e.id === item.env) || ENVIRONMENTS[0];

                return (
                  <div 
                    key={item.id}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700 shadow-xs flex flex-col gap-1.5 transition-all group/item"
                  >
                    {/* Item Top: Key name + Type Badge + Env Badge + Actions */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-zinc-200 truncate" title={item.key}>
                          {item.key}
                        </span>
                        
                        {/* Type Badge */}
                        <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium shrink-0 ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>

                        {/* Env Badge */}
                        {item.env && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono font-semibold uppercase shrink-0 ${envConfig.badge}`}>
                            {item.env}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Edit Item */}
                        <button
                          type="button"
                          onClick={(e) => openEditModal(item, e)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors opacity-0 group-hover/item:opacity-100"
                          title="Editar credencial"
                        >
                          <Edit3 size={12} />
                        </button>

                        {/* Delete Item */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteItem(item.id, e)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors opacity-0 group-hover/item:opacity-100"
                          title="Remover chave"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Item Value Bar (Masked / Revealed + Copy Button) */}
                    <div className="flex items-center gap-1 bg-slate-900 dark:bg-black rounded-md px-2.5 py-1.5 text-slate-200 font-mono text-xs shadow-inner">
                      <div className="flex-1 overflow-hidden select-all font-mono">
                        {isRevealed ? (
                          <span className="text-emerald-400 break-all select-all">{item.value}</span>
                        ) : (
                          <span className="text-slate-400 tracking-widest select-none">
                            {'•'.repeat(Math.min(28, Math.max(12, item.value.length)))}
                          </span>
                        )}
                      </div>

                      {/* Reveal Toggle Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleReveal(item.id, e)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                        title={isRevealed ? 'Ocultar valor' : 'Revelar valor'}
                      >
                        {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>

                      {/* Copy Secret Button */}
                      <button
                        type="button"
                        onClick={(e) => handleCopySecret(item, e)}
                        className={`px-1.5 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 shrink-0 transition-colors ${
                          isCopied 
                            ? 'bg-emerald-600 text-white font-bold' 
                            : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                        title="Copiar credencial"
                      >
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                        <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>

                    {/* Notes if any */}
                    {item.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 italic pl-1 truncate">
                        {item.notes}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Security Badge */}
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 text-[10px] text-slate-500 dark:text-zinc-400 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300">
              <Lock size={11} className="text-amber-600 dark:text-amber-500" />
              <span>Criptografia AES protegida por usuário</span>
            </div>
            <span className="text-slate-400 dark:text-zinc-500 font-mono">
              {secrets.length} {secrets.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
        </div>
      </Rnd>

      {/* Add / Edit Secret Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-slate-800">
              <KeyRound size={18} className="text-amber-600" />
              {editingItem ? 'Editar Credencial / Token' : 'Adicionar Token ou Senha'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveItem} className="space-y-3.5 py-1">
            {/* Key Name */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nome da Chave / Identificador
              </label>
              <Input
                placeholder="Ex: OPENAI_API_KEY, DATABASE_URL, STRIPE_SECRET"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                className="font-mono text-xs"
                autoFocus
              />
            </div>

            {/* Secret Value */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Valor Secreto (Token / Chave / Senha)
              </label>
              <Input
                type="text"
                placeholder="Ex: sk-proj-1234567890abcdef..."
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            {/* Type & Environment Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tipo de Credencial
                </label>
                <Select value={formType} onValueChange={(val) => setFormType(val as SecretType)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECRET_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id} className="text-xs">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Ambiente
                </label>
                <Select value={formEnv} onValueChange={(val) => setFormEnv(val as SecretEnv)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENVIRONMENTS.map((env) => (
                      <SelectItem key={env.id} value={env.id} className="text-xs">
                        {env.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes / Description */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Observações (Opcional)
              </label>
              <Input
                placeholder="Ex: Chave de produção para billing, rotacionar a cada 90 dias"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1">
                <Save size={14} /> Salvar Credencial
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
