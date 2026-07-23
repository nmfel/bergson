import { db } from '../database';
import type { Page } from '../../types';

export const pageRepository = {
  async getAllPages(): Promise<Page[]> {
    return await db.pages.filter(p => !p.isDeleted).toArray();
  },

  async getTrashedPages(): Promise<Page[]> {
    return await db.pages.filter(p => !!p.isDeleted).toArray();
  },

  async getPageById(id: string): Promise<Page | undefined> {
    return await db.pages.get(id);
  },

  async createPage(page: Omit<Page, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date();
    await db.pages.add({
      ...page,
      id,
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now
    });
    return id;
  },

  async updatePage(id: string, data: Partial<Page>): Promise<void> {
    await db.pages.update(id, {
      ...data,
      updatedAt: new Date()
    });
  },

  async softDeletePage(id: string): Promise<void> {
    await db.pages.update(id, { isDeleted: true, deletedAt: new Date() });
    const children = await db.pages.where('parentId').equals(id).toArray();
    for (const child of children) {
      if (child.id) await this.softDeletePage(child.id);
    }
  },

  async restorePage(id: string): Promise<void> {
    await db.pages.update(id, { isDeleted: false, deletedAt: null });
    const children = await db.pages.where('parentId').equals(id).toArray();
    for (const child of children) {
      if (child.id) await this.restorePage(child.id);
    }
  },

  async deletePage(id: string): Promise<void> {
    const children = await db.pages.where('parentId').equals(id).toArray();
    for (const child of children) {
      if (child.id) {
        await this.deletePage(child.id);
      }
    }
    await db.transaction('rw', db.pages, db.blocks, async () => {
      await db.pages.delete(id);
      await db.blocks.where('pageId').equals(id).delete();
    });
  },

  async cleanupTrash(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const trashedPages = await this.getTrashedPages();
    for (const page of trashedPages) {
      if (page.deletedAt && new Date(page.deletedAt) < thirtyDaysAgo) {
        if (page.id) await this.deletePage(page.id);
      }
    }
  },

  async getPagesByParent(parentId: string | null): Promise<Page[]> {
    return db.pages.where('parentId').equals(parentId || '').toArray();
  },

  async searchPages(query: string): Promise<Page[]> {
    const lowerQuery = query.toLowerCase();
    return db.pages.filter(page => page.title.toLowerCase().includes(lowerQuery)).toArray();
  }
};
