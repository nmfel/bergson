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

  // 1. Get set of all existing page IDs (including trashed pages so images aren't deleted before restore)
  const existingPageIds = new Set<string>();
  await db.pages.each(page => {
    if (page.id) {
      existingPageIds.add(page.id);
    }
  });

  // 2. Clean up orphaned blocks whose parent page no longer exists
  const orphanBlockIds: string[] = [];
  await db.blocks.each(block => {
    if (block.id && (!block.pageId || !existingPageIds.has(block.pageId))) {
      orphanBlockIds.push(block.id);
    }
  });

  if (orphanBlockIds.length > 0) {
    deletedBlocksCount = orphanBlockIds.length;
    await db.blocks.bulkDelete(orphanBlockIds);
  }

  // 3. Fast regex scanning for all active image references (bergson-image://<id>)
  const referencedImageIds = new Set<string>();
  const IMAGE_REF_REGEX = /bergson-image:\/\/([a-zA-Z0-9_-]+)/g;

  // a) Scan pages (coverImages and Whiteboard content strings)
  await db.pages.each(page => {
    if (page.coverImage && page.coverImage.startsWith('bergson-image://')) {
      referencedImageIds.add(page.coverImage.replace('bergson-image://', ''));
    }
    if (page.content) {
      const matches = page.content.matchAll(IMAGE_REF_REGEX);
      for (const match of matches) {
        if (match[1]) referencedImageIds.add(match[1]);
      }
    }
  });

  // b) Scan all blocks belonging to existing pages
  await db.blocks.each(block => {
    if (block.pageId && existingPageIds.has(block.pageId) && block.content) {
      const matches = block.content.matchAll(IMAGE_REF_REGEX);
      for (const match of matches) {
        if (match[1]) referencedImageIds.add(match[1]);
      }
    }
  });

  // 4. Bulk delete orphaned images via cursor stream
  const idsToDelete: string[] = [];
  await db.images.each(img => {
    if (img.id && !referencedImageIds.has(img.id)) {
      freedBytes += (img.size || Math.floor(img.data.length * 0.75));
      idsToDelete.push(img.id);
      deletedCount++;
    }
  });

  if (idsToDelete.length > 0) {
    await db.images.bulkDelete(idsToDelete);
  }

  return { deletedCount, deletedBlocksCount, freedBytes };
}
