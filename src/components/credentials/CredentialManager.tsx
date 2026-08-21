import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useLinkStore } from '@/lib/store/linkStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Eye, 
  EyeOff, 
  Copy, 
  RefreshCw, 
  Key, 
  Lock, 
  Plus, 
  Trash2, 
  Layers, 
  Sparkles,
  Server,
  Cloud,
  Code2,
  Database as DatabaseIcon,
  ShieldCheck,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { Credencial, CustomCredentialField, CredentialType } from '@/types/supabase';
import { generatePassword, calculatePasswordStrength, getStrengthLabel } from '@/lib/utils/passwordUtils';

interface CredentialManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkId: string | null;
  linkTitle: string;
  linkUrl: string;
}

interface CredentialTypeConfig {
  id: CredentialType;
  label: string;
  description: string;
  icon: React.ElementType;
  defaultFields: { name: string; type: 'text' | 'password'; placeholder?: string; hint?: string }[];
}

export const CREDENTIAL_TYPE_CONFIGS: CredentialTypeConfig[] = [
  {
    id: 'login',
    label: 'Usuário & Senha',
    description: 'Acesso convencional de contas, portais web e painéis administrativos.',
    icon: Lock,
    defaultFields: [] // Usa os campos fixos de Usuário e Senha nativos
  },
  {
    id: 'graph_azure',
    label: 'Microsoft Graph / Azure AD',
    description: 'Credenciais de aplicativo Azure App Registration / Microsoft Entra ID.',
    icon: Cloud,
    defaultFields: [
      { name: 'CLIENT ID (App ID)', type: 'text', placeholder: 'ex: 00000000-0000-0000-0000-000000000000', hint: 'ID do Aplicativo (Cliente)' },
      { name: 'CLIENT SECRET (Segredo)', type: 'password', placeholder: 'ex: ~xxxxxxxxxxxxxxxxxxxxxxxx', hint: 'Valor do segredo gerado no Azure' },
      { name: 'TENANT ID (ID do Diretório)', type: 'text', placeholder: 'ex: 11111111-1111-1111-1111-111111111111', hint: 'ID do Locatário do Azure AD' },
      { name: 'OBJECT ID (ID do Objeto)', type: 'text', placeholder: 'ex: 22222222-2222-2222-2222-222222222222', hint: 'ID do Objeto registrado' }
    ]
  },
  {
    id: 'oauth_api',
    label: 'OAuth 2.0 / API Rest',
    description: 'Integrações de serviços Web, Google Cloud, GitHub, Stripe, Mercado Pago, etc.',
    icon: Code2,
    defaultFields: [
      { name: 'CLIENT_ID', type: 'text', placeholder: 'ex: 123456789.apps.googleusercontent.com' },
      { name: 'CLIENT_SECRET', type: 'password', placeholder: 'ex: GOCSPX-xxxxxxxxxxxxxxxxxxxx' },
      { name: 'API_KEY', type: 'password', placeholder: 'ex: sk_live_xxxxxxxxxxxxxxxxxxxx' },
      { name: 'REDIRECT_URI', type: 'text', placeholder: 'ex: https://meusite.com/api/callback' }
    ]
  },
  {
    id: 'api_key',
    label: 'Chave de API / Token Simples',
    description: 'Chaves de autenticação Bearer, tokens de acesso pessoal ou webhooks.',
    icon: Key,
    defaultFields: [
      { name: 'API_KEY / TOKEN', type: 'password', placeholder: 'ex: ghp_xxxxxxxxxxxxxxxxxxxx ou Bearer token' },
      { name: 'ENDPOINT / BASE_URL', type: 'text', placeholder: 'ex: https://api.exemplo.com/v1' },
      { name: 'HEADER_NAME', type: 'text', placeholder: 'ex: X-API-Key ou Authorization' }
    ]
  },
  {
    id: 'database',
    label: 'Banco de Dados (DB)',
    description: 'Conexões PostgreSQL, MySQL, SQL Server, MongoDB, Redis, etc.',
    icon: DatabaseIcon,
    defaultFields: [
      { name: 'HOST / SERVIDOR', type: 'text', placeholder: 'ex: db.projeto.supabase.co ou 192.168.1.10' },
      { name: 'PORTA', type: 'text', placeholder: 'ex: 5432 / 3306 / 27017' },
      { name: 'DATABASE_NAME', type: 'text', placeholder: 'ex: postgres ou producao_db' },
      { name: 'DB_USER', type: 'text', placeholder: 'ex: postgres ou db_admin' },
      { name: 'DB_PASSWORD', type: 'password', placeholder: 'Senha de acesso ao banco de dados' }
    ]
  },
  {
    id: 'aws_cloud',
    label: 'AWS / Cloud IAM',
    description: 'Credenciais de infraestrutura de nuvem, AWS IAM, GCP Service Account ou OCI.',
    icon: Server,
    defaultFields: [
      { name: 'ACCESS_KEY_ID', type: 'text', placeholder: 'ex: AKIAIOSFODNN7EXAMPLE' },
      { name: 'SECRET_ACCESS_KEY', type: 'password', placeholder: 'ex: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
      { name: 'REGION', type: 'text', placeholder: 'ex: us-east-1 ou sa-east-1' },
      { name: 'ROLE_ARN / BUCKET', type: 'text', placeholder: 'ex: arn:aws:iam::123456789012:role/MinhaRole' }
    ]
  },
  {
    id: 'custom',
    label: 'Personalizado',
    description: 'Crie e configure livremente os campos que sua aplicação necessita.',
    icon: Layers,
    defaultFields: []
  }
];

export function CredentialManager({ 
  open, 
  onOpenChange, 
  linkId, 
  linkTitle,
  linkUrl 
}: CredentialManagerProps) {
  const { user } = useAuthStore();
  const { 
    addCredencial, 
    updateCredencial,
    deleteCredencial,
    getCredencialByLinkId
  } = useLinkStore();
  
  const [credentialType, setCredentialType] = useState<CredentialType>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [customFields, setCustomFields] = useState<CustomCredentialField[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [visibleFieldIds, setVisibleFieldIds] = useState<Record<string, boolean>>({});
  const [credentialId, setCredentialId] = useState<string | null>(null);
  
  // Password generator options
  const [passwordLength, setPasswordLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [activeTab, setActiveTab] = useState('credentials');
  const [isSaving, setIsSaving] = useState(false);
  
  const loadCredential = useCallback(() => {
    if (!linkId) return;
    
    const credential = getCredencialByLinkId(linkId);
    
    if (credential) {
      // Determinar o tipo de credencial
      let detectedType: CredentialType = (credential.credential_type as CredentialType) || 'login';
      
      // Detecção automática inteligente baseada nos campos existentes se não estiver salvo
      if (!credential.credential_type && credential.custom_fields && credential.custom_fields.length > 0) {
        const fieldNames = credential.custom_fields.map(f => f.name.toUpperCase());
        if (fieldNames.some(n => n.includes('CLIENT ID') || n.includes('GRAPH') || n.includes('TENANT') || n.includes('OBJECT ID'))) {
          detectedType = 'graph_azure';
        } else if (fieldNames.some(n => n.includes('OAUTH') || n.includes('CLIENT_ID') || n.includes('REDIRECT_URI'))) {
          detectedType = 'oauth_api';
        } else if (fieldNames.some(n => n.includes('HOST') || n.includes('DATABASE') || n.includes('PORTA'))) {
          detectedType = 'database';
        } else if (fieldNames.some(n => n.includes('ACCESS_KEY') || n.includes('AWS'))) {
          detectedType = 'aws_cloud';
        } else if (fieldNames.some(n => n.includes('API_KEY') || n.includes('TOKEN') || n.includes('ENDPOINT'))) {
          detectedType = 'api_key';
        } else {
          detectedType = 'custom';
        }
      }

      setCredentialType(detectedType);
      setUsername(credential.username || '');
      setPassword(credential.password || '');
      setNotes(credential.notes || '');
      setCustomFields(credential.custom_fields || []);
      setCredentialId(credential.id);
    } else {
      resetForm();
    }
    
    calculateCurrentPasswordStrength();
  }, [linkId, getCredencialByLinkId]);
  
  // Load existing credential when dialog opens
  useEffect(() => {
    if (open && linkId) {
      loadCredential();
    } else if (!open) {
      resetForm();
    }
  }, [open, linkId, loadCredential]);
  
  // Recalculate password strength when password changes
  useEffect(() => {
    calculateCurrentPasswordStrength();
  }, [password]);
  
  const calculateCurrentPasswordStrength = () => {
    if (password) {
      const strength = calculatePasswordStrength(password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(0);
    }
  };
  
  const resetForm = () => {
    setCredentialType('login');
    setUsername('');
    setPassword('');
    setNotes('');
    setCustomFields([]);
    setShowPassword(false);
    setVisibleFieldIds({});
    setCredentialId(null);
    setPasswordStrength(0);
  };
  
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado!`);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Não foi possível copiar para a área de transferência');
    }
  };
  
  const handleGeneratePassword = () => {
    const newPassword = generatePassword(passwordLength, {
      uppercase: includeUppercase,
      lowercase: includeLowercase,
      numbers: includeNumbers,
      symbols: includeSymbols
    });
    
    setPassword(newPassword);
    setShowPassword(true);
    toast.success('Nova senha gerada!');
  };

  // Troca dinâmica de tipo de credencial
  const handleSelectCredentialType = (type: CredentialType) => {
    if (type === credentialType) return;
    
    setCredentialType(type);
    const config = CREDENTIAL_TYPE_CONFIGS.find(c => c.id === type);
    
    if (!config) return;

    if (type === 'login') {
      // Se for apenas login, não precisa dos campos de API/Graph por padrão
      // Mantém os campos customizados que o usuário já tiver preenchido ou limpa vazios
      const filledCustom = customFields.filter(f => f.value.trim() !== '');
      setCustomFields(filledCustom);
    } else if (type === 'custom') {
      // Deixa os campos como estão
    } else {
      // Mesclar ou preencher os campos padrão do tipo selecionado
      const existingFieldsMap = new Map(customFields.map(f => [f.name.toUpperCase().trim(), f]));
      
      const newFieldsList: CustomCredentialField[] = config.defaultFields.map(df => {
        const existing = existingFieldsMap.get(df.name.toUpperCase().trim());
        if (existing) {
          return existing;
        }
        return {
          id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${df.name}`,
          name: df.name,
          value: '',
          type: df.type
        };
      });

      // Adicionar também campos extras já preenchidos que não estavam no template
      customFields.forEach(f => {
        const isInNewList = newFieldsList.some(nf => nf.name.toUpperCase().trim() === f.name.toUpperCase().trim());
        if (!isInNewList && f.value.trim() !== '') {
          newFieldsList.push(f);
        }
      });

      setCustomFields(newFieldsList);
    }

    toast.info(`Tipo alterado para: ${config.label}`);
  };

  // Funções para campos dinâmicos customizados
  const handleAddCustomField = (name = '', type: 'text' | 'password' = 'text', value = '') => {
    const newField: CustomCredentialField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      value,
      type
    };
    setCustomFields(prev => [...prev, newField]);
  };

  const handleUpdateCustomField = (id: string, updates: Partial<CustomCredentialField>) => {
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
  };

  const handleToggleFieldVisibility = (id: string) => {
    setVisibleFieldIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleDeleteCredential = async () => {
    if (!credentialId) return;
    if (confirm('Tem certeza de que deseja excluir todas as credenciais salvas para este link?')) {
      try {
        await deleteCredencial(credentialId);
        onOpenChange(false);
      } catch (err) {
        console.error('Error deleting credential:', err);
      }
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !linkId) return;
    setIsSaving(true);
    
    try {
      // Filtrar campos customizados sem nome
      const cleanCustomFields = customFields.filter(f => f.name.trim() !== '');

      if (credentialId) {
        await updateCredencial(credentialId, {
          credential_type: credentialType,
          username: username.trim() || null,
          password: password || null,
          notes: notes.trim() || null,
          custom_fields: cleanCustomFields
        });
      } else {
        await addCredencial({
          link_id: linkId,
          credential_type: credentialType,
          username: username.trim() || null,
          password: password || null,
          notes: notes.trim() || null,
          custom_fields: cleanCustomFields,
          user_id: user.id
        });
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving credentials:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const strengthLabel = getStrengthLabel(passwordStrength);
  const siteHostname = linkUrl ? (() => {
    try { return new URL(linkUrl).hostname; } catch { return linkUrl; }
  })() : '';
  
  const currentTypeConfig = CREDENTIAL_TYPE_CONFIGS.find(c => c.id === credentialType) || CREDENTIAL_TYPE_CONFIGS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        
        {/* Cabeçalho do Modal */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b bg-zinc-50/70 dark:bg-zinc-900/70">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                <Lock className="w-4 h-4" />
              </div>
              <span>Cofre de Credenciais & Chaves</span>
            </DialogTitle>
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span className="font-semibold text-foreground truncate max-w-[280px]">{linkTitle}</span>
            {siteHostname && <span className="text-[11px] text-zinc-400 truncate">{siteHostname}</span>}
          </div>
        </DialogHeader>
        
        {/* Seletor Dinâmico de Tipo de Credencial */}
        <div className="px-4 sm:px-5 py-3 border-b bg-white dark:bg-zinc-950">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Tipo de Credencial
            </Label>
            <span className="text-[11px] text-muted-foreground font-medium">
              {currentTypeConfig.label}
            </span>
          </div>

          {/* Chips / Pills de seleção de tipo de credencial */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {CREDENTIAL_TYPE_CONFIGS.map((typeConfig) => {
              const Icon = typeConfig.icon;
              const isSelected = credentialType === typeConfig.id;

              return (
                <button
                  key={typeConfig.id}
                  type="button"
                  onClick={() => handleSelectCredentialType(typeConfig.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-zinc-50 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                  title={typeConfig.description}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`} />
                  <span>{typeConfig.label}</span>
                  {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabs de Conteúdo */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 sm:px-5 pt-2.5 border-b bg-zinc-50/40 dark:bg-zinc-900/40">
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="credentials" className="text-xs font-semibold gap-1.5">
                <Key className="w-3.5 h-3.5" /> Campos & Valores
              </TabsTrigger>
              <TabsTrigger value="generator" className="text-xs font-semibold gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Gerador de Senha
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="credentials" className="flex-1 overflow-y-auto p-4 sm:p-5 m-0 space-y-4">
            <form id="credential-form" onSubmit={handleSubmit} className="space-y-4">
              
              {/* CASO 1: Tipo 'login' (Apenas Usuário e Senha) */}
              {credentialType === 'login' && (
                <div className="space-y-3 p-3.5 rounded-xl border bg-white dark:bg-zinc-900 shadow-2xs">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Acesso por Usuário e Senha
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="username" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Nome de Usuário / Email
                      </Label>
                      <div className="flex">
                        <Input 
                          id="username"
                          value={username} 
                          onChange={(e) => setUsername(e.target.value)} 
                          placeholder="admin@empresa.com"
                          className="h-9 text-xs bg-background"
                        />
                        {username && (
                          <Button 
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="ml-1 h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={() => copyToClipboard(username, 'Usuário')}
                            title="Copiar usuário"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Senha
                        </Label>
                        {password && (
                          <span className={`text-[10px] font-semibold ${strengthLabel.color.replace('bg-', 'text-')}`}>
                            {strengthLabel.label}
                          </span>
                        )}
                      </div>
                      <div className="flex">
                        <Input 
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          placeholder="••••••••••••"
                          className="h-9 text-xs font-mono bg-background"
                        />
                        <Button 
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="ml-1 h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                          title={showPassword ? "Ocultar" : "Mostrar"}
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        {password && (
                          <Button 
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={() => copyToClipboard(password, 'Senha')}
                            title="Copiar senha"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CASO 2: Tipos com campos estruturados dinâmicos (Graph, OAuth, DB, AWS, API Key, Custom) */}
              {credentialType !== 'login' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <currentTypeConfig.icon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        {currentTypeConfig.label}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {currentTypeConfig.description}
                      </p>
                    </div>

                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAddCustomField()}
                      className="h-7 text-xs px-2.5 gap-1 font-semibold border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Adicionar Campo</span>
                    </Button>
                  </div>

                  {/* Lista de Campos Específicos do Tipo */}
                  <div className="space-y-2.5">
                    {customFields.map((field, idx) => {
                      const isFieldSecret = field.type === 'password';
                      const isVisible = visibleFieldIds[field.id] || false;

                      return (
                        <div 
                          key={field.id || idx} 
                          className="p-3 rounded-xl border bg-white dark:bg-zinc-900/80 shadow-2xs space-y-2 transition-all hover:border-indigo-300 dark:hover:border-indigo-800"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <Input
                                value={field.name}
                                onChange={(e) => handleUpdateCustomField(field.id, { name: e.target.value })}
                                placeholder="Nome do campo (ex: CLIENT ID, CLIENT SECRET)"
                                className="h-7 text-xs font-bold uppercase tracking-wider bg-zinc-50/50 dark:bg-zinc-950"
                              />
                            </div>
                            
                            <select
                              value={field.type || 'text'}
                              onChange={(e) => handleUpdateCustomField(field.id, { type: e.target.value as 'text' | 'password' })}
                              className="h-7 text-[11px] px-2 rounded-lg border border-input bg-zinc-50 dark:bg-zinc-950 text-foreground font-medium"
                            >
                              <option value="text">Texto</option>
                              <option value="password">Segredo / Senha</option>
                            </select>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveCustomField(field.id)}
                              className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 shrink-0 rounded-lg"
                              title="Remover este campo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Input
                              type={isFieldSecret && !isVisible ? "password" : "text"}
                              value={field.value}
                              onChange={(e) => handleUpdateCustomField(field.id, { value: e.target.value })}
                              placeholder={`Valor do ${field.name || 'campo'}`}
                              className="h-8 text-xs font-mono flex-1 bg-background"
                            />

                            {isFieldSecret && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleFieldVisibility(field.id)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-lg"
                                title={isVisible ? "Ocultar valor" : "Revelar valor"}
                              >
                                {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </Button>
                            )}

                            {field.value && (
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                onClick={() => copyToClipboard(field.value, field.name || 'Valor')}
                                className="h-8 w-8 text-muted-foreground hover:text-indigo-600 shrink-0 rounded-lg"
                                title={`Copiar ${field.name || 'valor'}`}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {customFields.length === 0 && (
                      <div className="p-4 rounded-xl border border-dashed text-center bg-zinc-50/50 dark:bg-zinc-900/50">
                        <p className="text-xs text-muted-foreground mb-2">
                          Nenhum campo cadastrado ainda para este tipo.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddCustomField()}
                          className="h-7 text-xs font-semibold gap-1"
                        >
                          <Plus className="w-3 h-3" /> Adicionar Primeiro Campo
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Notas e Observações Adicionais */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <Label htmlFor="notes" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Notas & Instruções (opcional)
                </Label>
                <Textarea 
                  id="notes"
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anotações internas, escopos concedidos, links de documentação ou recuperação..."
                  rows={2}
                  className="text-xs resize-none bg-background"
                />
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="generator" className="flex-1 overflow-y-auto p-4 sm:p-5 m-0 space-y-4">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-xs font-medium">Tamanho da senha: {passwordLength} caracteres</Label>
                </div>
                <Slider
                  value={[passwordLength]}
                  min={8}
                  max={40}
                  step={1}
                  onValueChange={(value) => setPasswordLength(value[0])}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="uppercase"
                    checked={includeUppercase}
                    onCheckedChange={(checked) => setIncludeUppercase(checked === true)}
                  />
                  <Label htmlFor="uppercase" className="text-xs cursor-pointer">Maiúsculas (A-Z)</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="lowercase"
                    checked={includeLowercase}
                    onCheckedChange={(checked) => setIncludeLowercase(checked === true)}
                  />
                  <Label htmlFor="lowercase" className="text-xs cursor-pointer">Minúsculas (a-z)</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="numbers"
                    checked={includeNumbers}
                    onCheckedChange={(checked) => setIncludeNumbers(checked === true)}
                  />
                  <Label htmlFor="numbers" className="text-xs cursor-pointer">Números (0-9)</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="symbols"
                    checked={includeSymbols}
                    onCheckedChange={(checked) => setIncludeSymbols(checked === true)}
                  />
                  <Label htmlFor="symbols" className="text-xs cursor-pointer">Símbolos (!@#$%&*)</Label>
                </div>
              </div>
              
              <Button 
                type="button"
                onClick={handleGeneratePassword}
                className="w-full h-9 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={!includeLowercase && !includeUppercase && !includeNumbers && !includeSymbols}
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Gerar Senha Segura
              </Button>
              
              {password && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border space-y-2">
                  <Label className="text-xs font-semibold">Senha Gerada</Label>
                  <div className="flex">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      readOnly
                      className="flex-1 font-mono text-xs h-9 bg-background"
                    />
                    <Button 
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="ml-1 h-9 w-9 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button 
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                      onClick={() => copyToClipboard(password, 'Senha')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-muted-foreground">Força da senha:</span>
                    <span className="font-semibold">{strengthLabel.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${strengthLabel.color} transition-all duration-300`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                </div>
              )}
              
              <div>
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full h-9 text-xs font-semibold"
                  onClick={() => {
                    setActiveTab('credentials');
                    toast.success('Senha gerada aplicada às credenciais');
                  }}
                  disabled={!password}
                >
                  <Key className="mr-2 h-3.5 w-3.5" />
                  Usar esta senha nas credenciais
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Rodapé do Modal */}
        <DialogFooter className="p-3.5 sm:p-4 border-t bg-zinc-50/70 dark:bg-zinc-900/70 flex flex-row items-center justify-between sm:justify-between gap-2">
          {credentialId ? (
            <Button 
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs px-2.5 rounded-lg"
              onClick={handleDeleteCredential}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Excluir Tudo
            </Button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <Button 
              type="button"
              variant="outline" 
              size="sm"
              className="text-xs h-8 rounded-lg"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              form="credential-form"
              size="sm"
              disabled={isSaving}
              className="text-xs h-8 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs"
            >
              {isSaving ? 'Salvando...' : 'Salvar Credenciais'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
