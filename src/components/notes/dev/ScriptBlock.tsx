import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { CanvasBlock } from '@/types/notes';
import { 
  Copy, Check, Trash2, GripHorizontal, Download, 
  WrapText, Terminal, FileCode2, Eye, Edit3, Sun, Moon,
  Save, Sparkles, CheckCircle2, RefreshCw, Info, ChevronDown, ChevronUp,
  Tag, Compass
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-docker';

// Languages supported with metadata
const LANGUAGES = [
  { id: 'bash', name: 'Bash / Shell', ext: '.sh', prismLang: 'bash', color: 'bg-emerald-500 text-emerald-300' },
  { id: 'sql', name: 'SQL Query', ext: '.sql', prismLang: 'sql', color: 'bg-orange-500 text-orange-300' },
  { id: 'typescript', name: 'TypeScript', ext: '.ts', prismLang: 'typescript', color: 'bg-blue-500 text-blue-300' },
  { id: 'javascript', name: 'JavaScript', ext: '.js', prismLang: 'javascript', color: 'bg-yellow-500 text-yellow-300' },
  { id: 'python', name: 'Python', ext: '.py', prismLang: 'python', color: 'bg-indigo-500 text-indigo-300' },
  { id: 'json', name: 'JSON', ext: '.json', prismLang: 'json', color: 'bg-emerald-400 text-emerald-200' },
  { id: 'yaml', name: 'YAML', ext: '.yaml', prismLang: 'yaml', color: 'bg-purple-500 text-purple-300' },
  { id: 'docker', name: 'Dockerfile', ext: 'Dockerfile', prismLang: 'docker', color: 'bg-cyan-500 text-cyan-300' },
  { id: 'markdown', name: 'Markdown', ext: '.md', prismLang: 'markdown', color: 'bg-slate-400 text-slate-200' },
];

// Quick templates for developers
const SCRIPT_TEMPLATES: Record<string, { title: string; filename: string; description: string; targetPurpose: string; code: string }> = {
  bash_deploy: {
    title: 'Deploy e Backup de Produção',
    filename: 'deploy.sh',
    targetPurpose: 'Automação de deploy contínuo em servidor Cloud',
    description: 'Atualiza o repositório git na branch principal, instala dependências limpas com npm ci e compila a build de produção.',
    code: `#!/bin/bash\n# Script de automação e deploy seguro\nset -e\n\necho "🚀 Iniciando processo de deploy..."\ngit pull origin main\n\necho "📦 Instalando dependências..."\nnpm install --frozen-lockfile\n\necho "🔨 Compilando aplicação..."\nnpm run build\n\necho "✅ Deploy concluído com sucesso!"\n`,
  },
  sql_query: {
    title: 'Relatório Mensal de Links por Usuário',
    filename: 'query_relatorio.sql',
    targetPurpose: 'Auditoria de dados e métricas de engajamento no PostgreSQL',
    description: 'Agrupa os links cadastrados por usuário, calculando volume total e data do último acesso para métricas do painel analítico.',
    code: `-- Consulta de relatórios de atividade\nSELECT \n  u.id,\n  u.email,\n  COUNT(l.id) AS total_links,\n  MAX(l.created_at) AS ultimo_acesso\nFROM users u\nLEFT JOIN links l ON l.user_id = u.id\nGROUP BY u.id, u.email\nORDER BY total_links DESC\nLIMIT 50;\n`,
  },
  curl_api: {
    title: 'Autenticação OAuth2 Client Credentials',
    filename: 'test_token.sh',
    targetPurpose: 'Obter Bearer Token para testes de integração de API',
    description: 'Faz requisição POST para o gateway de autenticação gerando o token de autorização de serviço.',
    code: `#!/bin/bash\n# Teste de endpoint de autenticação\ncurl -X POST "https://api.exemplo.com/v1/auth/token" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\\n  -d '{\n    "grant_type": "client_credentials"\n  }'\n`,
  },
  node_script: {
    title: 'Sincronizador de Registros em Lote',
    filename: 'sync_worker.ts',
    targetPurpose: 'Migração e saneamento de dados na base Supabase',
    description: 'Script TypeScript para varrer a tabela, validar integridade de URLs e atualizar status de indexação em lote.',
    code: `import { createClient } from '@supabase/supabase-js';\n\nasync function main() {\n  console.log('🔄 Processando sincronização de dados...');\n  // Insira sua rotina de processamento aqui\n}\n\nmain().catch(console.error);\n`,
  },
  dockerfile_sample: {
    title: 'Build Otimizado Multi-stage Node + Nginx',
    filename: 'Dockerfile',
    targetPurpose: 'Containerização leve para deploy no Kubernetes / Cloud Run',
    description: 'Utiliza imagem Alpine com estágio builder Node 20 para compilar os assets estáticos e Nginx enxuto para servir a SPA.',
    code: `FROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM nginx:alpine\nCOPY --from=builder /app/dist /usr/share/nginx/html\nEXPOSE 80\nCMD ["nginx", "-g", "daemon off;"]\n`,
  },
};

interface ScriptBlockProps {
  block: CanvasBlock;
  updateBlock: (id: string, updates: Partial<CanvasBlock>) => void;
  removeBlock: (id: string) => void;
  isSelected: boolean;
  setSelectedId: (id: string | null) => void;
}

export function ScriptBlock({
  block,
  updateBlock,
  removeBlock,
  isSelected,
  setSelectedId,
}: ScriptBlockProps) {
  const [localCode, setLocalCode] = useState<string>(block.code || '');
  const [localTitle, setLocalTitle] = useState<string>(block.title || '');
  const [localPurpose, setLocalPurpose] = useState<string>(block.targetPurpose || '');
  const [localDescription, setLocalDescription] = useState<string>(block.description || '');
  
  const [copied, setCopied] = useState(false);
  const [isEditingFilename, setIsEditingFilename] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  
  // Controls collapse of the Purpose/Description documentation box
  const [isDocExpanded, setIsDocExpanded] = useState<boolean>(block.showDescription ?? true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const language = block.language || 'bash';
  const filename = block.filename || (language === 'docker' ? 'Dockerfile' : `script${LANGUAGES.find(l => l.id === language)?.ext || '.sh'}`);
  const wrapLines = block.wrapLines ?? false;
  const theme = block.theme || 'dark';
  const viewMode = block.viewMode || 'edit';

  // Sync external changes into local state if different
  useEffect(() => {
    if (block.code !== undefined && block.code !== localCode) {
      setLocalCode(block.code);
    }
    if (block.title !== undefined && block.title !== localTitle) {
      setLocalTitle(block.title);
    }
    if (block.targetPurpose !== undefined && block.targetPurpose !== localPurpose) {
      setLocalPurpose(block.targetPurpose);
    }
    if (block.description !== undefined && block.description !== localDescription) {
      setLocalDescription(block.description);
    }
  }, [block.code, block.title, block.targetPurpose, block.description]);

  const currentLang = useMemo(() => {
    return LANGUAGES.find(l => l.id === language) || LANGUAGES[0];
  }, [language]);

  const lineCount = useMemo(() => {
    return Math.max(1, localCode.split('\n').length);
  }, [localCode]);

  // Highlighted code with Prism
  const highlightedCode = useMemo(() => {
    try {
      const prismLanguage = Prism.languages[currentLang.prismLang] || Prism.languages.bash || Prism.languages.javascript;
      if (prismLanguage) {
        return Prism.highlight(localCode || '', prismLanguage, currentLang.prismLang);
      }
    } catch {
      // Fallback
    }
    return localCode
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }, [localCode, currentLang]);

  // Debounced auto-save function for code and metadata
  const triggerDebouncedSave = useCallback((updates: Partial<CanvasBlock>) => {
    setIsSaving(true);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      updateBlock(block.id, updates);
      setIsSaving(false);
      const now = new Date();
      setLastSavedTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
    }, 450);
  }, [block.id, updateBlock]);

  // Handle immediate manual save
  const handleManualSave = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    updateBlock(block.id, {
      code: localCode,
      title: localTitle,
      targetPurpose: localPurpose,
      description: localDescription,
    });
    setIsSaving(false);
    const now = new Date();
    setLastSavedTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
    toast.success('Script e documentação salvos!');
  };

  // Synchronize scroll between line numbers and textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Copy code to clipboard
  const handleCopyCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(localCode);
      setCopied(true);
      toast.success('Script copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar script');
    }
  };

  // Download script file
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const blob = new Blob([localCode], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Arquivo ${filename} baixado!`);
    } catch {
      toast.error('Erro ao baixar arquivo');
    }
  };

  // Handle Tab key in textarea to insert 2 spaces
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const updated = val.substring(0, start) + '  ' + val.substring(end);
      
      setLocalCode(updated);
      triggerDebouncedSave({ code: updated });
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // Load a preset template
  const applyTemplate = (templateKey: keyof typeof SCRIPT_TEMPLATES) => {
    const tmpl = SCRIPT_TEMPLATES[templateKey];
    if (!tmpl) return;
    setLocalCode(tmpl.code);
    setLocalTitle(tmpl.title);
    setLocalPurpose(tmpl.targetPurpose);
    setLocalDescription(tmpl.description);
    
    let lang = 'bash';
    if (templateKey.startsWith('sql')) lang = 'sql';
    if (templateKey.startsWith('node')) lang = 'typescript';
    if (templateKey.startsWith('docker')) lang = 'docker';

    updateBlock(block.id, {
      code: tmpl.code,
      title: tmpl.title,
      targetPurpose: tmpl.targetPurpose,
      description: tmpl.description,
      filename: tmpl.filename,
      language: lang,
    });
    toast.success(`Modelo "${tmpl.title}" aplicado!`);
  };

  const isDark = theme === 'dark';

  return (
    <Rnd
      size={{ width: block.width || 560, height: block.height || 420 }}
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
      minWidth={380}
      minHeight={260}
      dragHandleClassName="script-drag-handle"
      className={`group ${isSelected ? 'z-20' : 'z-10'}`}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedId(block.id);
      }}
    >
      <div 
        className={`flex flex-col h-full rounded-xl overflow-hidden border transition-all shadow-md ${
          isDark 
            ? 'bg-[#0f172a] text-slate-100 border-slate-800' 
            : 'bg-white text-slate-800 border-slate-300'
        } ${isSelected ? 'ring-2 ring-indigo-500 shadow-indigo-500/10' : 'hover:border-slate-400'}`}
      >
        {/* Top Header Bar */}
        <div 
          className={`flex items-center justify-between px-3 py-2 border-b text-xs shrink-0 select-none ${
            isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          {/* Left: Window Dots & Drag Handle & Filename */}
          <div className="flex items-center gap-2 min-w-0">
            <div 
              className="script-drag-handle cursor-grab active:cursor-grabbing flex items-center gap-1 py-1 px-1 -ml-1 text-slate-400 hover:text-slate-200"
              title="Arraste para mover o bloco de código no quadro"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <GripHorizontal size={13} className="ml-1 opacity-60" />
            </div>

            {/* Editable Filename */}
            <div className="flex items-center gap-1 min-w-0">
              <FileCode2 size={14} className={isDark ? 'text-indigo-400 shrink-0' : 'text-indigo-600 shrink-0'} />
              {isEditingFilename ? (
                <input
                  type="text"
                  value={filename}
                  autoFocus
                  onChange={(e) => updateBlock(block.id, { filename: e.target.value })}
                  onBlur={() => setIsEditingFilename(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingFilename(false)}
                  className={`border rounded px-1.5 py-0.5 text-xs font-mono outline-none w-36 ${
                    isDark ? 'bg-slate-900 border-indigo-500 text-white' : 'bg-white border-indigo-500 text-slate-900'
                  }`}
                />
              ) : (
                <span 
                  onClick={() => setIsEditingFilename(true)}
                  className={`font-mono font-semibold cursor-pointer px-1 py-0.5 rounded transition-colors truncate max-w-[150px] ${
                    isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Clique para renomear o arquivo do script"
                >
                  {filename}
                </span>
              )}
            </div>

            {/* Save Status Chip */}
            <div className="hidden sm:flex items-center gap-1 text-[10px] ml-1">
              {isSaving ? (
                <span className="flex items-center gap-1 text-amber-500 font-medium">
                  <RefreshCw size={10} className="animate-spin" /> Salvando...
                </span>
              ) : (
                <span 
                  className="flex items-center gap-1 text-emerald-500 font-medium cursor-pointer hover:underline"
                  onClick={handleManualSave}
                  title="Salvo automaticamente. Clique para forçar gravação."
                >
                  <CheckCircle2 size={10} /> Salvo
                </span>
              )}
            </div>
          </div>

          {/* Right: Language Selector & Toolbar Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Language Selector */}
            <Select 
              value={language}
              onValueChange={(val) => {
                const targetLang = LANGUAGES.find(l => l.id === val);
                const baseName = filename.includes('.') ? filename.substring(0, filename.lastIndexOf('.')) : filename;
                const newFilename = val === 'docker' ? 'Dockerfile' : `${baseName}${targetLang?.ext || '.sh'}`;
                updateBlock(block.id, { language: val, filename: newFilename });
              }}
            >
              <SelectTrigger 
                className={`h-6 text-[11px] font-mono py-0 px-2 rounded w-auto gap-1 border ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id} className="text-xs font-mono">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${lang.color.split(' ')[0]}`} />
                      {lang.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Toggle Purpose & Documentation Panel */}
            <button
              type="button"
              onClick={() => {
                const nextState = !isDocExpanded;
                setIsDocExpanded(nextState);
                updateBlock(block.id, { showDescription: nextState });
              }}
              className={`p-1 rounded text-xs transition-colors flex items-center gap-1 font-medium ${
                isDocExpanded
                  ? isDark ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/60' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
              title={isDocExpanded ? 'Ocultar descrição / finalidade' : 'Mostrar área de finalidade e documentação'}
            >
              <Compass size={13} className={isDocExpanded ? 'text-indigo-400' : ''} />
              <span className="hidden md:inline">Finalidade</span>
              {isDocExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {/* View Mode Toggle: Edit vs Highlighted Preview */}
            <button
              type="button"
              onClick={() => updateBlock(block.id, { viewMode: viewMode === 'edit' ? 'preview' : 'edit' })}
              className={`p-1 rounded text-xs transition-colors flex items-center gap-1 ${
                viewMode === 'preview' 
                  ? 'bg-indigo-600 text-white font-medium' 
                  : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
              title={viewMode === 'preview' ? 'Voltar para modo de Edição' : 'Ver com realce de sintaxe colorido'}
            >
              {viewMode === 'preview' ? <Eye size={13} /> : <Edit3 size={13} />}
              <span className="hidden lg:inline">{viewMode === 'preview' ? 'Preview' : 'Editor'}</span>
            </button>

            {/* Template Presets Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`p-1 rounded text-xs transition-colors flex items-center gap-1 ${
                    isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-600 hover:bg-slate-200 hover:text-amber-600'
                  }`}
                  title="Inserir modelo pronto com finalidade e código preenchidos"
                >
                  <Sparkles size={13} />
                  <span className="hidden xl:inline">Modelos</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs font-semibold">Modelos com Finalidade</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => applyTemplate('bash_deploy')} className="text-xs cursor-pointer">
                  🚀 Deploy & Backup Shell (.sh)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => applyTemplate('sql_query')} className="text-xs cursor-pointer">
                  📊 Consulta SQL com Agrupamento (.sql)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => applyTemplate('curl_api')} className="text-xs cursor-pointer">
                  🌐 Chamada API cURL com Token (.sh)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => applyTemplate('node_script')} className="text-xs cursor-pointer">
                  ⚡ Sincronizador TypeScript (.ts)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => applyTemplate('dockerfile_sample')} className="text-xs cursor-pointer">
                  🐳 Dockerfile Multi-stage
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle (Dark Terminal vs Clean Light) */}
            <button
              type="button"
              onClick={() => updateBlock(block.id, { theme: isDark ? 'light' : 'dark' })}
              className={`p-1 rounded transition-colors ${
                isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-yellow-300' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
              title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro (terminal)'}
            >
              {isDark ? <Sun size={13} /> : <Moon size={13} />}
            </button>

            {/* Wrap Lines Toggle */}
            <button
              type="button"
              onClick={() => updateBlock(block.id, { wrapLines: !wrapLines })}
              className={`p-1 rounded transition-colors ${
                wrapLines 
                  ? 'text-indigo-400 bg-slate-800' 
                  : isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'
              }`}
              title={wrapLines ? 'Desativar quebra de linha' : 'Ativar quebra de linha'}
            >
              <WrapText size={13} />
            </button>

            {/* Manual Save Button */}
            <button
              type="button"
              onClick={handleManualSave}
              className="p-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1 text-[11px] font-medium"
              title="Salvar alterações agora"
            >
              <Save size={13} />
              <span className="hidden sm:inline">Salvar</span>
            </button>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopyCode}
              className={`p-1 rounded transition-colors flex items-center gap-1 text-[11px] ${
                copied 
                  ? 'text-emerald-400 font-semibold' 
                  : isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 hover:bg-slate-200'
              }`}
              title="Copiar script para a área de transferência"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span className="hidden xl:inline">{copied ? 'Copiado' : 'Copiar'}</span>
            </button>

            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              className={`p-1 rounded transition-colors ${
                isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-200'
              }`}
              title="Baixar arquivo de script"
            >
              <Download size={13} />
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeBlock(block.id);
              }}
              className={`p-1 rounded transition-colors ml-0.5 ${
                isDark ? 'text-slate-500 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-200'
              }`}
              title="Excluir bloco de script"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Purpose & Documentation Section (Dedicated metadata box for script purpose) */}
        {isDocExpanded && (
          <div 
            className={`px-3 py-2.5 border-b text-xs transition-colors shrink-0 ${
              isDark 
                ? 'bg-[#131d31] border-slate-800/80 text-slate-200' 
                : 'bg-indigo-50/50 border-indigo-100 text-slate-800'
            }`}
          >
            <div className="flex flex-col gap-2">
              {/* Row 1: Purpose / Objective Header */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 font-semibold text-[11px] uppercase tracking-wider shrink-0 text-indigo-400">
                  <Compass size={13} />
                  <span>Finalidade:</span>
                </div>
                <input
                  type="text"
                  value={localPurpose}
                  onChange={(e) => {
                    setLocalPurpose(e.target.value);
                    triggerDebouncedSave({ targetPurpose: e.target.value });
                  }}
                  onBlur={() => updateBlock(block.id, { targetPurpose: localPurpose })}
                  placeholder="Ex: Executar backup do banco PostgreSQL e subir pro bucket S3..."
                  className={`flex-1 px-2 py-1 rounded text-xs outline-none border transition-colors font-sans ${
                    isDark 
                      ? 'bg-slate-900/90 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-indigo-500' 
                      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                  }`}
                />
              </div>

              {/* Row 2: Detailed Usage Notes / Instructions / Context */}
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-1 text-[11px] font-medium shrink-0 pt-1 text-slate-400">
                  <Info size={12} />
                  <span>Instruções:</span>
                </div>
                <textarea
                  rows={2}
                  value={localDescription}
                  onChange={(e) => {
                    setLocalDescription(e.target.value);
                    triggerDebouncedSave({ description: e.target.value });
                  }}
                  onBlur={() => updateBlock(block.id, { description: localDescription })}
                  placeholder="Instruções de execução, parâmetros necessários (ex: executar com sudo, criar pasta /tmp/backup antes)..."
                  className={`flex-1 px-2 py-1 rounded text-xs outline-none border transition-colors resize-none font-sans leading-relaxed ${
                    isDark 
                      ? 'bg-slate-900/90 border-slate-700 text-slate-200 placeholder-slate-500 focus:border-indigo-500' 
                      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Code Editor & Preview Area */}
        <div className="flex-1 relative flex overflow-hidden font-mono text-[13px] leading-5">
          {viewMode === 'edit' ? (
            <>
              {/* Line Numbers Column */}
              <div 
                ref={lineNumbersRef}
                className={`select-none py-3 px-2 text-right border-r font-mono text-xs shrink-0 w-11 overflow-hidden transition-colors ${
                  isDark ? 'bg-[#0f172a] text-slate-600 border-slate-800' : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div key={i} className="leading-5">{i + 1}</div>
                ))}
              </div>

              {/* Text Area Code Input */}
              <textarea
                ref={textareaRef}
                value={localCode}
                onChange={(e) => {
                  setLocalCode(e.target.value);
                  triggerDebouncedSave({ code: e.target.value });
                }}
                onBlur={() => {
                  updateBlock(block.id, { code: localCode });
                }}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
                placeholder={
                  language === 'bash'
                    ? '#!/bin/bash\n# Escreva seu script shell ou comandos aqui...\necho "Executando script..."'
                    : language === 'sql'
                    ? '-- Escreva sua query SQL aqui...\nSELECT * FROM note_pages ORDER BY created_at DESC;'
                    : language === 'javascript' || language === 'typescript'
                    ? '// Escreva seu código aqui...\nconst fetchData = async () => {\n  console.log("Processando dados...");\n};'
                    : '# Escreva seu código ou script aqui...'
                }
                spellCheck={false}
                wrap={wrapLines ? 'soft' : 'off'}
                className={`flex-1 p-3 bg-transparent resize-none outline-none font-mono text-[13px] leading-5 w-full h-full overflow-auto ${
                  isDark ? 'text-slate-100 placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'
                } ${wrapLines ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'}`}
              />
            </>
          ) : (
            /* Syntax Highlighted Preview Mode */
            <div 
              className={`flex-1 p-4 overflow-auto font-mono text-[13px] leading-5 ${
                isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-900'
              }`}
            >
              <pre className="!bg-transparent !p-0 !m-0 font-mono">
                <code 
                  className={`language-${currentLang.prismLang} font-mono`}
                  dangerouslySetInnerHTML={{ __html: highlightedCode }}
                />
              </pre>
            </div>
          )}
        </div>

        {/* Footer Info Bar */}
        <div 
          className={`px-3 py-1 border-t text-[10px] flex items-center justify-between shrink-0 select-none ${
            isDark ? 'bg-[#1e293b]/80 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-medium">
              <Terminal size={11} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
              {currentLang.name}
            </span>
            <span>•</span>
            <span>{lineCount} {lineCount === 1 ? 'linha' : 'linhas'}</span>
            <span>•</span>
            <span>{localCode.length} caracteres</span>
            {lastSavedTime && (
              <>
                <span>•</span>
                <span className="text-emerald-500 font-medium">Salvo às {lastSavedTime}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span className="hidden sm:inline">Tab = 2 espaços</span>
            <span className="text-indigo-400 font-medium cursor-pointer hover:underline" onClick={handleManualSave}>
              Ctrl+S / Salvar
            </span>
          </div>
        </div>
      </div>
    </Rnd>
  );
}
