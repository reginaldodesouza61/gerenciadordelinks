import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNoteStore } from '@/lib/store/noteStore';
import { useAuthStore } from '@/lib/store/authStore';
import { CanvasBlock } from '@/types/notes';
import { Link } from '@/types/supabase';
import { Rnd } from 'react-rnd';
import { Button } from '@/components/ui/button';
import { 
  MousePointer2, GripHorizontal, Trash2, Bold, Italic, Underline as UnderlineIcon,
  Strikethrough, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, Palette, TableProperties, Plus, ChevronRight, Combine,
  Code2, ShieldCheck, Link as LinkIcon, Type, Terminal, KeyRound, Sparkles, Wand2,
  Camera, Image as ImageIcon, Upload, Download, Copy, ChevronDown, Undo2, Redo2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TablePicker } from './TablePicker';
import { ScriptBlock } from './dev/ScriptBlock';
import { SecretVaultBlock } from './dev/SecretVaultBlock';
import { LinkCardBlock } from './dev/LinkCardBlock';
import { ImageBlock } from './dev/ImageBlock';
import { InsertLinkModal } from './dev/InsertLinkModal';
import { RelatedLinksDrawer } from './dev/RelatedLinksDrawer';
import { AiAssistantModal } from './AiAssistantModal';
import { ScreenCropModal } from './ScreenCropModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { captureScreen, fileToDataUrl } from '@/lib/screenCapture';
import { toast } from 'sonner';

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

function isBlockEmpty(block: CanvasBlock): boolean {
  if (block.type && block.type !== 'text') {
    return false;
  }
  if (!block.content) return true;
  const text = block.content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return text.length === 0;
}

function GlobalToolbar({ 
  editor, 
  onOpenAi 
}: { 
  editor: Editor | null; 
  onOpenAi?: () => void;
}) {
  if (!editor) {
    return (
      <div className="border-b border-slate-200 dark:border-zinc-800 w-full shrink-0"></div>
    );
  }

  // Determine current heading or paragraph
  let textType = 'paragraph';
  if (editor.isActive('heading', { level: 1 })) textType = 'h1';
  else if (editor.isActive('heading', { level: 2 })) textType = 'h2';
  else if (editor.isActive('heading', { level: 3 })) textType = 'h3';

  return (
    <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 min-h-11 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/90 dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 shrink-0 select-none">
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
        <SelectTrigger className="w-[130px] h-7 text-xs bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700">
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
        <SelectTrigger className="w-[110px] h-7 text-xs bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700">
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

      <div className="w-px h-5 bg-slate-300 dark:bg-zinc-700 mx-0.5" />

      {/* Text Styles */}
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive('bold') ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white font-bold' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }} title="Negrito (Ctrl+B)"><Bold size={14} /></Button>
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive('italic') ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }} title="Itálico (Ctrl+I)"><Italic size={14} /></Button>
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive('underline') ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }} title="Sublinhado (Ctrl+U)"><UnderlineIcon size={14} /></Button>
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive('strike') ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }} title="Tachado"><Strikethrough size={14} /></Button>
      
      <div className="w-px h-5 bg-slate-300 dark:bg-zinc-700 mx-0.5" />

      {/* Text Color Picker Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-1.5 gap-1 text-xs" title="Cor do Texto">
            <Palette size={14} style={{ color: (editor.getAttributes('textStyle').color as string) || '#0f172a' }} />
            <span className="w-3 h-3 rounded-full border border-slate-300 dark:border-zinc-600" style={{ backgroundColor: (editor.getAttributes('textStyle').color as string) || '#0f172a' }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-1.5">Cor do Texto</p>
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                className="w-8 h-8 rounded-md border border-slate-200 dark:border-zinc-700 flex items-center justify-center hover:scale-110 transition-transform"
                style={{ backgroundColor: c.value }}
                title={c.name}
                onClick={() => editor.chain().focus().setColor(c.value).run()}
              />
            ))}
          </div>
          <div className="pt-1.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-zinc-400">Personalizado:</span>
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
            <span className="w-3 h-3 rounded-full border border-slate-300 dark:border-zinc-600 bg-amber-200" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-1.5">Cor de Realce</p>
          <div className="grid grid-cols-4 gap-1.5">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                className="w-8 h-8 rounded-md border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-xs hover:scale-110 transition-transform"
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

      <div className="w-px h-5 bg-slate-300 dark:bg-zinc-700 mx-0.5" />
      
      {/* Alignment */}
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive({ textAlign: 'left' }) ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run(); }} title="Alinhar à Esquerda"><AlignLeft size={14} /></Button>
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive({ textAlign: 'center' }) ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run(); }} title="Centralizar"><AlignCenter size={14} /></Button>
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive({ textAlign: 'right' }) ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run(); }} title="Alinhar à Direita"><AlignRight size={14} /></Button>
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('justify').run(); }} title="Justificar"><AlignJustify size={14} /></Button>
      
      <div className="w-px h-5 bg-slate-300 dark:bg-zinc-700 mx-0.5" />
      
      {/* Lists */}
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive('bulletList') ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }} title="Lista com Marcadores"><List size={14} /></Button>
      <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive('orderedList') ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white' : ''}`} onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }} title="Lista Numerada"><ListOrdered size={14} /></Button>
      
      <div className="w-px h-5 bg-slate-300 dark:bg-zinc-700 mx-0.5" />

      {/* Undo / Redo */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7 text-slate-600 dark:text-zinc-300 hover:text-slate-900" 
        onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().undo().run(); }} 
        title="Desfazer (Ctrl+Z)"
      >
        <Undo2 size={14} />
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7 text-slate-600 dark:text-zinc-300 hover:text-slate-900" 
        onPointerDown={(e) => { e.preventDefault(); editor.chain().focus().redo().run(); }} 
        title="Refazer (Ctrl+Y)"
      >
        <Redo2 size={14} />
      </Button>

      <div className="w-px h-5 bg-slate-300 dark:bg-zinc-700 mx-0.5" />

      {/* Table Insert */}
      <TablePicker onSelect={(rows, cols) => editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()} />

      {/* Gemini AI Assistant Button */}
      {onOpenAi && (
        <>
          <div className="w-px h-5 bg-slate-300 dark:bg-zinc-700 mx-0.5" />
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenAi}
            className="h-7 text-xs px-2.5 gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 font-semibold shadow-2xs transition-colors ml-auto sm:ml-0"
            title="Assistente Gemini IA (Melhorar texto, requisitos, fluxos e casos de uso)"
          >
            <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400 group-hover:text-white" />
            <span>IA Gemini</span>
          </Button>
        </>
      )}
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
  onOpenAiAssistant,
}: {
  block: CanvasBlock;
  updateBlock: (id: string, updates: Partial<CanvasBlock>) => void;
  removeBlock: (id: string) => void;
  setActiveEditor: (editor: Editor | null) => void;
  isSelected: boolean;
  setSelectedId: (id: string | null) => void;
  onOpenAiAssistant?: (blockId: string, editor: Editor | null) => void;
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

  // Keep TipTap editor content synchronized when block.content changes externally (e.g. AI replacement)
  useEffect(() => {
    if (editor && block.content !== undefined) {
      const currentHtml = editor.getHTML();
      if (currentHtml !== block.content) {
        editor.commands.setContent(block.content, false);
      }
    }
  }, [block.content, editor]);

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
            className={`h-5 bg-slate-100/90 dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 border-b-0 rounded-t flex items-center px-1 transition-opacity ${
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <div className="drag-handle cursor-grab active:cursor-grabbing flex-1 h-full flex items-center justify-center text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300">
              <GripHorizontal size={14} />
            </div>

            {/* AI Assistant Button directly on the box */}
            {onOpenAiAssistant && (
              <button
                type="button"
                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 p-0.5 px-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/60 flex items-center gap-1 text-[10px] font-semibold transition-colors mr-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAiAssistant(block.id, editor);
                }}
                title="Assistente Gemini IA: Melhorar texto, estruturar requisitos, fluxos e casos de uso"
              >
                <Sparkles size={11} className="text-indigo-600 dark:text-indigo-400" />
                <span className="hidden xs:inline">IA</span>
              </button>
            )}

            <button
              type="button"
              className="text-slate-400 hover:text-red-500 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700"
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
                ? 'border border-slate-300 dark:border-zinc-700 rounded-b bg-white/90 dark:bg-zinc-900/90 shadow-sm'
                : 'border border-transparent group-hover:border-slate-200 dark:group-hover:border-zinc-800 rounded-b bg-transparent'
            }`}
          >
            <EditorContent
              editor={editor}
              className="prose dark:prose-invert prose-sm prose-p:my-0.5 prose-p:leading-normal max-w-none focus:outline-none focus:ring-0 focus:border-none [&_*]:outline-none [&_*]:focus:outline-none w-full h-full cursor-text"
            />
          </div>
        </div>
      </Rnd>

      {/* Clean Right-Click Context Menu for Table */}
      {contextMenu && editor && (
        <div
          className="fixed z-50 min-w-[210px] bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-slate-200 dark:border-zinc-800 py-1 text-xs text-slate-700 dark:text-zinc-200 animate-in fade-in zoom-in-95 duration-100 select-none"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 font-semibold text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            Tabela
          </div>
          
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium text-slate-700 dark:text-zinc-200"
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
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium text-slate-700 dark:text-zinc-200"
            onClick={() => {
              editor.chain().focus().addColumnAfter().run();
              setContextMenu(null);
            }}
          >
            <Plus size={14} className="text-slate-400" />
            Adicionar coluna à direita
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium text-slate-700 dark:text-zinc-200"
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
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium text-slate-700 dark:text-zinc-200"
            onClick={() => {
              editor.chain().focus().addRowAfter().run();
              setContextMenu(null);
            }}
          >
            <Plus size={14} className="text-slate-400" />
            Adicionar linha abaixo
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center gap-2 font-medium"
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
            className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center gap-2 font-medium"
            onClick={() => {
              editor.chain().focus().deleteRow().run();
              setContextMenu(null);
            }}
          >
            <Trash2 size={14} />
            Remover linha
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium text-slate-700 dark:text-zinc-200"
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
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium text-slate-700 dark:text-zinc-200"
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
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium text-slate-700 dark:text-zinc-200"
            onClick={() => {
              editor.chain().focus().selectRow().mergeCells().run();
              setContextMenu(null);
            }}
          >
            <Combine size={14} className="text-indigo-500" />
            Mesclar linha atual
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium text-slate-700 dark:text-zinc-200"
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
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium text-slate-700 dark:text-zinc-200"
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
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium text-slate-700 dark:text-zinc-200"
            onClick={() => {
              editor.chain().focus().splitCell().run();
              setContextMenu(null);
            }}
          >
            <Plus size={14} className="text-slate-400 rotate-45" />
            Dividir célula mesclada
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

          <button
            type="button"
            className="w-full text-left px-3 py-1.5 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-600 hover:text-white text-rose-600 flex items-center gap-2 font-medium transition-colors"
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
  const { pages, updatePage, relations } = useNoteStore();
  const page = pages.find((p) => p.id === pageId);
  const [blocks, setBlocks] = useState<CanvasBlock[]>([]);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isInsertLinkOpen, setIsInsertLinkOpen] = useState(false);
  const [isRelatedLinksOpen, setIsRelatedLinksOpen] = useState(false);

  // Gemini AI Assistant Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [aiTargetBlockId, setAiTargetBlockId] = useState<string | null>(null);
  const [aiSelectedText, setAiSelectedText] = useState('');
  const [aiFullBlockText, setAiFullBlockText] = useState('');

  // Screen Capture & Crop State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [capturedRawImage, setCapturedRawImage] = useState<{ dataUrl: string; width: number; height: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastLoadedPageIdRef = useRef<string | null>(null);
  const lastSavedContentRef = useRef<string | null>(null);

  const relatedLinksCount = useMemo(() => {
    return relations.filter((r) => r.note_id === pageId).length;
  }, [relations, pageId]);

  // Handle opening AI Assistant modal
  const handleOpenAiAssistant = useCallback((blockId?: string, ed?: Editor | null) => {
    let selectedTxt = '';
    let fullTxt = '';
    const targetId = blockId || selectedBlockId || (blocks.length > 0 ? blocks[blocks.length - 1].id : null);

    const editorToUse = ed || (targetId === selectedBlockId ? activeEditor : null);
    if (editorToUse) {
      const { from, to } = editorToUse.state.selection;
      if (from !== to) {
        selectedTxt = editorToUse.state.doc.textBetween(from, to, ' ');
      }
      fullTxt = editorToUse.getText();
    } else if (targetId) {
      const targetBlock = blocks.find((b) => b.id === targetId);
      if (targetBlock && targetBlock.content) {
        const tmp = document.createElement('div');
        tmp.innerHTML = targetBlock.content;
        fullTxt = tmp.textContent || tmp.innerText || '';
      }
    }

    setAiTargetBlockId(targetId);
    setAiSelectedText(selectedTxt);
    setAiFullBlockText(fullTxt);
    setIsAiModalOpen(true);
  }, [selectedBlockId, activeEditor, blocks]);

  // Handle applying generated AI content to note
  const handleApplyAiContent = useCallback((generatedHtml: string, mode: 'replace' | 'append') => {
    const targetId = aiTargetBlockId || selectedBlockId || (blocks.length > 0 ? blocks[blocks.length - 1].id : null);

    if (mode === 'replace' && targetId) {
      const targetBlock = blocks.find((b) => b.id === targetId);
      if (targetBlock) {
        const nextBlocks = blocks.map((b) => {
          if (b.id === targetId) {
            const currentW = typeof b.width === 'number' ? b.width : parseInt(String(b.width)) || 440;
            return {
              ...b,
              type: 'text' as const,
              content: generatedHtml,
              width: Math.max(currentW, 520),
            };
          }
          return b;
        });

        setBlocks(nextBlocks);
        const json = JSON.stringify(nextBlocks);
        lastSavedContentRef.current = json;
        updatePage(pageId, { conteudo: json });
        setSelectedBlockId(targetId);

        if (activeEditor) {
          try {
            activeEditor.commands.setContent(generatedHtml, false);
          } catch (err) {
            console.error('Error updating activeEditor content:', err);
          }
        }
        return;
      }
    }

    // Append mode (or fallback if no existing block was found to replace)
    const pos = getSpawnPosition();
    let targetX = pos.x;
    let targetY = pos.y;

    if (targetId) {
      const targetBlock = blocks.find((b) => b.id === targetId);
      if (targetBlock) {
        targetX = targetBlock.x;
        targetY = targetBlock.y + (typeof targetBlock.height === 'number' ? targetBlock.height : 160) + 20;
      }
    }

    const newBlock: CanvasBlock = {
      id: `text_ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      x: targetX,
      y: targetY,
      width: 540,
      height: 'auto',
      type: 'text',
      content: generatedHtml,
    };

    const updated = [...blocks, newBlock];
    setBlocks(updated);
    const json = JSON.stringify(updated);
    lastSavedContentRef.current = json;
    updatePage(pageId, { conteudo: json });
    setSelectedBlockId(newBlock.id);
  }, [aiTargetBlockId, selectedBlockId, blocks, activeEditor, pageId, updatePage]);

  // Load and parse content on page switch
  useEffect(() => {
    if (!page) return;

    // Skip reload if this update was triggered by our own internal save on the same page
    if (
      lastLoadedPageIdRef.current === pageId &&
      lastSavedContentRef.current === page.conteudo
    ) {
      return;
    }

    lastLoadedPageIdRef.current = pageId;
    lastSavedContentRef.current = page.conteudo || null;

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
              type: 'text',
              content: page.conteudo,
            },
          ];
        }
      }
    } catch (e) {
      console.error('Error parsing canvas blocks', e);
    }

    // Filter out unselected empty blocks on load
    const validBlocks = parsedBlocks.filter((b) => !isBlockEmpty(b));
    setBlocks(validBlocks.length > 0 ? validBlocks : parsedBlocks);
    setActiveEditor(null);
    setSelectedBlockId(null);
  }, [pageId, page?.conteudo]);

  // Clean up empty blocks
  const purgeAndSave = useCallback(
    (currentBlocks: CanvasBlock[], activeId?: string | null) => {
      const cleaned = currentBlocks.filter(
        (b) => b.id === activeId || !isBlockEmpty(b)
      );
      setBlocks(cleaned);
      const json = JSON.stringify(cleaned);
      lastSavedContentRef.current = json;
      updatePage(pageId, { conteudo: json });
      return cleaned;
    },
    [pageId, updatePage]
  );

  const updateBlock = (id: string, updates: Partial<CanvasBlock>) => {
    const updated = blocks.map((b) => (b.id === id ? { ...b, ...updates } : b));
    setBlocks(updated);
    const json = JSON.stringify(updated);
    lastSavedContentRef.current = json;
    updatePage(pageId, { conteudo: json });
  };

  const removeBlock = (id: string) => {
    const blockToRemove = blocks.find((b) => b.id === id);
    const updated = blocks.filter((b) => b.id !== id);
    setBlocks(updated);
    const json = JSON.stringify(updated);
    lastSavedContentRef.current = json;
    updatePage(pageId, { conteudo: json });
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
      setActiveEditor(null);
    }
    if (blockToRemove && !isBlockEmpty(blockToRemove)) {
      toast('Bloco removido', {
        duration: 7000,
        action: {
          label: 'Desfazer',
          onClick: () => {
            setBlocks((prev) => {
              const restored = [...prev, blockToRemove];
              const restoredJson = JSON.stringify(restored);
              lastSavedContentRef.current = restoredJson;
              updatePage(pageId, { conteudo: restoredJson });
              return restored;
            });
            toast.success('Bloco restaurado!');
          },
        },
      });
    }
  };

  // Helper to calculate spawn position near current view
  const getSpawnPosition = () => {
    const scrollLeft = canvasRef.current?.scrollLeft || 0;
    const scrollTop = canvasRef.current?.scrollTop || 0;
    const offset = (blocks.length % 6) * 25;
    return {
      x: Math.max(30, scrollLeft + 50 + offset),
      y: Math.max(30, scrollTop + 60 + offset),
    };
  };

  // Add a new Text & Table block
  const handleAddTextBlock = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const cleaned = purgeAndSave(blocks, null);
    const pos = getSpawnPosition();
    const newBlock: CanvasBlock = {
      id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      x: pos.x,
      y: pos.y,
      width: 440,
      height: 'auto',
      type: 'text',
      content: '<p></p>',
    };
    const nextBlocks = [...cleaned, newBlock];
    setBlocks(nextBlocks);
    setSelectedBlockId(newBlock.id);
  };

  // Add a new Script / Code block
  const handleAddScriptBlock = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const cleaned = purgeAndSave(blocks, null);
    const pos = getSpawnPosition();
    const newBlock: CanvasBlock = {
      id: `script_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      x: pos.x,
      y: pos.y,
      width: 560,
      height: 380,
      type: 'script',
      language: 'bash',
      filename: 'script.sh',
      targetPurpose: 'Script de automação / deploy',
      description: 'Executar no terminal para compilar ou rodar tarefas agendadas.',
      code: '#!/bin/bash\n# Script de automação\necho "Executando tarefas..."',
      wrapLines: false,
      showDescription: true,
    };
    const nextBlocks = [...cleaned, newBlock];
    setBlocks(nextBlocks);
    setSelectedBlockId(newBlock.id);
    updatePage(pageId, { conteudo: JSON.stringify(nextBlocks) });
  };

  // Add a new Secret / Token Vault block
  const handleAddVaultBlock = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const cleaned = purgeAndSave(blocks, null);
    const pos = getSpawnPosition();
    const newBlock: CanvasBlock = {
      id: `vault_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      x: pos.x,
      y: pos.y,
      width: 520,
      height: 340,
      type: 'vault',
      vaultTitle: 'Cofre de Credenciais & Senhas',
      secrets: [],
    };
    const nextBlocks = [...cleaned, newBlock];
    setBlocks(nextBlocks);
    setSelectedBlockId(newBlock.id);
    updatePage(pageId, { conteudo: JSON.stringify(nextBlocks) });
  };

  // Add an existing link card block
  const handleInsertLinkCard = (link: Link) => {
    const cleaned = purgeAndSave(blocks, null);
    const pos = getSpawnPosition();
    const newBlock: CanvasBlock = {
      id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      x: pos.x,
      y: pos.y,
      width: 380,
      height: 190,
      type: 'link',
      linkId: link.id,
      linkTitle: link.titulo,
      linkUrl: link.url,
      linkDescription: link.descricao,
    };
    const nextBlocks = [...cleaned, newBlock];
    setBlocks(nextBlocks);
    setSelectedBlockId(newBlock.id);
    updatePage(pageId, { conteudo: JSON.stringify(nextBlocks) });
  };

  // Insert Image / Screenshot Block helper
  const insertImageBlock = useCallback((
    dataUrl: string,
    origW = 600,
    origH = 400,
    title = 'Captura de Tela',
    customPos?: { x: number; y: number }
  ) => {
    const cleaned = purgeAndSave(blocks, null);
    const pos = customPos || getSpawnPosition();

    // Calculate aspect ratio for initial dimensions
    const aspect = origH / (origW || 1);
    const initialWidth = Math.min(560, Math.max(340, origW));
    const initialHeight = Math.round(initialWidth * aspect) + 56; // account for header/footer

    const newBlock: CanvasBlock = {
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      x: pos.x,
      y: pos.y,
      width: initialWidth,
      height: Math.min(initialHeight, 520),
      type: 'image',
      imageUrl: dataUrl,
      imageTitle: `${title} - ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      capturedAt: `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    };

    const nextBlocks = [...cleaned, newBlock];
    setBlocks(nextBlocks);
    setSelectedBlockId(newBlock.id);
    const json = JSON.stringify(nextBlocks);
    lastSavedContentRef.current = json;
    updatePage(pageId, { conteudo: json });
  }, [blocks, pageId, purgeAndSave, updatePage]);

  // Handle direct screen capture
  const handleCaptureScreen = async () => {
    try {
      toast.info('Selecione a tela, janela ou aba para capturar...');
      const captureResult = await captureScreen();
      setCapturedRawImage(captureResult);
      setIsCropModalOpen(true);
    } catch (err) {
      const error = err as Error | { name?: string; message?: string };
      if (error?.name === 'NotAllowedError' || error?.message?.includes('Permission denied')) {
        // User cancelled screen capture picker
        return;
      }
      toast.error(error?.message || 'Falha ao capturar tela');
    }
  };

  // Handle local image file upload
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl, width, height } = await fileToDataUrl(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      insertImageBlock(dataUrl, width, height, cleanName);
      toast.success('Imagem carregada na anotação!');
    } catch (err) {
      toast.error('Erro ao ler arquivo de imagem');
    } finally {
      e.target.value = '';
    }
  };

  // Handle drag & drop image files onto canvas
  const handleCanvasDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    const x = rect ? e.clientX - rect.left + (canvasRef.current?.scrollLeft || 0) : 50;
    const y = rect ? e.clientY - rect.top + (canvasRef.current?.scrollTop || 0) : 60;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        try {
          const { dataUrl, width, height } = await fileToDataUrl(file);
          const cleanName = file.name.replace(/\.[^/.]+$/, '');
          insertImageBlock(dataUrl, width, height, cleanName, { x: x + i * 30, y: y + i * 30 });
          toast.success(`Imagem "${file.name}" adicionada!`);
        } catch (err) {
          console.error('Error dropping image:', err);
        }
      }
    }
  };

  // Global paste handler to detect pasted images (Ctrl+V / PrintScreen paste)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Check if clipboard has image items
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            try {
              const { dataUrl, width, height } = await fileToDataUrl(file);
              insertImageBlock(dataUrl, width, height, 'Print Colado');
              toast.success('Print de tela colado na anotação!');
            } catch (err) {
              console.error('Error pasting image:', err);
              toast.error('Não foi possível colar a imagem');
            }
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [insertImageBlock]);

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
        width: 400,
        height: 'auto',
        type: 'text',
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
    const maxX = Math.max(...blocks.map((b) => b.x + (typeof b.width === 'number' ? b.width : parseInt(String(b.width)) || 450)));
    return Math.max(100, maxX + 250);
  }, [blocks]);

  const canvasHeight = useMemo(() => {
    if (blocks.length === 0) return '100%';
    const maxY = Math.max(...blocks.map((b) => b.y + (typeof b.height === 'number' ? b.height : parseInt(String(b.height)) || 320)));
    return Math.max(100, maxY + 250);
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
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden transition-colors">
      {/* Title Header */}
      <div className="px-6 py-4 border-b border-border bg-white dark:bg-zinc-900 z-20 shrink-0 flex flex-col gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0 w-full">
          {isSidebarCollapsed && onToggleSidebar && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              className="h-8 w-8 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100 shrink-0 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md mt-0.5"
              title="Expandir menu lateral"
            >
              <ChevronRight size={18} />
            </Button>
          )}
          <div className="flex flex-col w-full min-w-0">
            <input
              className="text-2xl font-bold border-none outline-none w-full bg-transparent placeholder-slate-300 dark:placeholder-zinc-600 text-slate-800 dark:text-zinc-100 truncate"
              value={page.titulo}
              onChange={(e) => updatePage(page.id, { titulo: e.target.value })}
              placeholder="Título da anotação..."
            />
            {formattedDate && (
              <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium capitalize mt-0.5 whitespace-nowrap">
                {formattedDate}
              </span>
            )}
          </div>
        </div>

        {/* Developer Action Bar / Quick Insert Buttons */}
        <div className="flex items-center flex-wrap gap-1.5 shrink-0 select-none">
          {/* Gemini AI Assistant Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenAiAssistant()}
            className="h-8 px-2.5 text-xs bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/80 dark:to-purple-950/80 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900 dark:hover:to-purple-900 text-indigo-700 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 rounded-md gap-1.5 shadow-2xs font-semibold"
            title="Assistente com Inteligência Artificial (Gemini): Melhorar texto, requisitos, fluxos e casos de uso"
          >
            <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">IA Gemini</span>
          </Button>

          {/* Screen Capture / Add Image Button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100/80 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 rounded-md gap-1.5 shadow-2xs font-medium"
                title="Capturar print de tela ou carregar imagem"
              >
                <Camera size={14} className="text-sky-600 dark:text-sky-400" />
                <span className="hidden sm:inline">Capturar Tela</span>
                <ChevronDown size={11} className="opacity-60 -ml-0.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-1.5" align="end">
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={handleCaptureScreen}
                  className="w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-sky-50 dark:hover:bg-sky-950/60 text-slate-700 dark:text-zinc-200 flex items-center gap-2 font-medium transition-colors"
                >
                  <Camera size={14} className="text-sky-600 dark:text-sky-400" />
                  <span>Capturar Tela (Print)</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 flex items-center gap-2 font-medium transition-colors"
                >
                  <ImageIcon size={14} className="text-slate-500 dark:text-zinc-400" />
                  <span>Carregar Imagem do PC</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Insert Text Block */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddTextBlock}
            className="h-8 px-2.5 text-xs bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-zinc-700 rounded-md gap-1.5 shadow-2xs font-medium"
            title="Inserir caixa de texto ou tabela no quadro"
          >
            <Type size={14} className="text-slate-500 dark:text-zinc-400" />
            <span className="hidden sm:inline">Texto</span>
          </Button>

          {/* Insert Script Block */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddScriptBlock}
            className="h-8 px-2.5 text-xs bg-slate-900 dark:bg-emerald-950/80 hover:bg-slate-800 dark:hover:bg-emerald-900 text-white dark:text-emerald-300 border-slate-900 dark:border-emerald-800 rounded-md gap-1.5 shadow-2xs font-medium"
            title="Inserir bloco de código / script com syntax highlighting"
          >
            <Code2 size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">Script / Código</span>
          </Button>

          {/* Insert Secret Vault Block */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddVaultBlock}
            className="h-8 px-2.5 text-xs bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100/80 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 rounded-md gap-1.5 shadow-2xs font-medium"
            title="Inserir cofre para guardar credenciais, logins, senhas, links e tokens"
          >
            <ShieldCheck size={14} className="text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Credenciais</span>
          </Button>

          {/* Insert Registered Link Card */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsInsertLinkOpen(true)}
            className="h-8 px-2.5 text-xs bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 rounded-md gap-1.5 shadow-2xs font-medium"
            title="Vincular e embutir link cadastrado no quadro"
          >
            <LinkIcon size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span className="hidden md:inline">Inserir Link</span>
          </Button>

          {/* View Related Links Drawer */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsRelatedLinksOpen(true)}
            className="h-8 px-2.5 text-xs text-slate-600 dark:text-zinc-300 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/60 rounded-md gap-1.5 font-medium relative"
            title="Ver e gerenciar links relacionados a esta página"
          >
            <LinkIcon size={14} className="text-indigo-500 dark:text-indigo-400" />
            <span className="hidden lg:inline">Links Relacionados</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold">
              {relatedLinksCount}
            </span>
          </Button>
        </div>
      </div>

      {/* Formatting Toolbar (Active when a text editor is focused) */}
      <GlobalToolbar editor={activeEditor} onOpenAi={() => handleOpenAiAssistant()} />

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto bg-[#ffffff] dark:bg-zinc-950 relative w-full h-full">
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
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCanvasDrop}
        >
          {blocks.map((block) => {
            if (block.type === 'script') {
              return (
                <ScriptBlock
                  key={block.id}
                  block={block}
                  updateBlock={updateBlock}
                  removeBlock={removeBlock}
                  isSelected={selectedBlockId === block.id}
                  setSelectedId={setSelectedBlockId}
                />
              );
            }

            if (block.type === 'vault') {
              return (
                <SecretVaultBlock
                  key={block.id}
                  block={block}
                  updateBlock={updateBlock}
                  removeBlock={removeBlock}
                  isSelected={selectedBlockId === block.id}
                  setSelectedId={setSelectedBlockId}
                />
              );
            }

            if (block.type === 'link') {
              return (
                <LinkCardBlock
                  key={block.id}
                  block={block}
                  updateBlock={updateBlock}
                  removeBlock={removeBlock}
                  isSelected={selectedBlockId === block.id}
                  setSelectedId={setSelectedBlockId}
                />
              );
            }

            if (block.type === 'image') {
              return (
                <ImageBlock
                  key={block.id}
                  block={block}
                  updateBlock={updateBlock}
                  removeBlock={removeBlock}
                  isSelected={selectedBlockId === block.id}
                  setSelectedId={setSelectedBlockId}
                />
              );
            }

            // Default Text Block
            return (
              <TextBlock
                key={block.id}
                block={block}
                updateBlock={updateBlock}
                removeBlock={removeBlock}
                setActiveEditor={setActiveEditor}
                isSelected={selectedBlockId === block.id}
                setSelectedId={setSelectedBlockId}
                onOpenAiAssistant={handleOpenAiAssistant}
              />
            );
          })}

          {blocks.length === 0 && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-slate-400 flex flex-col items-center">
              <MousePointer2 size={28} className="mb-2 opacity-40 text-indigo-500" />
              <p className="text-sm font-medium text-slate-600">Quadro de Anotações para Desenvolvedores</p>
              <p className="text-xs text-slate-400 mt-1 text-center max-w-sm">
                Clique em qualquer lugar da folha para escrever, ou use a barra superior para adicionar scripts de código, cofres de tokens/credenciais ou links cadastrados.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Insert Link Modal */}
      <InsertLinkModal
        isOpen={isInsertLinkOpen}
        onClose={() => setIsInsertLinkOpen(false)}
        pageId={page.id}
        onInsertCardBlock={handleInsertLinkCard}
      />

      {/* Related Links Drawer / Manager */}
      <RelatedLinksDrawer
        isOpen={isRelatedLinksOpen}
        onClose={() => setIsRelatedLinksOpen(false)}
        pageId={page.id}
        onInsertCardBlock={handleInsertLinkCard}
      />

      {/* Gemini AI Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        noteTitle={page.titulo}
        selectedText={aiSelectedText}
        fullBlockText={aiFullBlockText}
        onApplyContent={handleApplyAiContent}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Hidden file input for uploading images from computer */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Screen Crop / Selection Modal */}
      <ScreenCropModal
        open={isCropModalOpen}
        onOpenChange={setIsCropModalOpen}
        rawImageData={capturedRawImage}
        onConfirmCrop={(croppedUrl, width, height) => {
          insertImageBlock(croppedUrl, width, height, 'Recorte de Tela');
          toast.success('Recorte de tela adicionado à anotação!');
        }}
      />

      {/* Settings Modal (Configurar token Gemini, informações do desenvolvedor e sistema) */}
      <SettingsModal
        open={isSettingsModalOpen}
        onOpenChange={setIsSettingsModalOpen}
      />
    </div>
  );
}

