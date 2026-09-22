import { supabase } from '@/lib/supabase';

let bucketCheckPromise: Promise<boolean> | null = null;
let bucketAvailableCache: boolean | null = null;
let lastCheckTimestamp = 0;
const CACHE_LIFETIME = 60000; // 1 minute cache

/**
 * Checks if the Supabase Storage bucket 'note-assets' exists and is accessible.
 * Caches the result to avoid redundant network requests and prevent error spam.
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
      const { data, error } = await supabase.storage.getBucket('note-assets');
      if (error || !data) {
        bucketAvailableCache = false;
      } else {
        bucketAvailableCache = true;
      }
    } catch {
      bucketAvailableCache = false;
    } finally {
      lastCheckTimestamp = Date.now();
      bucketCheckPromise = null;
    }
    return bucketAvailableCache;
  })();

  return bucketCheckPromise;
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
 * If the bucket is not available, gracefully throws BUCKET_NOT_FOUND without attempting
 * client-side bucket creation (which is forbidden by Supabase RLS policies for anonymous clients).
 * 
 * @returns The public URL of the uploaded image.
 */
export async function uploadImageToStorage(
  source: string | File | Blob,
  pageId: string,
  userId: string
): Promise<string> {
  const bucketName = 'note-assets';

  const isAvailable = await isStorageBucketAvailable();
  if (!isAvailable) {
    throw new Error('BUCKET_NOT_FOUND');
  }

  let blob: Blob;
  let contentType = 'image/png';

  if (typeof source === 'string') {
    if (!source.startsWith('data:image/')) {
      throw new Error('A string fornecida não é um formato de dados Base64 válido.');
    }
    blob = base64ToBlob(source);
    contentType = blob.type;
  } else {
    blob = source;
    contentType = source.type || 'image/png';
  }

  // Generate a clean, unique file path
  const extension = contentType.split('/')[1] || 'png';
  const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  const filePath = `${userId}/${pageId}/${uniqueId}.${extension}`;

  // Attempt the upload
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, blob, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    const isBucketError = 
      uploadError.message?.includes('bucket') || 
      uploadError.message?.includes('not found') || 
      (uploadError as Record<string, unknown>).status === 404 ||
      (uploadError as Record<string, unknown>).statusCode === '404';

    if (isBucketError) {
      bucketAvailableCache = false;
      throw new Error('BUCKET_NOT_FOUND');
    }
    throw uploadError;
  }

  // Retrieve the public URL
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  if (!data || !data.publicUrl) {
    throw new Error('Não foi possível obter a URL pública do arquivo enviado.');
  }

  return data.publicUrl;
}
