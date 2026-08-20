import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNoteStore } from '@/lib/store/noteStore';
import { Rnd } from 'react-rnd';
import { Button } from '@/components/ui/button';
import { 
  MousePointer2, GripHorizontal, Trash2, Bold, Italic, Underline as UnderlineIcon,
  Strikethrough, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, Palette, TableProperties, Plus, ChevronRight, Combine
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TablePicker } from './TablePicker';

import { EditorContent, useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';

interface CanvasBlock {
  id: string;
  x: number;
  y: number;
  width: number | string;
  height: number | string;
  content: string;
}

const TEXT_COLORS = [
  { name: 'Preto', value: '#0f172a' },
  { name: 'Cinza', value: '#64748b' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Verde', value: '#10b981' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Roxo', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
];

const HIGHLIGHT_COLORS = [
  { name: 'Sem Realce', value: '' },
  { name: 'Amarelo', value: '#fef08a' },
  { name: 'Verde', value: '#bbf7d0' },
  { name: 'Azul', value: '#bfdbfe' },
  { name: 'Rosa', value: '#fbcfe8' },
  { name: 'Laranja', value: '#fed7aa' },
  { name: 'Roxo', value: '#e9d5ff' },
];

function isBlockEmpty(htmlContent: string): boolean {
  if (!htmlContent) return true;
  const text = htmlContent
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return text.length === 0;
}

function GlobalToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) {
    return (
      <div className="border-b border-slate-200 w-full shrink-0"></div>
    );
  }

  // Determine current heading or paragraph
  let textType = 'paragraph';
  if (editor.isActive('heading', { level: 1 })) textType = 'h1';
  else if (editor.isActive('heading', { level: 2 })) textType = 'h2';
  else if (editor.isActive('heading', { level: 3 })) textType = 'h3';

  return (
    <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 min-h-11 border-b bg-slate-50/90 text-slate-700 shrink-0 select-none">
      {/* Heading / Text Size Selector */}
      <Select 
        value={textType}
        onValueChange={(val) => {
          if (val === 'paragraph') {
            editor.chain().focus().setParagraph().run();
          } else if (val === 'h1') {
            editor.chain().focus().toggleHeading({ level: 1 }).run();
          } else if (val === 'h2') {
            editor.chain().focus().toggleHeading({ level: 2 }).run();
          } else if (val === 'h3') {
            editor.chain().focus().toggleHeading({ level: 3 }).run();
          }
        }}
      >
        <SelectTrigger className="w-[130px] h-7 text-xs bg-white border-slate-200">
          <SelectValue placeholder="Estilo do Texto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paragraph">Texto Normal</SelectItem>
          <SelectItem value="h1"><span className="font-bold text-base">Título 1</span></SelectItem>
          <SelectItem value="h2"><span className="font-semibold text-sm">Título 2</span></SelectItem>
          <SelectItem value="h3"><span className="font-medium text-xs">Título 3</span></SelectItem>
        </SelectContent>
      </Select>

      {/* Font Family Selector */}
      <Select onValueChange={(val) => editor.chain().focus().setFontFamily(val).run()}>
        <SelectTrigger className="w-[110px] h-7 text-xs bg-white border-slate-200">
          <SelectValue placeholder="Fonte" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Inter">Inter</SelectItem>
          <SelectItem value="Arial">Arial</SelectItem>
          <SelectItem value="Comic Sans MS, Comic Sans">Comic Sans</SelectItem>
          <SelectItem value="Georgia, serif">Georgia</SelectItem>
          <SelectItem value="Courier New, monospace">Monospace</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-5 bg-slate-300 mx-0.5" />

      {/* Text Styles */}
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive('bold') ? 'bg-slate-200 text-slate-900 font-bold' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }} title="Negrito (Ctrl+B)"><Bold size={14} /></Button>
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive('italic') ? 'bg-slate-200 text-slate-900' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }} title="Itálico (Ctrl+I)"><Italic size={14} /></Button>
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive('underline') ? 'bg-slate-200 text-slate-900' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }} title="Sublinhado (Ctrl+U)"><UnderlineIcon size={14} /></Button>
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive('strike') ? 'bg-slate-200 text-slate-900' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }} title="Tachado"><Strikethrough size={14} /></Button>
      
      <div className="w-px h-5 bg-slate-300 mx-0.5" />

      {/* Text Color Picker Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-1.5 gap-1 text-xs" title="Cor do Texto">
            <Palette size={14} style={{ color: (editor.getAttributes('textStyle').color as string) || '#0f172a' }} />
            <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: (editor.getAttributes('textStyle').color as string) || '#0f172a' }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Cor do Texto</p>
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                className="w-8 h-8 rounded-md border border-slate-200 flex items-center justify-center hover:scale-110 transition-transform"
                style={{ backgroundColor: c.value }}
                title={c.name}
                onClick={() => editor.chain().focus().setColor(c.value).run()}
              />
            ))}
          </div>
          <div className="pt-1.5 border-t flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Personalizado:</span>
            <input 
              type="color" 
              onInput={event => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()} 
              value={(editor.getAttributes('textStyle').color as string) || '#000000'}
              className="h-6 w-6 p-0 rounded cursor-pointer border-none bg-transparent"
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Highlight Color Picker Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-1.5 gap-1 text-xs" title="Cor de Realce (Fundo)">
            <Highlighter size={14} className="text-amber-500" />
            <span className="w-3 h-3 rounded-full border border-slate-300 bg-amber-200" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Cor de Realce</p>
          <div className="grid grid-cols-4 gap-1.5">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                className="w-8 h-8 rounded-md border border-slate-200 flex items-center justify-center text-xs hover:scale-110 transition-transform"
                style={{ backgroundColor: c.value || '#ffffff' }}
                title={c.name}
                onClick={() => {
                  if (c.value) {
                    editor.chain().focus().setHighlight({ color: c.value }).run();
                  } else {
                    editor.chain().focus().unsetHighlight().run();
                  }
                }}
              >
                {!c.value && '✕'}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-5 bg-slate-300 mx-0.5" />
      
      {/* Alignment */}
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive({ textAlign: 'left' }) ? 'bg-slate-200' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run(); }} title="Alinhar à Esquerda"><AlignLeft size={14} /></Button>
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive({ textAlign: 'center' }) ? 'bg-slate-200' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run(); }} title="Centralizar"><AlignCenter size={14} /></Button>
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive({ textAlign: 'right' }) ? 'bg-slate-200' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run(); }} title="Alinhar à Direita"><AlignRight size={14} /></Button>
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-slate-200' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('justify').run(); }} title="Justificar"><AlignJustify size={14} /></Button>
      
      <div className="w-px h-5 bg-slate-300 mx-0.5" />
      
      {/* Lists */}
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive('bulletList') ? 'bg-slate-200' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }} title="Lista com Marcadores"><List size={14} /></Button>
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive('orderedList') ? 'bg-slate-200' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }} title="Lista Numerada"><ListOrdered size={14} /></Button>
      
      <div className="w-px h-5 bg-slate-300 mx-0.5" />

      {/* Table Insert */}
      <TablePicker onSelect={(rows, cols) => editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()} />
    </div>
  );
}

function TextBlock({
  block,
  updateBlock,
  removeBlock,
  setActiveEditor,
  isSelected,
  setSelectedId,
}: {
  block: CanvasBlock;
  updateBlock: (id: string, updates: Partial<CanvasBlock>) => void;
  removeBlock: (id: string) => void;
  setActiveEditor: (editor: Editor | null) => void;
  isSelected: boolean;
  setSelectedId: (id: string | null) => void;
}) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('scroll', handleCloseMenu, true);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('scroll', handleCloseMenu, true);
    };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      FontFamily,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({
        resizable: true,
        lastColumnResizable: true,
        allowTableNodeSelection: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Highlight.configure({ multicolor: true }),
      Underline,
    ],
    editorProps: {
      handleKeyDown: (view, event) => {
        if (event.key === 'Delete' || event.key === 'Backspace') {
          const { selection } = view.state;
          // If table node is selected or cursor is inside table and delete is pressed
          if (selection.node && selection.node.type.name === 'table') {
            editor?.chain().focus().deleteTable().run();
            return true;
          }
        }
        return false;
      },
    },
    content: block.content,
    onUpdate: ({ editor: ed }) => {
      updateBlock(block.id, { content: ed.getHTML() });
    },
    onFocus: ({ editor: ed }) => {
      setActiveEditor(ed);
      setSelectedId(block.id);
    },
  });

  useEffect(() => {
    if (isSelected && editor && !editor.isFocused) {
      editor.commands.focus();
    }
  }, [isSelected, editor]);

  return (
    <>
      <Rnd
        size={{ width: block.width, height: block.height }}
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
        minWidth={150}
        minHeight={36}
        dragHandleClassName="drag-handle"
        className={`group ${isSelected ? 'z-20' : 'z-10'}`}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedId(block.id);
          if (editor) setActiveEditor(editor);
        }}
      >
        <div 
          className="relative w-full h-full flex flex-col"
          onContextMenu={(e) => {
            if (editor && editor.isActive('table')) {
              e.preventDefault();
              e.stopPropagation();
              const x = Math.min(e.clientX, window.innerWidth - 220);
              const y = Math.min(e.clientY, window.innerHeight - 320);
              setContextMenu({ x, y });
            }
          }}
        >
          {/* Top Handle Bar - OneNote style: visible on hover or selection */}
          <div
            className={`h-5 bg-slate-100/90 border border-slate-300 border-b-0 rounded-t flex items-center px-1 transition-opacity ${
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <div className="drag-handle cursor-grab active:cursor-grabbing flex-1 h-full flex items-center justify-center text-slate-400 hover:text-slate-600">
              <GripHorizontal size={14} />
            </div>
            <button
              type="button"
              className="text-slate-400 hover:text-red-500 p-0.5 rounded hover:bg-slate-200"
              onClick={(e) => {
                e.stopPropagation();
                removeBlock(block.id);
              }}
              title="Excluir caixa"
            >
              <Trash2 size={12} />
            </button>
          </div>

          {/* Content Box - Transparent when unselected, soft subtle container border when selected */}
          <div
            className={`flex-1 p-2 w-full h-full overflow-visible transition-all ${
              isSelected
                ? 'border border-slate-300 rounded-b bg-white/90 shadow-sm'
                : 'border border-transparent group-hover:border-slate-200 rounded-b bg-transparent'
            }`}
          >
            <EditorContent
              editor={editor}
              className="prose prose-sm prose-p:my-0.5 prose-p:leading-normal max-w-none focus:outline-none focus:ring-0 focus:border-none [&_*]:outline-none [&_*]:focus:outline-none w-full h-full cursor-text"
            />
          </div>
        </div>
      </Rnd>

      {/* Clean Right-Click Context Menu for Table */}
      {contextMenu && editor && (
        <div
          className="fixed z-50 min-w-[210px] bg-white rounded-lg shadow-xl border border-slate-200 py-1 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100 select-none"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 font-semibold text-[10px] text-slate-400 uppercase tracking-wider">
            Tabela
          </div>
          
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
            onClick={() => {
              editor.chain().focus().addColumnBefore().run();
              setContextMenu(null);
            }}
          >
            <Plus size={14} className="text-slate-400" />
            Adicionar coluna à esquerda
          </button>
          
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
            onClick={() => {
              editor.chain().focus().addColumnAfter().run();
              setContextMenu(null);
            }}
          >
            <Plus size={14} className="text-slate-400" />
            Adicionar coluna à direita
          </button>

          <div className="my-1 border-t border-slate-100" />

          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
            onClick={() => {
              editor.chain().focus().addRowBefore().run();
              setContextMenu(null);
            }}
          >
            <Plus size={14} className="text-slate-400" />
            Adicionar linha acima
          </button>

          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
            onClick={() => {
              editor.chain().focus().addRowAfter().run();
              setContextMenu(null);
            }}
          >
            <Plus size={14} className="text-slate-400" />
            Adicionar linha abaixo
          </button>

          <div className="my-1 border-t border-slate-100" />

          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-medium"
            onClick={() => {
              editor.chain().focus().deleteColumn().run();
              setContextMenu(null);
            }}
          >
            <Trash2 size={14} />
            Remover coluna
          </button>

          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-medium"
            onClick={() => {
              editor.chain().focus().deleteRow().run();
              setContextMenu(null);
            }}
          >
            <Trash2 size={14} />
            Remover linha
          </button>

          <div className="my-1 border-t border-slate-100" />

          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
            onClick={() => {
              editor.chain().focus().mergeCells().run();
              setContextMenu(null);
            }}
          >
            <Combine size={14} className="text-slate-400" />
            Mesclar células selecionadas
          </button>

          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
            onClick={() => {
              editor.chain().focus().selectColumn().mergeCells().run();
              setContextMenu(null);
            }}
          >
            <Combine size={14} className="text-indigo-500 rotate-90" />
            Mesclar coluna atual
          </button>

          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
            onClick={() => {
              editor.chain().focus().selectRow().mergeCells().run();
              setContextMenu(null);
            }}
          >
            <Combine size={14} className="text-indigo-500" />
            Mesclar linha atual
          </button>

          <div className="my-1 border-t border-slate-100" />

          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
            onClick={() => {
              editor.chain().focus().selectColumn().run();
              setContextMenu(null);
            }}
          >
            <Combine size={14} className="text-slate-400 rotate-90" />
            Selecionar coluna inteira
          </button>

          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
            onClick={() => {
              editor.chain().focus().selectRow().run();
              setContextMenu(null);
            }}
          >
            <Combine size={14} className="text-slate-400" />
            Selecionar linha inteira
          </button>

          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
            onClick={() => {
              editor.chain().focus().splitCell().run();
              setContextMenu(null);
            }}
          >
            <Plus size={14} className="text-slate-400 rotate-45" />
            Dividir célula mesclada
          </button>

          <div className="my-1 border-t border-slate-100" />

          <button
            type="button"
            className="w-full text-left px-3 py-1.5 bg-rose-50/80 hover:bg-rose-600 hover:text-white text-rose-600 flex items-center gap-2 font-medium transition-colors"
            onClick={() => {
              editor.chain().focus().deleteTable().run();
              setContextMenu(null);
            }}
          >
            <Trash2 size={14} />
            Excluir tabela
          </button>
        </div>
      )}
    </>
  );
}

interface NoteEditorProps {
  pageId: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function NoteEditor({ pageId, isSidebarCollapsed, onToggleSidebar }: NoteEditorProps) {
  const { pages, updatePage } = useNoteStore();
  const page = pages.find((p) => p.id === pageId);
  const [blocks, setBlocks] = useState<CanvasBlock[]>([]);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load and parse content
  useEffect(() => {
    if (!page) return;

    let parsedBlocks: CanvasBlock[] = [];
    try {
      if (page.conteudo) {
        if (page.conteudo.trim().startsWith('[')) {
          parsedBlocks = JSON.parse(page.conteudo);
        } else {
          // Legacy content conversion
          parsedBlocks = [
            {
              id: `block_${Date.now()}`,
              x: 40,
              y: 40,
              width: 600,
              height: 'auto',
              content: page.conteudo,
            },
          ];
        }
      }
    } catch (e) {
      console.error('Error parsing canvas blocks', e);
    }

    // Filter out unselected empty blocks on load
    const validBlocks = parsedBlocks.filter((b) => !isBlockEmpty(b.content));
    setBlocks(validBlocks.length > 0 ? validBlocks : parsedBlocks);
    setActiveEditor(null);
    setSelectedBlockId(null);
  }, [pageId, page?.conteudo]);

  // Clean up empty blocks
  const purgeAndSave = useCallback(
    (currentBlocks: CanvasBlock[], activeId?: string | null) => {
      const cleaned = currentBlocks.filter(
        (b) => b.id === activeId || !isBlockEmpty(b.content)
      );
      setBlocks(cleaned);
      updatePage(pageId, { conteudo: JSON.stringify(cleaned) });
      return cleaned;
    },
    [pageId, updatePage]
  );

  const updateBlock = (id: string, updates: Partial<CanvasBlock>) => {
    const updated = blocks.map((b) => (b.id === id ? { ...b, ...updates } : b));
    setBlocks(updated);
    updatePage(pageId, { conteudo: JSON.stringify(updated) });
  };

  const removeBlock = (id: string) => {
    const updated = blocks.filter((b) => b.id !== id);
    setBlocks(updated);
    updatePage(pageId, { conteudo: JSON.stringify(updated) });
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
      setActiveEditor(null);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      // Clean up any existing empty blocks
      const cleaned = purgeAndSave(blocks, null);

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + canvasRef.current.scrollLeft;
      const y = e.clientY - rect.top + canvasRef.current.scrollTop;

      const newBlock: CanvasBlock = {
        id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        x,
        y,
        width: 380,
        height: 'auto',
        content: '<p></p>',
      };

      const nextBlocks = [...cleaned, newBlock];
      setBlocks(nextBlocks);
      setSelectedBlockId(newBlock.id);
    } else {
      // Clicked somewhere else (deselect & clean empty blocks)
      purgeAndSave(blocks, selectedBlockId);
      setSelectedBlockId(null);
      setActiveEditor(null);
    }
  };

  // Dynamically calculate canvas dimensions based on blocks position so scrollbars only appear when needed
  const canvasWidth = useMemo(() => {
    if (blocks.length === 0) return '100%';
    const maxX = Math.max(...blocks.map((b) => b.x + (typeof b.width === 'number' ? b.width : parseInt(String(b.width)) || 400)));
    return Math.max(100, maxX + 200);
  }, [blocks]);

  const canvasHeight = useMemo(() => {
    if (blocks.length === 0) return '100%';
    const maxY = Math.max(...blocks.map((b) => b.y + (typeof b.height === 'number' ? b.height : parseInt(String(b.height)) || 300)));
    return Math.max(100, maxY + 200);
  }, [blocks]);

  const formattedDate = useMemo(() => {
    if (!page?.created_at) return '';
    const date = new Date(page.created_at);
    return new Intl.DateTimeFormat('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }, [page?.created_at]);

  if (!page) return null;

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* Title Header */}
      <div className="px-6 py-4 border-b bg-white z-20 shrink-0 flex items-start gap-3">
        {isSidebarCollapsed && onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="h-8 w-8 text-slate-500 hover:text-slate-800 shrink-0 hover:bg-slate-100 rounded-md mt-1"
            title="Expandir menu lateral"
          >
            <ChevronRight size={18} />
          </Button>
        )}
        <div className="flex flex-col w-full">
          <input
            className="text-2xl font-bold border-none outline-none w-full bg-transparent placeholder-slate-300 text-slate-800"
            value={page.titulo}
            onChange={(e) => updatePage(page.id, { titulo: e.target.value })}
            placeholder="Título da página..."
          />
          {formattedDate && (
            <span className="text-[12px] text-slate-400 font-medium capitalize mt-0.5">
              {formattedDate}
            </span>
          )}
        </div>
      </div>

      {/* Formatting Toolbar */}
      <GlobalToolbar editor={activeEditor} />

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto bg-[#ffffff] relative w-full h-full">
        <div
          ref={canvasRef}
          className="relative cursor-text"
          style={{
            width: typeof canvasWidth === 'number' ? `${canvasWidth}px` : canvasWidth,
            height: typeof canvasHeight === 'number' ? `${canvasHeight}px` : canvasHeight,
            minWidth: '100%',
            minHeight: '100%',
          }}
          onClick={handleCanvasClick}
        >
          {blocks.map((block) => (
            <TextBlock
              key={block.id}
              block={block}
              updateBlock={updateBlock}
              removeBlock={removeBlock}
              setActiveEditor={setActiveEditor}
              isSelected={selectedBlockId === block.id}
              setSelectedId={setSelectedBlockId}
            />
          ))}

          {blocks.length === 0 && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-slate-400 flex flex-col items-center">
              <MousePointer2 size={28} className="mb-2 opacity-40 text-indigo-500" />
              <p className="text-sm font-medium text-slate-500">Clique em qualquer lugar da folha para começar a escrever</p>
              <p className="text-xs text-slate-400 mt-1">Sua página funciona como um quadro livre (estilo OneNote)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

