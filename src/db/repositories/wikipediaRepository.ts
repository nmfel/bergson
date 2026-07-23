import { db } from '../database';
import type { Wikipedia } from '../../types';

export const wikipediaRepository = {
  async saveSnippet(snippet: Omit<Wikipedia, 'id' | 'insertedAt'>): Promise<string> {
    const id = crypto.randomUUID();
    await db.wikipedia.add({
      ...snippet,
      id,
      insertedAt: new Date()
    });
    return id;
  },

  async getSnippets(): Promise<Wikipedia[]> {
    return db.wikipedia.orderBy('insertedAt').reverse().toArray();
  },

  async deleteSnippet(id: string): Promise<void> {
    await db.wikipedia.delete(id);
  }
};
