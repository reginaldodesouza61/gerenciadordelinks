import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { 
  CanvasBlock, 
  DrawingElement, 
  DrawingElementType, 
  DrawingPoint 
} from '@/types/notes';
import { 
  Sparkles, 
  Square, 
  Circle, 
  Diamond, 
  ArrowRight, 
  Minus, 
  Pencil, 
  Type, 
  Eraser, 
  MousePointer, 
  Database, 
  StickyNote, 
  Trash2, 
  Download, 
  Maximize2, 
  Minimize2, 
  Undo2, 
  Redo2, 
  Plus, 
  X,
  Palette,
  Loader2,
  Copy,
  Check,
  Grid,
  Layers,
  GripHorizontal,
  ArrowUpToLine,
  ArrowDownToLine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { generateDiagramWithAi, getGeminiApiKey } from '@/lib/geminiService';

interface WhiteboardBlockProps {
  block: CanvasBlock;
  updateBlock: (id: string, updates: Partial<CanvasBlock>) => void;
  removeBlock: (id: string) => void;
  isSelected?: boolean;
  setSelectedId?: (id: string | null) => void;
  bringToFront?: (id: string) => void;
  sendToBack?: (id: string) => void;
}

type ToolType = 
  | 'select' 
  | 'pen' 
  | 'rectangle' 
  | 'diamond' 
  | 'ellipse' 
  | 'cylinder' 
  | 'arrow' 
  | 'line' 
  | 'card' 
  | 'text' 
  | 'eraser';

const STROKE_COLORS = [
  '#0f172a', // Slate 900
  '#475569', // Slate 600
  '#4f46e5', // Indigo 600
  '#2563eb', // Blue 600
  '#0891b2', // Cyan 600
  '#059669', // Emerald 600
  '#d97706', // Amber 600
  '#dc2626', // Red 600
  '#9333ea', // Purple 600
  '#db2777', // Pink 600
];

const FILL_COLORS = [
  'transparent',
  '#f8fafc',
  '#eef2ff', // Indigo soft
  '#eff6ff', // Blue soft
  '#ecfeff', // Cyan soft
  '#ecfdf5', // Emerald soft
  '#fffbeb', // Amber soft
  '#fef2f2', // Red soft
  '#faf5ff', // Purple soft
  '#fdf2f8', // Pink soft
  '#fef08a', // Sticky yellow
];

const TEMPLATE_PRESETS = [
  {
    title: 'Fluxo Básico de Decisão',
    desc: 'Início, processo de validação, condição Sim/Não e finalização',
    elements: [
      { id: 't1', type: 'ellipse', x: 60, y: 40, width: 140, height: 50, text: 'Início', strokeColor: '#059669', fillColor: '#ecfdf5', strokeWidth: 2, fontSize: 14, textColor: '#065f46' },
      { id: 't2', type: 'arrow', x: 130, y: 90, width: 0, height: 50, strokeColor: '#475569', strokeWidth: 2 },
      { id: 't3', type: 'rectangle', x: 50, y: 140, width: 160, height: 60, text: 'Processar Requisição', strokeColor: '#4f46e5', fillColor: '#eef2ff', strokeWidth: 2, fontSize: 13, textColor: '#1e1b4b', rounded: true },
      { id: 't4', type: 'arrow', x: 130, y: 200, width: 0, height: 50, strokeColor: '#475569', strokeWidth: 2 },
      { id: 't5', type: 'diamond', x: 50, y: 250, width: 160, height: 80, text: 'Válido?', strokeColor: '#d97706', fillColor: '#fffbeb', strokeWidth: 2, fontSize: 13, textColor: '#78350f' },
      { id: 't6', type: 'arrow', x: 210, y: 290, width: 90, height: 0, text: 'Não', strokeColor: '#dc2626', strokeWidth: 2, fontSize: 12, textColor: '#991b1b' },
      { id: 't7', type: 'rectangle', x: 300, y: 260, width: 140, height: 60, text: 'Retornar Erro 400', strokeColor: '#dc2626', fillColor: '#fef2f2', strokeWidth: 2, fontSize: 13, textColor: '#991b1b', rounded: true },
      { id: 't8', type: 'arrow', x: 130, y: 330, width: 0, height: 50, text: 'Sim', strokeColor: '#059669', strokeWidth: 2, fontSize: 12, textColor: '#065f46' },
      { id: 't9', type: 'ellipse', x: 60, y: 380, width: 140, height: 50, text: 'Sucesso / Fim', strokeColor: '#059669', fillColor: '#ecfdf5', strokeWidth: 2, fontSize: 14, textColor: '#065f46' },
    ] as DrawingElement[]
  },
  {
    title: 'Arquitetura Web / APIs',
    desc: 'Cliente Web, API Gateway, Microsserviço e Banco de Dados',
    elements: [
      { id: 'a1', type: 'rectangle', x: 40, y: 60, width: 130, height: 60, text: '📱 Web / Mobile', strokeColor: '#2563eb', fillColor: '#eff6ff', strokeWidth: 2, fontSize: 13, textColor: '#1e3a8a', rounded: true },
      { id: 'a2', type: 'arrow', x: 170, y: 90, width: 70, height: 0, text: 'HTTPS', strokeColor: '#475569', strokeWidth: 2, fontSize: 11, textColor: '#475569' },
      { id: 'a3', type: 'rectangle', x: 240, y: 55, width: 140, height: 70, text: '🛡️ API Gateway / Auth', strokeColor: '#4f46e5', fillColor: '#eef2ff', strokeWidth: 2, fontSize: 13, textColor: '#1e1b4b', rounded: true },
      { id: 'a4', type: 'arrow', x: 380, y: 90, width: 70, height: 0, text: 'gRPC / Rest', strokeColor: '#475569', strokeWidth: 2, fontSize: 11, textColor: '#475569' },
      { id: 'a5', type: 'rectangle', x: 450, y: 60, width: 150, height: 60, text: '⚙️ Backend Service', strokeColor: '#0891b2', fillColor: '#ecfeff', strokeWidth: 2, fontSize: 13, textColor: '#155e75', rounded: true },
      { id: 'a6', type: 'arrow', x: 525, y: 120, width: 0, height: 60, strokeColor: '#475569', strokeWidth: 2 },
      { id: 'a7', type: 'cylinder', x: 455, y: 180, width: 140, height: 70, text: '🗄️ PostgreSQL', strokeColor: '#059669', fillColor: '#ecfdf5', strokeWidth: 2, fontSize: 13, textColor: '#065f46' },
      { id: 'a8', type: 'card', x: 40, y: 160, width: 160, height: 90, text: '💡 Nota:\nTokens JWT validados no Gateway com expiração de 1 hora.', strokeColor: '#d97706', fillColor: '#fffbeb', strokeWidth: 1.5, fontSize: 12, textColor: '#78350f' },
    ] as DrawingElement[]
  }
];

export const WhiteboardBlock: React.FC<WhiteboardBlockProps> = ({
  block,
  updateBlock,
  removeBlock,
  isSelected,
  setSelectedId,
  bringToFront,
  sendToBack,
}) => {
  const elements = block.elements || [];
  const title = block.drawingTitle || 'Quadro de Diagramas & Fluxos';
  const canvasBg = block.canvasBg || 'grid';

  // Active Tool & Styling State
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [currentStrokeColor, setCurrentStrokeColor] = useState<string>('#4f46e5');
  const [currentFillColor, setCurrentFillColor] = useState<string>('#eef2ff');
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(2);
  const [currentStrokeStyle, setCurrentStrokeStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [currentFontSize, setCurrentFontSize] = useState<number>(14);

  // Selection & Interaction
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState<string>('');

  // Undo / Redo History
  const [history, setHistory] = useState<DrawingElement[][]>([elements]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Fullscreen Modal Mode
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // AI Modal
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);

  // Canvas Drawing refs
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isMouseDownRef = useRef<boolean>(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [drawingElement, setDrawingElement] = useState<DrawingElement | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Push to history
  const pushHistory = useCallback((newElements: DrawingElement[]) => {
    setHistory(prev => {
      const next = prev.slice(0, historyIndex + 1);
      return [...next, newElements];
    });
    setHistoryIndex(prev => prev + 1);
    updateBlock(block.id, { elements: newElements });
  }, [block.id, historyIndex, updateBlock]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prevElements = history[newIndex] || [];
      updateBlock(block.id, { elements: prevElements });
      setSelectedElementId(null);
    }
  }, [block.id, history, historyIndex, updateBlock]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextElements = history[newIndex] || [];
      updateBlock(block.id, { elements: nextElements });
      setSelectedElementId(null);
    }
  }, [block.id, history, historyIndex, updateBlock]);

  // Keyboard shortcuts (Delete, Undo, Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingTextId) return; // Don't intercept when typing in text input
      if (!isSelected && !isFullscreen) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        e.preventDefault();
        const nextElements = elements.filter(el => el.id !== selectedElementId);
        pushHistory(nextElements);
        setSelectedElementId(null);
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingTextId, isSelected, isFullscreen, selectedElementId, elements, pushHistory, handleUndo, handleRedo]);

  // Get pointer coordinates relative to SVG
  const getCanvasCoords = (e: React.PointerEvent<SVGSVGElement>): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
    };
  };

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; // only left click
    const coords = getCanvasCoords(e);
    isMouseDownRef.current = true;
    startPosRef.current = coords;

    if (activeTool === 'select') {
      // Find top-most element clicked
      const clicked = [...elements].reverse().find(el => {
        if (el.type === 'pen' && el.points) {
          return el.points.some(p => Math.hypot(p.x - coords.x, p.y - coords.y) < 15);
        }
        if (el.type === 'arrow' || el.type === 'line') {
          const x1 = el.x;
          const y1 = el.y;
          const x2 = el.x + el.width;
          const y2 = el.y + el.height;
          // Simple distance to line bounding box
          const minX = Math.min(x1, x2) - 10;
          const maxX = Math.max(x1, x2) + 10;
          const minY = Math.min(y1, y2) - 10;
          const maxY = Math.max(y1, y2) + 10;
          return coords.x >= minX && coords.x <= maxX && coords.y >= minY && coords.y <= maxY;
        }
        return (
          coords.x >= el.x &&
          coords.x <= el.x + el.width &&
          coords.y >= el.y &&
          coords.y <= el.y + el.height
        );
      });

      if (clicked) {
        setSelectedElementId(clicked.id);
        setDragOffset({ x: coords.x - clicked.x, y: coords.y - clicked.y });
      } else {
        setSelectedElementId(null);
        setDragOffset(null);
      }
      return;
    }

    if (activeTool === 'eraser') {
      const clicked = [...elements].reverse().find(el => {
        return (
          coords.x >= el.x - 10 &&
          coords.x <= el.x + el.width + 10 &&
          coords.y >= el.y - 10 &&
          coords.y <= el.y + el.height + 10
        );
      });
      if (clicked) {
        const next = elements.filter(el => el.id !== clicked.id);
        pushHistory(next);
      }
      return;
    }

    if (activeTool === 'text') {
      const newElem: DrawingElement = {
        id: uuidv4(),
        type: 'text',
        x: coords.x,
        y: coords.y,
        width: 140,
        height: 40,
        text: 'Clique para editar',
        strokeColor: 'transparent',
        fillColor: 'transparent',
        fontSize: currentFontSize,
        textColor: currentStrokeColor === 'transparent' ? '#0f172a' : currentStrokeColor,
      };
      const next = [...elements, newElem];
      pushHistory(next);
      setSelectedElementId(newElem.id);
      setActiveTool('select');
      setEditingTextId(newElem.id);
      setEditingTextValue(newElem.text || '');
      return;
    }

    if (activeTool === 'pen') {
      const newElem: DrawingElement = {
        id: uuidv4(),
        type: 'pen',
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
        points: [coords],
        strokeColor: currentStrokeColor,
        strokeWidth: currentStrokeWidth,
        strokeStyle: currentStrokeStyle,
      };
      setDrawingElement(newElem);
      return;
    }

    // Shapes: rectangle, diamond, ellipse, cylinder, card, arrow, line
    const newElem: DrawingElement = {
      id: uuidv4(),
      type: activeTool as DrawingElementType,
      x: coords.x,
      y: coords.y,
      width: 0,
      height: 0,
      strokeColor: currentStrokeColor,
      fillColor: currentFillColor,
      strokeWidth: currentStrokeWidth,
      strokeStyle: currentStrokeStyle,
      fontSize: currentFontSize,
      textColor: currentStrokeColor === 'transparent' ? '#0f172a' : currentStrokeColor,
      rounded: true,
      text: activeTool === 'card' ? 'Nota rápida' : '',
    };
    setDrawingElement(newElem);
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isMouseDownRef.current) return;
    const coords = getCanvasCoords(e);

    if (activeTool === 'select' && selectedElementId && dragOffset) {
      const newX = Math.max(0, coords.x - dragOffset.x);
      const newY = Math.max(0, coords.y - dragOffset.y);
      const nextElements = elements.map(el => {
        if (el.id === selectedElementId) {
          if (el.type === 'pen' && el.points && el.points.length > 0) {
            const dx = newX - el.x;
            const dy = newY - el.y;
            return {
              ...el,
              x: newX,
              y: newY,
              points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy })),
            };
          }
          return { ...el, x: newX, y: newY };
        }
        return el;
      });
      updateBlock(block.id, { elements: nextElements });
      return;
    }

    if (drawingElement) {
      if (drawingElement.type === 'pen') {
        const nextPoints = [...(drawingElement.points || []), coords];
        setDrawingElement({
          ...drawingElement,
          points: nextPoints,
        });
      } else if (drawingElement.type === 'arrow' || drawingElement.type === 'line') {
        const w = coords.x - startPosRef.current.x;
        const h = coords.y - startPosRef.current.y;
        setDrawingElement({
          ...drawingElement,
          width: w,
          height: h,
        });
      } else {
        const x = Math.min(startPosRef.current.x, coords.x);
        const y = Math.min(startPosRef.current.y, coords.y);
        const w = Math.abs(coords.x - startPosRef.current.x);
        const h = Math.abs(coords.y - startPosRef.current.y);
        setDrawingElement({
          ...drawingElement,
          x,
          y,
          width: w,
          height: h,
        });
      }
    }
  };

  // Pointer Up
  const handlePointerUp = () => {
    isMouseDownRef.current = false;
    setDragOffset(null);

    if (drawingElement) {
      // Validate minimum dimension to avoid accidental micro-clicks
      const isValidShape = 
        drawingElement.type === 'pen' 
          ? (drawingElement.points && drawingElement.points.length > 1)
          : (Math.abs(drawingElement.width) > 10 || Math.abs(drawingElement.height) > 10);

      if (isValidShape) {
        // Provide default sensible sizes if drawn very small
        const finalElem = { ...drawingElement };
        if (finalElem.type !== 'pen' && finalElem.type !== 'arrow' && finalElem.type !== 'line') {
          if (finalElem.width < 50) finalElem.width = 120;
          if (finalElem.height < 30) finalElem.height = 60;
        }
        const next = [...elements, finalElem];
        pushHistory(next);
        setSelectedElementId(finalElem.id);
      }
      setDrawingElement(null);
      setActiveTool('select');
    }
  };

  // Double click to edit shape text
  const handleElementDoubleClick = (el: DrawingElement) => {
    setEditingTextId(el.id);
    setEditingTextValue(el.text || '');
  };

  const handleSaveText = () => {
    if (editingTextId) {
      const next = elements.map(el => 
        el.id === editingTextId ? { ...el, text: editingTextValue } : el
      );
      pushHistory(next);
      setEditingTextId(null);
    }
  };

  // AI Diagram Generation
  const handleGenerateAiDiagram = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Digite a descrição do fluxo desejado');
      return;
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      toast.error('Configure sua chave de API do Gemini nas configurações da IA para gerar diagramas.');
      return;
    }

    setIsAiGenerating(true);
    try {
      const res = await generateDiagramWithAi(aiPrompt, block.drawingTitle);
      if (res && res.elements && res.elements.length > 0) {
        pushHistory(res.elements);
        updateBlock(block.id, { 
          drawingTitle: res.title || block.drawingTitle,
          elements: res.elements 
        });
        toast.success(`Fluxo "${res.title}" gerado com sucesso!`);
        setIsAiModalOpen(false);
        setAiPrompt('');
      } else {
        toast.error('Não foi possível estruturar o diagrama. Tente detalhar mais o processo.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao gerar diagrama com IA: ${msg}`);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Apply Template
  const handleApplyTemplate = (preset: typeof TEMPLATE_PRESETS[0]) => {
    pushHistory(preset.elements);
    updateBlock(block.id, { 
      drawingTitle: preset.title,
      elements: preset.elements 
    });
    toast.success(`Modelo "${preset.title}" carregado no quadro!`);
  };

  // Export to PNG Image
  const handleExportPng = () => {
    if (!svgRef.current) return;
    try {
      const svg = svgRef.current;
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const rect = svg.getBoundingClientRect();
      const scale = 2; // high-res
      canvas.width = (rect.width || 800) * scale;
      canvas.height = (rect.height || 500) * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(scale, scale);
      // Background fill
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `${title.toLowerCase().replace(/\s+/g, '-')}-diagram.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        toast.success('Imagem do diagrama baixada com sucesso (PNG)!');
      };
      img.src = url;
    } catch (err) {
      console.error('Erro ao exportar PNG:', err);
      toast.error('Erro ao gerar imagem');
    }
  };

  // Export to SVG
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    try {
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `${title.toLowerCase().replace(/\s+/g, '-')}-diagram.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast.success('Vetor do diagrama baixado com sucesso (SVG)!');
    } catch (err) {
      console.error('Erro ao exportar SVG:', err);
      toast.error('Erro ao gerar SVG');
    }
  };

  // Copy Image to Clipboard
  const handleCopyImage = async () => {
    if (!svgRef.current) return;
    try {
      const svg = svgRef.current;
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const rect = svg.getBoundingClientRect();
      canvas.width = rect.width || 800;
      canvas.height = rect.height || 500;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = async () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
              toast.success('Imagem copiada para a área de transferência!');
            } catch {
              toast.error('Seu navegador não suporta cópia direta de imagem.');
            }
          }
        });
      };
      img.src = url;
    } catch (err) {
      console.error('Erro ao copiar imagem:', err);
    }
  };

  // Selected element helper
  const selectedElement = elements.find(el => el.id === selectedElementId);

  // Update selected element property
  const updateSelectedProperty = (key: keyof DrawingElement, val: unknown) => {
    if (!selectedElementId) return;
    const next = elements.map(el => 
      el.id === selectedElementId ? { ...el, [key]: val } : el
    );
    pushHistory(next);
  };

  // Render SVG Element
  const renderElement = (el: DrawingElement, isPreview = false) => {
    const isElemSelected = !isPreview && selectedElementId === el.id;
    const stroke = el.strokeColor || '#4f46e5';
    const fill = el.fillColor || 'transparent';
    const strokeWidth = el.strokeWidth || 2;
    const strokeDash = el.strokeStyle === 'dashed' ? '6,6' : el.strokeStyle === 'dotted' ? '2,4' : undefined;
    const fontSize = el.fontSize || 13;
    const textColor = el.textColor || (stroke === 'transparent' ? '#0f172a' : stroke);

    switch (el.type) {
      case 'rectangle':
        return (
          <g key={el.id} className="cursor-pointer group">
            <rect
              x={el.x}
              y={el.y}
              width={Math.max(10, el.width)}
              height={Math.max(10, el.height)}
              rx={el.rounded ? 8 : 0}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
              className="transition-all"
            />
            {el.text && (
              <text
                x={el.x + el.width / 2}
                y={el.y + el.height / 2 + 4}
                textAnchor="middle"
                fontSize={fontSize}
                fill={textColor}
                fontWeight="500"
                fontFamily="inherit"
                className="select-none pointer-events-none"
              >
                {el.text}
              </text>
            )}
          </g>
        );

      case 'diamond': {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const points = `${cx},${el.y} ${el.x + el.width},${cy} ${cx},${el.y + el.height} ${el.x},${cy}`;
        return (
          <g key={el.id} className="cursor-pointer">
            <polygon
              points={points}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
            />
            {el.text && (
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize={fontSize}
                fill={textColor}
                fontWeight="600"
                fontFamily="inherit"
                className="select-none pointer-events-none"
              >
                {el.text}
              </text>
            )}
          </g>
        );
      }

      case 'ellipse':
      case 'circle': {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const rx = Math.max(5, el.width / 2);
        const ry = Math.max(5, el.height / 2);
        return (
          <g key={el.id} className="cursor-pointer">
            <ellipse
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
            />
            {el.text && (
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize={fontSize}
                fill={textColor}
                fontWeight="500"
                fontFamily="inherit"
                className="select-none pointer-events-none"
              >
                {el.text}
              </text>
            )}
          </g>
        );
      }

      case 'cylinder': {
        const h = Math.max(20, el.height);
        const w = Math.max(20, el.width);
        const rx = w / 2;
        const ry = Math.min(15, h / 4);
        const cx = el.x + rx;
        return (
          <g key={el.id} className="cursor-pointer">
            <path
              d={`M ${el.x} ${el.y + ry} v ${h - 2 * ry} a ${rx} ${ry} 0 0 0 ${w} 0 v -${h - 2 * ry} Z`}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
            />
            <ellipse
              cx={cx}
              cy={el.y + ry}
              rx={rx}
              ry={ry}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
            />
            {el.text && (
              <text
                x={cx}
                y={el.y + h / 2 + 6}
                textAnchor="middle"
                fontSize={fontSize}
                fill={textColor}
                fontWeight="600"
                fontFamily="inherit"
                className="select-none pointer-events-none"
              >
                {el.text}
              </text>
            )}
          </g>
        );
      }

      case 'card':
        return (
          <g key={el.id} className="cursor-pointer">
            <rect
              x={el.x}
              y={el.y}
              width={Math.max(20, el.width)}
              height={Math.max(20, el.height)}
              rx={4}
              fill={fill === 'transparent' ? '#fef08a' : fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.08))"
            />
            {el.text && (
              <foreignObject
                x={el.x + 8}
                y={el.y + 8}
                width={Math.max(10, el.width - 16)}
                height={Math.max(10, el.height - 16)}
                className="overflow-hidden pointer-events-none"
              >
                <div 
                  className="text-xs text-slate-800 leading-snug whitespace-pre-wrap font-sans"
                  style={{ fontSize: `${fontSize}px`, color: textColor }}
                >
                  {el.text}
                </div>
              </foreignObject>
            )}
          </g>
        );

      case 'text':
        return (
          <g key={el.id} className="cursor-pointer">
            <text
              x={el.x}
              y={el.y + (el.fontSize || 14)}
              fontSize={fontSize}
              fill={textColor}
              fontWeight="500"
              fontFamily="inherit"
              className="select-none"
            >
              {el.text || 'Texto'}
            </text>
          </g>
        );

      case 'arrow': {
        const x1 = el.x;
        const y1 = el.y;
        const x2 = el.x + el.width;
        const y2 = el.y + el.height;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const arrowHeadLength = 12;
        const arrowHeadAngle = Math.PI / 6;

        const hx1 = x2 - arrowHeadLength * Math.cos(angle - arrowHeadAngle);
        const hy1 = y2 - arrowHeadLength * Math.sin(angle - arrowHeadAngle);
        const hx2 = x2 - arrowHeadLength * Math.cos(angle + arrowHeadAngle);
        const hy2 = y2 - arrowHeadLength * Math.sin(angle + arrowHeadAngle);

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2 - 8;

        return (
          <g key={el.id} className="cursor-pointer">
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
              strokeLinecap="round"
            />
            {/* Arrowhead */}
            <polygon
              points={`${x2},${y2} ${hx1},${hy1} ${hx2},${hy2}`}
              fill={stroke}
            />
            {el.text && (
              <text
                x={midX}
                y={midY}
                textAnchor="middle"
                fontSize={fontSize}
                fill={textColor}
                fontWeight="500"
                fontFamily="inherit"
                className="select-none pointer-events-none bg-white px-1"
              >
                {el.text}
              </text>
            )}
          </g>
        );
      }

      case 'line':
        return (
          <g key={el.id} className="cursor-pointer">
            <line
              x1={el.x}
              y1={el.y}
              x2={el.x + el.width}
              y2={el.y + el.height}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
              strokeLinecap="round"
            />
          </g>
        );

      case 'pen': {
        if (!el.points || el.points.length === 0) return null;
        const d = el.points.reduce((acc, p, i) => {
          return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
        }, '');
        return (
          <g key={el.id} className="cursor-pointer">
            <path
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      }

      default:
        return null;
    }
  };

  // Selection Bounding Box Overlay
  const renderSelectionBox = () => {
    if (!selectedElement || activeTool !== 'select') return null;
    const el = selectedElement;

    if (el.type === 'pen' && el.points) {
      const minX = Math.min(...el.points.map(p => p.x)) - 6;
      const maxX = Math.max(...el.points.map(p => p.x)) + 6;
      const minY = Math.min(...el.points.map(p => p.y)) - 6;
      const maxY = Math.max(...el.points.map(p => p.y)) + 6;
      return (
        <rect
          x={minX}
          y={minY}
          width={maxX - minX}
          height={maxY - minY}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="1.5"
          strokeDasharray="4,4"
          className="pointer-events-none"
        />
      );
    }

    if (el.type === 'arrow' || el.type === 'line') {
      const minX = Math.min(el.x, el.x + el.width) - 6;
      const maxX = Math.max(el.x, el.x + el.width) + 6;
      const minY = Math.min(el.y, el.y + el.height) - 6;
      const maxY = Math.max(el.y, el.y + el.height) + 6;
      return (
        <rect
          x={minX}
          y={minY}
          width={maxX - minX}
          height={maxY - minY}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="1.5"
          strokeDasharray="4,4"
          className="pointer-events-none"
        />
      );
    }

    return (
      <rect
        x={el.x - 4}
        y={el.y - 4}
        width={Math.max(10, el.width) + 8}
        height={Math.max(10, el.height) + 8}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="1.5"
        strokeDasharray="4,4"
        className="pointer-events-none"
      />
    );
  };

  // Canvas Body Component (shared between Normal & Fullscreen)
  const renderCanvasBody = (inModal = false) => {
    return (
      <div className="flex flex-col w-full h-full bg-white dark:bg-zinc-900 select-none overflow-hidden relative">
        {/* Main Floating Toolbars */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/90 dark:bg-zinc-900/90 backdrop-blur z-20 shrink-0">
          {/* Drawing Tools */}
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 p-1 rounded-lg border border-slate-200 dark:border-zinc-700 shadow-2xs">
            <Button
              size="icon"
              variant={activeTool === 'select' ? 'default' : 'ghost'}
              className={`h-7 w-7 ${activeTool === 'select' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-zinc-300'}`}
              onClick={() => setActiveTool('select')}
              title="Selecionar / Mover (V)"
            >
              <MousePointer size={14} />
            </Button>
            <Button
              size="icon"
              variant={activeTool === 'pen' ? 'default' : 'ghost'}
              className={`h-7 w-7 ${activeTool === 'pen' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-zinc-300'}`}
              onClick={() => setActiveTool('pen')}
              title="Caneta / Traço Livre (P)"
            >
              <Pencil size={14} />
            </Button>
            <div className="w-px h-4 bg-slate-200 dark:bg-zinc-700 mx-0.5" />
            <Button
              size="icon"
              variant={activeTool === 'rectangle' ? 'default' : 'ghost'}
              className={`h-7 w-7 ${activeTool === 'rectangle' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-zinc-300'}`}
              onClick={() => setActiveTool('rectangle')}
              title="Retângulo / Bloco de Ação (R)"
            >
              <Square size={14} />
            </Button>
            <Button
              size="icon"
              variant={activeTool === 'diamond' ? 'default' : 'ghost'}
              className={`h-7 w-7 ${activeTool === 'diamond' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-zinc-300'}`}
              onClick={() => setActiveTool('diamond')}
              title="Decisão / Condição Sim-Não (D)"
            >
              <Diamond size={14} />
            </Button>
            <Button
              size="icon"
              variant={activeTool === 'ellipse' ? 'default' : 'ghost'}
              className={`h-7 w-7 ${activeTool === 'ellipse' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-zinc-300'}`}
              onClick={() => setActiveTool('ellipse')}
              title="Início / Fim / Círculo (C)"
            >
              <Circle size={14} />
            </Button>
            <Button
              size="icon"
              variant={activeTool === 'cylinder' ? 'default' : 'ghost'}
              className={`h-7 w-7 ${activeTool === 'cylinder' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-zinc-300'}`}
              onClick={() => setActiveTool('cylinder')}
              title="Banco de Dados / Armazenamento"
            >
              <Database size={14} />
            </Button>
            <Button
              size="icon"
              variant={activeTool === 'arrow' ? 'default' : 'ghost'}
              className={`h-7 w-7 ${activeTool === 'arrow' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-zinc-300'}`}
              onClick={() => setActiveTool('arrow')}
              title="Seta Conectora com Direção (A)"
            >
              <ArrowRight size={14} />
            </Button>
            <Button
              size="icon"
              variant={activeTool === 'line' ? 'default' : 'ghost'}
              className={`h-7 w-7 ${activeTool === 'line' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-zinc-300'}`}
              onClick={() => setActiveTool('line')}
              title="Linha (L)"
            >
              <Minus size={14} />
            </Button>
            <Button
              size="icon"
              variant={activeTool === 'card' ? 'default' : 'ghost'}
              className={`h-7 w-7 ${activeTool === 'card' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-zinc-300'}`}
              onClick={() => setActiveTool('card')}
              title="Post-it / Nota Adesiva (N)"
            >
              <StickyNote size={14} />
            </Button>
            <Button
              size="icon"
              variant={activeTool === 'text' ? 'default' : 'ghost'}
              className={`h-7 w-7 ${activeTool === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-zinc-300'}`}
              onClick={() => setActiveTool('text')}
              title="Texto (T)"
            >
              <Type size={14} />
            </Button>
            <Button
              size="icon"
              variant={activeTool === 'eraser' ? 'default' : 'ghost'}
              className={`h-7 w-7 ${activeTool === 'eraser' ? 'bg-rose-600 text-white' : 'text-slate-600 dark:text-zinc-300'}`}
              onClick={() => setActiveTool('eraser')}
              title="Borracha / Excluir (E)"
            >
              <Eraser size={14} />
            </Button>
          </div>

          {/* Styling Properties (Stroke, Fill, Size) */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 p-1 rounded-lg border border-slate-200 dark:border-zinc-700 shadow-2xs">
            {/* Color Palette Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs font-medium">
                  <Palette size={13} className="text-indigo-600" />
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: selectedElement?.strokeColor || currentStrokeColor }} />
                  <span className="hidden sm:inline text-[11px]">Cor</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-2.5" align="start">
                <div className="space-y-2.5">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cor da Borda / Traço</span>
                    <div className="grid grid-cols-5 gap-1.5 mt-1">
                      {STROKE_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          className="w-7 h-7 rounded-md border border-slate-200 dark:border-zinc-700 hover:scale-110 transition-transform"
                          style={{ backgroundColor: c }}
                          onClick={() => {
                            setCurrentStrokeColor(c);
                            updateSelectedProperty('strokeColor', c);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cor de Preenchimento</span>
                    <div className="grid grid-cols-5 gap-1.5 mt-1">
                      {FILL_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          className="w-7 h-7 rounded-md border border-slate-300 dark:border-zinc-600 hover:scale-110 transition-transform flex items-center justify-center text-[10px]"
                          style={{ backgroundColor: c === 'transparent' ? '#ffffff' : c }}
                          onClick={() => {
                            setCurrentFillColor(c);
                            updateSelectedProperty('fillColor', c);
                          }}
                        >
                          {c === 'transparent' && '✕'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Stroke Width Selector */}
            <div className="flex items-center gap-0.5 border-l border-slate-200 dark:border-zinc-700 pl-1">
              {[1, 2, 3].map(w => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    setCurrentStrokeWidth(w);
                    updateSelectedProperty('strokeWidth', w);
                  }}
                  className={`h-6 px-1.5 rounded text-[11px] font-semibold transition-colors ${
                    (selectedElement?.strokeWidth || currentStrokeWidth) === w 
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' 
                      : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-400'
                  }`}
                  title={`Espessura ${w}px`}
                >
                  {w}px
                </button>
              ))}
            </div>

            {/* Dash style */}
            <div className="flex items-center gap-0.5 border-l border-slate-200 dark:border-zinc-700 pl-1">
              {(['solid', 'dashed'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setCurrentStrokeStyle(s);
                    updateSelectedProperty('strokeStyle', s);
                  }}
                  className={`h-6 px-1.5 rounded text-[11px] capitalize transition-colors ${
                    (selectedElement?.strokeStyle || currentStrokeStyle) === s 
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' 
                      : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-400'
                  }`}
                >
                  {s === 'solid' ? 'Contínuo' : 'Tracejado'}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons: AI, Templates, Export, Undo, Fullscreen */}
          <div className="flex items-center gap-1">
            {/* AI Generator Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAiModalOpen(true)}
              className="h-7 px-2.5 text-xs bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 rounded-md gap-1.5 font-semibold shadow-2xs"
              title="Gerar fluxo de processos ou arquitetura automaticamente com IA Gemini"
            >
              <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span className="hidden md:inline">Gerar Fluxo com IA</span>
              <span className="md:hidden">IA</span>
            </Button>

            {/* Templates Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-slate-700 dark:text-zinc-300">
                  <Layers size={13} className="mr-1 text-slate-500" />
                  <span className="hidden sm:inline">Modelos</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200 mb-1.5">Carregar Modelo de Fluxo</p>
                <div className="space-y-1">
                  {TEMPLATE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyTemplate(preset)}
                      className="w-full text-left p-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-100 dark:border-zinc-800 transition-colors"
                    >
                      <div className="text-xs font-medium text-slate-800 dark:text-zinc-200">{preset.title}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Undo / Redo */}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-slate-600 dark:text-zinc-300"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Desfazer (Ctrl+Z)"
            >
              <Undo2 size={13} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-slate-600 dark:text-zinc-300"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Refazer (Ctrl+Y)"
            >
              <Redo2 size={13} />
            </Button>

            {/* Export Menu */}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 text-slate-700 dark:text-zinc-300" title="Exportar imagem do fluxo">
                  <Download size={13} />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1.5" align="end">
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={handleExportPng}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 flex items-center gap-2"
                  >
                    <Download size={13} className="text-indigo-600" />
                    <span>Baixar Imagem PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportSvg}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 flex items-center gap-2"
                  >
                    <Download size={13} className="text-emerald-600" />
                    <span>Baixar Vetor SVG</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyImage}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 flex items-center gap-2"
                  >
                    {isCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-slate-600" />}
                    <span>Copiar como Imagem</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Fullscreen Toggle */}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-slate-600 dark:text-zinc-300"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Reduzir para bloco da nota' : 'Expandir tela cheia'}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </Button>
          </div>
        </div>

        {/* SVG Drawing Canvas Surface */}
        <div className={`relative flex-1 w-full h-full overflow-auto ${
          canvasBg === 'grid' 
            ? 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]' 
            : 'bg-white dark:bg-zinc-900'
        }`}>
          <svg
            ref={svgRef}
            viewBox="0 0 4000 3000"
            width="4000"
            height="3000"
            className="cursor-crosshair select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Render saved elements */}
            {elements.map(el => (
              <g 
                key={el.id} 
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleElementDoubleClick(el);
                }}
              >
                {renderElement(el)}
              </g>
            ))}

            {/* Render currently drawing element preview */}
            {drawingElement && renderElement(drawingElement, true)}

            {/* Selection highlight box */}
            {renderSelectionBox()}
          </svg>

          {/* Inline Text Editor Overlay when double-clicked */}
          {editingTextId && (
            <div 
              className="absolute z-30 bg-white dark:bg-zinc-800 p-2 rounded-lg shadow-xl border border-indigo-300 flex flex-col gap-2 min-w-56"
              style={{
                left: Math.min(window.innerWidth - 240, Math.max(20, (elements.find(el => el.id === editingTextId)?.x || 100))),
                top: Math.max(20, (elements.find(el => el.id === editingTextId)?.y || 100) - 20),
              }}
            >
              <span className="text-[11px] font-semibold text-slate-500">Editar Texto da Caixa:</span>
              <input
                type="text"
                autoFocus
                value={editingTextValue}
                onChange={e => setEditingTextValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveText();
                  if (e.key === 'Escape') setEditingTextId(null);
                }}
                className="text-xs px-2.5 py-1.5 border border-indigo-200 dark:border-zinc-700 rounded bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Digite o texto..."
              />
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2" onClick={() => setEditingTextId(null)}>Cancelar</Button>
                <Button size="sm" className="h-6 text-[11px] px-2 bg-indigo-600 text-white" onClick={handleSaveText}>Salvar</Button>
              </div>
            </div>
          )}

          {/* Empty Canvas Hint */}
          {elements.length === 0 && !drawingElement && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-zinc-600 flex flex-col items-center text-center">
              <Pencil size={24} className="mb-2 opacity-40 text-indigo-500" />
              <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Quadro em Branco</p>
              <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                Escolha uma forma na barra superior para desenhar ou clique em <strong>"Gerar Fluxo com IA"</strong> para criar automaticamente.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Rnd
        size={{ 
          width: typeof block.width === 'number' ? block.width : parseInt(String(block.width), 10) || 960, 
          height: typeof block.height === 'number' ? block.height : parseInt(String(block.height), 10) || 600 
        }}
        position={{ x: block.x, y: block.y }}
        style={{
          zIndex: isSelected ? 40 : 15,
        }}
        onDragStart={() => {
          setSelectedId?.(block.id);
          bringToFront?.(block.id);
        }}
        onDragStop={(_e, d) => {
          updateBlock(block.id, { x: d.x, y: d.y });
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
            ...(direction.includes('left') ? { x: position.x } : {}),
            ...(direction.includes('top') ? { y: position.y } : {}),
          });
        }}
        bounds="parent"
        dragHandleClassName="whiteboard-drag-handle"
        minWidth={600}
        minHeight={450}
        onMouseDown={() => {
          setSelectedId?.(block.id);
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedId?.(block.id);
        }}
        className={`group bg-white dark:bg-zinc-900 border rounded-xl transition-all overflow-hidden flex flex-col ${
          isSelected 
            ? 'ring-2 ring-indigo-500 border-indigo-400 shadow-xl' 
            : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-sm'
        }`}
      >
        {/* Card Header & Move Handle */}
        <div className="whiteboard-drag-handle px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 flex items-center justify-between cursor-grab active:cursor-grabbing select-none shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div 
              className="flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-grab active:cursor-grabbing py-0.5 pr-1"
              title="Arraste para mover o quadro pelo espaço de anotações"
            >
              <GripHorizontal size={15} />
            </div>
            <div className="w-5 h-5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Pencil size={11} />
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => updateBlock(block.id, { drawingTitle: e.target.value })}
              className="text-xs font-semibold text-slate-800 dark:text-zinc-200 bg-transparent border-none outline-none focus:bg-white dark:focus:bg-zinc-900 px-1 py-0.5 rounded truncate"
              placeholder="Título do Fluxograma..."
            />
            <span className="text-[10px] text-slate-400 bg-slate-200/60 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">
              {elements.length} {elements.length === 1 ? 'elemento' : 'elementos'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {bringToFront && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-slate-500 hover:text-slate-800 dark:text-zinc-400"
                onClick={(e) => {
                  e.stopPropagation();
                  bringToFront(block.id);
                  toast.success('Quadro trazido para a frente!');
                }}
                title="Trazer quadro para frente de todas as notas"
              >
                <ArrowUpToLine size={13} />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-slate-500 hover:text-slate-800 dark:text-zinc-400"
              onClick={() => setIsFullscreen(true)}
              title="Expandir para tela cheia"
            >
              <Maximize2 size={13} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
              onClick={() => removeBlock(block.id)}
              title="Remover este quadro"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        </div>

        {/* Normal In-Note Canvas Body */}
        <div className="flex-1 w-full min-h-0 relative">
          {renderCanvasBody(false)}
        </div>
      </Rnd>

      {/* Fullscreen Big Canvas Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[96vw] w-[96vw] h-[92vh] max-h-[92vh] p-0 flex flex-col overflow-hidden bg-white dark:bg-zinc-900">
          <DialogHeader className="px-4 py-2.5 border-b border-slate-200 dark:border-zinc-800 flex flex-row items-center justify-between shrink-0 space-y-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Pencil size={15} />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-800 dark:text-zinc-100">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-500">
                  Quadro de Diagramas & Desenho Livre com IA
                </DialogDescription>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsFullscreen(false)}
              className="h-7 px-2.5 text-xs text-slate-600"
            >
              <Minimize2 size={13} className="mr-1" />
              Fechar Tela Cheia
            </Button>
          </DialogHeader>
          <div className="flex-1 w-full min-h-0 relative">
            {renderCanvasBody(true)}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Flow Generator Modal */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="max-w-lg p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Sparkles size={18} />
              Gerar Fluxograma / Diagrama com IA Gemini
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Descreva o processo, esteira ou arquitetura e a IA desenhará as caixas, decisões e setas organizadas no quadro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 my-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1.5">
                O que você deseja desenhar?
              </label>
              <textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="Ex: Fluxo de login com Google OAuth, validação no banco PostgreSQL, geração de token JWT e redirecionamento para o Dashboard caso sucesso, ou tela de erro se falha."
                rows={4}
                className="w-full text-xs p-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Quick Suggestions */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">Sugestões rápidas:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Autenticação OAuth com Azure AD e Refresh Token',
                  'Esteira de Deploy CI/CD com Rollback automático',
                  'Processo de Aprovação de Compras com Gerência',
                  'Microsserviços com API Gateway, Redis e PostgreSQL'
                ].map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAiPrompt(sug)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 dark:border-zinc-700 transition-colors text-left"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAiModalOpen(false)}
              disabled={isAiGenerating}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleGenerateAiDiagram}
              disabled={isAiGenerating || !aiPrompt.trim()}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5"
            >
              {isAiGenerating ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Gerando Diagrama com IA...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Desenhar Fluxo</span>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
