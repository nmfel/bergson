import { db } from '../db/database';
import type { PdfFile } from '../types';

export const PDF_PROTOCOL = 'bergson-pdf://';
export const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB soft limit

export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export async function storePdfToDB(file: File, pageCount: number = 1): Promise<{ id: string; protocolUrl: string; isDuplicate: boolean }> {
  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the 25 MB limit.`);
  }

  const hash = await hashFile(file);

  // Check deduplication first
  const existing = await db.pdfs.where('hash').equals(hash).first();
  if (existing && existing.id) {
    return {
      id: existing.id,
      protocolUrl: `${PDF_PROTOCOL}${existing.id}`,
      isDuplicate: true
    };
  }

  const dataBase64 = await fileToBase64(file);
  const id = crypto.randomUUID();

  const pdfRecord: PdfFile = {
    id,
    hash,
    data: dataBase64,
    name: file.name,
    size: file.size,
    pageCount,
    createdAt: new Date()
  };

  await db.pdfs.add(pdfRecord);

  return {
    id,
    protocolUrl: `${PDF_PROTOCOL}${id}`,
    isDuplicate: false
  };
}

const pdfBlobCache = new Map<string, string>();
const MAX_PDF_CACHE_SIZE = 10;

function prunePdfBlobCache() {
  while (pdfBlobCache.size >= MAX_PDF_CACHE_SIZE) {
    const oldestKey = pdfBlobCache.keys().next().value;
    if (!oldestKey) break;
    const oldUrl = pdfBlobCache.get(oldestKey);
    pdfBlobCache.delete(oldestKey);
    if (oldUrl) {
      try {
        URL.revokeObjectURL(oldUrl);
      } catch (e) {
        // Ignore
      }
    }
  }
}

export function base64ToBlob(base64Data: string, type: string = 'application/pdf'): Blob {
  const base64Index = base64Data.indexOf(';base64,');
  const rawBase64 = base64Index !== -1 ? base64Data.substring(base64Index + 8) : base64Data;
  const binaryString = atob(rawBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type });
}

export async function resolvePdfUrl(url: string): Promise<string> {
  if (!url.startsWith(PDF_PROTOCOL)) {
    return url;
  }

  const id = url.replace(PDF_PROTOCOL, '');

  if (pdfBlobCache.has(id)) {
    const existingUrl = pdfBlobCache.get(id)!;
    pdfBlobCache.delete(id);
    pdfBlobCache.set(id, existingUrl);
    return existingUrl;
  }

  const pdfRecord = await db.pdfs.get(id);
  if (pdfRecord && pdfRecord.data) {
    try {
      const blob = base64ToBlob(pdfRecord.data);
      prunePdfBlobCache();
      const blobUrl = URL.createObjectURL(blob);
      pdfBlobCache.set(id, blobUrl);
      return blobUrl;
    } catch (e) {
      return pdfRecord.data;
    }
  }

  return '';
}


export async function getPdfRecord(id: string): Promise<PdfFile | undefined> {
  return await db.pdfs.get(id);
}
