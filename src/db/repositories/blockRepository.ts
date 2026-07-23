import { db } from '../database';
import type { Block } from '../../types';

export const blockRepository = {
  async getBlocksByPageId(pageId: string): Promise<Block[]> {
    return db.blocks.where('pageId').equals(pageId).sortBy('order');
  },

  async getAllBlocks(): Promise<Block[]> {
    return db.blocks.toArray();
  },

  async createBlock(block: Omit<Block, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    await db.blocks.add({
      ...block,
      id
    });
    return id;
  },

  async updateBlock(id: string, data: Partial<Block>): Promise<void> {
    await db.blocks.update(id, data);
  },

  async deleteBlock(id: string): Promise<void> {
    await db.blocks.delete(id);
  },

  async deleteBlocksByPageId(pageId: string): Promise<void> {
    await db.blocks.where('pageId').equals(pageId).delete();
  },

  async reorderBlocks(pageId: string, blockIds: string[]): Promise<void> {
    await db.transaction('rw', db.blocks, async () => {
      for (let i = 0; i < blockIds.length; i++) {
        await db.blocks.update(blockIds[i], { order: i, pageId });
      }
    });
  }
};
