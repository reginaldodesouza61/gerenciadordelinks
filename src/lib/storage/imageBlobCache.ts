import { offlineDb, ImageBlobCacheItem } from '@/lib/db/offlineDb';
import { trackEgressEvent } from './egressTracker';

const objectUrlMemoryMap = new Map<string, string>();
const activeFetchPromises = new Map<string, Promise<string>>();

/**
 * Normalizes a URL to get the core Supabase Storage path.
 */
export function getCleanStorageUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  return rawUrl.split('?')[0].trim();
}

/**
 * Checks if a URL points to Supabase Storage.
 */
export function isSupabaseStorageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.includes('supabase.co/storage/v1/object/public/') || url.includes('/storage/v1/object/public/note-assets');
}

/**
 * Resolves an image URL: checks IndexedDB imageBlobCache first.
 * If found, returns an Object URL (`blob:http...`) with 0 network egress.
 * If not found, fetches the image once, stores it in IndexedDB, and returns the Object URL.
 */
export async function getCachedImageUrl(rawUrl: string, pageId?: string, trigger = 'note_render'): Promise<string> {
  const cleanUrl = getCleanStorageUrl(rawUrl);
  if (!cleanUrl || !isSupabaseStorageUrl(cleanUrl)) {
    return rawUrl;
  }

  // 1. Check in-memory object URL cache
  if (objectUrlMemoryMap.has(cleanUrl)) {
    const cachedObjUrl = objectUrlMemoryMap.get(cleanUrl)!;
    trackEgressEvent({
      type: 'image_download',
      url: cleanUrl,
      sizeBytes: 0,
      noteId: pageId,
      trigger,
      cached: true,
    }).catch(() => {});
    return cachedObjUrl;
  }

  // 2. Prevent duplicate simultaneous network fetches for the exact same URL
  if (activeFetchPromises.has(cleanUrl)) {
    return activeFetchPromises.get(cleanUrl)!;
  }

  const fetchPromise = (async () => {
    try {
      // 3. Query Dexie IndexedDB
      let dbItem: ImageBlobCacheItem | undefined;
      try {
        if (offlineDb.imageBlobCache) {
          dbItem = await offlineDb.imageBlobCache.get(cleanUrl);
        }
      } catch (err) {
        console.debug('[ImageBlobCache] Error checking Dexie:', err);
      }

      if (dbItem && dbItem.blob) {
        // HIT! Serve from IndexedDB with ZERO network egress!
        const objUrl = URL.createObjectURL(dbItem.blob);
        objectUrlMemoryMap.set(cleanUrl, objUrl);

        // Update hit count asynchronously
        offlineDb.imageBlobCache.update(cleanUrl, { hitCount: (dbItem.hitCount || 0) + 1 }).catch(() => {});

        trackEgressEvent({
          type: 'image_download',
          url: cleanUrl,
          sizeBytes: dbItem.size,
          noteId: pageId,
          trigger: `${trigger}_indexeddb_hit`,
          cached: true,
        }).catch(() => {});

        return objUrl;
      }

      // 4. MISS! Fetch over the network once, store in IndexedDB
      const response = await fetch(cleanUrl, { mode: 'cors', cache: 'force-cache' });
      if (!response.ok) {
        return cleanUrl; // fallback to raw URL if download fails
      }

      const blob = await response.blob();
      const size = blob.size || parseInt(response.headers.get('content-length') || '0', 10);
      const mimeType = blob.type || 'image/png';

      // Save to Dexie IndexedDB
      try {
        if (offlineDb.imageBlobCache) {
          await offlineDb.imageBlobCache.put({
            url: cleanUrl,
            blob,
            mimeType,
            size,
            pageId,
            fetchedAt: Date.now(),
            hitCount: 1,
          });
        }
      } catch (e) {
        console.debug('[ImageBlobCache] Failed to store blob in IndexedDB:', e);
      }

      const objUrl = URL.createObjectURL(blob);
      objectUrlMemoryMap.set(cleanUrl, objUrl);

      // Track Egress Event (Network Download)
      trackEgressEvent({
        type: 'image_download',
        url: cleanUrl,
        sizeBytes: size,
        noteId: pageId,
        trigger: `${trigger}_network_download`,
        cached: false,
      }).catch(() => {});

      return objUrl;
    } catch (err) {
      console.warn('[ImageBlobCache] Fetch image failed, using direct URL:', err);
      return cleanUrl;
    } finally {
      activeFetchPromises.delete(cleanUrl);
    }
  })();

  activeFetchPromises.set(cleanUrl, fetchPromise);
  return fetchPromise;
}

/**
 * Pre-caches all images referenced inside blocks of a note page into IndexedDB in the background.
 */
export async function preCacheNoteImages(blocks: Array<{ type?: string; imageUrl?: string; conteudo?: string; content?: string }>, pageId?: string) {
  if (!Array.isArray(blocks)) return;

  const storageUrls: string[] = [];

  blocks.forEach((block) => {
    if (block.type === 'image') {
      if (block.imageUrl && isSupabaseStorageUrl(block.imageUrl)) {
        storageUrls.push(block.imageUrl);
      }
      if (block.conteudo && isSupabaseStorageUrl(block.conteudo)) {
        storageUrls.push(block.conteudo);
      }
    } else if (block.type === 'text') {
      const txt = block.conteudo || block.content || '';
      const regex = /src="(https:\/\/[^"]+supabase\.co\/storage\/v1\/object\/public\/[^"]+)"/g;
      let match;
      while ((match = regex.exec(txt)) !== null) {
        storageUrls.push(match[1]);
      }
    }
  });

  const uniqueUrls = Array.from(new Set(storageUrls));
  for (const url of uniqueUrls) {
    await getCachedImageUrl(url, pageId, 'precache_background').catch(() => {});
  }
}

/**
 * Clears the image blob cache from Dexie and revokes object URLs.
 */
export async function clearImageBlobCache(): Promise<number> {
  let count = 0;
  try {
    if (offlineDb.imageBlobCache) {
      count = await offlineDb.imageBlobCache.count();
      await offlineDb.imageBlobCache.clear();
    }
  } catch (e) {
    console.debug('Failed to clear imageBlobCache:', e);
  }

  objectUrlMemoryMap.forEach((objUrl) => {
    try {
      URL.revokeObjectURL(objUrl);
    } catch {
      // ignore
    }
  });
  objectUrlMemoryMap.clear();

  return count;
}
