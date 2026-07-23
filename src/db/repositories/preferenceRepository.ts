import { db } from '../database';

export const preferenceRepository = {
  async getPreference(key: string): Promise<any> {
    const pref = await db.preferences.where('key').equals(key).first();
    if (pref && pref.value) {
      try {
        return JSON.parse(pref.value);
      } catch (e) {
        return pref.value;
      }
    }
    return undefined;
  },

  async setPreference(key: string, value: any): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const existing = await db.preferences.where('key').equals(key).first();
    
    if (existing && existing.id) {
      await db.preferences.update(existing.id, { value: stringValue });
    } else {
      await db.preferences.add({
        id: crypto.randomUUID(),
        key,
        value: stringValue
      });
    }
  }
};
