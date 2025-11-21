import { useState, useEffect, useCallback } from 'react';
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
import { Eye, EyeOff, Copy, RefreshCw, Key, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Credencial } from '@/types/supabase';
import { generatePassword, calculatePasswordStrength, getStrengthLabel } from '@/lib/utils/passwordUtils';

interface CredentialManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkId: string | null;
  linkTitle: string;
  linkUrl: string;
}

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
    getCredencialByLinkId
  } = useLinkStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [credentialId, setCredentialId] = useState<string | null>(null);
  
  // Password generator options
  const [passwordLength, setPasswordLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [activeTab, setActiveTab] = useState('credentials');
  
  const loadCredential = useCallback(() => {
    if (!linkId) return;
    
    const credential = getCredencialByLinkId(linkId);
    
    if (credential) {
      setUsername(credential.username || '');
      setPassword(credential.password || '');
      setNotes(credential.notes || '');
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
    setUsername('');
    setPassword('');
    setNotes('');
    setShowPassword(false);
    setCredentialId(null);
    setPasswordStrength(0);
  };
  
  const copyToClipboard = async (text: string, type: 'username' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type === 'username' ? 'Usuário' : 'Senha'} copiado para área de transferência`);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Não foi possível copiar para área de transferência');
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
    toast.success('Nova senha gerada');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !linkId) return;
    
    try {
      // Determine if we're adding or updating
      if (credentialId) {
        await updateCredencial(credentialId, {
          username,
          password,
          notes,
        });
      } else {
        await addCredencial({
          link_id: linkId,
          username,
          password,
          notes,
          user_id: user.id
        });
      }
      
      toast.success('Credenciais salvas com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving credentials:', error);
      toast.error('Erro ao salvar credenciais');
    }
  };
  
  const strengthLabel = getStrengthLabel(passwordStrength);
  const siteHostname = linkUrl ? new URL(linkUrl).hostname : '';
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Gerenciar credenciais
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-sm mb-4">
          <p className="font-medium">{linkTitle}</p>
          <p className="text-muted-foreground text-xs">{siteHostname}</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="credentials">Credenciais</TabsTrigger>
            <TabsTrigger value="generator">Gerador de senha</TabsTrigger>
          </TabsList>
          
          <TabsContent value="credentials">
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="username">Usuário</Label>
                  <div className="flex">
                    <Input 
                      id="username"
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      placeholder="Nome de usuário ou email"
                      className="flex-1"
                    />
                    {username && (
                      <Button 
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="ml-2"
                        onClick={() => copyToClipboard(username, 'username')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="flex">
                    <Input 
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="Senha"
                      className="flex-1"
                    />
                    <Button 
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="ml-2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    {password && (
                      <Button 
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(password, 'password')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {password && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>Força da senha:</span>
                        <span className="font-medium">{strengthLabel.label}</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${strengthLabel.color} transition-all duration-300`}
                          style={{ width: `${passwordStrength}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Textarea 
                    id="notes"
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Informações adicionais"
                    rows={3}
                  />
                </div>
              </div>
              
              <DialogFooter className="mt-4">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar credenciais
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          
          <TabsContent value="generator">
            <div className="space-y-4 py-2">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <Label>Tamanho da senha: {passwordLength}</Label>
                  </div>
                  <Slider
                    value={[passwordLength]}
                    min={8}
                    max={32}
                    step={1}
                    onValueChange={(value) => setPasswordLength(value[0])}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="uppercase"
                      checked={includeUppercase}
                      onCheckedChange={(checked) => setIncludeUppercase(checked === true)}
                    />
                    <Label htmlFor="uppercase" className="cursor-pointer">Incluir letras maiúsculas (A-Z)</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="lowercase"
                      checked={includeLowercase}
                      onCheckedChange={(checked) => setIncludeLowercase(checked === true)}
                    />
                    <Label htmlFor="lowercase" className="cursor-pointer">Incluir letras minúsculas (a-z)</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="numbers"
                      checked={includeNumbers}
                      onCheckedChange={(checked) => setIncludeNumbers(checked === true)}
                    />
                    <Label htmlFor="numbers" className="cursor-pointer">Incluir números (0-9)</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="symbols"
                      checked={includeSymbols}
                      onCheckedChange={(checked) => setIncludeSymbols(checked === true)}
                    />
                    <Label htmlFor="symbols" className="cursor-pointer">Incluir símbolos (!@#$%&*)</Label>
                  </div>
                </div>
                
                <Button 
                  type="button"
                  onClick={handleGeneratePassword}
                  className="w-full"
                  disabled={!includeLowercase && !includeUppercase && !includeNumbers && !includeSymbols}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Gerar senha aleatória
                </Button>
                
                {password && (
                  <div className="mt-4 space-y-2">
                    <Label>Senha gerada</Label>
                    <div className="flex">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        readOnly
                        className="flex-1"
                      />
                      <Button 
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="ml-2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(password, 'password')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span>Força da senha:</span>
                      <span className="font-medium">{strengthLabel.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${strengthLabel.color} transition-all duration-300`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                  </div>
                )}
                
                <div className="mt-4">
                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setActiveTab('credentials');
                      toast.success('Senha gerada aplicada às credenciais');
                    }}
                    disabled={!password}
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Usar senha gerada
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}