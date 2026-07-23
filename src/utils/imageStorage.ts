import { imageRepository } from '../db/repositories/imageRepository';

export const IMAGE_PROTOCOL = 'bergson-image://';

export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function storeImageToDB(dataUrl: string): Promise<string> {
  // If it's already a protocol URL, return it
  if (dataUrl.startsWith(IMAGE_PROTOCOL)) {
    return dataUrl;
  }
  
  if (!dataUrl.startsWith('data:image/')) {
    return dataUrl; // Not a base64 string
  }

  const hash = await hashString(dataUrl);
  
  // Calculate size in bytes approximately
  const base64Len = dataUrl.length - (dataUrl.indexOf(',') + 1);
  const size = Math.floor(base64Len * 0.75);

  const id = await imageRepository.saveImage({
    hash,
    data: dataUrl,
    size,
    width: 0, 
    height: 0
  });

  return `${IMAGE_PROTOCOL}${id}`;
}

const blobUrlCache = new Map<string, string>();
const MAX_BLOB_CACHE_SIZE = 30;

function pruneBlobCache() {
  while (blobUrlCache.size >= MAX_BLOB_CACHE_SIZE) {
    const oldestKey = blobUrlCache.keys().next().value;
    if (!oldestKey) break;
    const oldUrl = blobUrlCache.get(oldestKey);
    blobUrlCache.delete(oldestKey);
    if (oldUrl) {
      try {
        URL.revokeObjectURL(oldUrl);
      } catch (e) {
        // Ignore revocation errors
      }
    }
  }
}

export function clearBlobCache() {
  const cacheCopy = new Map(blobUrlCache);
  blobUrlCache.clear();
  
  // Delay revocation by 10 seconds to ensure any asynchronous operations
  // (like Whiteboard pending saves) have finished using these Blob URLs.
  setTimeout(() => {
    cacheCopy.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // Ignore
      }
    });
    cacheCopy.clear();
  }, 10000);
}

export async function resolveImageUrl(url: string): Promise<string> {
  if (url.startsWith(IMAGE_PROTOCOL)) {
    const id = url.replace(IMAGE_PROTOCOL, '');
    
    // Check in-memory blob cache first for instant resolution
    if (blobUrlCache.has(id)) {
      const existingUrl = blobUrlCache.get(id)!;
      // Re-insert to mark as recently used
      blobUrlCache.delete(id);
      blobUrlCache.set(id, existingUrl);
      return existingUrl;
    }

    const img = await imageRepository.getImageById(id);
    if (img && img.data) {
      try {
        const response = await fetch(img.data);
        const blob = await response.blob();
        pruneBlobCache();
        const blobUrl = URL.createObjectURL(blob);
        blobUrlCache.set(id, blobUrl);
        return blobUrl;
      } catch (e) {
        return img.data;
      }
    }
    return '';
  }
  return url;
}

export function getIdFromBlobUrl(blobUrl: string): string | null {
  for (const [id, url] of blobUrlCache.entries()) {
    if (url === blobUrl) return id;
  }
  return null;
}

// Recursively processes an object (like Whiteboard JSON) and replaces inline base64 with bergson-image URLs
export async function extractAndStoreImagesFromJson(obj: any): Promise<any> {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('data:image/')) {
       return await storeImageToDB(obj);
    }
    if (obj.startsWith('blob:')) {
       const id = getIdFromBlobUrl(obj);
       if (id) return `${IMAGE_PROTOCOL}${id}`;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = await extractAndStoreImagesFromJson(obj[i]);
    }
    return obj;
  }
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key === 'src' && typeof obj[key] === 'string') {
         if (obj[key].startsWith('data:image/')) {
            obj[key] = await storeImageToDB(obj[key]);
         } else if (obj[key].startsWith('blob:')) {
            const id = getIdFromBlobUrl(obj[key]);
            if (id) {
               obj[key] = `${IMAGE_PROTOCOL}${id}`;
            }
         }
      } else {
         obj[key] = await extractAndStoreImagesFromJson(obj[key]);
      }
    }
    return obj;
  }
  return obj;
}

// Recursively processes an object (like Whiteboard JSON) and replaces bergson-image URLs with base64
export async function resolveImagesInJson(obj: any): Promise<any> {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith(IMAGE_PROTOCOL)) {
       return await resolveImageUrl(obj);
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = await resolveImagesInJson(obj[i]);
    }
    return obj;
  }
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key === 'src' && typeof obj[key] === 'string' && obj[key].startsWith(IMAGE_PROTOCOL)) {
         obj[key] = await resolveImageUrl(obj[key]);
      } else {
         obj[key] = await resolveImagesInJson(obj[key]);
      }
    }
    return obj;
  }
  return obj;
}
