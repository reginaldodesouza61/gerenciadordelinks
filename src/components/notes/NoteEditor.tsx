import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNoteStore } from '@/lib/store/noteStore';
import { useAuthStore } from '@/lib/store/authStore';
import { decryptNoteContent, isFieldEncrypted } from '@/lib/encryption';
import { CanvasBlock } from '@/types/notes';
import { Link } from '@/types/supabase';
import { Rnd } from 'react-rnd';
import { Button } from '@/components/ui/button';
import { 
  MousePointer2, GripHorizontal, Trash2, Bold, Italic, Underline as UnderlineIcon,
  Strikethrough, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, Palette, TableProperties, Plus, ChevronRight, Combine,
  Code2, ShieldCheck, Link as LinkIcon, Type, Terminal, KeyRound, Sparkles, Wand2,
  Camera, Image as ImageIcon, Upload, Download, Copy, ChevronDown, Undo2, Redo2, PanelLeftOpen,
  Shapes, Pencil, Search, Network, Workflow, Maximize2, Minimize2, ChevronUp, PlusCircle, Layers, Clock, Globe, ExternalLink
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { TablePicker } from './TablePicker';
import { ScriptBlock } from './dev/ScriptBlock';
import { SecretVaultBlock } from './dev/SecretVaultBlock';
import { LinkCardBlock } from './dev/LinkCardBlock';
import { ImageBlock } from './dev/ImageBlock';
import { WhiteboardBlock } from './dev/WhiteboardBlock';
import { DrawioBlock } from './dev/DrawioBlock';
import { ExcalidrawBlock } from './dev/ExcalidrawBlock';
import { BlockActionMenu } from './dev/BlockActionMenu';
import { MoveOrCopyBlockModal } from './dev/MoveOrCopyBlockModal';
import { InsertLinkModal } from './dev/InsertLinkModal';
import { RelatedLinksDrawer } from './dev/RelatedLinksDrawer';
import { AiAssistantModal } from './AiAssistantModal';
import { ScreenCropModal } from './ScreenCropModal';
import { InsertImageToTextBlockModal } from './dev/InsertImageToTextBlockModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { captureScreen, fileToDataUrl } from '@/lib/screenCapture';
import { copyBlockToClipboard, getBlockFromClipboard, getBlockSummary } from '@/lib/utils/blockClipboard';
import { toast } from 'sonner';

import { EditorContent, useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TiptapLink from '@tiptap/extension-link';
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

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.style.backgroundColor || element.getAttribute('data-background-color') || null,
        renderHTML: attributes => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
            'data-background-color': attributes.backgroundColor,
          };
        },
      },
    };
  },
});

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.style.backgroundColor || element.getAttribute('data-background-color') || null,
        renderHTML: attributes => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
            'data-background-color': attributes.backgroundColor,
          };
        },
      },
    };
  },
});

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

const TABLE_BG_COLORS = [
  { name: 'Sem cor', value: '' },
  { name: 'Branco', value: '#ffffff' },
  { name: 'Cinza Claro', value: '#f1f5f9' },
  { name: 'Vermelho Claro', value: '#fee2e2' },
  { name: 'Laranja Claro', value: '#ffedd5' },
  { name: 'Amarelo Claro', value: '#fef9c3' },
  { name: 'Verde Claro', value: '#dcfce7' },
  { name: 'Azul Claro', value: '#dbeafe' },
  { name: 'Roxo Claro', value: '#f3e8ff' },
  { name: 'Rosa Claro', value: '#ffe4e6' },
];

function setEntireTableBackgroundColor(editor: Editor, color: string | null) {
  const { state, dispatch } = editor.view;
  const { $from } = state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === 'table') {
      const pos = $from.before(d);
      const tr = state.tr;
      node.descendants((child, childPos) => {
        if (child.type.name === 'tableCell' || child.type.name === 'tableHeader') {
          tr.setNodeMarkup(pos + 1 + childPos, undefined, {
            ...child.attrs,
            backgroundColor: color || null,
          });
        }
      });
      dispatch(tr);
      return true;
    }
  }
  return false;
}

function isBlockEmpty(block?: CanvasBlock | null): boolean {
  if (!block) return true;
  if (block.type && block.type !== 'text') {
    return false;
  }
  if (!block.content) return true;
  const text = (block.content || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return text.length === 0;
}

function LinkToolbarPopover({ 
  editor, 
  onOpenInsertLinkModal 
}: { 
  editor: Editor; 
  onOpenInsertLinkModal?: (tab?: 'registered' | 'custom') => void;
}) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const isLinkActive = editor.isActive('link');
  const currentHref = (editor.getAttributes('link').href as string) || '';

  useEffect(() => {
    if (isOpen) {
      if (isLinkActive) {
        setUrl(currentHref);
      } else {
        setUrl('');
      }
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, ' ');
      setText(selectedText);
    }
  }, [isOpen, isLinkActive, currentHref, editor]);

  const handleApplyLink = () => {
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      setIsOpen(false);
      return;
    }

    let href = url.trim();
    if (!/^https?:\/\//i.test(href) && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
      href = 'https://' + href;
    }

    const { from, to } = editor.state.selection;
    if (from === to && text.trim()) {
      // No text was selected, insert formatted anchor
      editor.chain().focus().insertContent(`<a href="${href}" target="_blank" rel="noopener noreferrer">${text.trim()}</a> `).run();
    } else {
      // Text was selected, set link on it
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }

    toast.success('Link aplicado no texto!');
    setIsOpen(false);
  };

  const handleRemoveLink = () => {
    editor.chain().focus().unsetLink().run();
    toast.success('Link removido do texto.');
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 px-2 gap-1 text-xs transition-colors ${
            isLinkActive 
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800' 
              : 'text-slate-700 dark:text-zinc-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
          }`}
          title="Inserir ou editar hiperlink (URL avulsa ou externa) no texto"
        >
          <LinkIcon size={14} className={isLinkActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'} />
          <span className="hidden sm:inline text-[11px] font-medium">{isLinkActive ? 'Editar Link' : 'Link'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-xl space-y-2.5" align="start">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-1.5">
          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
            <LinkIcon size={13} className="text-indigo-600 dark:text-indigo-400" />
            {isLinkActive ? 'Editar Link' : 'Inserir Link no Texto'}
          </span>
          {isLinkActive && (
            <a
              href={currentHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              title="Testar e abrir link em nova aba"
            >
              <ExternalLink size={12} />
              Abrir
            </a>
          )}
        </div>

        <div className="space-y-2">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
              Endereço URL (link avulso ou externo):
            </label>
            <input
              type="text"
              placeholder="https://exemplo.com.br"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyLink();
                }
              }}
              className="mt-0.5 w-full text-xs font-mono px-2 py-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          {!isLinkActive && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                Texto de exibição (opcional):
              </label>
              <input
                type="text"
                placeholder="Clique aqui para acessar"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyLink();
                  }
                }}
                className="mt-0.5 w-full text-xs px-2 py-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        <div className="pt-1.5 flex items-center justify-between gap-1 border-t border-slate-100 dark:border-zinc-800">
          {isLinkActive ? (
            <button
              type="button"
              onClick={handleRemoveLink}
              className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium px-1.5 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50"
            >
              Remover Link
            </button>
          ) : onOpenInsertLinkModal ? (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenInsertLinkModal('registered');
              }}
              className="text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium flex items-center gap-1 hover:underline"
            >
              <Globe size={12} />
              Buscar Cadastrados
            </button>
          ) : <div />}

          <Button
            size="sm"
            onClick={handleApplyLink}
            className="h-6 text-xs px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium ml-auto"
          >
            {isLinkActive ? 'Salvar' : 'Inserir'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function GlobalToolbar({ 
  editor, 
  onOpenAi,
  onCaptureScreen,
  onUploadImage,
  onOpenInsertLinkModal,
}: { 
  editor: Editor | null; 
  onOpenAi?: () => void;
  onCaptureScreen?: () => void;
  onUploadImage?: () => void;
  onOpenInsertLinkModal?: (tab?: 'registered' | 'custom') => void;
}) {
  if (!editor) {
    return null;
  }

  // Determine current heading or paragraph
  let textType = 'paragraph';
  if (editor?.isActive('heading', { level: 1 })) textType = 'h1';
  else if (editor?.isActive('heading', { level: 2 })) textType = 'h2';
  else if (editor?.isActive('heading', { level: 3 })) textType = 'h3';

  return (
    <div className="flex flex-wrap items-center gap-1 px-2.5 py-1 min-h-9 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/95 dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 shrink-0 select-none text-xs transition-all z-20">
      {editor && (
        <>
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
          
          {/* Insert or Edit Hyperlink */}
          <LinkToolbarPopover editor={editor} onOpenInsertLinkModal={onOpenInsertLinkModal} />

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

          {/* Table Insert & Color Options */}
          <TablePicker onSelect={(rows, cols) => editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()} />

          {/* Table Background Color Picker Popover */}
          {editor.isActive('table') && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1.5 bg-indigo-50/90 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100"
                  title="Cor de Fundo da Tabela / Células"
                >
                  <TableProperties size={14} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="font-medium text-[11px]">Cor da Tabela</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2.5" align="start">
                <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span>Cor de Fundo</span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">Células</span>
                </p>
                <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                  {TABLE_BG_COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      className="w-7 h-7 rounded-md border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-[10px] hover:scale-110 transition-transform shadow-2xs"
                      style={{ backgroundColor: c.value || 'transparent' }}
                      title={c.name}
                      onClick={() => {
                        if (c.value) {
                          editor.chain().focus().setCellAttribute('backgroundColor', c.value).run();
                        } else {
                          editor.chain().focus().setCellAttribute('backgroundColor', null).run();
                        }
                      }}
                    >
                      {!c.value && '✕'}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">Personalizado:</span>
                    <input
                      type="color"
                      onInput={(e) => {
                        const color = (e.target as HTMLInputElement).value;
                        editor.chain().focus().setCellAttribute('backgroundColor', color).run();
                      }}
                      className="h-6 w-6 p-0 rounded cursor-pointer border-none bg-transparent"
                      title="Escolher cor personalizada"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full h-7 text-[11px] mt-1 gap-1"
                    onClick={() => {
                      const currentColor = (editor.getAttributes('tableCell').backgroundColor as string) || '#f1f5f9';
                      setEntireTableBackgroundColor(editor, currentColor);
                    }}
                  >
                    Aplicar cor na tabela inteira
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          <div className="w-px h-5 bg-slate-300 dark:bg-zinc-700 mx-0.5" />

          {/* Insert Image directly inside active editor */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1 text-xs text-slate-700 dark:text-zinc-300 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                title="Inserir imagem ou print dentro do bloco de anotações"
              >
                <ImageIcon size={14} className="text-sky-500" />
                <span className="hidden sm:inline text-[11px] font-medium">Inserir Imagem</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-1 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-xl" align="start">
              <div className="space-y-0.5">
                {onCaptureScreen && (
                  <button
                    type="button"
                    onClick={() => onCaptureScreen()}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-slate-700 dark:text-zinc-200 transition-colors"
                  >
                    <Camera size={14} className="text-sky-500 shrink-0" />
                    <span>Capturar Print de Tela</span>
                  </button>
                )}
                {onUploadImage && (
                  <button
                    type="button"
                    onClick={() => onUploadImage()}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-slate-700 dark:text-zinc-200 transition-colors"
                  >
                    <ImageIcon size={14} className="text-emerald-500 shrink-0" />
                    <span>Carregar Arquivo do PC</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const url = prompt('Digite o link da imagem (URL):');
                    if (url) {
                      editor.chain().focus().setImage({ src: url }).run();
                      toast.success('Imagem inserida no bloco!');
                    }
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-slate-700 dark:text-zinc-200 transition-colors"
                >
                  <LinkIcon size={14} className="text-indigo-500 shrink-0" />
                  <span>Inserir por Link (URL)</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Gemini AI Assistant Button */}
          {onOpenAi && (
            <>
              <div className="w-px h-5 bg-slate-300 dark:bg-zinc-700 mx-0.5" />
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenAi}
                className="h-7 text-xs px-2.5 gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 font-semibold shadow-2xs transition-colors"
                title="Assistente Gemini IA (Melhorar texto, requisitos, fluxos e casos de uso)"
              >
                <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400 group-hover:text-white" />
                <span>IA Gemini</span>
              </Button>
            </>
          )}
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
  onOpenInsertLink,
  onMoveOrCopy,
  onDuplicate,
  onCopyClipboard,
}: {
  block: CanvasBlock;
  updateBlock: (id: string, updates: Partial<CanvasBlock>) => void;
  removeBlock: (id: string) => void;
  setActiveEditor: (editor: Editor | null) => void;
  isSelected: boolean;
  setSelectedId: (id: string | null) => void;
  onOpenAiAssistant?: (blockId: string, editor: Editor | null) => void;
  onOpenInsertLink?: (blockId: string) => void;
  onMoveOrCopy?: (block: CanvasBlock, action?: 'move' | 'copy') => void;
  onDuplicate?: (blockId: string) => void;
  onCopyClipboard?: (block: CanvasBlock) => void;
}) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const inlineFileInputRef = useRef<HTMLInputElement>(null);

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
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full my-2 border border-slate-200 dark:border-zinc-700 shadow-sm',
        },
      }),
      TiptapLink.configure({
        openOnClick: true,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'text-indigo-600 dark:text-indigo-400 underline font-medium hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors cursor-pointer',
        },
      }),
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
      CustomTableHeader,
      CustomTableCell,
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
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            const file = items[i].getAsFile();
            if (file) {
              event.preventDefault();
              fileToDataUrl(file).then(({ dataUrl }) => {
                editor?.chain().focus().setImage({ src: dataUrl, alt: 'Imagem colada' }).run();
                toast.success('Imagem inserida no bloco de anotações!');
              });
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            fileToDataUrl(file).then(({ dataUrl }) => {
              editor?.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
              toast.success('Imagem adicionada ao bloco de anotações!');
            });
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

  const handleInlineImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl } = await fileToDataUrl(file);
      editor?.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
      toast.success('Imagem inserida no bloco de anotações!');
    } catch {
      toast.error('Erro ao carregar imagem.');
    }
    if (e.target) e.target.value = '';
  };

  useEffect(() => {
    if (isSelected && editor && !editor.isFocused) {
      const timer = setTimeout(() => {
        if (!editor.isFocused) {
          editor.commands.focus();
        }
      }, 10);
      return () => clearTimeout(timer);
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
        size={{ 
          width: typeof block.width === 'number' ? block.width : parseInt(String(block.width), 10) || 400, 
          height: 'auto',
        }}
        position={{ x: block.x, y: Math.max(12, block.y) }}
        style={{
          zIndex: isSelected ? 40 : 10,
        }}
        onDragStart={() => {
          setSelectedId(block.id);
        }}
        onDragStop={(_, d) => updateBlock(block.id, { x: Math.max(0, d.x), y: Math.max(12, d.y) })}
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
        onResizeStop={(_, direction, ref, ___, position) => {
          const w = ref.offsetWidth;
          const h = ref.offsetHeight;
          updateBlock(block.id, {
            width: w,
            height: h,
            x: Math.max(0, position.x),
            y: Math.max(12, position.y),
          });
        }}
        bounds="parent"
        minWidth={180}
        minHeight={typeof block.height === 'number' ? Math.max(40, block.height) : 40}
        dragHandleClassName="text-drag-handle"
        className={`group ${isSelected ? 'z-40' : 'hover:z-30 z-10'}`}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedId(block.id);
          if (editor) setActiveEditor(editor);
        }}
      >
        <div 
          className="relative w-full h-auto min-h-[40px] flex flex-col"
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
          {/* Top Handle Bar - OneNote style: entire bar is a grab handle */}
          <div
            className={`h-6 bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 border-b-0 rounded-t flex items-center justify-between px-2 transition-all text-drag-handle cursor-grab active:cursor-grabbing select-none ${
              isSelected ? 'opacity-100 bg-indigo-50/90 dark:bg-zinc-800 border-indigo-300 dark:border-indigo-700' : 'opacity-70 group-hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 pointer-events-none">
              <GripHorizontal size={14} className="text-slate-500 dark:text-zinc-400" />
              <span className="text-[11px] font-semibold tracking-tight text-slate-600 dark:text-zinc-300">
                Arrastar para mover
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Insert Link button */}
              {onOpenInsertLink && (
                <button
                  type="button"
                  className="text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 p-0.5 px-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center gap-1 text-[10px] font-medium transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenInsertLink(block.id);
                  }}
                  title="Inserir link (cadastrado ou avulso) neste bloco de anotações"
                >
                  <LinkIcon size={11} className="text-indigo-500" />
                  <span className="hidden sm:inline">Link</span>
                </button>
              )}

              {/* Insert Image directly inside this text block */}
              <button
                type="button"
                className="text-slate-500 hover:text-sky-600 dark:text-zinc-400 dark:hover:text-sky-400 p-0.5 px-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center gap-1 text-[10px] font-medium transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  inlineFileInputRef.current?.click();
                }}
                title="Inserir imagem do PC neste bloco de anotações"
              >
                <ImageIcon size={11} className="text-sky-500" />
                <span className="hidden sm:inline">Imagem</span>
              </button>
              <input
                ref={inlineFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleInlineImageFileChange}
              />

              {/* AI Assistant Button directly on the box */}
              {onOpenAiAssistant && (
                <button
                  type="button"
                  className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 p-0.5 px-1.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-950/80 flex items-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAiAssistant(block.id, editor);
                  }}
                  title="Assistente Gemini IA: Melhorar texto, estruturar requisitos, fluxos e casos de uso"
                >
                  <Sparkles size={11} className="text-indigo-600 dark:text-indigo-400" />
                  <span>IA</span>
                </button>
              )}

              {/* Move / Copy / Duplicate / Remove Action Menu */}
              <BlockActionMenu
                block={block}
                onMoveOrCopy={onMoveOrCopy}
                onDuplicate={onDuplicate}
                onCopyClipboard={onCopyClipboard}
                onRemove={removeBlock}
                showMoveButtonDirectly={false}
              />

              <button
                type="button"
                className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  removeBlock(block.id);
                }}
                title="Excluir este bloco"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Content Box - Transparent when unselected, soft subtle container border when selected */}
          <div
            className={`flex-1 p-2 w-full h-auto min-h-[30px] transition-all ${
              isSelected
                ? 'border border-slate-300 dark:border-zinc-700 rounded-b bg-white/95 dark:bg-zinc-900/95 shadow-sm'
                : 'border border-transparent group-hover:border-slate-200 dark:group-hover:border-zinc-800 rounded-b bg-transparent'
            }`}
          >
            <EditorContent
              editor={editor}
              className="prose dark:prose-invert prose-sm prose-p:my-0.5 prose-p:leading-normal max-w-none focus:outline-none focus:ring-0 focus:border-none [&_*]:outline-none [&_*]:focus:outline-none w-full h-auto min-h-full cursor-text"
            />
          </div>

          {/* Visual Resize Indicator on Bottom-Right Corner when Selected */}
          {isSelected && (
            <div 
              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-indigo-500 rounded-full border-2 border-white dark:border-zinc-900 shadow-xs pointer-events-none opacity-80" 
              title="Puxe para redimensionar"
            />
          )}
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

          {/* Table Background Color Section in Context Menu */}
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-800/60 my-1 border-y border-slate-100 dark:border-zinc-800">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1 flex items-center justify-between">
              <span>Cor de fundo</span>
              <span className="text-[10px] text-slate-400 font-normal">Células</span>
            </div>
            <div className="grid grid-cols-5 gap-1 mb-1.5">
              {TABLE_BG_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className="w-6 h-6 rounded border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-[10px] hover:scale-110 transition-transform shadow-2xs"
                  style={{ backgroundColor: c.value || 'transparent' }}
                  title={c.name}
                  onClick={() => {
                    editor.chain().focus().setCellAttribute('backgroundColor', c.value || null).run();
                    setContextMenu(null);
                  }}
                >
                  {!c.value && '✕'}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-zinc-700/60">
              <button
                type="button"
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                onClick={() => {
                  const currentColor = (editor.getAttributes('tableCell').backgroundColor as string) || '#f1f5f9';
                  setEntireTableBackgroundColor(editor, currentColor);
                  setContextMenu(null);
                }}
              >
                Aplicar na tabela inteira
              </button>
              <input
                type="color"
                onInput={(e) => {
                  const color = (e.target as HTMLInputElement).value;
                  editor.chain().focus().setCellAttribute('backgroundColor', color).run();
                }}
                className="h-5 w-5 p-0 rounded cursor-pointer border-none bg-transparent"
                title="Escolher cor personalizada"
              />
            </div>
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
  onOpenSearch?: () => void;
}

export function NoteEditor({ pageId, isSidebarCollapsed, onToggleSidebar, onOpenSearch }: NoteEditorProps) {
  const pages = useNoteStore((state) => state.pages);
  const updatePage = useNoteStore((state) => state.updatePage);
  const relations = useNoteStore((state) => state.relations);
  const page = pages.find((p) => p.id === pageId);
  const [blocks, setBlocks] = useState<CanvasBlock[]>([]);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isInsertLinkOpen, setIsInsertLinkOpen] = useState(false);
  const [insertLinkTab, setInsertLinkTab] = useState<'registered' | 'custom'>('registered');
  const [insertLinkTargetBlockId, setInsertLinkTargetBlockId] = useState<string | null>(null);
  const [isRelatedLinksOpen, setIsRelatedLinksOpen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  // Gemini AI Assistant Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [aiTargetBlockId, setAiTargetBlockId] = useState<string | null>(null);
  const [aiSelectedText, setAiSelectedText] = useState('');
  const [aiFullBlockText, setAiFullBlockText] = useState('');

  // Screen Capture & Crop State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [capturedRawImage, setCapturedRawImage] = useState<{ dataUrl: string; width: number; height: number } | null>(null);

  // Move or Copy Block Modal State
  const [transferModalState, setTransferModalState] = useState<{
    isOpen: boolean;
    block: CanvasBlock | null;
    initialAction?: 'move' | 'copy';
  }>({
    isOpen: false,
    block: null,
    initialAction: 'move',
  });

  // Move or Copy Image into Text Block Modal State
  const [insertImageToTextBlockModal, setInsertImageToTextBlockModal] = useState<{
    isOpen: boolean;
    imageBlock: CanvasBlock | null;
  }>({
    isOpen: false,
    imageBlock: null,
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastLoadedPageIdRef = useRef<string | null>(null);
  const lastSavedContentRef = useRef<string | null>(null);

  // Listen for scroll & highlight target block event from search
  useEffect(() => {
    const handleScrollToBlock = (e: Event) => {
      const customEvent = e as CustomEvent<{ pageId: string; blockId?: string }>;
      if (!customEvent.detail || customEvent.detail.pageId !== pageId) return;

      const targetBlockId = customEvent.detail.blockId;
      if (!targetBlockId) return;

      setSelectedBlockId(targetBlockId);

      // Locate block and scroll canvas
      const targetBlock = blocks.find((b) => b.id === targetBlockId);
      if (targetBlock && canvasRef.current) {
        canvasRef.current.scrollTo({
          left: Math.max(0, targetBlock.x - 60),
          top: Math.max(0, targetBlock.y - 60),
          behavior: 'smooth',
        });
      }
    };

    window.addEventListener('meuhub_scroll_to_block', handleScrollToBlock);
    return () => window.removeEventListener('meuhub_scroll_to_block', handleScrollToBlock);
  }, [pageId, blocks]);

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
        const raw = page.conteudo.trim();

        if (isFieldEncrypted(raw)) {
          decryptNoteContent(raw).then(decrypted => {
            if (decrypted && decrypted !== raw) {
              try {
                if (decrypted.trim().startsWith('[')) {
                  const blocksData = JSON.parse(decrypted);
                  lastSavedContentRef.current = decrypted;
                  lastLoadedPageIdRef.current = pageId;
                  setBlocks(blocksData);
                  updatePage(pageId, { conteudo: decrypted });
                }
              } catch {
                // ignore
              }
            }
          });
          parsedBlocks = [];
        } else if (raw.startsWith('[')) {
          parsedBlocks = JSON.parse(raw);
        } else {
          parsedBlocks = [
            {
              id: `block_${Date.now()}`,
              x: 40,
              y: 40,
              width: 600,
              height: 'auto',
              type: 'text',
              content: raw,
            },
          ];
        }
      }
    } catch (e) {
      console.error('Error parsing canvas blocks', e);
    }

    // Filter out unselected empty blocks on load
    const safeParsed = Array.isArray(parsedBlocks) ? parsedBlocks : [];
    const validBlocks = safeParsed.filter((b) => b && !isBlockEmpty(b));
    setBlocks(validBlocks.length > 0 ? validBlocks : safeParsed);
    setActiveEditor(null);
    setSelectedBlockId(null);
  }, [pageId, page?.conteudo]);

  // Clean up empty blocks
  const purgeAndSave = useCallback(
    (currentBlocks: CanvasBlock[], activeId?: string | null) => {
      const safeBlocks = Array.isArray(currentBlocks) ? currentBlocks : [];
      const cleaned = safeBlocks.filter(
        (b) => b && (b.id === activeId || !isBlockEmpty(b))
      );
      setBlocks(cleaned);
      const json = JSON.stringify(cleaned);
      lastSavedContentRef.current = json;
      updatePage(pageId, { conteudo: json });
      return cleaned;
    },
    [pageId, updatePage]
  );

  const updateBlock = useCallback((id: string, updates: Partial<CanvasBlock>) => {
    setBlocks((prev) => {
      const updated = prev.map((b) => (b.id === id ? { ...b, ...updates } : b));
      const json = JSON.stringify(updated);
      lastSavedContentRef.current = json;
      Promise.resolve().then(() => {
        updatePage(pageId, { conteudo: json });
      });
      return updated;
    });
  }, [pageId, updatePage]);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const blockToRemove = prev.find((b) => b.id === id);
      const updated = prev.filter((b) => b.id !== id);
      const json = JSON.stringify(updated);
      lastSavedContentRef.current = json;
      Promise.resolve().then(() => {
        updatePage(pageId, { conteudo: json });
      });
      if (blockToRemove && !isBlockEmpty(blockToRemove)) {
        toast('Bloco removido', {
          duration: 7000,
          action: {
            label: 'Desfazer',
            onClick: () => {
              setBlocks((current) => {
                const restored = [...current, blockToRemove];
                const restoredJson = JSON.stringify(restored);
                lastSavedContentRef.current = restoredJson;
                Promise.resolve().then(() => {
                  updatePage(pageId, { conteudo: restoredJson });
                });
                return restored;
              });
              toast.success('Bloco restaurado!');
            },
          },
        });
      }
      return updated;
    });
    setSelectedBlockId((curr) => (curr === id ? null : curr));
    setActiveEditor(null);
  }, [pageId, updatePage]);

  // Duplicate a block
  const duplicateBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const target = prev.find((b) => b.id === id);
      if (!target) return prev;
      const newBlock: CanvasBlock = {
        ...target,
        id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        x: target.x + 30,
        y: target.y + 30,
      };
      const updated = [...prev, newBlock];
      const json = JSON.stringify(updated);
      lastSavedContentRef.current = json;
      Promise.resolve().then(() => {
        updatePage(pageId, { conteudo: json });
      });
      setSelectedBlockId(newBlock.id);
      return updated;
    });
    toast.success('Bloco duplicado!');
  }, [pageId, updatePage]);

  // Open modal to move or copy block to another page or section
  const handleOpenTransferModal = useCallback((block: CanvasBlock, action: 'move' | 'copy' = 'move') => {
    setTransferModalState({
      isOpen: true,
      block,
      initialAction: action,
    });
  }, []);

  // Copy block to clipboard (localStorage + window clipboard)
  const handleCopyBlockToClipboard = useCallback((block: CanvasBlock) => {
    copyBlockToClipboard(block);
  }, []);

  // Paste block from clipboard into current page canvas
  const handlePasteBlockFromClipboard = useCallback(() => {
    const copiedBlock = getBlockFromClipboard();
    if (!copiedBlock) {
      toast.error('Nenhum bloco copiado na área de transferência.');
      return;
    }
    const pos = getSpawnPosition(
      typeof copiedBlock.width === 'number' ? copiedBlock.width : 440,
      typeof copiedBlock.height === 'number' ? copiedBlock.height : 220
    );
    const newBlock: CanvasBlock = {
      ...copiedBlock,
      id: `${copiedBlock.type || 'block'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      x: pos.x,
      y: pos.y,
    };
    setBlocks((prev) => {
      const updated = [...prev, newBlock];
      const json = JSON.stringify(updated);
      lastSavedContentRef.current = json;
      Promise.resolve().then(() => {
        updatePage(pageId, { conteudo: json });
      });
      return updated;
    });
    setSelectedBlockId(newBlock.id);
    toast.success(`Bloco "${getBlockSummary(newBlock)}" colado na página!`);
  }, [pageId, updatePage, blocks]);

  // Helper to calculate spawn position avoiding overlapping on top of existing notes
  const getSpawnPosition = (blockWidth = 440, blockHeight = 220) => {
    const scrollLeft = canvasRef.current?.scrollLeft || 0;
    const scrollTop = canvasRef.current?.scrollTop || 0;
    
    // Check if user has existing blocks
    if (blocks.length > 0) {
      // Find the lowest bottom of existing blocks
      const maxY = blocks.reduce((acc, b) => {
        const h = typeof b.height === 'number' ? b.height : parseInt(String(b.height)) || 180;
        return Math.max(acc, b.y + h);
      }, 0);

      // Position comfortably below existing content or at top if user scrolled down
      if (scrollTop < maxY) {
        return {
          x: Math.max(30, scrollLeft + 40),
          y: maxY + 24,
        };
      }
    }

    const offset = (blocks.length % 6) * 25;
    return {
      x: Math.max(30, scrollLeft + 50 + offset),
      y: Math.max(30, scrollTop + 60 + offset),
    };
  };

  // Bring a block to the highest visual layer (front of DOM stack)
  const bringBlockToFront = useCallback((id: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const target = prev[idx];
      const rest = prev.filter((b) => b.id !== id);
      const updated = [...rest, target];
      const json = JSON.stringify(updated);
      lastSavedContentRef.current = json;
      Promise.resolve().then(() => {
        updatePage(pageId, { conteudo: json });
      });
      return updated;
    });
    setSelectedBlockId(id);
  }, [pageId, updatePage]);

  // Send a block to the back of the DOM stack
  const sendBlockToBack = useCallback((id: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx <= 0) return prev;
      const target = prev[idx];
      const rest = prev.filter((b) => b.id !== id);
      const updated = [target, ...rest];
      const json = JSON.stringify(updated);
      lastSavedContentRef.current = json;
      Promise.resolve().then(() => {
        updatePage(pageId, { conteudo: json });
      });
      return updated;
    });
    setSelectedBlockId(id);
  }, [pageId, updatePage]);

  // Add a new Text & Table block
  const handleAddTextBlock = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const cleaned = purgeAndSave(blocks, null);
    const pos = getSpawnPosition(440, 180);
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
    const json = JSON.stringify(nextBlocks);
    lastSavedContentRef.current = json;
    updatePage(pageId, { conteudo: json });
  }, [blocks, purgeAndSave, pageId, updatePage]);

  // Add a new Script / Code block
  const handleAddScriptBlock = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const cleaned = purgeAndSave(blocks, null);
    const pos = getSpawnPosition(560, 380);
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
    const json = JSON.stringify(nextBlocks);
    lastSavedContentRef.current = json;
    updatePage(pageId, { conteudo: json });
  }, [blocks, purgeAndSave, pageId, updatePage]);

  // Add a new Secret / Token Vault block
  const handleAddVaultBlock = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const cleaned = purgeAndSave(blocks, null);
    const pos = getSpawnPosition(520, 340);
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
    const json = JSON.stringify(nextBlocks);
    lastSavedContentRef.current = json;
    updatePage(pageId, { conteudo: json });
  }, [blocks, purgeAndSave, pageId, updatePage]);

  // Add a new Excalidraw Custom Block
  const handleAddExcalidrawBlock = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const cleaned = purgeAndSave(blocks, null);
    const pos = getSpawnPosition(760, 500);
    const newBlock: CanvasBlock = {
      id: `excalidraw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      x: pos.x,
      y: pos.y,
      width: 760,
      height: 500,
      type: 'excalidraw',
      excalidrawTitle: 'Novo Desenho Excalidraw',
      excalidrawElements: '[]',
      excalidrawAppState: '{}',
      excalidrawFiles: '{}',
      excalidrawLastEdited: new Date().toISOString(),
    };
    const nextBlocks = [...cleaned, newBlock];
    setBlocks(nextBlocks);
    setSelectedBlockId(newBlock.id);
    const json = JSON.stringify(nextBlocks);
    lastSavedContentRef.current = json;
    updatePage(pageId, { conteudo: json });
    toast.success('Quadro Excalidraw adicionado!');
  }, [blocks, purgeAndSave, pageId, updatePage]);

  // Add a new Draw.io Professional Diagram block
  const handleAddDrawioBlock = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const cleaned = purgeAndSave(blocks, null);
    const pos = getSpawnPosition(780, 500);
    const newBlock: CanvasBlock = {
      id: `drawio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      x: pos.x,
      y: pos.y,
      width: 780,
      height: 500,
      type: 'drawio',
      drawioTitle: 'Novo Diagrama Draw.io',
      drawioXml: '',
      drawioSvg: '',
      drawioLastEdited: new Date().toISOString(),
    };
    const nextBlocks = [...cleaned, newBlock];
    setBlocks(nextBlocks);
    setSelectedBlockId(newBlock.id);
    const json = JSON.stringify(nextBlocks);
    lastSavedContentRef.current = json;
    updatePage(pageId, { conteudo: json });
    toast.success('Bloco de diagrama Draw.io adicionado!');
  }, [blocks, purgeAndSave, pageId, updatePage]);

  // Open insert link modal targeting custom tab or block
  const handleOpenInsertLink = useCallback((tab: 'registered' | 'custom' = 'registered', targetBlockId?: string) => {
    setInsertLinkTab(tab);
    setInsertLinkTargetBlockId(targetBlockId || selectedBlockId || null);
    setIsInsertLinkOpen(true);
  }, [selectedBlockId]);

  // Add a link card block (registered or custom/unregistered)
  const handleInsertLinkCard = useCallback((link: Link | { id?: string; titulo: string; url: string; descricao?: string; categoria?: string }) => {
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
      linkCategory: 'categoria' in link ? link.categoria : undefined,
    };
    const nextBlocks = [...cleaned, newBlock];
    setBlocks(nextBlocks);
    setSelectedBlockId(newBlock.id);
    const json = JSON.stringify(nextBlocks);
    lastSavedContentRef.current = json;
    updatePage(pageId, { conteudo: json });
    toast.success('Card de link adicionado ao quadro!');
  }, [blocks, purgeAndSave, pageId, updatePage, getSpawnPosition]);

  // Insert an inline link into a text block or new block
  const handleInsertInlineLink = useCallback((url: string, title?: string, targetBlockId?: string) => {
    const displayTitle = title || url;
    let safeUrl = url.trim();
    if (!/^https?:\/\//i.test(safeUrl) && !safeUrl.startsWith('mailto:') && !safeUrl.startsWith('tel:')) {
      safeUrl = 'https://' + safeUrl;
    }
    const linkHtml = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${displayTitle}</a> `;

    // If new block requested
    if (targetBlockId === 'new_block') {
      const pos = getSpawnPosition(460, 200);
      const newBlock: CanvasBlock = {
        id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        x: pos.x,
        y: pos.y,
        width: 480,
        height: 'auto',
        type: 'text',
        content: `<p>🔗 ${linkHtml}</p><p></p>`,
      };
      setBlocks((prev) => {
        const updated = [...prev, newBlock];
        const json = JSON.stringify(updated);
        lastSavedContentRef.current = json;
        updatePage(pageId, { conteudo: json });
        return updated;
      });
      setSelectedBlockId(newBlock.id);
      toast.success('Novo bloco de anotação com o link criado!');
      return;
    }

    // If active editor is focused and target matches
    if (activeEditor && activeEditor.isFocused && (!targetBlockId || targetBlockId === selectedBlockId)) {
      const { from, to } = activeEditor.state.selection;
      if (from !== to) {
        activeEditor.chain().focus().extendMarkRange('link').setLink({ href: safeUrl }).run();
      } else {
        activeEditor.chain().focus().insertContent(linkHtml).run();
      }
      toast.success('Link inserido no texto!');
      return;
    }

    // Target specific block ID or selected block ID
    const targetId = targetBlockId || selectedBlockId;
    if (targetId) {
      setBlocks((prev) => {
        const updated = prev.map((b) => {
          if (b.id === targetId) {
            const prevContent = b.content || '<p></p>';
            return {
              ...b,
              content: `${prevContent}<p>🔗 ${linkHtml}</p>`,
            };
          }
          return b;
        });
        const json = JSON.stringify(updated);
        lastSavedContentRef.current = json;
        updatePage(pageId, { conteudo: json });
        return updated;
      });
      setSelectedBlockId(targetId);
      toast.success('Link inserido no bloco de anotações selecionado!');
    } else {
      // Create new text block
      const pos = getSpawnPosition(460, 200);
      const newBlock: CanvasBlock = {
        id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        x: pos.x,
        y: pos.y,
        width: 480,
        height: 'auto',
        type: 'text',
        content: `<p>🔗 ${linkHtml}</p><p></p>`,
      };
      setBlocks((prev) => {
        const updated = [...prev, newBlock];
        const json = JSON.stringify(updated);
        lastSavedContentRef.current = json;
        updatePage(pageId, { conteudo: json });
        return updated;
      });
      setSelectedBlockId(newBlock.id);
      toast.success('Novo bloco de anotações com o link criado!');
    }
  }, [activeEditor, getSpawnPosition, pageId, selectedBlockId, updatePage]);

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

  // Convert standalone ImageBlock into a rich TextBlock with the image embedded + editable text
  const handleConvertImageBlockToTextBlock = useCallback((imageBlockId: string) => {
    setBlocks((prev) => {
      const updated = prev.map((b) => {
        if (b.id === imageBlockId && b.type === 'image') {
          const title = b.imageTitle || 'Captura de Tela';
          const url = b.imageUrl || '';
          const caption = b.imageCaption || '';
          const notes = b.imageNotes || '';

          let html = `<p><strong>${title}</strong></p><p><img src="${url}" alt="${title.replace(/"/g, '&quot;')}" class="rounded-lg max-w-full my-2" /></p>`;
          if (caption) {
            html += `<p><em>${caption}</em></p>`;
          }
          if (notes) {
            html += `<p>${notes.replace(/\n/g, '<br/>')}</p>`;
          } else {
            html += `<p>✍️ <em>Adicione seus comentários e anotações aqui...</em></p>`;
          }

          return {
            ...b,
            type: 'text' as const,
            content: html,
            width: Math.max(typeof b.width === 'number' ? b.width : 480, 500),
            height: 'auto',
          };
        }
        return b;
      });

      const json = JSON.stringify(updated);
      lastSavedContentRef.current = json;
      updatePage(pageId, { conteudo: json });
      return updated;
    });
    setSelectedBlockId(imageBlockId);
    toast.success('Imagem convertida para bloco de anotações com texto!');
  }, [pageId, updatePage]);

  // Insert image HTML into an existing TextBlock on canvas (start or end)
  const handleInsertImageIntoExistingTextBlock = useCallback((
    targetBlockId: string,
    imageHtml: string,
    position: 'start' | 'end',
    removeOriginalImageBlock: boolean
  ) => {
    setBlocks((prev) => {
      let updated = prev.map((b) => {
        if (b.id === targetBlockId) {
          const currentContent = b.content || '<p></p>';
          const newContent = position === 'start'
            ? `${imageHtml}${currentContent}`
            : `${currentContent}${imageHtml}`;
          return {
            ...b,
            content: newContent,
            width: Math.max(typeof b.width === 'number' ? b.width : 440, 500),
          };
        }
        return b;
      });

      if (removeOriginalImageBlock && insertImageToTextBlockModal.imageBlock) {
        updated = updated.filter((b) => b.id !== insertImageToTextBlockModal.imageBlock!.id);
      }

      const json = JSON.stringify(updated);
      lastSavedContentRef.current = json;
      updatePage(pageId, { conteudo: json });
      return updated;
    });
    setSelectedBlockId(targetBlockId);
  }, [insertImageToTextBlockModal.imageBlock, pageId, updatePage]);

  // Create a new TextBlock with the image HTML embedded
  const handleCreateNewTextBlockWithImage = useCallback((
    imageHtml: string,
    removeOriginalImageBlock: boolean
  ) => {
    const pos = getSpawnPosition(520, 260);
    const newBlock: CanvasBlock = {
      id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      x: pos.x,
      y: pos.y,
      width: 520,
      height: 'auto',
      type: 'text',
      content: `${imageHtml}<p>✍️ <em>Adicione comentários...</em></p>`,
    };

    setBlocks((prev) => {
      let updated = [...prev, newBlock];
      if (removeOriginalImageBlock && insertImageToTextBlockModal.imageBlock) {
        updated = updated.filter((b) => b.id !== insertImageToTextBlockModal.imageBlock!.id);
      }
      const json = JSON.stringify(updated);
      lastSavedContentRef.current = json;
      updatePage(pageId, { conteudo: json });
      return updated;
    });
    setSelectedBlockId(newBlock.id);
  }, [getSpawnPosition, insertImageToTextBlockModal.imageBlock, pageId, updatePage]);

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
      // If an active text editor is focused, insert directly into that editor
      if (activeEditor && activeEditor.isFocused) {
        activeEditor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
        toast.success('Imagem inserida no bloco de anotações!');
        return;
      }
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
      // Check if target is inside an input or textarea
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            try {
              const { dataUrl, width, height } = await fileToDataUrl(file);
              
              // If active editor is focused, insert into editor
              if (activeEditor && activeEditor.isFocused) {
                activeEditor.chain().focus().setImage({ src: dataUrl, alt: 'Print Colado' }).run();
                toast.success('Imagem colada no bloco de anotações!');
                return;
              }

              // If a text block is selected, insert image directly into that text block
              if (selectedBlockId) {
                const selBlock = blocks.find((b) => b.id === selectedBlockId);
                if (selBlock && (!selBlock.type || selBlock.type === 'text')) {
                  const imgHtml = `<p><img src="${dataUrl}" alt="Print Colado" class="rounded-lg max-w-full my-2" /></p><p></p>`;
                  setBlocks((prev) => {
                    const updated = prev.map((b) => {
                      if (b.id === selectedBlockId) {
                        return { ...b, content: `${b.content || '<p></p>'}${imgHtml}` };
                      }
                      return b;
                    });
                    const json = JSON.stringify(updated);
                    lastSavedContentRef.current = json;
                    updatePage(pageId, { conteudo: json });
                    return updated;
                  });
                  toast.success('Imagem colada no bloco de anotações!');
                  return;
                }
              }

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
  }, [activeEditor, blocks, insertImageBlock, pageId, selectedBlockId, updatePage]);

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
      const json = JSON.stringify(nextBlocks);
      lastSavedContentRef.current = json;
      updatePage(pageId, { conteudo: json });
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
    const dateStr = new Intl.DateTimeFormat('pt-BR', { 
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }, [page?.created_at]);

  const formattedDateFull = useMemo(() => {
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
      {/* Discrete Top Header Bar */}
      {!isHeaderCollapsed ? (
        <div className="px-3.5 py-1.5 border-b border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 z-20 shrink-0 flex items-center justify-between gap-2 transition-all">
          {/* Left: Title & Date */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <input
              className="text-base sm:text-lg font-bold border-none outline-none bg-transparent placeholder-slate-300 dark:placeholder-zinc-600 text-slate-800 dark:text-zinc-100 truncate max-w-[240px] sm:max-w-[340px] focus:ring-0"
              value={page.titulo}
              onChange={(e) => updatePage(page.id, { titulo: e.target.value })}
              placeholder="Título da anotação..."
            />
            {formattedDate && (
              <span 
                className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium whitespace-nowrap shrink-0 flex items-center gap-1 bg-slate-100/90 dark:bg-zinc-800/90 px-2 py-0.5 rounded-md"
                title={`Criado em: ${formattedDateFull}`}
              >
                <Clock size={11} className="text-slate-400 dark:text-zinc-500" />
                <span>{formattedDate}</span>
              </span>
            )}
          </div>

          {/* Right: Consolidated Discrete Action Controls */}
          <div className="flex items-center gap-1.5 shrink-0 select-none">
            {/* Add Block Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg gap-1.5 shadow-2xs transition-colors"
                  title="Adicionar blocos de conteúdo no quadro"
                >
                  <Plus size={14} />
                  <span>Bloco</span>
                  <ChevronDown size={11} className="opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5">
                <DropdownMenuLabel className="text-[11px] text-slate-400 dark:text-zinc-500 font-normal px-2 py-1">
                  Inserir no quadro:
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={handleAddTextBlock}
                  className="text-xs cursor-pointer gap-2 py-1.5 font-medium"
                >
                  <Type size={14} className="text-slate-500 dark:text-zinc-400" />
                  <span>Texto & Tabela</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleAddScriptBlock}
                  className="text-xs cursor-pointer gap-2 py-1.5 font-medium"
                >
                  <Code2 size={14} className="text-emerald-500" />
                  <span>Script / Código</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleAddVaultBlock}
                  className="text-xs cursor-pointer gap-2 py-1.5 font-medium"
                >
                  <ShieldCheck size={14} className="text-amber-500" />
                  <span>Credenciais & Senhas</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleAddExcalidrawBlock}
                  className="text-xs cursor-pointer gap-2 py-1.5 font-medium"
                >
                  <Shapes size={14} className="text-indigo-500" />
                  <span>Desenho Excalidraw</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleAddDrawioBlock}
                  className="text-xs cursor-pointer gap-2 py-1.5 font-medium"
                >
                  <Network size={14} className="text-amber-600 dark:text-amber-400" />
                  <span>Diagrama Draw.io</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleCaptureScreen}
                  className="text-xs cursor-pointer gap-2 py-1.5 font-medium"
                >
                  <Camera size={14} className="text-sky-500" />
                  <span>Capturar Tela (Print)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs cursor-pointer gap-2 py-1.5 font-medium"
                >
                  <ImageIcon size={14} className="text-slate-500" />
                  <span>Carregar Imagem</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleOpenInsertLink('registered')}
                  className="text-xs cursor-pointer gap-2 py-1.5 font-medium"
                >
                  <LinkIcon size={14} className="text-indigo-500" />
                  <span>Inserir Link Cadastrado</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleOpenInsertLink('custom')}
                  className="text-xs cursor-pointer gap-2 py-1.5 font-medium"
                >
                  <Globe size={14} className="text-sky-500" />
                  <span>Inserir Link Avulso / URL</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handlePasteBlockFromClipboard}
                  className="text-xs cursor-pointer gap-2 py-1.5 font-medium text-indigo-600 dark:text-indigo-400"
                >
                  <Copy size={14} />
                  <span>Colar Bloco Copiado</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Gemini AI */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenAiAssistant()}
              className="h-7 px-2 text-xs bg-purple-50/80 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/80 rounded-lg gap-1 font-medium shadow-2xs"
              title="Assistente com Inteligência Artificial (Gemini)"
            >
              <Sparkles size={13} className="text-purple-600 dark:text-purple-400" />
              <span className="hidden sm:inline">IA Gemini</span>
            </Button>

            {/* Search Button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenSearch?.()}
              className="h-7 px-2 text-xs text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg gap-1.5 font-medium"
              title="Pesquisar em todas as notas (Ctrl+K)"
            >
              <Search size={14} className="text-slate-400 dark:text-zinc-500" />
              <kbd className="hidden md:inline-block px-1 py-0.2 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded text-[9px] font-mono text-slate-400">
                Ctrl+K
              </kbd>
            </Button>

            {/* Related Links */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsRelatedLinksOpen(true)}
              className="h-7 px-2 text-xs text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg gap-1 font-medium relative"
              title="Ver e gerenciar links relacionados a esta página"
            >
              <LinkIcon size={13} className="text-indigo-500 dark:text-indigo-400" />
              <span className="hidden lg:inline">Links</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-bold">
                {relatedLinksCount}
              </span>
            </Button>

            <div className="w-px h-4 bg-slate-200 dark:bg-zinc-800 mx-0.5" />

            {/* Collapse Header Toggle for Maximum Workspace */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsHeaderCollapsed(true)}
              className="h-7 w-7 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
              title="Modo Foco: Ocultar barra superior para ter espaço total de trabalho"
            >
              <ChevronUp size={15} />
            </Button>
          </div>
        </div>
      ) : (
        /* Collapsed Ultra-Discrete Top Strip */
        <div className="h-7 px-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/90 dark:bg-zinc-900/90 z-20 shrink-0 flex items-center justify-between gap-2 text-xs select-none">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-slate-700 dark:text-zinc-300 truncate max-w-[200px]">
              {page.titulo || 'Sem título'}
            </span>
            {formattedDate && (
              <span 
                className="hidden sm:inline-flex text-[10px] text-slate-400 dark:text-zinc-500 font-medium whitespace-nowrap shrink-0 items-center gap-1"
                title={`Criado em: ${formattedDateFull}`}
              >
                <span>•</span>
                <Clock size={10} className="text-slate-400 dark:text-zinc-500" />
                <span>{formattedDate}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* Quick Add Block Button in Collapsed Mode */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-5 px-2 text-[11px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded flex items-center gap-1 font-medium"
                  title="Adicionar bloco"
                >
                  <Plus size={12} />
                  <span>Bloco</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5">
                <DropdownMenuItem onClick={handleAddTextBlock} className="text-xs cursor-pointer gap-2 py-1.5 font-medium">
                  <Type size={14} className="text-slate-500" />
                  <span>Texto & Tabela</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAddScriptBlock} className="text-xs cursor-pointer gap-2 py-1.5 font-medium">
                  <Code2 size={14} className="text-emerald-500" />
                  <span>Script / Código</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAddVaultBlock} className="text-xs cursor-pointer gap-2 py-1.5 font-medium">
                  <ShieldCheck size={14} className="text-amber-500" />
                  <span>Credenciais</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAddExcalidrawBlock} className="text-xs cursor-pointer gap-2 py-1.5 font-medium">
                  <Shapes size={14} className="text-indigo-500" />
                  <span>Excalidraw</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAddDrawioBlock} className="text-xs cursor-pointer gap-2 py-1.5 font-medium">
                  <Network size={14} className="text-amber-600" />
                  <span>Draw.io</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleOpenInsertLink('registered')} className="text-xs cursor-pointer gap-2 py-1.5 font-medium">
                  <LinkIcon size={14} className="text-indigo-500" />
                  <span>Link Cadastrado</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenInsertLink('custom')} className="text-xs cursor-pointer gap-2 py-1.5 font-medium">
                  <Globe size={14} className="text-sky-500" />
                  <span>Link Avulso / URL</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handlePasteBlockFromClipboard} className="text-xs cursor-pointer gap-2 py-1.5 font-medium text-indigo-600 dark:text-indigo-400">
                  <Copy size={14} />
                  <span>Colar Bloco Copiado</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={() => setIsHeaderCollapsed(false)}
              className="h-5 px-2 text-[11px] text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 rounded flex items-center gap-1 transition-colors"
              title="Expandir barra de ferramentas completa"
            >
              <ChevronDown size={13} />
              <span className="hidden sm:inline">Mostrar barra</span>
            </button>
          </div>
        </div>
      )}

      {/* Formatting Toolbar (Active when a text editor is focused) */}
      <GlobalToolbar 
        editor={activeEditor} 
        onOpenAi={() => handleOpenAiAssistant()} 
        onCaptureScreen={handleCaptureScreen}
        onUploadImage={() => fileInputRef.current?.click()}
        onOpenInsertLinkModal={handleOpenInsertLink}
      />

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto bg-[#ffffff] dark:bg-zinc-950 relative w-full h-full p-4 pt-6">
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
                  onMoveOrCopy={handleOpenTransferModal}
                  onDuplicate={duplicateBlock}
                  onCopyClipboard={handleCopyBlockToClipboard}
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
                  onMoveOrCopy={handleOpenTransferModal}
                  onDuplicate={duplicateBlock}
                  onCopyClipboard={handleCopyBlockToClipboard}
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
                  onMoveOrCopy={handleOpenTransferModal}
                  onDuplicate={duplicateBlock}
                  onCopyClipboard={handleCopyBlockToClipboard}
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
                  onMoveOrCopy={handleOpenTransferModal}
                  onDuplicate={duplicateBlock}
                  onCopyClipboard={handleCopyBlockToClipboard}
                  onConvertToTextBlock={handleConvertImageBlockToTextBlock}
                  onOpenInsertToTextBlockModal={(blk) => setInsertImageToTextBlockModal({ isOpen: true, imageBlock: blk })}
                />
              );
            }

            if (block.type === 'whiteboard') {
              return (
                <WhiteboardBlock
                  key={block.id}
                  block={block}
                  updateBlock={updateBlock}
                  removeBlock={removeBlock}
                  isSelected={selectedBlockId === block.id}
                  setSelectedId={setSelectedBlockId}
                  bringToFront={bringBlockToFront}
                  sendToBack={sendBlockToBack}
                  onMoveOrCopy={handleOpenTransferModal}
                  onDuplicate={duplicateBlock}
                  onCopyClipboard={handleCopyBlockToClipboard}
                />
              );
            }

            if (block.type === 'drawio') {
              return (
                <DrawioBlock
                  key={block.id}
                  block={block}
                  updateBlock={updateBlock}
                  removeBlock={removeBlock}
                  isSelected={selectedBlockId === block.id}
                  setSelectedId={setSelectedBlockId}
                  bringToFront={bringBlockToFront}
                  sendToBack={sendBlockToBack}
                  onMoveOrCopy={handleOpenTransferModal}
                  onDuplicate={duplicateBlock}
                  onCopyClipboard={handleCopyBlockToClipboard}
                />
              );
            }

            if (block.type === 'excalidraw') {
              return (
                <ExcalidrawBlock
                  key={block.id}
                  block={block}
                  updateBlock={updateBlock}
                  removeBlock={removeBlock}
                  isSelected={selectedBlockId === block.id}
                  setSelectedId={setSelectedBlockId}
                  bringToFront={bringBlockToFront}
                  sendToBack={sendBlockToBack}
                  onMoveOrCopy={handleOpenTransferModal}
                  onDuplicate={duplicateBlock}
                  onCopyClipboard={handleCopyBlockToClipboard}
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
                onOpenInsertLink={(bId) => handleOpenInsertLink('registered', bId)}
                onMoveOrCopy={handleOpenTransferModal}
                onDuplicate={duplicateBlock}
                onCopyClipboard={handleCopyBlockToClipboard}
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

      {/* Insert Link Modal (Supports both registered library and custom/unregistered URLs) */}
      <InsertLinkModal
        isOpen={isInsertLinkOpen}
        onClose={() => setIsInsertLinkOpen(false)}
        pageId={page.id}
        initialTab={insertLinkTab}
        targetTextBlockId={insertLinkTargetBlockId}
        allBlocks={blocks}
        onInsertCardBlock={handleInsertLinkCard}
        onInsertInlineLink={handleInsertInlineLink}
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
          if (activeEditor && activeEditor.isFocused) {
            activeEditor.chain().focus().setImage({ src: croppedUrl, alt: 'Recorte de Tela' }).run();
            toast.success('Recorte inserido no bloco de anotações!');
            return;
          }
          if (selectedBlockId) {
            const selBlock = blocks.find((b) => b.id === selectedBlockId);
            if (selBlock && (!selBlock.type || selBlock.type === 'text')) {
              const imgHtml = `<p><img src="${croppedUrl}" alt="Recorte de Tela" class="rounded-lg max-w-full my-2" /></p><p></p>`;
              setBlocks((prev) => {
                const updated = prev.map((b) => {
                  if (b.id === selectedBlockId) {
                    return { ...b, content: `${b.content || '<p></p>'}${imgHtml}` };
                  }
                  return b;
                });
                const json = JSON.stringify(updated);
                lastSavedContentRef.current = json;
                updatePage(pageId, { conteudo: json });
                return updated;
              });
              toast.success('Recorte adicionado ao bloco de anotações selecionado!');
              return;
            }
          }
          insertImageBlock(croppedUrl, width, height, 'Recorte de Tela');
          toast.success('Recorte de tela adicionado à anotação!');
        }}
      />

      {/* Settings Modal (Configurar token Gemini, informações do desenvolvedor e sistema) */}
      <SettingsModal
        open={isSettingsModalOpen}
        onOpenChange={setIsSettingsModalOpen}
      />

      {/* Move / Copy Block Modal (Mover ou copiar bloco para outra página/seção) */}
      {transferModalState.block && (
        <MoveOrCopyBlockModal
          isOpen={transferModalState.isOpen}
          onClose={() => setTransferModalState({ isOpen: false, block: null, initialAction: 'move' })}
          sourcePageId={page.id}
          sourceSectionId={page.secao_id}
          block={transferModalState.block}
          initialAction={transferModalState.initialAction}
          onBlockMoved={(blockId) => {
            // Remove block locally if moved
            removeBlock(blockId);
          }}
        />
      )}

      {/* Insert / Merge Image into Text Block Modal */}
      {insertImageToTextBlockModal.imageBlock && (
        <InsertImageToTextBlockModal
          isOpen={insertImageToTextBlockModal.isOpen}
          onClose={() => setInsertImageToTextBlockModal({ isOpen: false, imageBlock: null })}
          imageBlock={insertImageToTextBlockModal.imageBlock}
          allBlocks={blocks}
          onConvertToTextBlock={handleConvertImageBlockToTextBlock}
          onInsertIntoExistingTextBlock={handleInsertImageIntoExistingTextBlock}
          onCreateNewTextBlockWithImage={handleCreateNewTextBlockWithImage}
        />
      )}
    </div>
  );
}

