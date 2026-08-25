/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
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
  HelpCircle
} from 'lucide-react';
import { BlockActionMenu } from '@/components/notes/dev/BlockActionMenu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

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
  flowchart: {
    name: 'Fluxograma de Decisão',
    icon: Workflow,
    description: 'Processo lógico corporativo com raias, decisões e fluxos.',
    elements: [
      { id: 'el1', type: 'rectangle', x: 250, y: 100, width: 140, height: 50, strokeColor: '#1e3a8a', backgroundColor: '#dbeafe', strokeWidth: 2, roughness: 1, roundness: { type: 3 }, strokeStyle: 'solid', fillStyle: 'solid', text: 'Iniciar Processo' },
      { id: 'el2', type: 'arrow', x: 320, y: 150, width: 0, height: 60, strokeColor: '#1e3a8a', strokeWidth: 2, roughness: 1, strokeStyle: 'solid' },
      { id: 'el3', type: 'diamond', x: 230, y: 210, width: 180, height: 100, strokeColor: '#b45309', backgroundColor: '#fef3c7', strokeWidth: 2, roughness: 1, strokeStyle: 'solid', fillStyle: 'solid', text: 'Token Ativo?' },
      { id: 'el4', type: 'arrow', x: 410, y: 260, width: 80, height: 0, strokeColor: '#b45309', strokeWidth: 2, roughness: 1, strokeStyle: 'solid' },
      { id: 'el5', type: 'rectangle', x: 490, y: 235, width: 150, height: 50, strokeColor: '#9f1239', backgroundColor: '#ffe4e6', strokeWidth: 2, roughness: 1, strokeStyle: 'solid', fillStyle: 'solid', text: 'Retornar 401\n(Acesso Negado)' },
      { id: 'el6', type: 'arrow', x: 320, y: 310, width: 0, height: 60, strokeColor: '#1e3a8a', strokeWidth: 2, roughness: 1, strokeStyle: 'solid' },
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
      { id: 'arch3', type: 'arrow', x: 190, y: 190, width: 100, height: 50, strokeColor: '#4f46e5', strokeWidth: 2, roughness: 1 },
      { id: 'arch4', type: 'arrow', x: 190, y: 310, width: 100, height: -70, strokeColor: '#4f46e5', strokeWidth: 2, roughness: 1 },
      { id: 'arch5', type: 'rectangle', x: 290, y: 180, width: 160, height: 140, strokeColor: '#0891b2', backgroundColor: '#ecfeff', strokeWidth: 2, roughness: 1, roundness: { type: 3 }, strokeStyle: 'solid', fillStyle: 'solid', text: 'API Gateway / Auth\n(Reverse Proxy & JWT)' },
      { id: 'arch6', type: 'arrow', x: 450, y: 250, width: 90, height: 0, strokeColor: '#0891b2', strokeWidth: 2, roughness: 1 },
      { id: 'arch7', type: 'rectangle', x: 540, y: 190, width: 150, height: 110, strokeColor: '#16a34a', backgroundColor: '#dcfce7', strokeWidth: 2, roughness: 1, roundness: { type: 3 }, strokeStyle: 'solid', fillStyle: 'solid', text: 'Core backend API\n(Node.js / Express)' }
    ]
  },
  database: {
    name: 'Modelagem de Banco (ERD)',
    icon: Database,
    description: 'Entidades relacionais com chaves primárias e relacionamentos.',
    elements: [
      { id: 'db1', type: 'rectangle', x: 100, y: 120, width: 180, height: 120, strokeColor: '#0f172a', backgroundColor: '#f1f5f9', strokeWidth: 2, roughness: 1, strokeStyle: 'solid', fillStyle: 'solid', text: 'ORGANIZATIONS\n------------------\n+ id: UUID [PK]\n+ name: VARCHAR\n+ created_at: TIMESTZ' },
      { id: 'db2', type: 'arrow', x: 280, y: 180, width: 140, height: 0, strokeColor: '#64748b', strokeWidth: 2, roughness: 1, strokeStyle: 'dashed' },
      { id: 'db3', type: 'rectangle', x: 420, y: 120, width: 180, height: 120, strokeColor: '#0f172a', backgroundColor: '#f1f5f9', strokeWidth: 2, roughness: 1, strokeStyle: 'solid', fillStyle: 'solid', text: 'USERS (Usuários)\n------------------\n+ id: UUID [PK]\n+ org_id: UUID [FK]\n+ email: VARCHAR [UQ]\n+ role: VARCHAR' }
    ]
  }
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const excalidrawAPIRef = useRef<any>(null);
  const lastElementsRef = useRef<any[]>([]);
  const lastAppStateRef = useRef<any>({});
  const lastFilesRef = useRef<any>({});

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
      const serializedElements = JSON.stringify(finalElements);
      const serializedAppState = JSON.stringify(finalAppState);
      const serializedFiles = JSON.stringify(finalFiles);

      let renderedSvgString = '';

      // Programmatically pre-render high-quality static SVG using excalidrawExport helper
      if (excalidrawExport?.exportToSvg && finalElements && finalElements.length > 0) {
        try {
          const svgElement = await excalidrawExport.exportToSvg({
            elements: finalElements,
            appState: {
              ...finalAppState,
              exportBackground: true,
              viewBackgroundColor: finalAppState.viewBackgroundColor || '#ffffff',
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
          <div className="h-11 px-4 bg-slate-900 text-white flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                <Shapes size={14} />
              </div>
              <div>
                <span className="font-semibold text-xs text-white">
                  Lousa Excalidraw: <span className="text-indigo-400">{title}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 hidden md:inline">
                Sincronizando com seu banco de dados • Clique em "Salvar" para fechar
              </span>

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

          {/* Render Active Excalidraw Component Client-Side */}
          <div 
            className="flex-1 w-full relative bg-slate-50 overflow-hidden" 
            style={{ height: 'calc(94vh - 44px)', width: '100%' }}
          >
            {ExcalidrawComponent ? (
              <ExcalidrawComponent
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
                      return Array.isArray(els) ? els : [];
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
        </DialogContent>
      </Dialog>
    </>
  );
}
