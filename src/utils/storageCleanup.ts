import { db } from '../db/database';

export interface CleanupResult {
  deletedCount: number;
  deletedBlocksCount: number;
  freedBytes: number;
}

export async function cleanupOrphanedImages(): Promise<CleanupResult> {
  let deletedCount = 0;
  let deletedBlocksCount = 0;
  let freedBytes = 0;

  // 1. Get all pages in one fast array operation
  const pages = await db.pages.toArray();
  const existingPageIds = new Set<string>();
  pages.forEach(page => {
    if (page.id) {
      existingPageIds.add(page.id);
    }
  });

  // 2. Clean up orphaned blocks whose parent page no longer exists
  const blocks = await db.blocks.toArray();
  const orphanBlockIds: string[] = [];
  const validBlocks: typeof blocks = [];
  
  blocks.forEach(block => {
    if (block.id) {
      if (!block.pageId || !existingPageIds.has(block.pageId)) {
        orphanBlockIds.push(block.id);
      } else {
        validBlocks.push(block);
      }
    }
  });

  if (orphanBlockIds.length > 0) {
    deletedBlocksCount = orphanBlockIds.length;
    await db.blocks.bulkDelete(orphanBlockIds);
  }

  // 3. Fast regex scanning for active image and PDF references
  const referencedImageIds = new Set<string>();
  const referencedPdfIds = new Set<string>();
  const IMAGE_REF_REGEX = /bergson-image:\/\/([a-zA-Z0-9_-]+)/g;
  const PDF_REF_REGEX = /bergson-pdf:\/\/([a-zA-Z0-9_-]+)/g;

  // a) Scan pages (coverImages and Whiteboard content strings)
  pages.forEach(page => {
    if (page.coverImage && page.coverImage.startsWith('bergson-image://')) {
      referencedImageIds.add(page.coverImage.replace('bergson-image://', ''));
    }
    if (page.content) {
      const imgMatches = page.content.matchAll(IMAGE_REF_REGEX);
      for (const match of imgMatches) {
        if (match[1]) referencedImageIds.add(match[1]);
      }
      const pdfMatches = page.content.matchAll(PDF_REF_REGEX);
      for (const match of pdfMatches) {
        if (match[1]) referencedPdfIds.add(match[1]);
      }
    }
  });

  // b) Scan all blocks belonging to existing pages
  validBlocks.forEach(block => {
    if (block.content) {
      const imgMatches = block.content.matchAll(IMAGE_REF_REGEX);
      for (const match of imgMatches) {
        if (match[1]) referencedImageIds.add(match[1]);
      }
      const pdfMatches = block.content.matchAll(PDF_REF_REGEX);
      for (const match of pdfMatches) {
        if (match[1]) referencedPdfIds.add(match[1]);
      }
    }
  });

  // 4. Get only keys of images to check references (Saves loading large base64 data into RAM)
  const allImageIds = await db.images.toCollection().primaryKeys();
  const imgIdsToDelete = allImageIds.filter((id: string) => !referencedImageIds.has(id));

  if (imgIdsToDelete.length > 0) {
    // Only load the data of images we are deleting
    const imgsToDelete = await db.images.bulkGet(imgIdsToDelete);
    imgsToDelete.forEach(img => {
      if (img) {
        freedBytes += (img.size || Math.floor(img.data.length * 0.75));
        deletedCount++;
      }
    });
    await db.images.bulkDelete(imgIdsToDelete);
  }

  // 5. Get only keys of PDFs to check references (Saves loading large PDF files into RAM)
  const allPdfIds = await db.pdfs.toCollection().primaryKeys();
  const pdfIdsToDelete = allPdfIds.filter((id: string) => !referencedPdfIds.has(id));

  if (pdfIdsToDelete.length > 0) {
    // Only load the data of PDFs we are deleting
    const pdfsToDelete = await db.pdfs.bulkGet(pdfIdsToDelete);
    pdfsToDelete.forEach(pdf => {
      if (pdf) {
        freedBytes += (pdf.size || Math.floor(pdf.data.length * 0.75));
        deletedCount++;
      }
    });
    await db.pdfs.bulkDelete(pdfIdsToDelete);
  }

  return { deletedCount, deletedBlocksCount, freedBytes };
}
