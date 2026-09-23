import { supabase } from '@/lib/supabase';
import { trackEgressEvent } from './egressTracker';
import { offlineDb } from '@/lib/db/offlineDb';

let bucketCheckPromise: Promise<boolean> | null = null;
let bucketAvailableCache: boolean | null = null;
let lastCheckTimestamp = 0;
const CACHE_LIFETIME = 60000; // 1 minute cache

/**
 * Optimizes/compresses an image Blob before uploading to Supabase Storage.
 * Reduces 8MB raw PNG screen captures down to ~300KB WebP/JPEG (95%+ egress savings).
 */
export async function optimizeImageBlob(blob: Blob, maxDimension = 1920, quality = 0.82): Promise<Blob> {
  // If blob is already small (< 300 KB), leave it untouched
  if (blob.size < 300 * 1024) return blob;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(blob);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (compressedBlob) => {
          if (compressedBlob && compressedBlob.size < blob.size) {
            resolve(compressedBlob);
          } else {
            resolve(blob);
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };

    img.src = url;
  });
}

/**
 * Checks if the Supabase Storage bucket 'note-assets' exists and is accessible.
 * Client-compatible: avoids administrative getBucket() call which fails on client tokens.
 * Uses cached upload results or a client-safe list probe.
 */
export async function isStorageBucketAvailable(forceRefresh = false): Promise<boolean> {
  const now = Date.now();
  if (!forceRefresh && bucketAvailableCache !== null && now - lastCheckTimestamp < CACHE_LIFETIME) {
    return bucketAvailableCache;
  }

  if (bucketCheckPromise && !forceRefresh) {
    return bucketCheckPromise;
  }

  bucketCheckPromise = (async () => {
    try {
      // Client-safe check: list limit 1 does not require administrative getBucket privileges
      const { error } = await supabase.storage.from('note-assets').list('', { limit: 1 });
      if (error) {
        const isBucketNotFound = 
          error.message?.includes('not found') || 
          error.message?.includes('NoSuchBucket') ||
          (error as Record<string, unknown>).status === 404 ||
          (error as Record<string, unknown>).statusCode === '404';

        if (isBucketNotFound) {
          bucketAvailableCache = false;
        } else {
          // If error is permission-related (e.g. 403 on root listing), bucket exists!
          bucketAvailableCache = true;
        }
      } else {
        bucketAvailableCache = true;
      }
    } catch {
      // Default to optimistic true to avoid prematurely blocking valid uploads
      bucketAvailableCache = true;
    } finally {
      lastCheckTimestamp = Date.now();
      bucketCheckPromise = null;
    }
    return bucketAvailableCache;
  })();

  return bucketCheckPromise;
}

export function setStorageBucketAvailable(available: boolean) {
  bucketAvailableCache = available;
  lastCheckTimestamp = Date.now();
}

/**
 * Converts a Base64 data URL to a binary Blob.
 */
export function base64ToBlob(base64DataUrl: string): Blob {
  const matches = base64DataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Formato de dados Base64 inválido.');
  }
  const contentType = matches[1];
  const base64Data = matches[2];

  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

/**
 * Uploads an image (Base64 string or File/Blob) directly to the Supabase Storage bucket 'note-assets'.
 * Optimizes image size and immediately caches the uploaded file into IndexedDB imageBlobCache
 * to ensure 0 B network egress on subsequent renders.
 * 
 * @returns The public URL of the uploaded image.
 */
export async function uploadImageToStorage(
  source: string | File | Blob,
  pageId: string,
  userId: string
): Promise<string> {
  const bucketName = 'note-assets';

  let rawBlob: Blob;
  let contentType = 'image/png';

  if (typeof source === 'string') {
    if (!source.startsWith('data:image/')) {
      throw new Error('A string fornecida não é um formato de dados Base64 válido.');
    }
    rawBlob = base64ToBlob(source);
    contentType = rawBlob.type;
  } else {
    rawBlob = source;
    contentType = source.type || 'image/png';
  }

  // Compress/optimize heavy images before upload
  const blob = await optimizeImageBlob(rawBlob);
  contentType = blob.type || contentType;

  // Generate a clean, unique file path
  const extension = contentType.includes('webp') ? 'webp' : (contentType.split('/')[1] || 'png');
  const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  const filePath = `${userId}/${pageId}/${uniqueId}.${extension}`;

  // Attempt the upload directly without prior getBucket blocking
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, blob, {
      contentType,
      upsert: true,
      cacheControl: '36500000', // 1 year HTTP cache
    });

  if (uploadError) {
    const isBucketNotFound = 
      uploadError.message?.includes('NoSuchBucket') || 
      uploadError.message?.includes('bucket not found') || 
      uploadError.message?.includes('Bucket not found') || 
      (uploadError as Record<string, unknown>).status === 404 ||
      (uploadError as Record<string, unknown>).statusCode === '404';

    if (isBucketNotFound) {
      bucketAvailableCache = false;
      lastCheckTimestamp = Date.now();
      throw new Error('BUCKET_NOT_FOUND');
    }

    const isRlsError = 
      uploadError.message?.includes('row-level security') ||
      uploadError.message?.includes('AccessDenied') ||
      (uploadError as Record<string, unknown>).status === 403 ||
      (uploadError as Record<string, unknown>).statusCode === '403';

    if (isRlsError) {
      bucketAvailableCache = true;
      lastCheckTimestamp = Date.now();
      console.warn('[Storage] Erro de política de segurança (RLS) ao enviar imagem:', uploadError.message);
      throw new Error(`STORAGE_RLS_DENIED: ${uploadError.message}`);
    }

    throw uploadError;
  }

  // Upload succeeded: bucket is verified as active and accessible
  bucketAvailableCache = true;
  lastCheckTimestamp = Date.now();

  // Retrieve the public URL
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  if (!data || !data.publicUrl) {
    throw new Error('Não foi possível obter a URL pública do arquivo enviado.');
  }

  const publicUrl = data.publicUrl;

  // Immediately cache in local IndexedDB so browser never fetches it back from network!
  try {
    if (offlineDb.imageBlobCache) {
      await offlineDb.imageBlobCache.put({
        url: publicUrl,
        blob,
        mimeType: contentType,
        size: blob.size,
        pageId,
        fetchedAt: Date.now(),
        hitCount: 1,
      });
    }
  } catch (err) {
    console.debug('[StorageUpload] Failed to pre-cache in IndexedDB:', err);
  }

  // Record upload event
  trackEgressEvent({
    type: 'get_public_url',
    url: publicUrl,
    sizeBytes: blob.size,
    noteId: pageId,
    trigger: 'image_upload_initial',
    cached: true,
  }).catch(() => {});

  return publicUrl;
}
