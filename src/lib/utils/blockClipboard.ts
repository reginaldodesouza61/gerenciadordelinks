import { CanvasBlock } from '@/types/notes';

const CLIPBOARD_STORAGE_KEY = 'meuhub_block_clipboard';

export interface BlockClipboardData {
  block: CanvasBlock;
  sourcePageTitle?: string;
  copiedAt: string;
}

export function copyBlockToClipboard(block: CanvasBlock, sourcePageTitle?: string): void {
  try {
    const data: BlockClipboardData = {
      block: JSON.parse(JSON.stringify(block)),
      sourcePageTitle: sourcePageTitle || 'Página de Anotação',
      copiedAt: new Date().toISOString(),
    };
    localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('meuhub_clipboard_change'));
  } catch (e) {
    console.error('Failed to copy block to clipboard:', e);
  }
}

export function getBlockFromClipboard(): BlockClipboardData | null {
  try {
    const raw = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read block from clipboard:', e);
    return null;
  }
}

export function clearBlockClipboard(): void {
  try {
    localStorage.removeItem(CLIPBOARD_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('meuhub_clipboard_change'));
  } catch (e) {
    console.error('Failed to clear block clipboard:', e);
  }
}

export function getBlockTypeLabel(type?: string): { label: string; color: string; badge: string } {
  switch (type) {
    case 'vault':
      return {
        label: 'Cofre de Credenciais & Senhas',
        color: 'text-amber-600 dark:text-amber-400',
        badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      };
    case 'script':
      return {
        label: 'Script / Código',
        color: 'text-emerald-600 dark:text-emerald-400',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
      };
    case 'image':
      return {
        label: 'Imagem / Captura de Tela',
        color: 'text-sky-600 dark:text-sky-400',
        badge: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
      };
    case 'excalidraw':
      return {
        label: 'Desenho Excalidraw',
        color: 'text-indigo-600 dark:text-indigo-400',
        badge: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
      };
    case 'whiteboard':
      return {
        label: 'Quadro / Diagrama Fluxo',
        color: 'text-purple-600 dark:text-purple-400',
        badge: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
      };
    case 'drawio':
      return {
        label: 'Diagrama Draw.io',
        color: 'text-orange-600 dark:text-orange-400',
        badge: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
      };
    case 'link':
      return {
        label: 'Card de Link',
        color: 'text-indigo-600 dark:text-indigo-400',
        badge: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
      };
    case 'text':
    default:
      return {
        label: 'Bloco de Texto & Tabela',
        color: 'text-slate-600 dark:text-zinc-300',
        badge: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
      };
  }
}

export function getBlockSummary(block: CanvasBlock): { title: string; subtitle: string } {
  switch (block.type) {
    case 'vault': {
      const count = block.secrets?.length || 0;
      return {
        title: block.vaultTitle || 'Cofre de Credenciais & Senhas',
        subtitle: `${count} credencial(is) / chave(s) cadastradas`,
      };
    }
    case 'script': {
      return {
        title: block.title || block.filename || 'Script de Código',
        subtitle: `${block.language ? block.language.toUpperCase() : 'BASH'} • ${block.filename || 'script'}`,
      };
    }
    case 'image': {
      return {
        title: block.imageTitle || 'Imagem / Captura de Tela',
        subtitle: block.capturedAt || 'Imagem salva no quadro',
      };
    }
    case 'excalidraw': {
      return {
        title: block.excalidrawTitle || 'Desenho Excalidraw',
        subtitle: 'Quadro visual Excalidraw',
      };
    }
    case 'whiteboard': {
      const count = block.elements?.length || 0;
      return {
        title: block.drawingTitle || 'Quadro de Processos & Diagrama',
        subtitle: `${count} elementos desenhados`,
      };
    }
    case 'drawio': {
      return {
        title: block.drawioTitle || 'Diagrama Draw.io',
        subtitle: 'Diagrama de arquitetura & fluxo',
      };
    }
    case 'link': {
      return {
        title: block.linkTitle || 'Link Cadastrado',
        subtitle: block.linkUrl || '',
      };
    }
    case 'text':
    default: {
      const rawHtml = block.content || '';
      const text = rawHtml.replace(/<[^>]*>/g, '').trim();
      const firstLine = text.split('\n')[0] || '';
      return {
        title: firstLine.length > 50 ? `${firstLine.substring(0, 50)}...` : firstLine || 'Bloco de Texto',
        subtitle: `${text.length} caracteres`,
      };
    }
  }
}
