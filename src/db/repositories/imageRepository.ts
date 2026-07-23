import { db } from '../database';
import type { Image } from '../../types';

export const imageRepository = {
  async saveImage(image: Omit<Image, 'id' | 'createdAt'>): Promise<string> {
    const existing = await this.getImageByHash(image.hash);
    if (existing && existing.id) {
      return existing.id;
    }

    const id = crypto.randomUUID();
    await db.images.add({
      ...image,
      id,
      createdAt: new Date()
    });
    return id;
  },

  async getImageById(id: string): Promise<Image | undefined> {
    return db.images.get(id);
  },

  async getImageByHash(hash: string): Promise<Image | undefined> {
    return db.images.where('hash').equals(hash).first();
  },

  async deleteImage(id: string): Promise<void> {
    await db.images.delete(id);
  }
};
