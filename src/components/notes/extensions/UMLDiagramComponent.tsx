/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Maximize2, Trash2, X, Palette, Type, MousePointer2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  ReactFlowProvider,
  Handle,
  Position,
  Node,
  getBezierPath,
  BaseEdge,
  EdgeLabelRenderer,
  MarkerType,
  NodeResizer
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// --- Custom Nodes ---
const ActorNode = ({ data, selected, id }: any) => {
  const fill = data.fill || 'none';
  const stroke = data.stroke || 'currentColor';
  const color = data.color || 'inherit';

  return (
    <>
      <NodeResizer color="#6366f1" isVisible={selected} minWidth={40} minHeight={60} />
      <div className={`flex flex-col items-center justify-center p-2 w-full h-full ${selected ? 'ring-2 ring-indigo-500 rounded' : ''}`} style={{ color }}>
        <Handle type="target" position={Position.Top} className="!bg-indigo-500" />
        <Handle type="source" position={Position.Bottom} className="!bg-indigo-500" />
        <Handle type="source" position={Position.Left} className="!bg-indigo-500" />
        <Handle type="source" position={Position.Right} className="!bg-indigo-500" />
        <svg width="100%" height="100%" viewBox="0 0 40 60" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="10" r="8" fill={fill} stroke={stroke} strokeWidth="2" />
          <line x1="20" y1="18" x2="20" y2="35" stroke={stroke} strokeWidth="2" />
          <line x1="20" y1="22" x2="5" y2="30" stroke={stroke} strokeWidth="2" />
          <line x1="20" y1="22" x2="35" y2="30" stroke={stroke} strokeWidth="2" />
          <line x1="20" y1="35" x2="10" y2="55" stroke={stroke} strokeWidth="2" />
          <line x1="20" y1="35" x2="30" y2="55" stroke={stroke} strokeWidth="2" />
        </svg>
        <div className="mt-1 text-xs font-semibold text-center leading-tight break-words w-full">{data.label}</div>
      </div>
    </>
  );
};

const UseCaseNode = ({ data, selected }: any) => {
  const bg = data.fill || '#eef2ff';
  const border = data.stroke || '#c7d2fe';
  const color = data.color || '#312e81';

  return (
    <>
      <NodeResizer color="#6366f1" isVisible={selected} minWidth={100} minHeight={50} />
      <div 
        className={`relative w-full h-full px-2 py-2 border-2 rounded-[50%] text-center shadow-sm flex items-center justify-center ${selected ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}`}
        style={{ backgroundColor: bg, borderColor: selected ? undefined : border, color }}
      >
        <Handle type="target" position={Position.Top} className="!bg-indigo-500" />
        <Handle type="source" position={Position.Bottom} className="!bg-indigo-500" />
        <Handle type="target" position={Position.Left} className="!bg-indigo-500" />
        <Handle type="source" position={Position.Right} className="!bg-indigo-500" />
        <span className="font-medium text-sm px-2 text-balance leading-tight break-words">{data.label}</span>
      </div>
    </>
  );
};

const SystemNode = ({ data, selected }: any) => {
  const bg = data.fill || 'rgba(248, 250, 252, 0.5)';
  const border = data.stroke || '#cbd5e1';
  const color = data.color || '#334155';

  return (
    <>
      <NodeResizer color="#6366f1" isVisible={selected} minWidth={150} minHeight={150} />
      <div 
        className={`relative w-full h-full border-2 rounded-sm ${selected ? 'ring-2 ring-indigo-500' : ''}`}
        style={{ backgroundColor: bg, borderColor: selected ? undefined : border }}
      >
        <div className="absolute top-0 left-0 right-0 px-2 py-1 text-center font-bold border-b break-words" style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderColor: border, color }}>
          {data.label}
        </div>
        <div className="p-4 w-full h-full pt-10 pointer-events-none">
          {/* Children go here */}
        </div>
      </div>
    </>
  );
};

const nodeTypes = {
  actor: ActorNode,
  useCase: UseCaseNode,
  system: SystemNode,
};

// --- Custom Edges ---
const UMLEdge = ({ id, sourceX, sourceY, targetX, targetY, data, markerEnd, style, selected }: any) => {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY });
  
  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: selected ? 3 : (style?.strokeWidth || 2) }} />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: '#fff',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 'bold',
              pointerEvents: 'all',
              border: '1px solid #e2e8f0',
              color: selected ? '#4f46e5' : '#334155',
              boxShadow: selected ? '0 0 0 2px #c7d2fe' : 'none'
            }}
            className="nodrag nopan"
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
const edgeTypes = { umlEdge: UMLEdge };

// --- Toolbar & Palette ---

const Sidebar = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 border-r bg-slate-50 p-4 flex flex-col gap-4 overflow-y-auto z-10 relative">
      <div className="font-semibold text-slate-700 text-sm mb-2">Paleta UML</div>
      
      <div className="text-xs text-slate-500 mb-2">Arraste os elementos para o quadro:</div>
      
      <div className="flex flex-col gap-4">
        <div 
          className="border border-slate-300 bg-white p-3 rounded flex flex-col items-center justify-center cursor-grab hover:bg-slate-50 hover:border-indigo-300 transition-colors"
          onDragStart={(event) => onDragStart(event, 'actor', 'Ator')}
          draggable
        >
          <svg width="24" height="36" viewBox="0 0 40 60" xmlns="http://www.w3.org/2000/svg" className="text-slate-700 mb-2">
            <circle cx="20" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
            <line x1="20" y1="18" x2="20" y2="35" stroke="currentColor" strokeWidth="2" />
            <line x1="20" y1="22" x2="5" y2="30" stroke="currentColor" strokeWidth="2" />
            <line x1="20" y1="22" x2="35" y2="30" stroke="currentColor" strokeWidth="2" />
            <line x1="20" y1="35" x2="10" y2="55" stroke="currentColor" strokeWidth="2" />
            <line x1="20" y1="35" x2="30" y2="55" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span className="text-xs font-medium">Ator</span>
        </div>

        <div 
          className="border border-slate-300 bg-white p-3 rounded flex flex-col items-center justify-center cursor-grab hover:bg-slate-50 hover:border-indigo-300 transition-colors"
          onDragStart={(event) => onDragStart(event, 'useCase', 'Caso de Uso')}
          draggable
        >
          <div className="w-20 h-10 border-2 border-indigo-200 bg-indigo-50 rounded-[50%] mb-2"></div>
          <span className="text-xs font-medium">Caso de Uso</span>
        </div>

        <div 
          className="border border-slate-300 bg-white p-3 rounded flex flex-col items-center justify-center cursor-grab hover:bg-slate-50 hover:border-indigo-300 transition-colors"
          onDragStart={(event) => onDragStart(event, 'system', 'Sistema')}
          draggable
        >
          <div className="w-20 h-16 border-2 border-slate-300 bg-slate-50 flex flex-col mb-2">
             <div className="h-4 border-b border-slate-300 bg-slate-200"></div>
          </div>
          <span className="text-xs font-medium">Sistema (Contêiner)</span>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-indigo-50 text-indigo-800 rounded-md text-xs border border-indigo-100">
        <p className="font-semibold mb-1">Controles:</p>
        <ul className="list-disc pl-4 space-y-1 mb-2">
          <li>Arraste as bordas do elemento para <b>redimensionar</b>.</li>
          <li>Use a barra superior para <b>excluir</b> elementos ou conexões selecionadas.</li>
        </ul>
      </div>
    </div>
  );
};

// --- Editor Canvas Component ---

const getId = () => `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const EditorCanvas = ({ initialNodes, initialEdges, onSave }: any) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [elementType, setElementType] = useState<'node'|'edge'|null>(null);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ 
    ...params, 
    id: `edge_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: 'umlEdge',
    animated: false, 
    style: { stroke: '#475569', strokeWidth: 2 },
    data: { label: '' }
  }, eds)), [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/reactflow-label');

      if (!type || !reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: { label, fill: '', stroke: '', color: '' },
      };
      
      if (type === 'system') {
        newNode.style = { width: 300, height: 300, zIndex: -1 };
      } else if (type === 'useCase') {
        newNode.style = { width: 140, height: 70 };
      } else if (type === 'actor') {
        newNode.style = { width: 60, height: 90 };
      }

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );
  
  const onSelectionChange = useCallback(({ nodes, edges }: any) => {
    if (nodes.length === 1) {
      setSelectedElement(nodes[0]);
      setElementType('node');
    } else if (edges.length === 1) {
      setSelectedElement(edges[0]);
      setElementType('edge');
    } else {
      setSelectedElement(null);
      setElementType(null);
    }
  }, []);
  
  const updateNodeData = (key: string, value: string) => {
    if (!selectedElement || elementType !== 'node') return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedElement.id) {
          node.data = { ...node.data, [key]: value };
        }
        return node;
      })
    );
    setSelectedElement((prev: any) => ({ ...prev, data: { ...prev.data, [key]: value } }));
  };

  const updateEdgeType = (umlType: string) => {
    if (!selectedElement || elementType !== 'edge') return;
    
    const newData = { label: '' };
    const newStyle = { stroke: '#475569', strokeWidth: 2, strokeDasharray: 'none' };
    let newMarker = undefined;

    if (umlType === 'include') {
      newData.label = '<<include>>';
      newStyle.strokeDasharray = '5 5';
      newMarker = { type: MarkerType.ArrowClosed, color: '#475569' };
    } else if (umlType === 'extend') {
      newData.label = '<<extend>>';
      newStyle.strokeDasharray = '5 5';
      newMarker = { type: MarkerType.ArrowClosed, color: '#475569' };
    } else if (umlType === 'generalization') {
      newMarker = { type: MarkerType.ArrowClosed, color: '#475569', fill: 'white' };
    } else if (umlType === 'association') {
      // standard line
    }

    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === selectedElement.id) {
          return { ...edge, data: newData, style: newStyle, markerEnd: newMarker };
        }
        return edge;
      })
    );
  };

  const deleteSelectedElement = () => {
    if (!selectedElement) return;
    if (elementType === 'node') {
      setNodes((nds) => nds.filter((n) => n.id !== selectedElement.id));
      // Also remove connected edges
      setEdges((eds) => eds.filter((e) => e.source !== selectedElement.id && e.target !== selectedElement.id));
    } else if (elementType === 'edge') {
      setEdges((eds) => eds.filter((e) => e.id !== selectedElement.id));
    }
    setSelectedElement(null);
    setElementType(null);
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Contextual Toolbar */}
      <div className="bg-white border-b h-14 flex items-center px-4 gap-4 shadow-sm z-20">
        {!selectedElement ? (
          <div className="text-sm text-slate-500 italic">Selecione um elemento ou linha para formatar</div>
        ) : elementType === 'node' ? (
          <>
            <div className="flex items-center gap-2 border-r pr-4">
              <Type size={16} className="text-slate-400" />
              <input 
                type="text"
                className="border border-slate-300 rounded px-2 py-1 text-sm w-[200px]"
                value={selectedElement.data.label}
                onChange={(e) => updateNodeData('label', e.target.value)}
                placeholder="Texto do elemento..."
              />
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-sm">
                <span className="text-slate-500 text-xs mr-1">Fundo:</span>
                <input type="color" className="w-6 h-6 p-0 border-none rounded cursor-pointer" value={selectedElement.data.fill || '#ffffff'} onChange={(e) => updateNodeData('fill', e.target.value)} />
              </div>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-slate-500 text-xs mr-1">Borda:</span>
                <input type="color" className="w-6 h-6 p-0 border-none rounded cursor-pointer" value={selectedElement.data.stroke || '#000000'} onChange={(e) => updateNodeData('stroke', e.target.value)} />
              </div>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-slate-500 text-xs mr-1">Texto:</span>
                <input type="color" className="w-6 h-6 p-0 border-none rounded cursor-pointer" value={selectedElement.data.color || '#000000'} onChange={(e) => updateNodeData('color', e.target.value)} />
              </div>
            </div>

            <div className="ml-auto">
              <Button variant="destructive" size="sm" onClick={deleteSelectedElement}>
                <Trash2 size={14} className="mr-1" /> Excluir Elemento
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 w-full">
             <span className="text-sm font-medium text-slate-700 mr-2">Tipo de Conexão:</span>
             <Button variant="outline" size="sm" onClick={() => updateEdgeType('association')}>Associação</Button>
             <Button variant="outline" size="sm" onClick={() => updateEdgeType('include')}>&lt;&lt;include&gt;&gt;</Button>
             <Button variant="outline" size="sm" onClick={() => updateEdgeType('extend')}>&lt;&lt;extend&gt;&gt;</Button>             
             <Button variant="outline" size="sm" onClick={() => updateEdgeType('generalization')}>Generalização</Button>
             
             <div className="ml-auto">
               <Button variant="destructive" size="sm" onClick={deleteSelectedElement}>
                 <Trash2 size={14} className="mr-1" /> Excluir Relação
               </Button>
             </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 h-full w-full overflow-hidden" ref={reactFlowWrapper}>
        <Sidebar />
        <div className="flex-1 h-full w-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Controls />
            <MiniMap />
            <Background gap={12} size={1} />
          </ReactFlow>
          
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button onClick={() => onSave(nodes, edges)} className="shadow-md">
              Salvar Diagrama
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Tiptap Node Component ---

export function UMLDiagramComponent(props: any) {
  const [isEditing, setIsEditing] = useState(false);
  const parseJSON = (data: any) => {
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch { return []; }
    }
    return Array.isArray(data) ? data : [];
  };

  const nodes = parseJSON(props.node.attrs.nodes);
  const edges = parseJSON(props.node.attrs.edges);

  const handleSave = (newNodes: any, newEdges: any) => {
    props.updateAttributes({
      nodes: newNodes,
      edges: newEdges,
    });
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper className="uml-diagram-wrapper my-6 relative group">
      <div className="border border-indigo-200 bg-indigo-50/30 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-indigo-100/50 px-3 py-2 border-b border-indigo-200 flex justify-between items-center">
          <span className="font-semibold text-sm text-indigo-900 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            Diagrama UML (Visual)
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs bg-white/50 hover:bg-white text-indigo-700" onClick={() => setIsEditing(true)}>
              <Maximize2 size={14} className="mr-1" /> Abrir Editor Visual
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={props.deleteNode} title="Remover Diagrama">
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
        
        {/* Preview Area */}
        <div className="h-auto min-h-[350px] w-full bg-white relative nodrag resize-y overflow-auto" onDoubleClick={() => setIsEditing(true)}>
          {nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm flex-col gap-2">
              <div className="p-4 rounded-full bg-slate-50 border border-slate-200 border-dashed">
                 <MousePointer2 size={24} className="text-slate-300" />
              </div>
              <p>Clique em Abrir Editor Visual para desenhar seu diagrama</p>
            </div>
          ) : (
            <div className="w-full h-[500px] pointer-events-none">
              <ReactFlowProvider>
                <ReactFlow
                  nodes={nodes.map((n: any) => ({ ...n, draggable: false, selectable: false }))}
                  edges={edges.map((e: any) => ({ ...e, selectable: false }))}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  fitView
                  panOnDrag={false}
                  zoomOnScroll={false}
                  panOnScroll={false}
                />
              </ReactFlowProvider>
            </div>
          )}
        </div>
        <div className="h-2 bg-indigo-50/50 border-t border-indigo-100 flex items-center justify-center cursor-row-resize opacity-0 group-hover:opacity-100 transition-opacity">
           <div className="w-12 h-1 bg-indigo-200 rounded-full"></div>
        </div>
      </div>

      <Dialog open={isEditing} onOpenChange={(open) => !open && setIsEditing(false)}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-4 py-2 border-b bg-white m-0 shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>Editor Visual de Diagrama UML</DialogTitle>
            </div>
          </DialogHeader>
          <div className="flex-1 h-full bg-slate-50 overflow-hidden relative">
             <ReactFlowProvider>
               <EditorCanvas initialNodes={nodes} initialEdges={edges} onSave={handleSave} />
             </ReactFlowProvider>
          </div>
        </DialogContent>
      </Dialog>
    </NodeViewWrapper>
  );
}
