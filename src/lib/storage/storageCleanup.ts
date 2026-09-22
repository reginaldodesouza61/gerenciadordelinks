import { supabase } from '@/lib/supabase';
import { CanvasBlock } from '@/types/notes';

/**
 * Extracts all Storage Public URLs referenced inside note blocks.
 * Supports both standalone image blocks and inline images embedded inside rich text blocks.
 */
export function getReferencedUrls(blocks: CanvasBlock[]): Set<string> {
  const urls = new Set<string>();

  blocks.forEach((block) => {
    if (block.type === 'image') {
      if (block.imageUrl && block.imageUrl.startsWith('http')) {
        urls.add(block.imageUrl);
      }
      if (block.conteudo && block.conteudo.startsWith('http')) {
        urls.add(block.conteudo);
      }
    } else if (block.type === 'text') {
      const blockContent = block.conteudo || block.content || '';
      const regex = /src="(https:\/\/[^"]+)"/g;
      let match;
      while ((match = regex.exec(blockContent)) !== null) {
        urls.add(match[1]);
      }
    }
  });

  return urls;
}

/**
 * Parses a Supabase Storage public URL to extract the relative file path.
 * Format: https://[project-id].supabase.co/storage/v1/object/public/[bucket]/[file-path]
 */
export function getStoragePathFromUrl(url: string, bucketName = 'note-assets'): string | null {
  try {
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const index = url.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(url.substring(index + marker.length));
  } catch (err) {
    console.error('Erro ao extrair caminho do arquivo da URL:', err);
    return null;
  }
}

/**
 * Deletes an asset from the Supabase Storage bucket.
 */
export async function deleteAsset(url: string, bucketName = 'note-assets'): Promise<boolean> {
  const filePath = getStoragePathFromUrl(url, bucketName);
  if (!filePath) return false;

  try {
    const { error } = await supabase.storage.from(bucketName).remove([filePath]);
    if (error) {
      console.error(`[Cleanup] Falha ao excluir arquivo '${filePath}':`, error);
      return false;
    }
    console.log(`[Cleanup] Arquivo excluído com sucesso do storage: '${filePath}'`);
    return true;
  } catch (err) {
    console.error(`[Cleanup] Erro inesperado ao excluir arquivo '${filePath}':`, err);
    return false;
  }
}

/**
 * Audit and cleanup routine: Lists all files in storage for the current note,
 * identifies orphaned assets (files that exist in the bucket but are no longer
 * referenced in any of the note's active blocks), and deletes them.
 * 
 * Safety: This should be run on a deferred basis or manually to avoid breaking
 * the "Undo" (Desfazer) buffer.
 */
export async function cleanupOrphanedAssets(
  pageId: string,
  userId: string,
  blocks: CanvasBlock[],
  bucketName = 'note-assets'
): Promise<{ scanned: number; deleted: number; orphans: string[] }> {
  const referencedUrls = getReferencedUrls(blocks);
  const folderPath = `${userId}/${pageId}`;
  
  const result = {
    scanned: 0,
    deleted: 0,
    orphans: [] as string[],
  };

  try {
    // List all files inside the note's storage folder
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list(folderPath, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      // If folder or bucket doesn't exist, nothing to clean up
      if (error.message?.includes('not found') || (error as Record<string, unknown>).status === 404) {
        return result;
      }
      throw error;
    }

    if (!files || files.length === 0) {
      return result;
    }

    result.scanned = files.length;
    const pathsToDelete: string[] = [];

    files.forEach((file) => {
      // Reconstruct the public URL of the file in storage
      const relativePath = `${folderPath}/${file.name}`;
      const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(relativePath);

      // If the public URL is NOT inside the referenced set, it is an orphan
      if (!referencedUrls.has(publicUrl)) {
        pathsToDelete.push(relativePath);
        result.orphans.push(publicUrl);
      }
    });

    if (pathsToDelete.length > 0) {
      const { error: deleteError } = await supabase.storage.from(bucketName).remove(pathsToDelete);
      if (deleteError) {
        console.error('[Cleanup] Erro ao remover arquivos órfãos:', deleteError);
      } else {
        result.deleted = pathsToDelete.length;
        console.log(`[Cleanup] Removidos ${result.deleted} arquivos órfãos para a nota ${pageId}.`);
      }
    }
  } catch (err) {
    console.error(`[Cleanup] Falha ao auditar e limpar arquivos órfãos para a nota ${pageId}:`, err);
  }

  return result;
}
