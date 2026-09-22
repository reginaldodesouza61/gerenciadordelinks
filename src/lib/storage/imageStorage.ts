import { supabase } from '@/lib/supabase';

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
 * Automatically attempts to create the bucket as public if it does not exist.
 * 
 * @returns The public URL of the uploaded image.
 */
export async function uploadImageToStorage(
  source: string | File | Blob,
  pageId: string,
  userId: string
): Promise<string> {
  const bucketName = 'note-assets';
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
    // If the bucket doesn't exist, try to create it and retry once
    const isBucketError = 
      uploadError.message?.includes('bucket') || 
      uploadError.message?.includes('not found') || 
      (uploadError as Record<string, unknown>).status === 404 ||
      (uploadError as Record<string, unknown>).statusCode === '404';

    if (isBucketError) {
      console.log(`Bucket '${bucketName}' não encontrado. Tentando criar automaticamente...`);
      try {
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true,
        });

        if (createError) {
          console.warn('Não foi possível criar o bucket automaticamente devido a restrições de permissão RLS do Supabase.', createError);
          throw new Error('BUCKET_NOT_FOUND');
        }

        // Retry the upload after creating the bucket
        const { error: retryError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, blob, {
            contentType,
            upsert: true,
          });

        if (retryError) throw retryError;
      } catch (err) {
        console.error('Falha na criação automática do bucket ou no reenvio:', err);
        throw new Error('BUCKET_NOT_FOUND');
      }
    } else {
      throw uploadError;
    }
  }

  // Retrieve the public URL
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  if (!data || !data.publicUrl) {
    throw new Error('Não foi possível obter a URL pública do arquivo enviado.');
  }

  return data.publicUrl;
}
