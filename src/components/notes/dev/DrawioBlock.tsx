import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { CanvasBlock } from '@/types/notes';
import { 
  Network, 
  Maximize2, 
  Trash2, 
  Download, 
  Upload, 
  Edit3, 
  Sparkles, 
  FileCode, 
  ExternalLink,
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
  GitBranch,
  X,
  Check,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

interface DrawioBlockProps {
  block: CanvasBlock;
  updateBlock: (id: string, updates: Partial<CanvasBlock>) => void;
  removeBlock: (id: string) => void;
  isSelected?: boolean;
  setSelectedId?: (id: string | null) => void;
  bringToFront?: (id: string) => void;
  sendToBack?: (id: string) => void;
}

// Starter Diagram Templates in Draw.io mxGraph XML format
const STARTER_TEMPLATES = {
  flowchart: {
    name: 'Fluxograma de Processo',
    icon: Workflow,
    description: 'Fluxo com início, decisão lógica e ramificações',
    xml: `<mxfile host="app.diagrams.net"><diagram name="Fluxograma" id="d1"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="start" value="Início" style="ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontStyle=1;fontSize=13;" vertex="1" parent="1"><mxGeometry x="340" y="80" width="120" height="60" as="geometry"/></mxCell><mxCell id="input" value="Receber Requisição&#xa;(Payload JSON)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=12;" vertex="1" parent="1"><mxGeometry x="325" y="180" width="150" height="60" as="geometry"/></mxCell><mxCell id="decision" value="Token e Dados&#xa;Válidos?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontStyle=1;fontSize=12;" vertex="1" parent="1"><mxGeometry x="320" y="280" width="160" height="90" as="geometry"/></mxCell><mxCell id="process" value="Processar Transação &amp;&#xa;Salvar no Banco" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=12;" vertex="1" parent="1"><mxGeometry x="325" y="420" width="150" height="60" as="geometry"/></mxCell><mxCell id="error" value="Retornar Erro HTTP 401&#xa;(Acesso Negado)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=12;" vertex="1" parent="1"><mxGeometry x="540" y="295" width="160" height="60" as="geometry"/></mxCell><mxCell id="end" value="Fim (Sucesso)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontStyle=1;fontSize=13;" vertex="1" parent="1"><mxGeometry x="340" y="530" width="120" height="60" as="geometry"/></mxCell><mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="start" target="input"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="e2" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="input" target="decision"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="e3" value="Sim" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;fontStyle=1;fontColor=#27ae60;" edge="1" parent="1" source="decision" target="process"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="e4" value="Não" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;fontStyle=1;fontColor=#c0392b;" edge="1" parent="1" source="decision" target="error"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="e5" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="process" target="end"><mxGeometry relative="1" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>`,
  },
  architecture: {
    name: 'Arquitetura Cloud & Microsserviços',
    icon: Server,
    description: 'Frontend, API Gateway, Serviços, Banco e Cache',
    xml: `<mxfile host="app.diagrams.net"><diagram name="Arquitetura" id="d2"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="client" value="Web &amp; Mobile Clients&#xa;(React SPA / App)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="80" y="200" width="140" height="70" as="geometry"/></mxCell><mxCell id="gateway" value="API Gateway / CDN&#xa;(Reverse Proxy / SSL)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="280" y="200" width="150" height="70" as="geometry"/></mxCell><mxCell id="auth_srv" value="Auth Service&#xa;(JWT &amp; OAuth2)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;" vertex="1" parent="1"><mxGeometry x="500" y="120" width="140" height="60" as="geometry"/></mxCell><mxCell id="core_srv" value="Core Backend API&#xa;(Node / Python / Go)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="500" y="280" width="150" height="65" as="geometry"/></mxCell><mxCell id="db" value="PostgreSQL Database&#xa;(Transações &amp; Entidades)" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="720" y="260" width="150" height="85" as="geometry"/></mxCell><mxCell id="redis" value="Redis Cache &amp; Queue" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=12;fillColor=#f8cecc;strokeColor=#b85450;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="720" y="120" width="140" height="65" as="geometry"/></mxCell><mxCell id="e_c_g" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;entryX=0;entryY=0.5;" edge="1" parent="1" source="client" target="gateway"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="e_g_a" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="gateway" target="auth_srv"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="e_g_c" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="gateway" target="core_srv"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="e_c_db" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="core_srv" target="db"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="e_a_r" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="auth_srv" target="redis"><mxGeometry relative="1" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>`,
  },
  database: {
    name: 'Banco de Dados (Modelo ER)',
    icon: Database,
    description: 'Tabelas relacionais com PK, FK e campos',
    xml: `<mxfile host="app.diagrams.net"><diagram name="Modelo ER" id="d3"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="tbl_users" value="USERS (Usuários)&#xa;------------------------&#xa;+ id: UUID [PK]&#xa;+ email: VARCHAR [UQ]&#xa;+ password_hash: TEXT&#xa;+ role: VARCHAR&#xa;+ created_at: TIMESTAMP" style="rounded=0;whiteSpace=wrap;html=1;align=left;spacingLeft=10;fillColor=#dae8fc;strokeColor=#6c8ebf;fontFamily=Courier New;fontSize=11;" vertex="1" parent="1"><mxGeometry x="100" y="160" width="180" height="110" as="geometry"/></mxCell><mxCell id="tbl_orders" value="ORDERS (Pedidos)&#xa;------------------------&#xa;+ id: UUID [PK]&#xa;+ user_id: UUID [FK]&#xa;+ total: NUMERIC(10,2)&#xa;+ status: VARCHAR&#xa;+ created_at: TIMESTAMP" style="rounded=0;whiteSpace=wrap;html=1;align=left;spacingLeft=10;fillColor=#d5e8d4;strokeColor=#82b366;fontFamily=Courier New;fontSize=11;" vertex="1" parent="1"><mxGeometry x="360" y="160" width="180" height="110" as="geometry"/></mxCell><mxCell id="tbl_items" value="ORDER_ITEMS&#xa;------------------------&#xa;+ id: UUID [PK]&#xa;+ order_id: UUID [FK]&#xa;+ product_id: UUID [FK]&#xa;+ quantity: INT&#xa;+ unit_price: NUMERIC" style="rounded=0;whiteSpace=wrap;html=1;align=left;spacingLeft=10;fillColor=#fff2cc;strokeColor=#d6b656;fontFamily=Courier New;fontSize=11;" vertex="1" parent="1"><mxGeometry x="620" y="160" width="180" height="110" as="geometry"/></mxCell><mxCell id="e_u_o" value="1 : N" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;fontStyle=1;" edge="1" parent="1" source="tbl_users" target="tbl_orders"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="e_o_i" value="1 : N" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;fontStyle=1;" edge="1" parent="1" source="tbl_orders" target="tbl_items"><mxGeometry relative="1" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>`,
  },
  sequence: {
    name: 'Diagrama de Sequência (UML)',
    icon: GitBranch,
    description: 'Interação entre Cliente, API e Banco ao longo do tempo',
    xml: `<mxfile host="app.diagrams.net"><diagram name="Sequencia" id="d4"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="act1" value="Usuário" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;" vertex="1" parent="1"><mxGeometry x="120" y="100" width="30" height="60" as="geometry"/></mxCell><mxCell id="obj_fe" value="Frontend (App)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="240" y="110" width="120" height="40" as="geometry"/></mxCell><mxCell id="obj_be" value="Backend API" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="420" y="110" width="120" height="40" as="geometry"/></mxCell><mxCell id="obj_db" value="Database (SQL)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="600" y="110" width="120" height="40" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>`,
  },
};

const DEFAULT_BLANK_XML = `<mxfile host="app.diagrams.net"><diagram name="Diagrama" id="page1"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`;

export function DrawioBlock({
  block,
  updateBlock,
  removeBlock,
  isSelected,
  setSelectedId,
  bringToFront,
  sendToBack,
}: DrawioBlockProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const title = block.drawioTitle || 'Diagrama Draw.io';
  const xmlData = block.drawioXml || '';
  const svgData = block.drawioSvg || '';

  // Safe dimension parser
  const widthVal = typeof block.width === 'number' ? block.width : parseInt(String(block.width), 10) || 760;
  const heightVal = typeof block.height === 'number' ? block.height : parseInt(String(block.height), 10) || 500;

  // Listen to Draw.io embed postMessages
  useEffect(() => {
    if (!isEditorOpen) return;

    const handleMessage = (event: MessageEvent) => {
      // Ensure msg is valid JSON string or object
      let msg: { event?: string; action?: string; xml?: string; exit?: boolean; data?: string } | null = null;
      try {
        msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (!msg || typeof msg !== 'object') return;

      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow) return;

      // 1. Draw.io initialized -> Load diagram XML
      if (msg.event === 'init') {
        const payloadXml = xmlData.trim() ? xmlData : DEFAULT_BLANK_XML;
        iframe.contentWindow.postMessage(
          JSON.stringify({
            action: 'load',
            autosave: 1,
            xml: payloadXml,
            title: title,
          }),
          '*'
        );
      }

      // 2. Autosave or Save event from Draw.io
      if (msg.event === 'autosave' || msg.event === 'save') {
        if (msg.xml) {
          updateBlock(block.id, {
            drawioXml: msg.xml,
            drawioLastEdited: new Date().toISOString(),
          });
          // Request rendered SVG export for crisp on-canvas rendering
          iframe.contentWindow.postMessage(
            JSON.stringify({
              action: 'export',
              format: 'xmlsvg',
            }),
            '*'
          );
        }
        if (msg.exit) {
          setIsEditorOpen(false);
          toast.success('Diagrama Draw.io salvo!');
        }
      }

      // 3. Export response containing rendered SVG
      if (msg.event === 'export') {
        if (msg.data) {
          updateBlock(block.id, {
            drawioSvg: msg.data,
            ...(msg.xml ? { drawioXml: msg.xml } : {}),
            drawioLastEdited: new Date().toISOString(),
          });
        }
      }

      // 4. Exit clicked in Draw.io toolbar
      if (msg.event === 'exit') {
        setIsEditorOpen(false);
        toast.info('Editor Draw.io fechado.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isEditorOpen, xmlData, title, block.id, updateBlock]);

  // Load a starter template
  const handleApplyTemplate = (templateKey: keyof typeof STARTER_TEMPLATES) => {
    const t = STARTER_TEMPLATES[templateKey];
    updateBlock(block.id, {
      drawioTitle: t.name,
      drawioXml: t.xml,
      drawioSvg: '', // will be generated upon opening/saving
      drawioLastEdited: new Date().toISOString(),
    });
    toast.success(`Modelo "${t.name}" aplicado! Abrindo editor...`);
    setIsEditorOpen(true);
  };

  // Export Diagram File (.drawio)
  const handleExportDrawioFile = () => {
    if (!xmlData) {
      toast.error('Nenhum diagrama criado para exportar.');
      return;
    }
    const blob = new Blob([xmlData], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_') || 'diagrama'}.drawio`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Arquivo .drawio baixado com sucesso!');
  };

  // Export as SVG File
  const handleExportSvgFile = () => {
    if (!svgData) {
      toast.error('Abra e salve o diagrama para gerar o SVG exportável.');
      return;
    }
    const a = document.createElement('a');
    a.href = svgData;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_') || 'diagrama'}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Imagem vetorial SVG baixada com sucesso!');
  };

  // Import .drawio or .xml file
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && content.includes('<mxGraphModel') || content.includes('<mxfile')) {
        updateBlock(block.id, {
          drawioXml: content,
          drawioSvg: '',
          drawioTitle: file.name.replace(/\.(drawio|xml)$/i, ''),
          drawioLastEdited: new Date().toISOString(),
        });
        toast.success(`Diagrama "${file.name}" importado com sucesso!`);
        setIsEditorOpen(true);
      } else {
        toast.error('O arquivo selecionado não é um diagrama Draw.io (.drawio / .xml) válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <Rnd
        size={{ width: widthVal, height: heightVal }}
        position={{ x: block.x, y: block.y }}
        onDragStop={(_e, d) => {
          updateBlock(block.id, { x: d.x, y: d.y });
        }}
        onResizeStop={(_e, _direction, ref, _delta, position) => {
          updateBlock(block.id, {
            width: parseInt(ref.style.width, 10),
            height: parseInt(ref.style.height, 10),
            ...position,
          });
        }}
        dragHandleClassName="drawio-drag-handle"
        bounds="parent"
        minWidth={460}
        minHeight={320}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedId?.(block.id);
        }}
        className={`group z-10 transition-shadow ${
          isSelected ? 'ring-2 ring-amber-500 shadow-xl' : 'hover:shadow-md'
        }`}
        style={{ touchAction: 'none' }}
      >
        <div 
          className="w-full h-full flex flex-col rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm overflow-hidden text-slate-800 dark:text-zinc-100"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Header Bar */}
          <div className="h-10 px-3 bg-slate-50/90 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-700 flex items-center justify-between gap-2 shrink-0 select-none">
            {/* Drag Handle & Title */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className="drawio-drag-handle cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                title="Arrastar bloco de diagrama"
              >
                <GripHorizontal size={14} />
              </div>

              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Network size={13} />
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => updateBlock(block.id, { drawioTitle: e.target.value })}
                  placeholder="Nome do Diagrama..."
                  className="text-xs font-semibold bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500 rounded px-1 text-slate-800 dark:text-zinc-200 truncate max-w-[220px]"
                />
              </div>

              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800 hidden sm:inline-block">
                Draw.io
              </span>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Zoom Controls (when preview exists) */}
              {svgData && (
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
                    title="Modelos prontos de fluxos e arquitetura"
                  >
                    <Sparkles size={12} className="text-amber-500" />
                    <span className="hidden md:inline">Modelos</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-lg" align="end">
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 mb-2 px-1">
                    Modelos de Diagrama Draw.io
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
                          <div className="p-1.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0">
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
                    title="Importar / Exportar diagrama"
                  >
                    <Download size={13} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" align="end">
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded flex items-center gap-2"
                    >
                      <Upload size={13} className="text-indigo-500" />
                      <span>Importar .drawio</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportDrawioFile}
                      className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded flex items-center gap-2"
                    >
                      <FileCode size={13} className="text-amber-500" />
                      <span>Exportar .drawio</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportSvgFile}
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
                accept=".drawio,.xml"
                onChange={handleFileImport}
                className="hidden"
              />

              {/* Layer Position Controls */}
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

              {/* Edit in Draw.io Primary Button */}
              <Button
                size="sm"
                onClick={() => setIsEditorOpen(true)}
                className="h-7 px-2.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium gap-1.5 shadow-2xs"
                title="Abrir editor completo do Draw.io"
              >
                <Edit3 size={12} />
                <span>Editar</span>
              </Button>

              {/* Remove Block */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeBlock(block.id)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                title="Excluir bloco de diagrama"
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>

          {/* Diagram Canvas Body */}
          <div 
            className="flex-1 w-full h-full relative overflow-hidden bg-slate-50/50 dark:bg-zinc-950 flex items-center justify-center"
            onDoubleClick={() => setIsEditorOpen(true)}
          >
            {/* Background grid pattern */}
            <div 
              className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            />

            {/* Case A: Diagram has SVG preview */}
            {svgData ? (
              <div 
                className="w-full h-full p-4 flex items-center justify-center overflow-auto relative select-none"
                style={{ cursor: 'pointer' }}
                title="Clique duas vezes para editar no Draw.io"
              >
                <div 
                  className="transition-transform duration-150 origin-center flex items-center justify-center"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  {svgData.startsWith('data:image/svg+xml') || svgData.startsWith('<svg') ? (
                    svgData.startsWith('data:') ? (
                      <img 
                        src={svgData} 
                        alt={title}
                        className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-sm" 
                      />
                    ) : (
                      <div 
                        dangerouslySetInnerHTML={{ __html: svgData }}
                        className="w-full h-full flex items-center justify-center"
                      />
                    )
                  ) : (
                    <img 
                      src={svgData} 
                      alt={title}
                      className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-sm" 
                    />
                  )}
                </div>

                {/* Floating "Double click to edit" hint on hover */}
                {isHovered && (
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/80 dark:bg-zinc-800/90 text-white text-[11px] font-medium backdrop-blur shadow-md flex items-center gap-1.5 pointer-events-none">
                    <Edit3 size={11} className="text-amber-400" />
                    <span>Clique 2x para editar</span>
                  </div>
                )}
              </div>
            ) : xmlData && xmlData !== DEFAULT_BLANK_XML ? (
              /* Case B: Has XML but no SVG cached yet */
              <div className="flex flex-col items-center justify-center p-6 text-center z-10">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 shadow-inner">
                  <Network size={24} />
                </div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-zinc-100 mb-1">
                  Diagrama pronto para visualização
                </h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mb-4">
                  Clique no botão abaixo para abrir o editor Draw.io e sincronizar a visualização em alta resolução.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsEditorOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-2 text-xs font-medium shadow-sm"
                >
                  <Edit3 size={13} />
                  <span>Abrir no Draw.io</span>
                </Button>
              </div>
            ) : (
              /* Case C: Blank new diagram block with templates */
              <div className="flex flex-col items-center justify-center p-6 text-center z-10 max-w-md">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 shadow-inner">
                  <Workflow size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100 mb-1">
                  Criar Diagrama Draw.io
                </h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4 leading-relaxed">
                  Desenhe fluxogramas, arquitetura de sistemas, banco de dados ER, diagramas UML e redes com o editor profissional Draw.io.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                  <Button
                    size="sm"
                    onClick={() => setIsEditorOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 text-xs font-semibold shadow-xs"
                  >
                    <Edit3 size={13} />
                    <span>Diagrama em Branco</span>
                  </Button>
                </div>

                {/* Quick starter chips */}
                <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 w-full">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Ou comece com um modelo:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(STARTER_TEMPLATES).map(([key, t]) => {
                      const IconComponent = t.icon;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleApplyTemplate(key as keyof typeof STARTER_TEMPLATES)}
                          className="px-2 py-1.5 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-600 text-left flex items-center gap-1.5 transition-colors group"
                        >
                          <IconComponent size={12} className="text-amber-500 shrink-0" />
                          <span className="text-[11px] font-medium text-slate-700 dark:text-zinc-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 truncate">
                            {t.name}
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

      {/* Full Draw.io Editor Dialog Modal */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-[96vw] w-[1440px] h-[92vh] max-h-[92vh] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 flex flex-col">
          {/* Modal Header */}
          <div className="h-11 px-4 bg-slate-900 text-white flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                <Network size={14} />
              </div>
              <div>
                <span className="font-semibold text-xs text-white">
                  Editor Draw.io: <span className="text-amber-300">{title}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Salvamento automático ativo • Clique em "Salvar" para fechar
              </span>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  // Request save & exit from draw.io iframe
                  const iframe = iframeRef.current;
                  if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage(
                      JSON.stringify({ action: 'export', format: 'xmlsvg' }),
                      '*'
                    );
                  }
                  setIsEditorOpen(false);
                  toast.success('Diagrama Draw.io salvo!');
                }}
                className="h-7 px-3 text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold gap-1.5"
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

          {/* Iframe with Draw.io Embed Mode */}
          <div className="flex-1 w-full h-full relative bg-slate-100 dark:bg-zinc-900">
            <iframe
              ref={iframeRef}
              src="https://embed.diagrams.net/?embed=1&ui=atlas&spin=1&modified=unsavedChanges&proto=json&lang=pt-br&libraries=1"
              className="w-full h-full border-none"
              title="Editor Draw.io"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
