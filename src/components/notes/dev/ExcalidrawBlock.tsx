/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import '@excalidraw/excalidraw/index.css';
import { Rnd } from 'react-rnd';
import { CanvasBlock } from '@/types/notes';
import { 
  Shapes, 
  Maximize2, 
  Trash2, 
  Download, 
  Upload, 
  Edit3, 
  Sparkles, 
  FileCode, 
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ArrowUpToLine,
  ArrowDownToLine,
  GripHorizontal,
  Workflow,
  Server,
  Database,
  X,
  Check,
  Eye,
  Settings,
  HelpCircle,
  BookOpen,
  Code2,
  FolderDown,
  Plus,
  GitBranch,
  Boxes,
  Table,
  UserCheck,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkle,
  ArrowRight,
  Globe,
  Languages
} from 'lucide-react';
import { BlockActionMenu } from '@/components/notes/dev/BlockActionMenu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  UML_ER_LIBRARY_ITEMS, 
  UML_ER_SHAPES_CATEGORIES, 
  UML_ER_LIBRARY_RAW,
  UML_SHAPE_INFOS,
  UmlShapeInfo
} from '@/components/notes/dev/umlErLibrary';
import { toast } from 'sonner';

export const EXCALIDRAW_LANGUAGES = [
  { code: 'pt-BR', label: 'Português (Brasil)', short: 'PT-BR', flag: '🇧🇷' },
  { code: 'pt-PT', label: 'Português (Portugal)', short: 'PT-PT', flag: '🇵🇹' },
  { code: 'en', label: 'English (US)', short: 'EN', flag: '🇺🇸' },
  { code: 'es-ES', label: 'Español', short: 'ES', flag: '🇪🇸' },
  { code: 'fr-FR', label: 'Français', short: 'FR', flag: '🇫🇷' },
  { code: 'de-DE', label: 'Deutsch', short: 'DE', flag: '🇩🇪' },
  { code: 'it-IT', label: 'Italiano', short: 'IT', flag: '🇮🇹' },
  { code: 'ja-JP', label: '日本語 (Japonês)', short: 'JA', flag: '🇯🇵' },
  { code: 'zh-CN', label: '简体中文 (Chinês Simp.)', short: 'ZH', flag: '🇨🇳' },
  { code: 'zh-TW', label: '繁體中文 (Chinês Trad.)', short: 'ZH-TW', flag: '🇹🇼' },
  { code: 'ru-RU', label: 'Русский (Russo)', short: 'RU', flag: '🇷🇺' },
  { code: 'ko-KR', label: '한국어 (Coreano)', short: 'KO', flag: '🇰🇷' },
];

interface ExcalidrawBlockProps {
  block: CanvasBlock;
  updateBlock: (id: string, updates: Partial<CanvasBlock>) => void;
  removeBlock: (id: string) => void;
  isSelected?: boolean;
  setSelectedId?: (id: string | null) => void;
  bringToFront?: (id: string) => void;
  sendToBack?: (id: string) => void;
  onMoveOrCopy?: (block: CanvasBlock, action?: 'move' | 'copy') => void;
  onDuplicate?: (blockId: string) => void;
  onCopyClipboard?: (block: CanvasBlock) => void;
}

// Predefined professional starter templates for Excalidraw
const STARTER_TEMPLATES = {
  uml_er: {
    name: 'Diagrama UML & ER (BjoernKW)',
    icon: Code2,
    description: 'Classes com métodos/atributos, interfaces, entidades ER e conectores 1..n, 0..1.',
    elements: [
      { id: 'uml_cls1', type: 'rectangle', x: 80, y: 100, width: 200, height: 130, strokeColor: '#1e3a8a', backgroundColor: '#eff6ff', strokeWidth: 2, roughness: 1, strokeStyle: 'solid', fillStyle: 'solid' },
      { id: 'uml_cls1_div1', type: 'line', x: 80, y: 135, width: 200, height: 0, strokeColor: '#1e3a8a', strokeWidth: 1.5, points: [[0, 0], [200, 0]] },
      { id: 'uml_cls1_div2', type: 'line', x: 80, y: 185, width: 200, height: 0, strokeColor: '#1e3a8a', strokeWidth: 1.5, points: [[0, 0], [200, 0]] },
      { id: 'uml_cls1_title', type: 'text', x: 130, y: 108, text: '«Entity»\nUsuario', fontSize: 14, fontFamily: 1, textAlign: 'center', strokeColor: '#1e3a8a' },
      { id: 'uml_cls1_attrs', type: 'text', x: 88, y: 142, text: '+ id: UUID [PK]\n+ email: String\n+ nome: String', fontSize: 11, fontFamily: 3, strokeColor: '#1e293b' },
      { id: 'uml_cls1_methods', type: 'text', x: 88, y: 192, text: '+ autenticar(): Boolean\n+ obterPerfil(): Perfil', fontSize: 11, fontFamily: 3, strokeColor: '#1e293b' },

      { id: 'uml_arr1', type: 'arrow', x: 280, y: 165, width: 140, height: 0, strokeColor: '#475569', strokeWidth: 2, roughness: 1, points: [[0, 0], [140, 0]] },
      { id: 'uml_card1', type: 'text', x: 290, y: 145, text: '1', fontSize: 12, fontFamily: 1, strokeColor: '#0f172a' },
      { id: 'uml_card2', type: 'text', x: 395, y: 145, text: '0..*', fontSize: 12, fontFamily: 1, strokeColor: '#0f172a' },

      { id: 'uml_cls2', type: 'rectangle', x: 420, y: 100, width: 210, height: 130, strokeColor: '#065f46', backgroundColor: '#f0fdf4', strokeWidth: 2, roughness: 1, strokeStyle: 'solid', fillStyle: 'solid' },
      { id: 'uml_cls2_div1', type: 'line', x: 420, y: 135, width: 210, height: 0, strokeColor: '#065f46', strokeWidth: 1.5, points: [[0, 0], [210, 0]] },
      { id: 'uml_cls2_div2', type: 'line', x: 420, y: 185, width: 210, height: 0, strokeColor: '#065f46', strokeWidth: 1.5, points: [[0, 0], [210, 0]] },
      { id: 'uml_cls2_title', type: 'text', x: 470, y: 108, text: 'Workspace\n(Caderno)', fontSize: 14, fontFamily: 1, textAlign: 'center', strokeColor: '#065f46' },
      { id: 'uml_cls2_attrs', type: 'text', x: 428, y: 142, text: '+ id: UUID [PK]\n+ usuario_id: UUID [FK]\n+ titulo: String', fontSize: 11, fontFamily: 3, strokeColor: '#1e293b' },
      { id: 'uml_cls2_methods', type: 'text', x: 428, y: 192, text: '+ adicionarBloco(): Void\n+ exportarPdf(): File', fontSize: 11, fontFamily: 3, strokeColor: '#1e293b' }
    ]
  },
  flowchart: {
    name: 'Fluxograma de Decisão',
    icon: Workflow,
    description: 'Processo lógico corporativo com raias, decisões e fluxos.',
    elements: [
      { id: 'el1', type: 'rectangle', x: 250, y: 100, width: 140, height: 50, strokeColor: '#1e3a8a', backgroundColor: '#dbeafe', strokeWidth: 2, roughness: 1, roundness: { type: 3 }, strokeStyle: 'solid', fillStyle: 'solid', text: 'Iniciar Processo' },
      { id: 'el2', type: 'arrow', x: 320, y: 150, width: 0, height: 60, strokeColor: '#1e3a8a', strokeWidth: 2, roughness: 1, strokeStyle: 'solid', points: [[0, 0], [0, 60]] },
      { id: 'el3', type: 'diamond', x: 230, y: 210, width: 180, height: 100, strokeColor: '#b45309', backgroundColor: '#fef3c7', strokeWidth: 2, roughness: 1, strokeStyle: 'solid', fillStyle: 'solid', text: 'Token Ativo?' },
      { id: 'el4', type: 'arrow', x: 410, y: 260, width: 80, height: 0, strokeColor: '#b45309', strokeWidth: 2, roughness: 1, strokeStyle: 'solid', points: [[0, 0], [80, 0]] },
      { id: 'el5', type: 'rectangle', x: 490, y: 235, width: 150, height: 50, strokeColor: '#9f1239', backgroundColor: '#ffe4e6', strokeWidth: 2, roughness: 1, strokeStyle: 'solid', fillStyle: 'solid', text: 'Retornar 401\n(Acesso Negado)' },
      { id: 'el6', type: 'arrow', x: 320, y: 310, width: 0, height: 60, strokeColor: '#1e3a8a', strokeWidth: 2, roughness: 1, strokeStyle: 'solid', points: [[0, 0], [0, 60]] },
      { id: 'el7', type: 'rectangle', x: 230, y: 370, width: 180, height: 60, strokeColor: '#065f46', backgroundColor: '#d1fae5', strokeWidth: 2, roughness: 1, strokeStyle: 'solid', fillStyle: 'solid', text: 'Processar Requisição\ne Salvar Log' }
    ]
  },
  architecture: {
    name: 'Arquitetura Micro-Frontends',
    icon: Server,
    description: 'Camada de clientes, API gateway e barramento de dados.',
    elements: [
      { id: 'arch1', type: 'rectangle', x: 50, y: 150, width: 140, height: 80, strokeColor: '#4f46e5', backgroundColor: '#e0e7ff', strokeWidth: 2, roughness: 1, roundness: { type: 3 }, strokeStyle: 'solid', fillStyle: 'solid', text: 'Web Portal\n(React SPA)' },
      { id: 'arch2', type: 'rectangle', x: 50, y: 270, width: 140, height: 80, strokeColor: '#4f46e5', backgroundColor: '#e0e7ff', strokeWidth: 2, roughness: 1, roundness: { type: 3 }, strokeStyle: 'solid', fillStyle: 'solid', text: 'Mobile App\n(React Native)' },
      { id: 'arch3', type: 'arrow', x: 190, y: 190, width: 100, height: 50, strokeColor: '#4f46e5', strokeWidth: 2, roughness: 1, points: [[0, 0], [100, 50]] },
      { id: 'arch4', type: 'arrow', x: 190, y: 310, width: 100, height: -70, strokeColor: '#4f46e5', strokeWidth: 2, roughness: 1, points: [[0, 0], [100, -70]] },
      { id: 'arch5', type: 'rectangle', x: 290, y: 180, width: 160, height: 140, strokeColor: '#0891b2', backgroundColor: '#ecfeff', strokeWidth: 2, roughness: 1, roundness: { type: 3 }, strokeStyle: 'solid', fillStyle: 'solid', text: 'API Gateway / Auth\n(Reverse Proxy & JWT)' },
      { id: 'arch6', type: 'arrow', x: 450, y: 250, width: 90, height: 0, strokeColor: '#0891b2', strokeWidth: 2, roughness: 1, points: [[0, 0], [90, 0]] },
      { id: 'arch7', type: 'rectangle', x: 540, y: 190, width: 150, height: 110, strokeColor: '#16a34a', backgroundColor: '#dcfce7', strokeWidth: 2, roughness: 1, roundness: { type: 3 }, strokeStyle: 'solid', fillStyle: 'solid', text: 'Core backend API\n(Node.js / Express)' }
    ]
  },
  database: {
    name: 'Modelagem de Banco (ERD)',
    icon: Database,
    description: 'Entidades relacionais com chaves primárias e relacionamentos.',
    elements: [
      { id: 'db1', type: 'rectangle', x: 100, y: 120, width: 180, height: 120, strokeColor: '#0f172a', backgroundColor: '#f1f5f9', strokeWidth: 2, roughness: 1, strokeStyle: 'solid', fillStyle: 'solid', text: 'ORGANIZATIONS\n------------------\n+ id: UUID [PK]\n+ name: VARCHAR\n+ created_at: TIMESTZ' },
      { id: 'db2', type: 'arrow', x: 280, y: 180, width: 140, height: 0, strokeColor: '#64748b', strokeWidth: 2, roughness: 1, strokeStyle: 'dashed', points: [[0, 0], [140, 0]] },
      { id: 'db3', type: 'rectangle', x: 420, y: 120, width: 180, height: 120, strokeColor: '#0f172a', backgroundColor: '#f1f5f9', strokeWidth: 2, roughness: 1, strokeStyle: 'solid', fillStyle: 'solid', text: 'USERS (Usuários)\n------------------\n+ id: UUID [PK]\n+ org_id: UUID [FK]\n+ email: VARCHAR [UQ]\n+ role: VARCHAR' }
    ]
  }
};

const sanitizeExcalidrawElements = (rawEls: any[]): any[] => {
  if (!Array.isArray(rawEls)) return [];
  return rawEls
    .map((el, idx) => {
      if (!el || typeof el !== 'object') return null;
      const item = { ...el };
      if (!item.id) item.id = `el_${Date.now()}_${idx}`;
      if (!item.type) item.type = 'rectangle';
      if (
        (item.type === 'arrow' || item.type === 'line' || item.type === 'freedraw' || item.type === 'draw') &&
        (!Array.isArray(item.points) || item.points.length === 0)
      ) {
        item.points = [
          [0, 0],
          [item.width || 50, item.height || 0],
        ];
      }
      return item;
    })
    .filter(Boolean);
};

export function ExcalidrawBlock({
  block,
  updateBlock,
  removeBlock,
  isSelected,
  setSelectedId,
  bringToFront,
  sendToBack,
  onMoveOrCopy,
  onDuplicate,
  onCopyClipboard,
}: ExcalidrawBlockProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const [isUmlDrawerOpen, setIsUmlDrawerOpen] = useState(false);
  const [umlSearchQuery, setUmlSearchQuery] = useState('');
  const [umlCategoryFilter, setUmlCategoryFilter] = useState('all');
  const [selectedLang, setSelectedLang] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('excalidraw_lang_code') || 'pt-BR';
    }
    return 'pt-BR';
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const libraryFileInputRef = useRef<HTMLInputElement | null>(null);
  const excalidrawAPIRef = useRef<any>(null);
  const lastElementsRef = useRef<any[]>([]);
  const lastAppStateRef = useRef<any>({});
  const lastFilesRef = useRef<any>({});

  const currentLangObj = useMemo(() => {
    return EXCALIDRAW_LANGUAGES.find((l) => l.code === selectedLang) || EXCALIDRAW_LANGUAGES[0];
  }, [selectedLang]);

  const handleLanguageChange = (langCode: string) => {
    setSelectedLang(langCode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('excalidraw_lang_code', langCode);
    }
    const langObj = EXCALIDRAW_LANGUAGES.find((l) => l.code === langCode);
    toast.success(`Idioma do Excalidraw alterado para ${langObj?.label || langCode}`);
  };

  // Filter UML shapes by category & search term
  const filteredUmlShapes = useMemo(() => {
    return UML_SHAPE_INFOS.filter((shape) => {
      const matchesCategory = 
        umlCategoryFilter === 'all' || 
        shape.category === umlCategoryFilter;
      const matchesSearch = 
        !umlSearchQuery.trim() || 
        shape.name.toLowerCase().includes(umlSearchQuery.toLowerCase()) || 
        shape.description.toLowerCase().includes(umlSearchQuery.toLowerCase()) ||
        shape.categoryLabel.toLowerCase().includes(umlSearchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [umlCategoryFilter, umlSearchQuery]);

  // Lazy load components/libraries inside safety structures
  const [ExcalidrawComponent, setExcalidrawComponent] = useState<any>(null);
  const [excalidrawExport, setExcalidrawExport] = useState<any>(null);

  const title = block.excalidrawTitle || 'Painel de Desenho Excalidraw';
  const elementsJson = block.excalidrawElements || '[]';
  const appStateJson = block.excalidrawAppState || '{}';
  const filesJson = block.excalidrawFiles || '{}';
  const previewSvg = block.drawioSvg || ''; // Reuses drawioSvg field to store rendered high-resolution preview vector safely

  // Parse safe dimensions
  const widthVal = typeof block.width === 'number' ? block.width : parseInt(String(block.width), 10) || 760;
  const heightVal = typeof block.height === 'number' ? block.height : parseInt(String(block.height), 10) || 500;

  // Lazily import `@excalidraw/excalidraw` only on client-side
  useEffect(() => {
    if (isEditorOpen && !ExcalidrawComponent) {
      import('@excalidraw/excalidraw').then((mod) => {
        setExcalidrawComponent(() => mod.Excalidraw);
        setExcalidrawExport({
          exportToSvg: mod.exportToSvg,
          serializeAsJSON: mod.serializeAsJSON,
        });
      }).catch((err) => {
        console.error('Failed to load Excalidraw library dynamically:', err);
        toast.error('Erro ao carregar a biblioteca de desenho Excalidraw.');
      });
    }
  }, [isEditorOpen, ExcalidrawComponent]);

  // Open UML & ER library panel inside Excalidraw editor seamlessly
  const handleLoadUmlLibrary = () => {
    setIsEditorOpen(true);
    setIsUmlDrawerOpen(true);
    const api = excalidrawAPIRef.current || (window as any)[`excalidraw_ref_${block.id}`];
    if (api && typeof api.updateLibrary === 'function') {
      try {
        api.updateLibrary({
          libraryItems: UML_ER_LIBRARY_ITEMS,
          merge: false,
          openLibraryMenu: false, // Don't trigger Excalidraw's remote marketplace loader
          defaultStatus: 'published',
        });
      } catch (err) {
        console.warn('Library local cache update notice:', err);
      }
    }
    toast.success('Painel com as 21 Formas UML & ER pronto para uso!');
  };

  // Insert a specific UML/ER item directly onto canvas center
  const handleInsertUmlShape = (shapeIdx: number) => {
    const item = UML_ER_LIBRARY_ITEMS[shapeIdx];
    if (!item) return;

    const api = excalidrawAPIRef.current || (window as any)[`excalidraw_ref_${block.id}`];
    if (api && typeof api.getSceneElements === 'function') {
      const currentElements = api.getSceneElements() || [];
      const appState = typeof api.getAppState === 'function' ? api.getAppState() : {};

      const scrollX = appState.scrollX || 0;
      const scrollY = appState.scrollY || 0;
      const zoom = appState.zoom?.value || 1;
      const viewportWidth = appState.width || 900;
      const viewportHeight = appState.height || 600;

      // Slight random jitter so sequential insertions don't perfectly stack
      const jitter = (Math.random() - 0.5) * 40;
      const centerX = -scrollX + viewportWidth / (2 * zoom) - 80 + jitter;
      const centerY = -scrollY + viewportHeight / (2 * zoom) - 50 + jitter;

      const minX = Math.min(...item.elements.map((e: any) => e.x || 0));
      const minY = Math.min(...item.elements.map((e: any) => e.y || 0));

      const offsetElements = item.elements.map((el: any, i: number) => {
        const cloned = { ...el };
        cloned.id = `uml_inst_${Date.now()}_${shapeIdx}_${i}`;
        cloned.x = centerX + ((el.x || 0) - minX);
        cloned.y = centerY + ((el.y || 0) - minY);
        return cloned;
      });

      const sanitized = sanitizeExcalidrawElements([...currentElements, ...offsetElements]);
      if (typeof api.updateScene === 'function') {
        api.updateScene({ elements: sanitized });
      }
      const shapeInfo = UML_SHAPE_INFOS[shapeIdx];
      toast.success(`Forma "${shapeInfo?.name || 'UML'}" inserida no centro da tela!`);
    } else {
      // If editor isn't currently active, open editor with the shape appended
      try {
        const existing = JSON.parse(elementsJson) || [];
        const minX = Math.min(...item.elements.map((e: any) => e.x || 0));
        const minY = Math.min(...item.elements.map((e: any) => e.y || 0));
        const offsetElements = item.elements.map((el: any, i: number) => {
          const cloned = { ...el };
          cloned.id = `uml_inst_${Date.now()}_${shapeIdx}_${i}`;
          cloned.x = 200 + ((el.x || 0) - minX);
          cloned.y = 150 + ((el.y || 0) - minY);
          return cloned;
        });
        const merged = sanitizeExcalidrawElements([...existing, ...offsetElements]);
        updateBlock(block.id, {
          excalidrawElements: JSON.stringify(merged),
          excalidrawLastEdited: new Date().toISOString(),
        });
        setIsEditorOpen(true);
        setIsUmlDrawerOpen(true);
        const shapeInfo = UML_SHAPE_INFOS[shapeIdx];
        toast.success(`Forma "${shapeInfo?.name || 'UML'}" adicionada ao diagrama!`);
      } catch (err) {
        console.error('Error inserting shape into closed editor:', err);
      }
    }
  };

  // Handle custom .excalidrawlib file import
  const handleImportLibraryFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        let items: any[] = [];
        if (Array.isArray(parsed.library)) {
          items = parsed.library.map((elements: any[], idx: number) => ({
            id: `lib_item_${Date.now()}_${idx}`,
            status: 'published',
            elements: sanitizeExcalidrawElements(elements),
            created: Date.now(),
          }));
        } else if (Array.isArray(parsed.libraryItems)) {
          items = parsed.libraryItems;
        }

        if (items.length > 0) {
          const api = excalidrawAPIRef.current || (window as any)[`excalidraw_ref_${block.id}`];
          if (api && typeof api.updateLibrary === 'function') {
            api.updateLibrary({
              libraryItems: items,
              merge: true,
              openLibraryMenu: true,
            });
            toast.success(`${items.length} formas da biblioteca "${file.name}" importadas!`);
          } else {
            toast.success(`Biblioteca "${file.name}" importada com sucesso!`);
          }
        } else {
          toast.error('Nenhuma forma encontrada no arquivo de biblioteca.');
        }
      } catch {
        toast.error('Erro ao ler o arquivo .excalidrawlib.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Download official UML & ER .excalidrawlib file
  const handleDownloadUmlLibFile = () => {
    try {
      const blob = new Blob([JSON.stringify(UML_ER_LIBRARY_RAW, null, 2)], {
        type: 'application/vnd.excalidrawlib+json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'UML-ER-library.excalidrawlib';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Arquivo UML-ER-library.excalidrawlib baixado!');
    } catch {
      toast.error('Erro ao baixar arquivo da biblioteca.');
    }
  };

  // Handle direct file import of .excalidraw files
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        const parsed = JSON.parse(content);
        if (parsed.type === 'excalidraw' || Array.isArray(parsed.elements)) {
          const importedElements = parsed.elements || parsed;
          const importedAppState = parsed.appState || {};
          
          updateBlock(block.id, {
            excalidrawElements: JSON.stringify(importedElements),
            excalidrawAppState: JSON.stringify(importedAppState),
            excalidrawTitle: file.name.replace(/\.excalidraw$/i, ''),
            excalidrawLastEdited: new Date().toISOString(),
          });

          toast.success(`Painel "${file.name}" importado com sucesso!`);
          setIsEditorOpen(true);
        } else {
          toast.error('O arquivo selecionado não parece ser um JSON válido do Excalidraw.');
        }
      } catch {
        toast.error('Erro ao ler ou processar o JSON do arquivo.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export Excalidraw project file (.excalidraw)
  const handleExportExcalidraw = () => {
    try {
      const elements = JSON.parse(elementsJson);
      const appState = JSON.parse(appStateJson);
      const files = JSON.parse(filesJson);

      const payload = {
        type: 'excalidraw',
        version: 2,
        source: 'https://excalidraw.com',
        elements,
        appState: {
          ...appState,
          viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
        },
        files,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/\s+/g, '_') || 'desenho'}.excalidraw`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Arquivo .excalidraw baixado com sucesso!');
    } catch (e) {
      toast.error('Erro ao exportar arquivo .excalidraw');
    }
  };

  // Export as static local vector image (.svg)
  const handleExportSvg = async () => {
    try {
      if (previewSvg) {
        const blob = new Blob([previewSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.toLowerCase().replace(/\s+/g, '_') || 'desenho'}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Arquivo vetorial SVG exportado!');
        return;
      }

      toast.error('Nenhum vetor de desenho gerado ainda. Abra o editor e salve para gerar o preview.');
    } catch {
      toast.error('Erro ao gerar exportação SVG.');
    }
  };

  // Apply quick starter template
  const handleApplyTemplate = (key: keyof typeof STARTER_TEMPLATES) => {
    const t = STARTER_TEMPLATES[key];
    
    // Create pre-rendered mock SVG or direct element list
    updateBlock(block.id, {
      excalidrawTitle: t.name,
      excalidrawElements: JSON.stringify(t.elements),
      excalidrawAppState: JSON.stringify({ viewBackgroundColor: '#ffffff' }),
      excalidrawLastEdited: new Date().toISOString(),
    });

    toast.success(`Modelo "${t.name}" aplicado! Clique em "Editar" para desenhar.`);
    setIsEditorOpen(true);
  };

  // Core callback when Excalidraw editor modal is closed or saves state
  const handleSaveAndClose = async (finalElements: any[], finalAppState: any, finalFiles: any) => {
    try {
      const sanitizedEls = sanitizeExcalidrawElements(finalElements);
      const serializedElements = JSON.stringify(sanitizedEls);
      const serializedAppState = JSON.stringify(finalAppState || {});
      const serializedFiles = JSON.stringify(finalFiles || {});

      let renderedSvgString = '';

      // Programmatically pre-render high-quality static SVG using excalidrawExport helper
      if (excalidrawExport?.exportToSvg && sanitizedEls && sanitizedEls.length > 0) {
        try {
          const svgElement = await excalidrawExport.exportToSvg({
            elements: sanitizedEls,
            appState: {
              ...finalAppState,
              exportBackground: true,
              viewBackgroundColor: finalAppState?.viewBackgroundColor || '#ffffff',
            },
            files: finalFiles || {},
          });
          renderedSvgString = svgElement.outerHTML;
        } catch (svgErr) {
          console.error('Failed to pre-render static Excalidraw preview:', svgErr);
        }
      }

      updateBlock(block.id, {
        excalidrawElements: serializedElements,
        excalidrawAppState: serializedAppState,
        excalidrawFiles: serializedFiles,
        drawioSvg: renderedSvgString || previewSvg, // Stores pre-rendered high-res vector in drawioSvg for seamless instant Canvas rendering
        excalidrawLastEdited: new Date().toISOString(),
      });

      setIsEditorOpen(false);
      toast.success('Painel Excalidraw atualizado!');
    } catch {
      toast.error('Falha ao salvar as alterações do Excalidraw.');
    }
  };

  return (
    <>
      <Rnd
        size={{ width: widthVal, height: heightVal }}
        position={{ x: block.x, y: Math.max(12, block.y) }}
        style={{
          zIndex: isSelected ? 40 : 12,
          touchAction: 'none',
        }}
        onDragStart={() => {
          setSelectedId?.(block.id);
        }}
        onDragStop={(_e, d) => {
          updateBlock(block.id, { x: Math.max(0, d.x), y: Math.max(12, d.y) });
        }}
        enableResizing={{
          top: false,
          right: true,
          bottom: true,
          left: false,
          topRight: false,
          bottomRight: true,
          bottomLeft: false,
          topLeft: false,
        }}
        resizeHandleStyles={{
          right: { cursor: 'ew-resize', width: '8px', right: '-4px', zIndex: 35 },
          bottom: { cursor: 'ns-resize', height: '8px', bottom: '-4px', zIndex: 35 },
          bottomRight: { cursor: 'nwse-resize', width: '14px', height: '14px', right: '-4px', bottom: '-4px', zIndex: 36 },
        }}
        onResizeStop={(_e, direction, ref, _delta, position) => {
          updateBlock(block.id, {
            width: ref.offsetWidth,
            height: ref.offsetHeight,
            x: Math.max(0, position.x),
            y: Math.max(12, position.y),
          });
        }}
        dragHandleClassName="excalidraw-drag-handle"
        bounds="parent"
        minWidth={460}
        minHeight={320}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedId?.(block.id);
        }}
        className={`group transition-shadow ${
          isSelected ? 'z-40 ring-2 ring-indigo-500 shadow-xl' : 'hover:z-30 z-10 hover:shadow-md'
        }`}
      >
        <div 
          className="w-full h-full flex flex-col rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm overflow-hidden text-slate-800 dark:text-zinc-100"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Header Bar */}
          <div className="h-10 px-3 bg-slate-50/90 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-700 flex items-center justify-between gap-2 shrink-0 select-none">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className="excalidraw-drag-handle cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                title="Arrastar bloco de desenho"
              >
                <GripHorizontal size={14} />
              </div>

              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Shapes size={13} />
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => updateBlock(block.id, { excalidrawTitle: e.target.value })}
                  placeholder="Nome do Quadro Excalidraw..."
                  className="text-xs font-semibold bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 text-slate-800 dark:text-zinc-200 truncate max-w-[220px]"
                />
              </div>

              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 hidden sm:inline-block">
                Excalidraw
              </span>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-1 shrink-0">
              {previewSvg && (
                <div className="flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-md p-0.5 mr-1">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.4, z - 0.15))}
                    className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded"
                    title="Diminuir Zoom"
                  >
                    <ZoomOut size={12} />
                  </button>
                  <span className="text-[10px] font-mono px-1 text-slate-500 dark:text-zinc-400 min-w-[32px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.15))}
                    className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded"
                    title="Aumentar Zoom"
                  >
                    <ZoomIn size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded border-l border-slate-200 dark:border-zinc-700 ml-0.5"
                    title="Resetar Zoom (100%)"
                  >
                    <RotateCcw size={11} />
                  </button>
                </div>
              )}

              {/* UML & ER Library Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 gap-1 font-medium border border-indigo-200/60 dark:border-indigo-800/60"
                    title="Biblioteca de Formas UML & ER (BjoernKW)"
                  >
                    <Code2 size={12} className="text-indigo-600 dark:text-indigo-400" />
                    <span className="hidden sm:inline">UML & ER</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-88 p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl z-50 rounded-xl" align="end">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5">
                      <Code2 size={14} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-100">Biblioteca UML & ER</span>
                    </div>
                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-semibold px-1.5 py-0.5 rounded">
                      21 Formas Prontas
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mb-2.5 leading-relaxed">
                    Biblioteca oficial <span className="font-semibold text-slate-700 dark:text-zinc-300">BjoernKW/UML-ER</span> com classes, cardinalidades e diagramas relacionais.
                  </p>

                  <div className="space-y-1.5 mb-2.5">
                    <Button
                      size="sm"
                      onClick={handleLoadUmlLibrary}
                      className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-1.5 shadow-xs"
                    >
                      <BookOpen size={13} />
                      <span>Abrir Editor com Painel UML & ER</span>
                    </Button>

                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => libraryFileInputRef.current?.click()}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-[11px] font-medium text-slate-700 dark:text-zinc-200 flex items-center justify-center gap-1"
                        title="Importar outro arquivo .excalidrawlib"
                      >
                        <Upload size={12} className="text-indigo-500" />
                        <span>Importar .lib</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadUmlLibFile}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-[11px] font-medium text-slate-700 dark:text-zinc-200 flex items-center justify-center gap-1"
                        title="Baixar arquivo da biblioteca"
                      >
                        <FolderDown size={12} className="text-indigo-500" />
                        <span>Baixar .lib</span>
                      </button>
                    </div>
                  </div>

                  {/* Search in Popover */}
                  <div className="relative mb-2">
                    <Search size={12} className="absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={umlSearchQuery}
                      onChange={(e) => setUmlSearchQuery(e.target.value)}
                      placeholder="Buscar forma UML (ex: classe, ator, 1..n)..."
                      className="w-full pl-7 pr-6 py-1 text-xs rounded-md bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                    {umlSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setUmlSearchQuery('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Categories Pills */}
                  <div className="flex gap-1 overflow-x-auto pb-1 mb-2 scrollbar-none">
                    {UML_ER_SHAPES_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setUmlCategoryFilter(cat.id)}
                        className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap transition-colors font-medium ${
                          umlCategoryFilter === cat.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {cat.title}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 dark:border-zinc-800 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Clique para Inserir na Tela ({filteredUmlShapes.length}):
                    </span>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {filteredUmlShapes.map((shape) => (
                        <button
                          key={shape.index}
                          type="button"
                          onClick={() => handleInsertUmlShape(shape.index)}
                          className="w-full p-1.5 text-left rounded bg-slate-50 dark:bg-zinc-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-slate-200/70 dark:border-zinc-700/60 text-[11px] flex items-center justify-between group transition-colors"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 shrink-0">
                              {shape.badge || 'UML'}
                            </span>
                            <span className="truncate text-slate-700 dark:text-zinc-200 font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              {shape.name}
                            </span>
                          </div>
                          <Plus size={12} className="text-slate-400 group-hover:text-indigo-600 shrink-0 ml-1" />
                        </button>
                      ))}
                      {filteredUmlShapes.length === 0 && (
                        <p className="text-center py-3 text-xs text-slate-400">
                          Nenhuma forma encontrada.
                        </p>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Language Selector Popover on Card */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 gap-1 font-medium"
                    title={`Idioma do Excalidraw: ${currentLangObj.label}`}
                  >
                    <Languages size={12} className="text-emerald-500" />
                    <span>{currentLangObj.flag}</span>
                    <span className="hidden xl:inline text-[11px]">{currentLangObj.short}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl z-50 rounded-xl" align="end">
                  <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-slate-100 dark:border-zinc-800 px-1">
                    <div className="flex items-center gap-1.5">
                      <Languages size={13} className="text-emerald-500" />
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-100">Idioma da Lousa</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedLang}
                    </span>
                  </div>
                  <div className="space-y-0.5 max-h-60 overflow-y-auto pr-0.5">
                    {EXCALIDRAW_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`w-full px-2 py-1.5 text-left rounded text-xs flex items-center justify-between transition-colors ${
                          selectedLang === lang.code
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/60'
                            : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{lang.flag}</span>
                          <span className="truncate">{lang.label}</span>
                        </div>
                        {selectedLang === lang.code && <Check size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0 ml-1" />}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Templates Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 gap-1"
                    title="Modelos de diagramas profissionais do Excalidraw"
                  >
                    <Sparkles size={12} className="text-indigo-500" />
                    <span className="hidden md:inline">Modelos</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-lg z-50" align="end">
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 mb-2 px-1">
                    Modelos Rápidos do Excalidraw
                  </p>
                  <div className="space-y-1.5">
                    {Object.entries(STARTER_TEMPLATES).map(([key, t]) => {
                      const IconComponent = t.icon;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleApplyTemplate(key as keyof typeof STARTER_TEMPLATES)}
                          className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-start gap-2.5 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700"
                        >
                          <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0">
                            <IconComponent size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-zinc-100">{t.name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">{t.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Import / Export Menu */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
                    title="Importar / Exportar desenho"
                  >
                    <Download size={13} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 z-50" align="end">
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded flex items-center gap-2"
                    >
                      <Upload size={13} className="text-indigo-500" />
                      <span>Importar .excalidraw</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportExcalidraw}
                      className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded flex items-center gap-2"
                    >
                      <FileCode size={13} className="text-indigo-500" />
                      <span>Exportar .excalidraw</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportSvg}
                      className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded flex items-center gap-2"
                    >
                      <Download size={13} className="text-emerald-500" />
                      <span>Exportar SVG</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              <input
                ref={fileInputRef}
                type="file"
                accept=".excalidraw,.json"
                onChange={handleFileImport}
                className="hidden"
              />

              {/* Layer Positioning */}
              {bringToFront && (
                <button
                  type="button"
                  onClick={() => bringToFront(block.id)}
                  className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded hover:bg-slate-200/60 dark:hover:bg-zinc-700"
                  title="Trazer para frente"
                >
                  <ArrowUpToLine size={13} />
                </button>
              )}
              {sendToBack && (
                <button
                  type="button"
                  onClick={() => sendToBack(block.id)}
                  className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded hover:bg-slate-200/60 dark:hover:bg-zinc-700"
                  title="Enviar para trás"
                >
                  <ArrowDownToLine size={13} />
                </button>
              )}

              {/* Edit Button */}
              <Button
                size="sm"
                onClick={() => setIsEditorOpen(true)}
                className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-1.5 shadow-2xs"
                title="Abrir lousa interativa do Excalidraw"
              >
                <Edit3 size={12} />
                <span>Editar</span>
              </Button>

              {/* Action dropdown */}
              <BlockActionMenu
                block={block}
                onMoveOrCopy={onMoveOrCopy}
                onDuplicate={onDuplicate}
                onCopyClipboard={onCopyClipboard}
                onRemove={removeBlock}
                showMoveButtonDirectly={false}
                triggerClassName="h-7 w-7 p-0 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded hover:bg-slate-200/60 dark:hover:bg-zinc-700"
              />

              {/* Remove block */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeBlock(block.id)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                title="Excluir quadro Excalidraw"
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>

          {/* Canvas Box Body - Pure White Canvas Board */}
          <div 
            className="flex-1 w-full h-full relative overflow-hidden bg-white flex items-center justify-center"
            onDoubleClick={() => setIsEditorOpen(true)}
          >
            {/* Case A: SVG Preview is pre-rendered on solid white board */}
            {previewSvg ? (
              <div 
                className="w-full h-full p-4 flex items-center justify-center overflow-auto relative select-none bg-white"
                style={{ cursor: 'pointer' }}
                title="Clique duplo para desenhar no Excalidraw"
              >
                <div 
                  className="transition-transform duration-150 origin-center flex items-center justify-center bg-white"
                  style={{ transform: `scale(${zoomLevel})` }}
                  dangerouslySetInnerHTML={{ __html: previewSvg }}
                />

                {isHovered && (
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/80 dark:bg-zinc-800/90 text-white text-[11px] font-medium backdrop-blur shadow-md flex items-center gap-1.5 pointer-events-none">
                    <Edit3 size={11} className="text-indigo-400" />
                    <span>Clique 2x para desenhar</span>
                  </div>
                )}
              </div>
            ) : elementsJson && elementsJson !== '[]' ? (
              /* Case B: Has elements, but no SVG preview yet */
              <div className="flex flex-col items-center justify-center p-6 text-center z-10 bg-white">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 shadow-inner">
                  <Shapes size={24} />
                </div>
                <h4 className="text-sm font-semibold text-slate-800 mb-1">
                  Quadro Excalidraw pronto para renderizar
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mb-4">
                  Seus elementos estão guardados. Clique no botão de editar para abrir a tela cheia.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsEditorOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-xs font-medium shadow-sm"
                >
                  <Edit3 size={13} />
                  <span>Abrir no Excalidraw</span>
                </Button>
              </div>
            ) : (
              /* Case C: Totally blank new canvas block */
              <div className="flex flex-col items-center justify-center p-6 text-center z-10 max-w-md bg-white">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 shadow-inner">
                  <Shapes size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Desenho com Excalidraw
                </h4>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Crie wireframes, diagramas estruturados, ideias de interfaces e croquis com a lousa virtual do Excalidraw em um quadro inteiramente branco.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                  <Button
                    size="sm"
                    onClick={() => setIsEditorOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs font-semibold shadow-xs"
                  >
                    <Edit3 size={13} />
                    <span>Quadro em Branco</span>
                  </Button>
                </div>

                <div className="pt-3 border-t border-slate-200 w-full">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Ou inicie com um modelo corporativo:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {Object.entries(STARTER_TEMPLATES).map(([key, t]) => {
                      const IconComponent = t.icon;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleApplyTemplate(key as keyof typeof STARTER_TEMPLATES)}
                          className="px-2 py-1.5 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 text-left flex flex-col items-center justify-center text-center gap-1 transition-colors group"
                        >
                          <IconComponent size={14} className="text-indigo-500 shrink-0" />
                          <span className="text-[10px] font-semibold text-slate-700 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate max-w-full">
                            {t.name.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Rnd>

      {/* Excalidraw Interactive IFrame-like Dialog Editor */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-[98vw] w-[1560px] h-[94vh] max-h-[94vh] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 flex flex-col z-50">
          {/* Modal Header */}
          <div className="h-11 px-4 bg-slate-900 text-white flex items-center justify-between shrink-0 select-none border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                <Shapes size={14} />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-white">
                  Lousa Excalidraw: <span className="text-indigo-400">{title}</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/80 text-indigo-200 border border-indigo-700/60 hidden sm:inline-block">
                  Biblioteca UML/ER BjoernKW
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* UML & ER Side Panel Toggle Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsUmlDrawerOpen((prev) => !prev)}
                className={`h-7 px-2.5 text-xs font-medium gap-1.5 shadow-2xs transition-colors ${
                  isUmlDrawerOpen
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-indigo-300'
                }`}
                title={isUmlDrawerOpen ? 'Recolher Painel UML & ER' : 'Expandir Painel de Formas UML & ER'}
              >
                {isUmlDrawerOpen ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />}
                <span>Painel UML & ER</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                  isUmlDrawerOpen ? 'bg-indigo-800 text-white' : 'bg-slate-700 text-indigo-200'
                }`}>
                  21
                </span>
              </Button>

              {/* Quick Shape Dropdown inside Editor Modal */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 font-medium gap-1 shadow-2xs"
                    title="Menu Rápido de Formas"
                  >
                    <Code2 size={13} className="text-indigo-400" />
                    <span className="hidden md:inline">Inserção Rápida</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 bg-slate-900 border border-slate-800 text-white shadow-2xl z-50 rounded-xl" align="end">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Code2 size={14} className="text-indigo-400" />
                      <span className="text-xs font-bold text-white">Formas Mais Usadas</span>
                    </div>
                    <span className="text-[10px] bg-indigo-600/30 text-indigo-300 font-medium px-1.5 py-0.5 rounded border border-indigo-500/30">
                      UML & ER
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => handleInsertUmlShape(0)}
                      className="p-1.5 text-left rounded bg-slate-800 hover:bg-indigo-900/60 border border-slate-700 hover:border-indigo-600 text-[11px] text-slate-200 flex items-center gap-1.5 transition-colors"
                    >
                      <Table size={12} className="text-indigo-400 shrink-0" />
                      <span className="truncate">Classe UML</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertUmlShape(1)}
                      className="p-1.5 text-left rounded bg-slate-800 hover:bg-indigo-900/60 border border-slate-700 hover:border-indigo-600 text-[11px] text-slate-200 flex items-center gap-1.5 transition-colors"
                    >
                      <Boxes size={12} className="text-blue-400 shrink-0" />
                      <span className="truncate">Entidade ER</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertUmlShape(5)}
                      className="p-1.5 text-left rounded bg-slate-800 hover:bg-indigo-900/60 border border-slate-700 hover:border-indigo-600 text-[11px] text-slate-200 flex items-center gap-1.5 transition-colors"
                    >
                      <GitBranch size={12} className="text-amber-400 shrink-0" />
                      <span className="truncate">Diamante Relac.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertUmlShape(13)}
                      className="p-1.5 text-left rounded bg-slate-800 hover:bg-indigo-900/60 border border-slate-700 hover:border-indigo-600 text-[11px] text-slate-200 flex items-center gap-1.5 transition-colors"
                    >
                      <span className="font-mono text-[10px] font-bold text-indigo-300">0..1</span>
                      <span className="truncate">Cardinalidade 0..1</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertUmlShape(14)}
                      className="p-1.5 text-left rounded bg-slate-800 hover:bg-indigo-900/60 border border-slate-700 hover:border-indigo-600 text-[11px] text-slate-200 flex items-center gap-1.5 transition-colors"
                    >
                      <span className="font-mono text-[10px] font-bold text-indigo-300">1..n</span>
                      <span className="truncate">Cardinalidade 1..n</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertUmlShape(17)}
                      className="p-1.5 text-left rounded bg-slate-800 hover:bg-indigo-900/60 border border-slate-700 hover:border-indigo-600 text-[11px] text-slate-200 flex items-center gap-1.5 transition-colors"
                    >
                      <UserCheck size={12} className="text-emerald-400 shrink-0" />
                      <span className="truncate">Ator / Use Case</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Language Selector Dropdown inside Modal Header */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 font-medium gap-1.5 shadow-2xs"
                    title={`Alterar idioma do Excalidraw (${currentLangObj.label})`}
                  >
                    <Globe size={13} className="text-emerald-400" />
                    <span>{currentLangObj.flag}</span>
                    <span className="hidden sm:inline text-xs font-semibold text-emerald-300">{currentLangObj.short}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 bg-slate-900 border border-slate-800 text-white shadow-2xl z-50 rounded-xl" align="end">
                  <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-slate-800 px-1">
                    <div className="flex items-center gap-1.5">
                      <Languages size={14} className="text-emerald-400" />
                      <span className="text-xs font-bold text-white">Idioma do Editor</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedLang}
                    </span>
                  </div>
                  <div className="space-y-0.5 max-h-64 overflow-y-auto pr-0.5">
                    {EXCALIDRAW_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`w-full px-2 py-1.5 text-left rounded text-xs flex items-center justify-between transition-colors ${
                          selectedLang === lang.code
                            ? 'bg-emerald-950/80 text-emerald-300 font-semibold border border-emerald-700/60'
                            : 'hover:bg-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{lang.flag}</span>
                          <span className="truncate">{lang.label}</span>
                        </div>
                        {selectedLang === lang.code && <Check size={13} className="text-emerald-400 shrink-0 ml-1" />}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                size="sm"
                onClick={() => {
                  let el = lastElementsRef.current;
                  let state = lastAppStateRef.current;
                  let files = lastFilesRef.current;

                  const api = excalidrawAPIRef.current || (window as any)[`excalidraw_ref_${block.id}`];
                  if (api) {
                    try {
                      if (typeof api.getSceneElements === 'function') el = api.getSceneElements();
                      if (typeof api.getAppState === 'function') state = api.getAppState();
                      if (typeof api.getFiles === 'function') files = api.getFiles();
                    } catch (err) {
                      console.warn('Error reading from excalidraw API:', err);
                    }
                  }

                  if (el && el.length > 0) {
                    handleSaveAndClose(el, state, files);
                  } else {
                    setIsEditorOpen(false);
                  }
                }}
                className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5"
              >
                <Check size={13} />
                <span>Salvar e Fechar</span>
              </Button>

              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                title="Fechar editor"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Editor Workspace: Side UML Drawer + Excalidraw Canvas */}
          <div 
            className="flex-1 w-full flex relative overflow-hidden" 
            style={{ height: 'calc(94vh - 44px)' }}
          >
            {/* Dedicated Docked UML & ER Side Panel */}
            {isUmlDrawerOpen && (
              <div className="w-84 h-full bg-slate-900 border-r border-slate-800 text-white flex flex-col shrink-0 z-20 shadow-xl select-none">
                {/* Side Drawer Header */}
                <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 size={15} className="text-indigo-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">Formas UML & ER</h4>
                      <p className="text-[10px] text-slate-400">BjoernKW (21 componentes)</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsUmlDrawerOpen(false)}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    title="Ocultar Painel"
                  >
                    <PanelLeftClose size={15} />
                  </button>
                </div>

                {/* Search Bar in Side Panel */}
                <div className="p-2.5 border-b border-slate-800">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={umlSearchQuery}
                      onChange={(e) => setUmlSearchQuery(e.target.value)}
                      placeholder="Filtrar por nome (ex: classe, 1..n)..."
                      className="w-full pl-7 pr-7 py-1.5 text-xs rounded-md bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                    {umlSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setUmlSearchQuery('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category Pills */}
                <div className="px-2.5 py-2 border-b border-slate-800 flex gap-1 overflow-x-auto scrollbar-none">
                  {UML_ER_SHAPES_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setUmlCategoryFilter(cat.id)}
                      className={`text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition-colors font-medium ${
                        umlCategoryFilter === cat.id
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {cat.title}
                    </button>
                  ))}
                </div>

                {/* Shape Cards List */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">
                    Clique na forma para inserir ({filteredUmlShapes.length}):
                  </p>

                  {filteredUmlShapes.map((shape) => (
                    <button
                      key={shape.index}
                      type="button"
                      onClick={() => handleInsertUmlShape(shape.index)}
                      className="w-full p-2 text-left rounded-lg bg-slate-800/80 hover:bg-indigo-950/70 border border-slate-700 hover:border-indigo-500 text-slate-200 transition-all group flex items-start justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-900/90 text-indigo-300 border border-indigo-700/60 shrink-0">
                            {shape.badge || 'UML'}
                          </span>
                          <span className="text-xs font-semibold text-white group-hover:text-indigo-300 truncate">
                            {shape.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1 leading-snug">
                          {shape.description}
                        </p>
                      </div>
                      <div className="w-5 h-5 rounded bg-slate-700 group-hover:bg-indigo-600 text-slate-300 group-hover:text-white flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                        <Plus size={12} />
                      </div>
                    </button>
                  ))}

                  {filteredUmlShapes.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400">
                      <p>Nenhuma forma encontrada.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setUmlSearchQuery('');
                          setUmlCategoryFilter('all');
                        }}
                        className="text-indigo-400 hover:underline text-[11px] mt-1.5 block mx-auto"
                      >
                        Limpar filtros
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Quick Tools */}
                <div className="p-2.5 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={handleDownloadUmlLibFile}
                    className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center gap-1 text-[10px]"
                    title="Baixar arquivo .excalidrawlib"
                  >
                    <FolderDown size={11} className="text-indigo-400" />
                    <span>Baixar .lib</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => libraryFileInputRef.current?.click()}
                    className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center gap-1 text-[10px]"
                    title="Importar biblioteca externa"
                  >
                    <Upload size={11} className="text-indigo-400" />
                    <span>Importar .lib</span>
                  </button>
                </div>
              </div>
            )}

            {/* Main Canvas Area */}
            <div className="flex-1 h-full relative bg-slate-50 overflow-hidden">
              {ExcalidrawComponent ? (
                <ExcalidrawComponent
                  langCode={selectedLang}
                  excalidrawAPI={(api: any) => {
                    if (api) {
                      excalidrawAPIRef.current = api;
                      (window as any)[`excalidraw_ref_${block.id}`] = api;
                    }
                  }}
                  viewModeEnabled={false}
                  zenModeEnabled={false}
                  gridModeEnabled={false}
                  theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                  initialData={{
                    elements: (() => {
                      try {
                        const els = JSON.parse(elementsJson);
                        return sanitizeExcalidrawElements(Array.isArray(els) ? els : []);
                      } catch {
                        return [];
                      }
                    })(),
                    appState: (() => {
                      try {
                        const parsed = JSON.parse(appStateJson) || {};
                        if (parsed.collaborators) {
                          delete parsed.collaborators;
                        }
                        return {
                          ...parsed,
                          viewModeEnabled: false,
                          zenModeEnabled: false,
                          viewBackgroundColor: parsed.viewBackgroundColor || '#ffffff',
                          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
                        };
                      } catch {
                        return {
                          viewModeEnabled: false,
                          zenModeEnabled: false,
                          viewBackgroundColor: '#ffffff',
                          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
                        };
                      }
                    })(),
                    files: (() => {
                      try {
                        return JSON.parse(filesJson) || {};
                      } catch {
                        return {};
                      }
                    })(),
                    libraryItems: UML_ER_LIBRARY_ITEMS,
                  }}
                  onChange={(newElements: any[], newAppState: any, newFiles: any) => {
                    lastElementsRef.current = newElements;
                    lastAppStateRef.current = newAppState;
                    lastFilesRef.current = newFiles;
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-900 text-slate-500">
                  <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-3" />
                  <p className="text-xs font-semibold mb-3">Inicializando lousa Excalidraw...</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
