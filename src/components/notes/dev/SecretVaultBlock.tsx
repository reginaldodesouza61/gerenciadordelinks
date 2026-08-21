import React, { useState, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { CanvasBlock, SecretItem, SecretType, SecretEnv } from '@/types/notes';
import { useAuthStore } from '@/lib/store/authStore';
import { 
  ShieldCheck, Lock, KeyRound, Eye, EyeOff, Copy, Check, 
  Plus, Trash2, GripHorizontal, Terminal,
  ExternalLink, Edit3, Save, User, Globe, Share2, FileText, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

const SECRET_TYPES: { id: SecretType; label: string; color: string }[] = [
  { id: 'password', label: 'Senha', color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { id: 'api_token', label: 'Token de API', color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  { id: 'db_connection', label: 'Conexão DB / URL', color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { id: 'jwt_secret', label: 'JWT Secret', color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  { id: 'ssh_key', label: 'Chave SSH / Cert', color: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' },
  { id: 'webhook_secret', label: 'Webhook Secret', color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  { id: 'env_var', label: 'Variável .ENV', color: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700' },
  { id: 'custom', label: 'Credencial Geral', color: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
];

const ENVIRONMENTS: { id: SecretEnv; label: string; badge: string }[] = [
  { id: 'prod', label: 'Produção (Prod)', badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' },
  { id: 'staging', label: 'Staging / Homolog', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  { id: 'dev', label: 'Desenvolvimento (Dev)', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  { id: 'local', label: 'Ambiente Local', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  { id: 'global', label: 'Global / Compartilhado', badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800' },
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
  const [copiedActionMap, setCopiedActionMap] = useState<Record<string, string>>({});
  const [isCopiedAll, setIsCopiedAll] = useState(false);
  const [isCopiedEnv, setIsCopiedEnv] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  // Add/Edit Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SecretItem | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formType, setFormType] = useState<SecretType>('password'); // Default to Senha (Password)
  const [formEnv, setFormEnv] = useState<SecretEnv>('prod');
  const [formNotes, setFormNotes] = useState('');
  const [showDialogPassword, setShowDialogPassword] = useState(false);

  const secrets: SecretItem[] = useMemo(() => {
    if (block.secrets && Array.isArray(block.secrets)) {
      return block.secrets;
    }
    return [];
  }, [block.secrets]);

  const vaultTitle = block.vaultTitle || 'Cofre de Credenciais & Senhas';

  // Toggle reveal password
  const toggleReveal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to format a single credential into complete shareable text
  const formatItemAsText = (item: SecretItem) => {
    const typeLabel = SECRET_TYPES.find(t => t.id === item.type)?.label || item.type;
    const envLabel = ENVIRONMENTS.find(e => e.id === item.env)?.label || item.env || 'Produção';
    
    const lines: string[] = [
      `🔐 Serviço / Identificador: ${item.key}`,
    ];

    if (item.url) {
      lines.push(`🌐 Link / Acesso: ${item.url}`);
    }

    if (item.username) {
      lines.push(`👤 Usuário / Login: ${item.username}`);
    }

    lines.push(`🔑 Senha / Valor: ${item.value}`);
    lines.push(`📌 Tipo: ${typeLabel}`);
    if (item.env) {
      lines.push(`🏷️ Ambiente: ${envLabel}`);
    }
    if (item.notes) {
      lines.push(`📝 Observações: ${item.notes}`);
    }

    return lines.join('\n');
  };

  // Trigger copied indicator on specific button
  const triggerCopiedFeedback = (itemId: string, actionType: string) => {
    setCopiedActionMap(prev => ({ ...prev, [`${itemId}_${actionType}`]: 'copied' }));
    setTimeout(() => {
      setCopiedActionMap(prev => {
        const next = { ...prev };
        delete next[`${itemId}_${actionType}`];
        return next;
      });
    }, 2000);
  };

  // Copy secret value only
  const handleCopySecretValue = async (item: SecretItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.value);
      triggerCopiedFeedback(item.id, 'value');
      toast.success(`Senha de "${item.key}" copiada!`);
    } catch {
      toast.error('Erro ao copiar senha');
    }
  };

  // Copy username only
  const handleCopyUsername = async (item: SecretItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.username) return;
    try {
      await navigator.clipboard.writeText(item.username);
      triggerCopiedFeedback(item.id, 'username');
      toast.success(`Usuário "${item.username}" copiado!`);
    } catch {
      toast.error('Erro ao copiar usuário');
    }
  };

  // Copy link only
  const handleCopyLink = async (item: SecretItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.url) return;
    try {
      await navigator.clipboard.writeText(item.url);
      triggerCopiedFeedback(item.id, 'url');
      toast.success(`Link de "${item.key}" copiado!`);
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  // Copy all information of a SINGLE item for easy sharing
  const handleCopyItemAll = async (item: SecretItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const fullText = formatItemAsText(item);
      await navigator.clipboard.writeText(fullText);
      triggerCopiedFeedback(item.id, 'all');
      toast.success(`Todas as informações de "${item.key}" copiadas!`);
    } catch {
      toast.error('Erro ao copiar informações');
    }
  };

  // Copy ALL credentials in this block formatted for sharing
  const handleCopyAllFormatted = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (secrets.length === 0) {
      toast.info('Nenhuma credencial cadastrada neste cofre.');
      return;
    }

    try {
      const header = `📋 ${vaultTitle.toUpperCase()}\n${'='.repeat(40)}\n`;
      const itemsText = secrets.map(formatItemAsText).join(`\n\n${'-'.repeat(30)}\n\n`);
      const fullExport = `${header}\n${itemsText}\n\n${'='.repeat(40)}\nExportado em: ${new Date().toLocaleString('pt-BR')}`;

      await navigator.clipboard.writeText(fullExport);
      setIsCopiedAll(true);
      toast.success(`${secrets.length} credenciais copiadas com todas as informações!`);
      setTimeout(() => setIsCopiedAll(false), 2200);
    } catch {
      toast.error('Erro ao copiar informações');
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
          const formattedKey = item.key.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
          const lines: string[] = [];
          if (item.username) {
            lines.push(`${formattedKey}_USER="${item.username}"`);
          }
          lines.push(`${formattedKey}_PASS="${item.value}"`);
          if (item.url) {
            lines.push(`${formattedKey}_URL="${item.url}"`);
          }
          return lines.join('\n');
        })
        .join('\n\n');

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
    setFormUsername('');
    setFormValue('');
    setFormUrl('');
    setFormType('password'); // Default is Senha
    setFormEnv('prod');
    setFormNotes('');
    setShowDialogPassword(false);
    setIsDialogOpen(true);
  };

  const openEditModal = (item: SecretItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingItem(item);
    setFormKey(item.key);
    setFormUsername(item.username || '');
    setFormValue(item.value);
    setFormUrl(item.url || '');
    setFormType(item.type || 'password');
    setFormEnv(item.env || 'prod');
    setFormNotes(item.notes || '');
    setShowDialogPassword(false);
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
      toast.error('Preencha o nome do serviço/chave e a senha/valor.');
      return;
    }

    // Auto prepend https:// if url provided without protocol
    let cleanUrl = formUrl.trim();
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    let updatedSecrets: SecretItem[];

    if (editingItem) {
      updatedSecrets = secrets.map((s) =>
        s.id === editingItem.id
          ? {
              ...s,
              key: formKey.trim(),
              username: formUsername.trim() || undefined,
              value: formValue.trim(),
              url: cleanUrl || undefined,
              type: formType,
              env: formEnv,
              notes: formNotes.trim() || undefined,
            }
          : s
      );
      toast.success('Credencial atualizada com sucesso!');
    } else {
      const newItem: SecretItem = {
        id: generateId(),
        key: formKey.trim(),
        username: formUsername.trim() || undefined,
        value: formValue.trim(),
        url: cleanUrl || undefined,
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
    setFormUsername('');
    setFormValue('');
    setFormUrl('');
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
        size={{ width: block.width || 520, height: block.height || 360 }}
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
        minWidth={340}
        minHeight={220}
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
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-amber-50/90 via-slate-50 to-amber-50/40 dark:from-amber-950/40 dark:via-zinc-900 dark:to-amber-950/20 border-b border-amber-200/60 dark:border-amber-900/40 shrink-0 select-none">
            {/* Left: Drag Handle & Title */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="vault-drag-handle cursor-grab active:cursor-grabbing text-amber-600/80 hover:text-amber-700 dark:text-amber-500 flex items-center gap-1 shrink-0">
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
                  className="bg-white dark:bg-zinc-800 border border-amber-400 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-zinc-100 font-semibold outline-none w-48 shadow-xs"
                />
              ) : (
                <span 
                  onClick={() => setIsEditingTitle(true)}
                  className="font-semibold text-xs text-slate-800 dark:text-zinc-100 hover:text-amber-900 dark:hover:text-amber-400 cursor-pointer px-1 py-0.5 rounded hover:bg-amber-100/50 dark:hover:bg-amber-950/40 transition-colors truncate max-w-[190px]"
                  title="Clique para renomear cofre"
                >
                  {vaultTitle}
                </span>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Copy Actions Menu */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`px-2 py-1 rounded text-[11px] font-medium border flex items-center gap-1 transition-all ${
                      isCopiedAll || isCopiedEnv
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400' 
                        : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white shadow-2xs'
                    }`}
                    title="Opções de cópia e exportação rápida"
                  >
                    {isCopiedAll || isCopiedEnv ? <Check size={12} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={12} />}
                    <span>{isCopiedAll ? 'Copiado!' : isCopiedEnv ? '.env Copiado!' : 'Copiar'}</span>
                    <ChevronDown size={10} className="opacity-60 -ml-0.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1.5" align="end">
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={handleCopyAllFormatted}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/60 text-slate-800 dark:text-zinc-200 flex items-center gap-2 font-medium transition-colors"
                    >
                      <Share2 size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-zinc-100">Copiar Todas as Info</div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal">Serviço, Link, Usuário e Senha</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyAsEnv}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 flex items-center gap-2 font-medium transition-colors"
                    >
                      <Terminal size={13} className="text-slate-600 dark:text-zinc-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-zinc-100">Copiar como .ENV</div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal">Formato de variáveis de ambiente</div>
                      </div>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Add Credential Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={openAddModal}
                className="h-6 px-2 text-[11px] bg-amber-500 hover:bg-amber-600 text-white border-none rounded gap-1 font-medium shadow-xs"
              >
                <Plus size={12} />
                <span>Adicionar</span>
              </Button>

              {/* Delete Vault Block */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeBlock(block.id);
                }}
                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-0.5"
                title="Excluir este cofre de credenciais"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Secrets List Area */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#fcfcfd] dark:bg-zinc-950">
            {secrets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mb-2">
                  <KeyRound size={20} />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200">Nenhuma credencial ou senha cadastrada</p>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 max-w-[280px]">
                  Guarde links de acesso, contas de usuário, senhas e tokens com cópia rápida em 1 clique.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openAddModal}
                  className="mt-3 h-7 text-xs border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1 font-medium"
                >
                  <Plus size={13} /> Adicionar primeira credencial
                </Button>
              </div>
            ) : (
              secrets.map((item) => {
                const isRevealed = !!revealedIds[item.id];
                const isCopiedValue = copiedActionMap[`${item.id}_value`] === 'copied';
                const isCopiedUser = copiedActionMap[`${item.id}_username`] === 'copied';
                const isCopiedLink = copiedActionMap[`${item.id}_url`] === 'copied';
                const isCopiedAllItem = copiedActionMap[`${item.id}_all`] === 'copied';

                const typeConfig = SECRET_TYPES.find(t => t.id === item.type) || SECRET_TYPES[0];
                const envConfig = ENVIRONMENTS.find(e => e.id === item.env) || ENVIRONMENTS[0];

                return (
                  <div 
                    key={item.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700 shadow-xs flex flex-col gap-2 transition-all group/item"
                  >
                    {/* Item Header: Service Name + Badges + Edit/Delete */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="font-semibold text-xs text-slate-800 dark:text-zinc-100 truncate" title={item.key}>
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
                        {/* Copy ALL item info button */}
                        <button
                          type="button"
                          onClick={(e) => handleCopyItemAll(item, e)}
                          className={`px-1.5 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors border ${
                            isCopiedAllItem
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-bold'
                              : 'bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-300 hover:border-amber-300'
                          }`}
                          title="Copiar todas as informações desta credencial (Serviço, Link, Usuário e Senha)"
                        >
                          {isCopiedAllItem ? <Check size={11} className="text-emerald-600" /> : <Share2 size={11} className="text-amber-600 dark:text-amber-400" />}
                          <span>{isCopiedAllItem ? 'Copiado!' : 'Copiar Tudo'}</span>
                        </button>

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
                          title="Remover credencial"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Service Link (if provided) */}
                    {item.url && (
                      <div className="flex items-center justify-between gap-2 px-2.5 py-1 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0 text-slate-600 dark:text-zinc-300 truncate">
                          <Globe size={12} className="text-sky-500 shrink-0" />
                          <span className="text-slate-400 dark:text-zinc-500 font-medium shrink-0">Link:</span>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-600 dark:text-sky-400 hover:underline truncate flex items-center gap-1 font-medium"
                            title={item.url}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>{item.url.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink size={10} className="shrink-0" />
                          </a>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleCopyLink(item, e)}
                          className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-700 shrink-0"
                          title="Copiar URL do serviço"
                        >
                          {isCopiedLink ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                        </button>
                      </div>
                    )}

                    {/* Username / Login (if provided) */}
                    {item.username && (
                      <div className="flex items-center justify-between gap-2 px-2.5 py-1 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0 text-slate-700 dark:text-zinc-200 truncate">
                          <User size={12} className="text-indigo-500 shrink-0" />
                          <span className="text-slate-400 dark:text-zinc-500 font-medium shrink-0">Usuário:</span>
                          <span className="font-mono font-medium truncate select-all">{item.username}</span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleCopyUsername(item, e)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 shrink-0 transition-colors ${
                            isCopiedUser
                              ? 'bg-emerald-100 text-emerald-700 font-bold dark:bg-emerald-950 dark:text-emerald-300'
                              : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-700'
                          }`}
                          title="Copiar nome de usuário"
                        >
                          {isCopiedUser ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                          <span>{isCopiedUser ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                    )}

                    {/* Password / Token Bar (Masked / Revealed + Copy Password) */}
                    <div className="flex items-center gap-1 bg-slate-900 dark:bg-black rounded-md px-2.5 py-1.5 text-slate-200 font-mono text-xs shadow-inner">
                      <div className="flex items-center gap-1.5 shrink-0 text-slate-400 text-[10px] select-none font-sans font-semibold">
                        <KeyRound size={11} className="text-amber-400" />
                        <span>Senha:</span>
                      </div>

                      <div className="flex-1 overflow-hidden select-all font-mono px-1">
                        {isRevealed ? (
                          <span className="text-emerald-400 break-all select-all font-medium">{item.value}</span>
                        ) : (
                          <span className="text-slate-400 tracking-widest select-none">
                            {'•'.repeat(Math.min(24, Math.max(10, item.value.length)))}
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
                        onClick={(e) => handleCopySecretValue(item, e)}
                        className={`px-1.5 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 shrink-0 transition-colors ${
                          isCopiedValue 
                            ? 'bg-emerald-600 text-white font-bold' 
                            : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                        title="Copiar apenas a senha/token"
                      >
                        {isCopiedValue ? <Check size={11} /> : <Copy size={11} />}
                        <span>{isCopiedValue ? 'Copiado!' : 'Copiar'}</span>
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
              <span>Criptografia protegida por sessão e usuário</span>
            </div>
            <span className="text-slate-400 dark:text-zinc-500 font-mono">
              {secrets.length} {secrets.length === 1 ? 'credencial' : 'credenciais'}
            </span>
          </div>
        </div>
      </Rnd>

      {/* Add / Edit Secret Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-slate-800 dark:text-zinc-100">
              <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <KeyRound size={16} />
              </div>
              <span>{editingItem ? 'Editar Credencial' : 'Adicionar Credencial'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveItem} className="space-y-3 py-1">
            {/* Service Name / Key */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                Serviço / Nome da Chave <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Ex: GitHub, Banco Postgres, AWS Console, E-mail Corporativo"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                className="text-xs"
                autoFocus
                required
              />
            </div>

            {/* Service Link / URL (Item 2) */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5 mb-1">
                <Globe size={13} className="text-sky-500" />
                <span>Link / URL do Serviço (Opcional)</span>
              </label>
              <Input
                type="text"
                placeholder="Ex: https://app.servico.com/login"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Username / E-mail (Item 1) */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5 mb-1">
                <User size={13} className="text-indigo-500" />
                <span>Nome de Usuário / E-mail / Login</span>
              </label>
              <Input
                placeholder="Ex: admin@empresa.com, dev_user, root"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Secret Value / Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
                  <Lock size={13} className="text-amber-500" />
                  <span>Senha / Token / Valor Secreto <span className="text-rose-500">*</span></span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowDialogPassword(!showDialogPassword)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1"
                >
                  {showDialogPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                  <span>{showDialogPassword ? 'Ocultar' : 'Visualizar'}</span>
                </button>
              </div>
              <Input
                type={showDialogPassword ? 'text' : 'password'}
                placeholder="Ex: SuaSenhaForte@2026 ou sk-proj-xxxxxxxx..."
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                className="font-mono text-xs"
                required
              />
            </div>

            {/* Type & Environment Row (Default Type is Senha) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
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
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
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
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                Observações (Opcional)
              </label>
              <Input
                placeholder="Ex: Requer 2FA via Authy, rotacionar a cada 90 dias"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setIsDialogOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                size="sm" 
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1 text-xs font-medium"
              >
                <Save size={14} /> Salvar Credencial
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
