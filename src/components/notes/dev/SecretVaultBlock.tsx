import React, { useState, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { CanvasBlock, SecretItem, SecretType, SecretEnv, SecretItemCustomField } from '@/types/notes';
import { 
  ShieldCheck, Lock, KeyRound, Eye, EyeOff, Copy, Check, 
  Plus, Trash2, GripHorizontal, Terminal,
  ExternalLink, Edit3, Save, User, Globe, Share2, ChevronDown,
  Cloud, Code2, Database as DatabaseIcon, Server, RefreshCw,
  Landmark, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { generatePassword } from '@/lib/utils/passwordUtils';

const SECRET_TYPES: { id: SecretType; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'password', label: 'Senha (Usuário & Senha)', icon: Lock, color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { id: 'bank', label: 'Conta Bancária & PIX', icon: Landmark, color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { id: 'credit_card', label: 'Cartão de Crédito', icon: CreditCard, color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  { id: 'azure_graph', label: 'Microsoft Graph / Azure AD', icon: Cloud, color: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800' },
  { id: 'oauth_api', label: 'OAuth 2.0 / API Rest', icon: Code2, color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  { id: 'api_token', label: 'Token de API / API Key', icon: KeyRound, color: 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800' },
  { id: 'db_connection', label: 'Banco de Dados (DB)', icon: DatabaseIcon, color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { id: 'ssh_key', label: 'Chave SSH / Servidor', icon: Server, color: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' },
  { id: 'jwt_secret', label: 'JWT Secret', icon: KeyRound, color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  { id: 'webhook_secret', label: 'Webhook Secret', icon: Code2, color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  { id: 'env_var', label: 'Variável .ENV', icon: Terminal, color: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700' },
  { id: 'custom', label: 'Personalizado', icon: ShieldCheck, color: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
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
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedActionMap, setCopiedActionMap] = useState<Record<string, string>>({});
  const [isCopiedAll, setIsCopiedAll] = useState(false);
  const [isCopiedEnv, setIsCopiedEnv] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  // Add/Edit Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SecretItem | null>(null);

  // Form State
  const [formType, setFormType] = useState<SecretType>('password'); // Default to Senha
  const [formKey, setFormKey] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formEnv, setFormEnv] = useState<SecretEnv>('prod');
  const [formNotes, setFormNotes] = useState('');
  const [showDialogPassword, setShowDialogPassword] = useState(false);

  // Specific dynamic fields
  const [formClientId, setFormClientId] = useState('');
  const [formClientSecret, setFormClientSecret] = useState('');
  const [formTenantId, setFormTenantId] = useState('');
  const [formObjectId, setFormObjectId] = useState('');
  const [formRedirectUri, setFormRedirectUri] = useState('');

  const [formDbHost, setFormDbHost] = useState('');
  const [formDbPort, setFormDbPort] = useState('');
  const [formDbName, setFormDbName] = useState('');
  const [formDbUser, setFormDbUser] = useState('');

  // Bank fields
  const [formBankName, setFormBankName] = useState('');
  const [formBankAgency, setFormBankAgency] = useState('');
  const [formBankAccount, setFormBankAccount] = useState('');
  const [formBankAccountType, setFormBankAccountType] = useState('Corrente');
  const [formPixKey, setFormPixKey] = useState('');
  const [formTransactionPassword, setFormTransactionPassword] = useState('');

  // Credit Card fields
  const [formCardholderName, setFormCardholderName] = useState('');
  const [formCardNumber, setFormCardNumber] = useState('');
  const [formCardExpiry, setFormCardExpiry] = useState('');
  const [formCardCvv, setFormCardCvv] = useState('');
  const [formCardBrand, setFormCardBrand] = useState('Visa');
  const [formCardLimit, setFormCardLimit] = useState('');
  const [formCardDueDay, setFormCardDueDay] = useState('');

  const [formCustomFields, setFormCustomFields] = useState<SecretItemCustomField[]>([]);

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
      `🔐 Serviço: ${item.key}`,
      `📌 Tipo: ${typeLabel}`,
      `🏷️ Ambiente: ${envLabel}`
    ];

    if (item.url) lines.push(`🌐 Link / URL: ${item.url}`);
    if (item.username) lines.push(`👤 Usuário / Login: ${item.username}`);
    if (item.value) lines.push(`🔑 Senha / Valor: ${item.value}`);

    // Azure / OAuth fields
    if (item.clientId) lines.push(`🆔 Client ID: ${item.clientId}`);
    if (item.clientSecret) lines.push(`🔒 Client Secret: ${item.clientSecret}`);
    if (item.tenantId) lines.push(`🏢 Tenant ID: ${item.tenantId}`);
    if (item.objectId) lines.push(`📦 Object ID: ${item.objectId}`);
    if (item.redirectUri) lines.push(`🔄 Redirect URI: ${item.redirectUri}`);

    // Database fields
    if (item.dbHost) lines.push(`🖥️ Host: ${item.dbHost}${item.dbPort ? `:${item.dbPort}` : ''}`);
    if (item.dbName) lines.push(`🗄️ Database: ${item.dbName}`);
    if (item.dbUser) lines.push(`👤 DB User: ${item.dbUser}`);

    // Bank fields
    if (item.bankName) lines.push(`🏦 Banco: ${item.bankName}`);
    if (item.bankAgency) lines.push(`🏢 Agência: ${item.bankAgency}`);
    if (item.bankAccount) lines.push(`💳 Conta: ${item.bankAccount}${item.bankAccountType ? ` (${item.bankAccountType})` : ''}`);
    if (item.pixKey) lines.push(`💠 Chave PIX: ${item.pixKey}`);
    if (item.transactionPassword) lines.push(`🔒 Senha de Transação: ${item.transactionPassword}`);

    // Credit Card fields
    if (item.cardBrand) lines.push(`💳 Bandeira: ${item.cardBrand}`);
    if (item.cardholderName) lines.push(`👤 Titular: ${item.cardholderName}`);
    if (item.cardNumber) lines.push(`💳 Número do Cartão: ${item.cardNumber}`);
    if (item.cardExpiry) lines.push(`⏳ Validade: ${item.cardExpiry}`);
    if (item.cardCvv) lines.push(`🔒 CVV: ${item.cardCvv}`);
    if (item.cardLimit) lines.push(`💰 Limite: ${item.cardLimit}`);
    if (item.cardDueDay) lines.push(`📅 Vencimento (Dia): ${item.cardDueDay}`);

    // Custom fields
    if (item.customFields && item.customFields.length > 0) {
      item.customFields.forEach(cf => {
        if (cf.name && cf.value) {
          lines.push(`⚙️ ${cf.name}: ${cf.value}`);
        }
      });
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

  const copyTextToClipboard = async (text: string, label: string, itemId: string, actionKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      triggerCopiedFeedback(itemId, actionKey);
      toast.success(`${label} copiado!`);
    } catch {
      toast.error(`Erro ao copiar ${label.toLowerCase()}`);
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
          
          if (item.type === 'azure_graph') {
            if (item.clientId) lines.push(`${formattedKey}_CLIENT_ID="${item.clientId}"`);
            if (item.clientSecret || item.value) lines.push(`${formattedKey}_CLIENT_SECRET="${item.clientSecret || item.value}"`);
            if (item.tenantId) lines.push(`${formattedKey}_TENANT_ID="${item.tenantId}"`);
            if (item.objectId) lines.push(`${formattedKey}_OBJECT_ID="${item.objectId}"`);
          } else if (item.type === 'oauth_api') {
            if (item.clientId) lines.push(`${formattedKey}_CLIENT_ID="${item.clientId}"`);
            if (item.clientSecret || item.value) lines.push(`${formattedKey}_CLIENT_SECRET="${item.clientSecret || item.value}"`);
            if (item.redirectUri) lines.push(`${formattedKey}_REDIRECT_URI="${item.redirectUri}"`);
          } else if (item.type === 'db_connection') {
            if (item.dbHost) lines.push(`${formattedKey}_HOST="${item.dbHost}"`);
            if (item.dbPort) lines.push(`${formattedKey}_PORT="${item.dbPort}"`);
            if (item.dbName) lines.push(`${formattedKey}_DATABASE="${item.dbName}"`);
            if (item.dbUser || item.username) lines.push(`${formattedKey}_USER="${item.dbUser || item.username}"`);
            if (item.value) lines.push(`${formattedKey}_PASSWORD="${item.value}"`);
          } else {
            if (item.username) lines.push(`${formattedKey}_USER="${item.username}"`);
            if (item.value) lines.push(`${formattedKey}_PASS="${item.value}"`);
            if (item.url) lines.push(`${formattedKey}_URL="${item.url}"`);
          }

          if (item.customFields) {
            item.customFields.forEach(cf => {
              if (cf.name && cf.value) {
                const cfKey = cf.name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
                lines.push(`${formattedKey}_${cfKey}="${cf.value}"`);
              }
            });
          }

          return lines.join('\n');
        })
        .filter(Boolean)
        .join('\n\n');

      await navigator.clipboard.writeText(envText);
      setIsCopiedEnv(true);
      toast.success(`${secrets.length} credenciais exportadas como .env!`);
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
    setFormClientId('');
    setFormClientSecret('');
    setFormTenantId('');
    setFormObjectId('');
    setFormRedirectUri('');
    setFormDbHost('');
    setFormDbPort('');
    setFormDbName('');
    setFormDbUser('');
    setFormBankName('');
    setFormBankAgency('');
    setFormBankAccount('');
    setFormBankAccountType('Corrente');
    setFormPixKey('');
    setFormTransactionPassword('');
    setFormCardholderName('');
    setFormCardNumber('');
    setFormCardExpiry('');
    setFormCardCvv('');
    setFormCardBrand('Visa');
    setFormCardLimit('');
    setFormCardDueDay('');
    setFormCustomFields([]);
    setShowDialogPassword(false);
    setIsDialogOpen(true);
  };

  const openEditModal = (item: SecretItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingItem(item);
    setFormKey(item.key);
    setFormUsername(item.username || '');
    setFormValue(item.value || '');
    setFormUrl(item.url || '');
    setFormType(item.type || 'password');
    setFormEnv(item.env || 'prod');
    setFormNotes(item.notes || '');
    setFormClientId(item.clientId || '');
    setFormClientSecret(item.clientSecret || '');
    setFormTenantId(item.tenantId || '');
    setFormObjectId(item.objectId || '');
    setFormRedirectUri(item.redirectUri || '');
    setFormDbHost(item.dbHost || '');
    setFormDbPort(item.dbPort || '');
    setFormDbName(item.dbName || '');
    setFormDbUser(item.dbUser || '');
    setFormBankName(item.bankName || '');
    setFormBankAgency(item.bankAgency || '');
    setFormBankAccount(item.bankAccount || '');
    setFormBankAccountType(item.bankAccountType || 'Corrente');
    setFormPixKey(item.pixKey || '');
    setFormTransactionPassword(item.transactionPassword || '');
    setFormCardholderName(item.cardholderName || '');
    setFormCardNumber(item.cardNumber || '');
    setFormCardExpiry(item.cardExpiry || '');
    setFormCardCvv(item.cardCvv || '');
    setFormCardBrand(item.cardBrand || 'Visa');
    setFormCardLimit(item.cardLimit || '');
    setFormCardDueDay(item.cardDueDay || '');
    setFormCustomFields(item.customFields || []);
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

  // Add Custom Field
  const handleAddCustomField = () => {
    setFormCustomFields(prev => [
      ...prev,
      {
        id: `cf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: '',
        value: '',
        type: 'text'
      }
    ]);
  };

  const handleUpdateCustomField = (id: string, updates: Partial<SecretItemCustomField>) => {
    setFormCustomFields(prev => prev.map(cf => cf.id === id ? { ...cf, ...updates } : cf));
  };

  const handleRemoveCustomField = (id: string) => {
    setFormCustomFields(prev => prev.filter(cf => cf.id !== id));
  };

  const handleGenerateRandomPass = () => {
    const newPass = generatePassword(16, { uppercase: true, lowercase: true, numbers: true, symbols: true });
    setFormValue(newPass);
    if (formType === 'azure_graph' || formType === 'oauth_api') {
      setFormClientSecret(newPass);
    }
    setShowDialogPassword(true);
    toast.success('Senha forte gerada!');
  };

  // Save secret item
  const handleSaveItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!formKey.trim()) {
      toast.error('Preencha o nome do serviço ou chave.');
      return;
    }

    // Auto prepend https:// if url provided without protocol
    let cleanUrl = formUrl.trim();
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    // Determine primary secret value based on credential type
    let primarySecretValue = formValue.trim();
    if (formType === 'azure_graph') {
      primarySecretValue = formClientSecret.trim() || formValue.trim() || ' ';
    } else if (formType === 'oauth_api') {
      primarySecretValue = formClientSecret.trim() || formValue.trim() || ' ';
    }

    const cleanCustom = formCustomFields.filter(cf => cf.name.trim() !== '');

    let updatedSecrets: SecretItem[];

    const itemData: Omit<SecretItem, 'id'> = {
      key: formKey.trim(),
      username: (formType === 'db_connection' ? (formDbUser.trim() || formUsername.trim()) : formUsername.trim()) || undefined,
      value: primarySecretValue,
      url: cleanUrl || undefined,
      type: formType,
      env: formEnv,
      notes: formNotes.trim() || undefined,
      clientId: formClientId.trim() || undefined,
      clientSecret: (formClientSecret.trim() || formValue.trim()) || undefined,
      tenantId: formTenantId.trim() || undefined,
      objectId: formObjectId.trim() || undefined,
      redirectUri: formRedirectUri.trim() || undefined,
      dbHost: formDbHost.trim() || undefined,
      dbPort: formDbPort.trim() || undefined,
      dbName: formDbName.trim() || undefined,
      dbUser: formDbUser.trim() || undefined,
      bankName: formBankName.trim() || undefined,
      bankAgency: formBankAgency.trim() || undefined,
      bankAccount: formBankAccount.trim() || undefined,
      bankAccountType: formBankAccountType.trim() || undefined,
      pixKey: formPixKey.trim() || undefined,
      transactionPassword: formTransactionPassword.trim() || undefined,
      cardholderName: formCardholderName.trim() || undefined,
      cardNumber: formCardNumber.trim() || undefined,
      cardExpiry: formCardExpiry.trim() || undefined,
      cardCvv: formCardCvv.trim() || undefined,
      cardBrand: formCardBrand.trim() || undefined,
      cardLimit: formCardLimit.trim() || undefined,
      cardDueDay: formCardDueDay.trim() || undefined,
      customFields: cleanCustom.length > 0 ? cleanCustom : undefined,
    };

    if (editingItem) {
      updatedSecrets = secrets.map((s) =>
        s.id === editingItem.id ? { ...s, ...itemData } : s
      );
      toast.success('Credencial atualizada com sucesso!');
    } else {
      const newItem: SecretItem = {
        id: generateId(),
        ...itemData
      };
      updatedSecrets = [...secrets, newItem];
      toast.success('Credencial adicionada ao cofre!');
    }

    updateBlock(block.id, { secrets: updatedSecrets });
    setIsDialogOpen(false);
    setEditingItem(null);
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
        size={{ width: block.width || 540, height: block.height || 380 }}
        position={{ x: block.x, y: block.y }}
        style={{
          zIndex: isSelected ? 35 : 12,
        }}
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
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal">Serviço, Link, Chaves e Senhas</div>
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

              {/* Remove Block Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeBlock(block.id);
                }}
                className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                title="Remover cofre"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Secrets List Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 select-text">
            {secrets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-zinc-500 space-y-2 select-none">
                <div className="p-3 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-200 dark:border-amber-800/40">
                  <KeyRound size={24} />
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Cofre vazio
                </div>
                <p className="text-[11px] max-w-[260px] text-slate-500 dark:text-zinc-400">
                  Guarde senhas, credenciais Graph API, chaves OAuth, tokens de API e conexões com total segurança.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openAddModal}
                  className="mt-1 h-7 text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1 font-medium"
                >
                  <Plus size={12} />
                  <span>Cadastrar Primeira Credencial</span>
                </Button>
              </div>
            ) : (
              secrets.map((item) => {
                const isRevealed = revealedIds[item.id] || false;
                const isCopiedAllItem = copiedActionMap[`${item.id}_all`] === 'copied';
                const typeConfig = SECRET_TYPES.find((t) => t.id === item.type) || SECRET_TYPES[0];
                const envConfig = ENVIRONMENTS.find((e) => e.id === item.env) || ENVIRONMENTS[0];

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
                          title="Copiar todas as informações desta credencial"
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
                          onClick={(e) => copyTextToClipboard(item.url || '', 'Link', item.id, 'url', e)}
                          className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-700 shrink-0"
                          title="Copiar URL"
                        >
                          {copiedActionMap[`${item.id}_url`] === 'copied' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                        </button>
                      </div>
                    )}

                    {/* Specific Fields: Bank Account */}
                    {item.type === 'bank' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {item.bankName && (
                          <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-[11px]">
                            <div className="truncate flex items-center gap-1">
                              <Landmark size={12} className="text-emerald-500 shrink-0" />
                              <span className="font-bold text-slate-500 dark:text-zinc-400 text-[10px]">BANCO:</span>
                              <span className="font-mono truncate">{item.bankName}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => copyTextToClipboard(item.bankName || '', 'Banco', item.id, 'bank_name', e)}
                              className="p-0.5 rounded text-slate-400 hover:text-emerald-600 shrink-0"
                              title="Copiar Banco"
                            >
                              {copiedActionMap[`${item.id}_bank_name`] === 'copied' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </button>
                          </div>
                        )}

                        {item.bankAgency && (
                          <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-[11px]">
                            <div className="truncate flex items-center gap-1">
                              <span className="font-bold text-slate-500 dark:text-zinc-400 text-[10px]">AGÊNCIA:</span>
                              <span className="font-mono truncate">{item.bankAgency}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => copyTextToClipboard(item.bankAgency || '', 'Agência', item.id, 'bank_agency', e)}
                              className="p-0.5 rounded text-slate-400 hover:text-emerald-600 shrink-0"
                              title="Copiar Agência"
                            >
                              {copiedActionMap[`${item.id}_bank_agency`] === 'copied' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </button>
                          </div>
                        )}

                        {item.bankAccount && (
                          <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-[11px]">
                            <div className="truncate flex items-center gap-1">
                              <span className="font-bold text-slate-500 dark:text-zinc-400 text-[10px]">CONTA ({item.bankAccountType || 'Corrente'}):</span>
                              <span className="font-mono truncate">{item.bankAccount}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => copyTextToClipboard(item.bankAccount || '', 'Conta', item.id, 'bank_account', e)}
                              className="p-0.5 rounded text-slate-400 hover:text-emerald-600 shrink-0"
                              title="Copiar Conta"
                            >
                              {copiedActionMap[`${item.id}_bank_account`] === 'copied' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </button>
                          </div>
                        )}

                        {item.pixKey && (
                          <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-[11px]">
                            <div className="truncate flex items-center gap-1">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[10px]">PIX:</span>
                              <span className="font-mono truncate">{item.pixKey}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => copyTextToClipboard(item.pixKey || '', 'Chave PIX', item.id, 'pix_key', e)}
                              className="p-0.5 rounded text-slate-400 hover:text-emerald-600 shrink-0"
                              title="Copiar Chave PIX"
                            >
                              {copiedActionMap[`${item.id}_pix_key`] === 'copied' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </button>
                          </div>
                        )}

                        {item.transactionPassword && (
                          <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-[11px] col-span-full">
                            <div className="truncate flex items-center gap-1.5">
                              <Lock size={12} className="text-emerald-500 shrink-0" />
                              <span className="font-bold text-slate-500 dark:text-zinc-400 text-[10px]">SENHA DE TRANSAÇÃO:</span>
                              <span className="font-mono truncate">
                                {revealedIds[`${item.id}_tx`] ? item.transactionPassword : '••••••••'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRevealedIds(prev => ({ ...prev, [`${item.id}_tx`]: !prev[`${item.id}_tx`] }));
                                }}
                                className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
                                title={revealedIds[`${item.id}_tx`] ? "Ocultar" : "Revelar"}
                              >
                                {revealedIds[`${item.id}_tx`] ? <EyeOff size={11} /> : <Eye size={11} />}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => copyTextToClipboard(item.transactionPassword || '', 'Senha de Transação', item.id, 'tx_password', e)}
                                className="p-0.5 rounded text-slate-400 hover:text-emerald-600"
                                title="Copiar Senha de Transação"
                              >
                                {copiedActionMap[`${item.id}_tx_password`] === 'copied' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Specific Fields: Credit Card */}
                    {item.type === 'credit_card' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {item.cardBrand && (
                          <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-[11px]">
                            <div className="truncate flex items-center gap-1">
                              <CreditCard size={12} className="text-indigo-500 shrink-0" />
                              <span className="font-bold text-slate-500 dark:text-zinc-400 text-[10px]">BANDEIRA:</span>
                              <span className="font-mono truncate">{item.cardBrand}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => copyTextToClipboard(item.cardBrand || '', 'Bandeira', item.id, 'card_brand', e)}
                              className="p-0.5 rounded text-slate-400 hover:text-indigo-600 shrink-0"
                              title="Copiar Bandeira"
                            >
                              {copiedActionMap[`${item.id}_card_brand`] === 'copied' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </button>
                          </div>
                        )}

                        {item.cardNumber && (
                          <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-[11px]">
                            <div className="truncate flex items-center gap-1">
                              <span className="font-bold text-slate-500 dark:text-zinc-400 text-[10px]">CARTÃO:</span>
                              <span className="font-mono truncate">{item.cardNumber}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => copyTextToClipboard(item.cardNumber || '', 'Número do Cartão', item.id, 'card_number', e)}
                              className="p-0.5 rounded text-slate-400 hover:text-indigo-600 shrink-0"
                              title="Copiar Número do Cartão"
                            >
                              {copiedActionMap[`${item.id}_card_number`] === 'copied' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </button>
                          </div>
                        )}

                        {item.cardExpiry && (
                          <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-[11px]">
                            <div className="truncate flex items-center gap-1">
                              <span className="font-bold text-slate-500 dark:text-zinc-400 text-[10px]">VALIDADE / CVV:</span>
                              <span className="font-mono truncate">{item.cardExpiry} {item.cardCvv ? `(CVV: ${item.cardCvv})` : ''}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => copyTextToClipboard(`${item.cardExpiry || ''} ${item.cardCvv ? `CVV: ${item.cardCvv}` : ''}`, 'Validade e CVV', item.id, 'card_expiry', e)}
                              className="p-0.5 rounded text-slate-400 hover:text-indigo-600 shrink-0"
                              title="Copiar Validade & CVV"
                            >
                              {copiedActionMap[`${item.id}_card_expiry`] === 'copied' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </button>
                          </div>
                        )}

                        {item.cardDueDay && (
                          <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-[11px]">
                            <div className="truncate flex items-center gap-1">
                              <span className="font-bold text-slate-500 dark:text-zinc-400 text-[10px]">VENCIMENTO:</span>
                              <span className="font-mono truncate">Dia {item.cardDueDay}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => copyTextToClipboard(item.cardDueDay || '', 'Vencimento', item.id, 'card_due', e)}
                              className="p-0.5 rounded text-slate-400 hover:text-indigo-600 shrink-0"
                              title="Copiar Dia de Vencimento"
                            >
                              {copiedActionMap[`${item.id}_card_due`] === 'copied' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Specific Fields: Azure Graph / OAuth */}
                    {(item.type === 'azure_graph' || item.type === 'oauth_api') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {item.clientId && (
                          <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-[11px]">
                            <div className="truncate flex items-center gap-1">
                              <span className="font-bold text-slate-500 dark:text-zinc-400 text-[10px]">CLIENT ID:</span>
                              <span className="font-mono truncate">{item.clientId}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => copyTextToClipboard(item.clientId || '', 'Client ID', item.id, 'client_id', e)}
                              className="p-0.5 rounded text-slate-400 hover:text-indigo-600 shrink-0"
                              title="Copiar Client ID"
                            >
                              {copiedActionMap[`${item.id}_client_id`] === 'copied' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </button>
                          </div>
                        )}

                        {item.tenantId && (
                          <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-[11px]">
                            <div className="truncate flex items-center gap-1">
                              <span className="font-bold text-slate-500 dark:text-zinc-400 text-[10px]">TENANT ID:</span>
                              <span className="font-mono truncate">{item.tenantId}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => copyTextToClipboard(item.tenantId || '', 'Tenant ID', item.id, 'tenant_id', e)}
                              className="p-0.5 rounded text-slate-400 hover:text-indigo-600 shrink-0"
                              title="Copiar Tenant ID"
                            >
                              {copiedActionMap[`${item.id}_tenant_id`] === 'copied' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </button>
                          </div>
                        )}

                        {item.objectId && (
                          <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-[11px]">
                            <div className="truncate flex items-center gap-1">
                              <span className="font-bold text-slate-500 dark:text-zinc-400 text-[10px]">OBJECT ID:</span>
                              <span className="font-mono truncate">{item.objectId}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => copyTextToClipboard(item.objectId || '', 'Object ID', item.id, 'object_id', e)}
                              className="p-0.5 rounded text-slate-400 hover:text-indigo-600 shrink-0"
                              title="Copiar Object ID"
                            >
                              {copiedActionMap[`${item.id}_object_id`] === 'copied' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </button>
                          </div>
                        )}

                        {item.redirectUri && (
                          <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-[11px]">
                            <div className="truncate flex items-center gap-1">
                              <span className="font-bold text-slate-500 dark:text-zinc-400 text-[10px]">REDIRECT:</span>
                              <span className="font-mono truncate">{item.redirectUri}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => copyTextToClipboard(item.redirectUri || '', 'Redirect URI', item.id, 'redirect_uri', e)}
                              className="p-0.5 rounded text-slate-400 hover:text-indigo-600 shrink-0"
                              title="Copiar Redirect URI"
                            >
                              {copiedActionMap[`${item.id}_redirect_uri`] === 'copied' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Specific Fields: Database Connection */}
                    {item.type === 'db_connection' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {item.dbHost && (
                          <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-[11px]">
                            <div className="truncate flex items-center gap-1">
                              <span className="font-bold text-slate-500 dark:text-zinc-400 text-[10px]">HOST:</span>
                              <span className="font-mono truncate">{item.dbHost}{item.dbPort ? `:${item.dbPort}` : ''}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => copyTextToClipboard(item.dbHost || '', 'Host', item.id, 'db_host', e)}
                              className="p-0.5 rounded text-slate-400 hover:text-emerald-600 shrink-0"
                              title="Copiar Host"
                            >
                              {copiedActionMap[`${item.id}_db_host`] === 'copied' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </button>
                          </div>
                        )}

                        {item.dbName && (
                          <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-[11px]">
                            <div className="truncate flex items-center gap-1">
                              <span className="font-bold text-slate-500 dark:text-zinc-400 text-[10px]">DATABASE:</span>
                              <span className="font-mono truncate">{item.dbName}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => copyTextToClipboard(item.dbName || '', 'Banco de Dados', item.id, 'db_name', e)}
                              className="p-0.5 rounded text-slate-400 hover:text-emerald-600 shrink-0"
                              title="Copiar Nome do Banco"
                            >
                              {copiedActionMap[`${item.id}_db_name`] === 'copied' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Username / Login (if provided for standard login / ssh / db) */}
                    {(item.username || item.dbUser) && (
                      <div className="flex items-center justify-between gap-2 px-2.5 py-1 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0 text-slate-700 dark:text-zinc-200 truncate">
                          <User size={12} className="text-indigo-500 shrink-0" />
                          <span className="text-slate-400 dark:text-zinc-500 font-medium shrink-0">Usuário:</span>
                          <span className="font-mono font-medium truncate select-all">{item.username || item.dbUser}</span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => copyTextToClipboard(item.username || item.dbUser || '', 'Usuário', item.id, 'username', e)}
                          className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-700 shrink-0"
                          title="Copiar usuário"
                        >
                          {copiedActionMap[`${item.id}_username`] === 'copied' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                        </button>
                      </div>
                    )}

                    {/* Password / Secret / Key Bar */}
                    <div className="flex items-center gap-1 bg-slate-900 dark:bg-black rounded-md px-2.5 py-1.5 text-slate-200 font-mono text-xs shadow-inner">
                      <div className="flex items-center gap-1.5 shrink-0 text-slate-400 text-[10px] select-none font-sans font-semibold">
                        <KeyRound size={11} className="text-amber-400" />
                        <span>
                          {item.type === 'azure_graph' || item.type === 'oauth_api' ? 'Secret:' : item.type === 'api_token' ? 'Token:' : 'Senha:'}
                        </span>
                      </div>

                      <div className="flex-1 overflow-hidden select-all font-mono px-1">
                        {isRevealed ? (
                          <span className="text-emerald-400 break-all select-all font-medium">{item.clientSecret || item.value}</span>
                        ) : (
                          <span className="text-slate-400 tracking-widest select-none">
                            {'•'.repeat(Math.min(24, Math.max(10, (item.clientSecret || item.value || '').length)))}
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
                        onClick={(e) => copyTextToClipboard(item.clientSecret || item.value || '', 'Senha/Segredo', item.id, 'value', e)}
                        className={`px-1.5 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 shrink-0 transition-colors ${
                          copiedActionMap[`${item.id}_value`] === 'copied'
                            ? 'bg-emerald-600 text-white font-bold' 
                            : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                        title="Copiar valor secreto"
                      >
                        {copiedActionMap[`${item.id}_value`] === 'copied' ? <Check size={11} /> : <Copy size={11} />}
                        <span>{copiedActionMap[`${item.id}_value`] === 'copied' ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>

                    {/* Custom dynamic fields */}
                    {item.customFields && item.customFields.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-zinc-800">
                        {item.customFields.map((cf) => (
                          <div key={cf.id} className="flex items-center justify-between gap-1.5 px-2 py-0.5 rounded bg-slate-50 dark:bg-zinc-800/40 text-[11px]">
                            <div className="truncate flex items-center gap-1">
                              <span className="font-bold text-slate-500 dark:text-zinc-400 text-[10px] uppercase">{cf.name}:</span>
                              <span className="font-mono truncate">{cf.value}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => copyTextToClipboard(cf.value, cf.name, item.id, cf.id, e)}
                              className="p-0.5 rounded text-slate-400 hover:text-indigo-600 shrink-0"
                              title={`Copiar ${cf.name}`}
                            >
                              {copiedActionMap[`${item.id}_${cf.id}`] === 'copied' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

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

      {/* Add / Edit Secret Dialog - DYNAMIC FORM */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800">
          <DialogHeader className="p-4 pb-3 border-b bg-slate-50/60 dark:bg-zinc-950/60">
            <DialogTitle className="flex items-center gap-2 text-base text-slate-800 dark:text-zinc-100 font-bold">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <KeyRound size={16} />
              </div>
              <span>{editingItem ? 'Editar Credencial' : 'Adicionar Credencial'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveItem} className="flex-1 overflow-y-auto p-4 space-y-3.5">
            
            {/* Tipo de Credencial & Ambiente */}
            <div className="grid grid-cols-2 gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-200 block mb-1">
                  Tipo de Credencial
                </label>
                <Select value={formType} onValueChange={(val) => setFormType(val as SecretType)}>
                  <SelectTrigger className="text-xs h-8 bg-white dark:bg-zinc-900">
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
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-200 block mb-1">
                  Ambiente
                </label>
                <Select value={formEnv} onValueChange={(val) => setFormEnv(val as SecretEnv)}>
                  <SelectTrigger className="text-xs h-8 bg-white dark:bg-zinc-900">
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

            {/* Serviço / Nome da Chave */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                Serviço / Nome da Chave <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder={
                  formType === 'azure_graph' ? 'Ex: Microsoft Graph API / Azure App'
                  : formType === 'oauth_api' ? 'Ex: Google OAuth / Stripe API'
                  : formType === 'db_connection' ? 'Ex: Banco Postgres Produção / MySQL'
                  : formType === 'api_token' ? 'Ex: OpenAI API Key / SendGrid'
                  : formType === 'ssh_key' ? 'Ex: Servidor AWS EC2 / VPS'
                  : formType === 'env_var' ? 'Ex: DATABASE_URL / NEXT_PUBLIC_API'
                  : 'Ex: GitHub, Painel Admin, Netflix, E-mail'
                }
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                className="text-xs h-8"
                autoFocus
                required
              />
            </div>

            {/* Link / URL do Serviço */}
            {formType !== 'env_var' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5 mb-1">
                  <Globe size={13} className="text-sky-500" />
                  <span>Link / URL de Acesso (Opcional)</span>
                </label>
                <Input
                  type="text"
                  placeholder="Ex: https://portal.azure.com ou https://app.servico.com/login"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            )}

            {/* CASO 1: SENHA (Usuário e Senha tradicional) */}
            {formType === 'password' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5 mb-1">
                    <User size={13} className="text-indigo-500" />
                    <span>Nome de Usuário / E-mail / Login</span>
                  </label>
                  <Input
                    placeholder="Ex: admin@empresa.com, dev_user, root"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
                      <Lock size={13} className="text-amber-500" />
                      <span>Senha <span className="text-rose-500">*</span></span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateRandomPass}
                        className="text-[11px] text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1"
                        title="Gerar senha segura"
                      >
                        <RefreshCw size={11} /> Gerar
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDialogPassword(!showDialogPassword)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1"
                      >
                        {showDialogPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                        <span>{showDialogPassword ? 'Ocultar' : 'Visualizar'}</span>
                      </button>
                    </div>
                  </div>
                  <Input
                    type={showDialogPassword ? 'text' : 'password'}
                    placeholder="Ex: SuaSenhaForte@2026"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="font-mono text-xs h-8"
                    required
                  />
                </div>
              </>
            )}

            {/* CASO 2: MICROSOFT GRAPH / AZURE AD */}
            {formType === 'azure_graph' && (
              <div className="space-y-2.5 p-3 rounded-lg border bg-slate-50/50 dark:bg-zinc-950/50">
                <div className="text-[11px] font-bold uppercase text-sky-600 dark:text-sky-400 flex items-center gap-1">
                  <Cloud size={13} /> Parâmetros Microsoft Graph / Azure
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                    CLIENT ID (ID do Aplicativo) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="Ex: 00000000-0000-0000-0000-000000000000"
                    value={formClientId}
                    onChange={(e) => setFormClientId(e.target.value)}
                    className="font-mono text-xs h-8"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block">
                      CLIENT SECRET (Valor do Segredo) <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDialogPassword(!showDialogPassword)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 flex items-center gap-1"
                    >
                      {showDialogPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{showDialogPassword ? 'Ocultar' : 'Visualizar'}</span>
                    </button>
                  </div>
                  <Input
                    type={showDialogPassword ? 'text' : 'password'}
                    placeholder="Ex: ~xxxxxxxxxxxxxxxxxxxxxxxx"
                    value={formClientSecret || formValue}
                    onChange={(e) => {
                      setFormClientSecret(e.target.value);
                      setFormValue(e.target.value);
                    }}
                    className="font-mono text-xs h-8"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                      TENANT ID (ID do Diretório)
                    </label>
                    <Input
                      placeholder="Ex: 11111111-1111-1111-1111-111111111111"
                      value={formTenantId}
                      onChange={(e) => setFormTenantId(e.target.value)}
                      className="font-mono text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                      OBJECT ID (ID do Objeto)
                    </label>
                    <Input
                      placeholder="Ex: 22222222-2222-2222-2222-222222222222"
                      value={formObjectId}
                      onChange={(e) => setFormObjectId(e.target.value)}
                      className="font-mono text-xs h-8"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CASO 3: OAUTH 2.0 / API REST */}
            {formType === 'oauth_api' && (
              <div className="space-y-2.5 p-3 rounded-lg border bg-slate-50/50 dark:bg-zinc-950/50">
                <div className="text-[11px] font-bold uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Code2 size={13} /> Parâmetros OAuth 2.0 / API
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                    CLIENT ID <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="Ex: 123456789.apps.googleusercontent.com"
                    value={formClientId}
                    onChange={(e) => setFormClientId(e.target.value)}
                    className="font-mono text-xs h-8"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block">
                      CLIENT SECRET <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDialogPassword(!showDialogPassword)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 flex items-center gap-1"
                    >
                      {showDialogPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{showDialogPassword ? 'Ocultar' : 'Visualizar'}</span>
                    </button>
                  </div>
                  <Input
                    type={showDialogPassword ? 'text' : 'password'}
                    placeholder="Ex: GOCSPX-xxxxxxxxxxxxxxxxxxxx"
                    value={formClientSecret || formValue}
                    onChange={(e) => {
                      setFormClientSecret(e.target.value);
                      setFormValue(e.target.value);
                    }}
                    className="font-mono text-xs h-8"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                    REDIRECT URI (URL de Callback)
                  </label>
                  <Input
                    placeholder="Ex: https://meusite.com/api/auth/callback"
                    value={formRedirectUri}
                    onChange={(e) => setFormRedirectUri(e.target.value)}
                    className="font-mono text-xs h-8"
                  />
                </div>
              </div>
            )}

            {/* CASO 4: BANCO DE DADOS (DB CONNECTION) */}
            {formType === 'db_connection' && (
              <div className="space-y-2.5 p-3 rounded-lg border bg-slate-50/50 dark:bg-zinc-950/50">
                <div className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <DatabaseIcon size={13} /> Conexão de Banco de Dados
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                      Host / Servidor
                    </label>
                    <Input
                      placeholder="Ex: db.empresa.com ou 127.0.0.1"
                      value={formDbHost}
                      onChange={(e) => setFormDbHost(e.target.value)}
                      className="font-mono text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                      Porta
                    </label>
                    <Input
                      placeholder="5432 / 3306"
                      value={formDbPort}
                      onChange={(e) => setFormDbPort(e.target.value)}
                      className="font-mono text-xs h-8"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                      Database Name
                    </label>
                    <Input
                      placeholder="Ex: postgres / producao"
                      value={formDbName}
                      onChange={(e) => setFormDbName(e.target.value)}
                      className="font-mono text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                      DB User (Usuário)
                    </label>
                    <Input
                      placeholder="Ex: postgres / admin"
                      value={formDbUser}
                      onChange={(e) => setFormDbUser(e.target.value)}
                      className="font-mono text-xs h-8"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block">
                      DB Password (Senha) <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDialogPassword(!showDialogPassword)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 flex items-center gap-1"
                    >
                      {showDialogPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{showDialogPassword ? 'Ocultar' : 'Visualizar'}</span>
                    </button>
                  </div>
                  <Input
                    type={showDialogPassword ? 'text' : 'password'}
                    placeholder="Senha de acesso ao banco"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="font-mono text-xs h-8"
                    required
                  />
                </div>
              </div>
            )}

            {/* CASO 5: CHAVE SSH / SERVIDOR */}
            {formType === 'ssh_key' && (
              <div className="space-y-2.5 p-3 rounded-lg border bg-slate-50/50 dark:bg-zinc-950/50">
                <div className="text-[11px] font-bold uppercase text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                  <Server size={13} /> Acesso SSH / Servidor
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                      Usuário SSH
                    </label>
                    <Input
                      placeholder="Ex: root / ubuntu / ec2-user"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      className="font-mono text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                      Porta SSH
                    </label>
                    <Input
                      placeholder="Ex: 22"
                      value={formDbPort}
                      onChange={(e) => setFormDbPort(e.target.value)}
                      className="font-mono text-xs h-8"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block">
                      Senha / Passphrase / Chave <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDialogPassword(!showDialogPassword)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 flex items-center gap-1"
                    >
                      {showDialogPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{showDialogPassword ? 'Ocultar' : 'Visualizar'}</span>
                    </button>
                  </div>
                  <Input
                    type={showDialogPassword ? 'text' : 'password'}
                    placeholder="Chave ou senha de autenticação"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="font-mono text-xs h-8"
                    required
                  />
                </div>
              </div>
            )}

            {/* CASO: CONTA BANCÁRIA & PIX */}
            {formType === 'bank' && (
              <div className="space-y-2.5 p-3 rounded-lg border bg-slate-50/50 dark:bg-zinc-950/50">
                <div className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Landmark size={13} /> Dados da Conta Bancária & PIX
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                      Banco / Instituição <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      placeholder="Ex: Nubank, Itaú, Bradesco"
                      value={formBankName}
                      onChange={(e) => setFormBankName(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                      Tipo de Conta
                    </label>
                    <Input
                      placeholder="Ex: Corrente, Poupança, PJ"
                      value={formBankAccountType}
                      onChange={(e) => setFormBankAccountType(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                      Agência
                    </label>
                    <Input
                      placeholder="Ex: 0001"
                      value={formBankAgency}
                      onChange={(e) => setFormBankAgency(e.target.value)}
                      className="font-mono text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                      Número da Conta
                    </label>
                    <Input
                      placeholder="Ex: 12345-6"
                      value={formBankAccount}
                      onChange={(e) => setFormBankAccount(e.target.value)}
                      className="font-mono text-xs h-8"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                    Chave PIX Principal
                  </label>
                  <Input
                    placeholder="Ex: seu-email@gmail.com, CPF ou CNPJ"
                    value={formPixKey}
                    onChange={(e) => setFormPixKey(e.target.value)}
                    className="font-mono text-xs h-8"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block">
                      Senha do App / Login <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDialogPassword(!showDialogPassword)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 flex items-center gap-1"
                    >
                      {showDialogPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{showDialogPassword ? 'Ocultar' : 'Visualizar'}</span>
                    </button>
                  </div>
                  <Input
                    type={showDialogPassword ? 'text' : 'password'}
                    placeholder="Senha de acesso ao aplicativo do banco"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="font-mono text-xs h-8"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                    Senha de Transação / PIN (PIX/TED)
                  </label>
                  <Input
                    type={showDialogPassword ? 'text' : 'password'}
                    placeholder="PIN de 4/6 dígitos ou senha de confirmação de TED/PIX"
                    value={formTransactionPassword}
                    onChange={(e) => setFormTransactionPassword(e.target.value)}
                    className="font-mono text-xs h-8"
                  />
                </div>
              </div>
            )}

            {/* CASO: CARTÃO DE CRÉDITO */}
            {formType === 'credit_card' && (
              <div className="space-y-2.5 p-3 rounded-lg border bg-slate-50/50 dark:bg-zinc-950/50">
                <div className="text-[11px] font-bold uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <CreditCard size={13} /> Dados do Cartão de Crédito
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                      Bandeira / Emissor <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      placeholder="Ex: Visa Infinite, Mastercard Black"
                      value={formCardBrand}
                      onChange={(e) => setFormCardBrand(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                      Nome no Cartão
                    </label>
                    <Input
                      placeholder="Ex: JOAO A SILVA"
                      value={formCardholderName}
                      onChange={(e) => setFormCardholderName(e.target.value.toUpperCase())}
                      className="text-xs h-8 uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                    Número do Cartão <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="Ex: 4532 •••• •••• 8890"
                    value={formCardNumber}
                    onChange={(e) => setFormCardNumber(e.target.value)}
                    className="font-mono text-xs h-8"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                      Validade
                    </label>
                    <Input
                      placeholder="MM/AA"
                      value={formCardExpiry}
                      onChange={(e) => setFormCardExpiry(e.target.value)}
                      className="font-mono text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                      CVV
                    </label>
                    <Input
                      placeholder="123"
                      value={formCardCvv}
                      onChange={(e) => setFormCardCvv(e.target.value)}
                      className="font-mono text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block mb-1">
                      Venc. Fatura
                    </label>
                    <Input
                      placeholder="Dia 10"
                      value={formCardDueDay}
                      onChange={(e) => setFormCardDueDay(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block">
                      Senha do Cartão / PIN <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDialogPassword(!showDialogPassword)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 flex items-center gap-1"
                    >
                      {showDialogPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{showDialogPassword ? 'Ocultar' : 'Visualizar'}</span>
                    </button>
                  </div>
                  <Input
                    type={showDialogPassword ? 'text' : 'password'}
                    placeholder="Senha numérica do cartão"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="font-mono text-xs h-8"
                    required
                  />
                </div>
              </div>
            )}

            {/* CASO 6: TOKEN DE API, JWT, WEBHOOK, ENV VAR, CUSTOM */}
            {formType !== 'password' && formType !== 'azure_graph' && formType !== 'oauth_api' && formType !== 'db_connection' && formType !== 'ssh_key' && formType !== 'bank' && formType !== 'credit_card' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
                    <KeyRound size={13} className="text-amber-500" />
                    <span>
                      {formType === 'api_token' ? 'Token de API / Chave Secreta' : formType === 'env_var' ? 'Valor da Variável' : 'Valor Secreto'} <span className="text-rose-500">*</span>
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDialogPassword(!showDialogPassword)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 flex items-center gap-1"
                  >
                    {showDialogPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                    <span>{showDialogPassword ? 'Ocultar' : 'Visualizar'}</span>
                  </button>
                </div>
                <Input
                  type={showDialogPassword ? 'text' : 'password'}
                  placeholder="Ex: sk-proj-xxxxxxxx ou Bearer eyJhbGci..."
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="font-mono text-xs h-8"
                  required
                />
              </div>
            )}

            {/* Campos Customizados Dinâmicos Extras */}
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Campos Personalizados Extras
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomField}
                  className="h-6 text-[11px] px-2 gap-1"
                >
                  <Plus size={11} /> Campo
                </Button>
              </div>

              {formCustomFields.map((cf) => (
                <div key={cf.id} className="flex items-center gap-1.5 p-1.5 rounded-lg border bg-slate-50/50 dark:bg-zinc-950/50">
                  <Input
                    placeholder="Nome (ex: REGION, PORT)"
                    value={cf.name}
                    onChange={(e) => handleUpdateCustomField(cf.id, { name: e.target.value })}
                    className="h-7 text-xs uppercase font-bold w-1/3 bg-white dark:bg-zinc-900"
                  />
                  <Input
                    placeholder="Valor do campo"
                    value={cf.value}
                    onChange={(e) => handleUpdateCustomField(cf.id, { value: e.target.value })}
                    className="h-7 text-xs font-mono flex-1 bg-white dark:bg-zinc-900"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCustomField(cf.id)}
                    className="h-7 w-7 text-slate-400 hover:text-rose-500 shrink-0"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}
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
                className="text-xs h-8"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setIsDialogOpen(false)}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                size="sm" 
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1 text-xs font-medium h-8"
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
