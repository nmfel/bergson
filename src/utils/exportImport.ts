import { exportDB, importDB } from 'dexie-export-import';
import { db } from '../db/database';
import { toast } from 'sonner';
import { cleanupOrphanedImages } from './storageCleanup';

export const exportDatabase = async () => {
  try {
    // Automatically purge dead image blobs before creating backup
    await cleanupOrphanedImages();
    const blob = await exportDB(db, { prettyJson: true });
    
    // Create a download link and trigger it
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `bergson-backup-${date}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    toast.success('Backup exported successfully');
  } catch (error) {
    console.error('Export failed:', error);
    toast.error('Failed to export backup');
    throw error;
  }
};

export const importDatabase = async (file: File) => {
  try {
    // We might need to clear the existing DB first or let importDB overwrite
    // importDB has an option { clearTablesBeforeImport: true } 
    // but sometimes it's safer to just importDB which merges or overwrites.
    
    await importDB(file, { clearTablesBeforeImport: true } as any);
    
    // Re-open DB if needed (Dexie handles most of this internally)
    toast.success('Backup restored successfully');
    
    // Force a reload to ensure all stores and state catch up with the new DB
    setTimeout(() => {
      window.location.reload();
    }, 1500);
    
  } catch (error) {
    console.error('Import failed:', error);
    toast.error('Failed to restore backup. Check file validity.');
    throw error;
  }
};

export const wipeDatabase = async () => {
  try {
    await db.delete();
    localStorage.clear();
    toast.success('All data has been permanently deleted');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.error('Wipe failed:', error);
    toast.error('Failed to wipe data');
    throw error;
  }
};
