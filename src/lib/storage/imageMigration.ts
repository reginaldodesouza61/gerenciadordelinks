import { NotePage, CanvasBlock } from '@/types/notes';
import { uploadImageToStorage } from '@/lib/storage/imageStorage';
import { offlineDb } from '@/lib/db/offlineDb';

export interface NoteImageAuditItem {
  pageId: string;
  pageTitle: string;
  blockId: string;
  blockType: 'image' | 'text';
  base64DataUrl: string;
  sizeBytes: number;
}

export interface WorkspaceImageAuditResult {
  totalPagesScanned: number;
  pagesWithBase64Count: number;
  totalBase64Images: number;
  totalStorageImages: number;
  totalOtherUrlImages: number;
  totalBase64Bytes: number;
  estimatedCompressedBytes: number;
  estimatedSavingsBytes: number;
  savingsPercentage: number;
  pageDetails: Array<{
    pageId: string;
    pageTitle: string;
    base64Count: number;
    storageUrlCount: number;
    base64Bytes: number;
    base64Images: NoteImageAuditItem[];
    storageUrls: string[];
  }>;
}

export interface BatchMigrationProgress {
  currentImageIndex: number;
  totalImages: number;
  currentPageId: string;
  currentPageTitle: string;
  statusText: string;
  percent: number;
}

export interface BatchMigrationResult {
  totalMigrated: number;
  totalFailed: number;
  pagesUpdated: number;
  migratedBytes: number;
  savedBytes: number;
  errors: string[];
}

/**
 * Extracts and classifies all images from a note page's blocks.
 */
export function auditPageImages(page: NotePage): {
  base64Images: NoteImageAuditItem[];
  storageUrls: string[];
  otherUrls: string[];
  base64Bytes: number;
} {
  const base64Images: NoteImageAuditItem[] = [];
  const storageUrls: string[] = [];
  const otherUrls: string[] = [];
  let base64Bytes = 0;

  let blocks: CanvasBlock[] = [];
  try {
    if (page.conteudo) {
      blocks = JSON.parse(page.conteudo);
    }
  } catch {
    blocks = [];
  }

  if (!Array.isArray(blocks)) return { base64Images, storageUrls, otherUrls, base64Bytes };

  blocks.forEach((block) => {
    if (block.type === 'image') {
      const src = block.imageUrl || block.conteudo || '';
      if (src.startsWith('data:image/')) {
        const approxBytes = Math.round(src.length * 0.75);
        base64Bytes += approxBytes;
        base64Images.push({
          pageId: page.id,
          pageTitle: page.titulo,
          blockId: block.id,
          blockType: 'image',
          base64DataUrl: src,
          sizeBytes: approxBytes,
        });
      } else if (src.includes('/storage/v1/object/public/note-assets/')) {
        storageUrls.push(src);
      } else if (src.startsWith('http')) {
        otherUrls.push(src);
      }
    } else if (block.type === 'text') {
      const content = block.conteudo || block.content || '';
      
      // Check Base64 in img tags
      const base64Regex = /src="(data:image\/[^"]+;base64,[^"]+)"/g;
      let match;
      while ((match = base64Regex.exec(content)) !== null) {
        const approxBytes = Math.round(match[1].length * 0.75);
        base64Bytes += approxBytes;
        base64Images.push({
          pageId: page.id,
          pageTitle: page.titulo,
          blockId: block.id,
          blockType: 'text',
          base64DataUrl: match[1],
          sizeBytes: approxBytes,
        });
      }

      // Check storage URLs in img tags
      const storageRegex = /src="(https:\/\/[^"]+\/storage\/v1\/object\/public\/note-assets\/[^"]+)"/g;
      let storageMatch;
      while ((storageMatch = storageRegex.exec(content)) !== null) {
        storageUrls.push(storageMatch[1]);
      }

      // Check other URLs in img tags
      const otherRegex = /src="(https?:\/\/(?![^"]*\/storage\/v1\/object\/public\/note-assets\/)[^"]+)"/g;
      let otherMatch;
      while ((otherMatch = otherRegex.exec(content)) !== null) {
        otherUrls.push(otherMatch[1]);
      }
    }
  });

  return { base64Images, storageUrls, otherUrls, base64Bytes };
}

/**
 * Audits all pages in the workspace (from in-memory store and/or Dexie).
 */
export async function auditAllWorkspaceNotes(pages: NotePage[]): Promise<WorkspaceImageAuditResult> {
  // Merge pages from parameter and offlineDb to ensure complete coverage
  const pagesMap = new Map<string, NotePage>();
  pages.forEach((p) => pagesMap.set(p.id, p));

  try {
    if (offlineDb.pages) {
      const dexiePages = await offlineDb.pages.toArray();
      dexiePages.forEach((dp) => {
        if (!pagesMap.has(dp.id)) {
          pagesMap.set(dp.id, dp as unknown as NotePage);
        } else {
          // If dexie has more recent content, use it
          const existing = pagesMap.get(dp.id);
          if (dp.conteudo && (!existing?.conteudo || dp.conteudo.length > (existing.conteudo?.length || 0))) {
            pagesMap.set(dp.id, { ...existing, ...dp } as unknown as NotePage);
          }
        }
      });
    }
  } catch (err) {
    console.debug('IndexedDB read during audit:', err);
  }

  const allPages = Array.from(pagesMap.values());
  let totalBase64Images = 0;
  let totalStorageImages = 0;
  let totalOtherUrlImages = 0;
  let totalBase64Bytes = 0;
  let pagesWithBase64Count = 0;

  const pageDetails: WorkspaceImageAuditResult['pageDetails'] = [];

  allPages.forEach((page) => {
    const { base64Images, storageUrls, otherUrls, base64Bytes } = auditPageImages(page);
    
    totalBase64Images += base64Images.length;
    totalStorageImages += storageUrls.length;
    totalOtherUrlImages += otherUrls.length;
    totalBase64Bytes += base64Bytes;

    if (base64Images.length > 0) {
      pagesWithBase64Count++;
    }

    pageDetails.push({
      pageId: page.id,
      pageTitle: page.titulo || 'Sem título',
      base64Count: base64Images.length,
      storageUrlCount: storageUrls.length,
      base64Bytes,
      base64Images,
      storageUrls,
    });
  });

  // Compression estimates: WebP compresses large Base64 by ~90%
  // Average target WebP file size is ~250KB per heavy image, or ~10% of raw Base64 size
  const estimatedCompressedBytes = totalBase64Images > 0 
    ? Math.round(totalBase64Bytes * 0.12)
    : 0;
  const estimatedSavingsBytes = Math.max(0, totalBase64Bytes - estimatedCompressedBytes);
  const savingsPercentage = totalBase64Bytes > 0 
    ? Math.round((estimatedSavingsBytes / totalBase64Bytes) * 100) 
    : 0;

  return {
    totalPagesScanned: allPages.length,
    pagesWithBase64Count,
    totalBase64Images,
    totalStorageImages,
    totalOtherUrlImages,
    totalBase64Bytes,
    estimatedCompressedBytes,
    estimatedSavingsBytes,
    savingsPercentage,
    pageDetails,
  };
}

/**
 * Runs a complete batch migration across all pages with Base64 images.
 */
export async function migrateAllWorkspaceNotes(
  pages: NotePage[],
  userId: string,
  updatePageFn: (id: string, updates: Partial<NotePage>) => Promise<void>,
  onProgress?: (progress: BatchMigrationProgress) => void
): Promise<BatchMigrationResult> {
  const audit = await auditAllWorkspaceNotes(pages);
  const pagesWithBase64 = audit.pageDetails.filter((p) => p.base64Count > 0);

  const result: BatchMigrationResult = {
    totalMigrated: 0,
    totalFailed: 0,
    pagesUpdated: 0,
    migratedBytes: 0,
    savedBytes: 0,
    errors: [],
  };

  if (pagesWithBase64.length === 0 || audit.totalBase64Images === 0) {
    return result;
  }

  let processedCount = 0;
  const totalImages = audit.totalBase64Images;

  for (const pageItem of pagesWithBase64) {
    const pageId = pageItem.pageId;
    const pageTitle = pageItem.pageTitle;
    let pageUpdated = false;

    // Load fresh blocks for this page
    const pageObj = pages.find((p) => p.id === pageId);
    let blocks: CanvasBlock[] = [];
    try {
      if (pageObj?.conteudo) {
        blocks = JSON.parse(pageObj.conteudo);
      }
    } catch {
      blocks = [];
    }

    if (blocks.length === 0) continue;

    const updatedBlocks = JSON.parse(JSON.stringify(blocks)) as CanvasBlock[];

    for (let i = 0; i < pageItem.base64Images.length; i++) {
      const item = pageItem.base64Images[i];
      processedCount++;

      if (onProgress) {
        onProgress({
          currentImageIndex: processedCount,
          totalImages,
          currentPageId: pageId,
          currentPageTitle: pageTitle,
          statusText: `Migrando imagem ${processedCount} de ${totalImages} (${pageTitle})...`,
          percent: Math.round((processedCount / totalImages) * 100),
        });
      }

      try {
        const publicUrl = await uploadImageToStorage(item.base64DataUrl, pageId, userId);

        const block = updatedBlocks.find((b) => b.id === item.blockId);
        if (block) {
          if (block.type === 'image') {
            block.imageUrl = publicUrl;
            block.conteudo = publicUrl;
            result.totalMigrated++;
            result.migratedBytes += item.sizeBytes;
            pageUpdated = true;
          } else if (block.type === 'text') {
            if (block.conteudo) {
              block.conteudo = block.conteudo.replace(item.base64DataUrl, publicUrl);
            }
            if (block.content) {
              block.content = block.content.replace(item.base64DataUrl, publicUrl);
            }
            result.totalMigrated++;
            result.migratedBytes += item.sizeBytes;
            pageUpdated = true;
          }
        }
      } catch (uploadErr) {
        const errMsg = (uploadErr as Error)?.message || String(uploadErr);
        console.error(`[BatchMigration] Erro ao migrar imagem ${item.blockId}:`, errMsg);
        result.totalFailed++;
        result.errors.push(`Página "${pageTitle}": ${errMsg}`);
      }
    }

    if (pageUpdated) {
      try {
        const jsonContent = JSON.stringify(updatedBlocks);
        await updatePageFn(pageId, { conteudo: jsonContent });
        result.pagesUpdated++;

        if (offlineDb.pages) {
          await offlineDb.pages.update(pageId, { conteudo: jsonContent });
        }
      } catch (saveErr) {
        console.error(`[BatchMigration] Erro ao salvar página ${pageId}:`, saveErr);
        result.errors.push(`Erro ao salvar página "${pageTitle}": ${(saveErr as Error)?.message}`);
      }
    }
  }

  result.savedBytes = Math.round(result.migratedBytes * 0.88);

  if (onProgress) {
    onProgress({
      currentImageIndex: totalImages,
      totalImages,
      currentPageId: '',
      currentPageTitle: '',
      statusText: `Migração concluída! ${result.totalMigrated} imagens migradas com sucesso.`,
      percent: 100,
    });
  }

  return result;
}
