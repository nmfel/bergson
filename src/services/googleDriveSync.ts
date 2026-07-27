import { db } from '../db/database';
import 'dexie-export-import';
import { useSyncStore } from '../store/syncStore';
import { cleanupOrphanedImages } from '../utils/storageCleanup';

declare const google: any;

const CLIENT_ID = '197043603410-joh2i9cf1p47hfsip91numdas0mia8so.apps.googleusercontent.com'; // User will replace this
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILENAME = 'bergson_backup.json';

// Make sure the GSI script is loaded in index.html: <script src="https://accounts.google.com/gsi/client" async defer></script>

export const googleDriveSync = {
  requestToken: (prompt: string = ''): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
          reject(new Error('Google Identity Services script is not loaded yet.'));
          return;
        }
        const client = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (response: any) => {
            if (response.error !== undefined) {
              reject(response);
              return;
            }
            const expiresIn = response.expires_in ? parseInt(response.expires_in, 10) : 3600;
            useSyncStore.getState().setAccessToken(response.access_token, expiresIn);
            useSyncStore.getState().setIsConnected(true);
            resolve(response.access_token);
          },
          error_callback: (err: any) => {
            reject(err);
          }
        });
        client.requestAccessToken(prompt ? { prompt } : { prompt: '' });
      } catch (error) {
        reject(error);
      }
    });
  },

  login: (): Promise<string> => {
    return googleDriveSync.requestToken('consent');
  },

  ensureValidToken: async (interactive: boolean = true): Promise<string> => {
    const { accessToken, tokenExpiresAt, isConnected } = useSyncStore.getState();
    const now = Date.now();

    // 1. Fast-path: Check if token is still valid by timestamp (with 1-minute buffer)
    if (accessToken && tokenExpiresAt && now < (tokenExpiresAt - 60000)) {
      return accessToken;
    }

    // 2. Validate token with lightweight Drive API request if token exists
    if (accessToken) {
      try {
        const query = `name='${BACKUP_FILENAME}'`;
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(query)}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.ok) {
          // Refresh expiration buffer
          useSyncStore.getState().setAccessToken(accessToken, 3600);
          return accessToken;
        }
      } catch (e) {
        console.warn('Token validation check failed, attempting silent refresh...', e);
      }
    }

    // 3. Token is expired or missing. Attempt silent refresh without popup
    if (isConnected || accessToken) {
      try {
        const newToken = await googleDriveSync.requestToken('');
        return newToken;
      } catch (e) {
        console.warn('Silent token refresh failed.', e);
      }
    }

    // 4. If non-interactive (background/startup auto-backup), do NOT trigger popup
    if (!interactive) {
      throw new Error('Google Drive session expired. Re-authentication required.');
    }

    // 5. Interactive fallback: trigger consent login prompt
    return await googleDriveSync.login();
  },

  getBackupFileId: async (accessToken: string): Promise<string | null> => {
    const query = `name='${BACKUP_FILENAME}'`;
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Query Error:', errText);
      throw new Error(`Failed to query Drive files: ${errText}`);
    }
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  },

  backup: async (interactive: boolean = true): Promise<void> => {
    const accessToken = await googleDriveSync.ensureValidToken(interactive);


    // 1. Purge dead images to ensure backup size is minimal
    await cleanupOrphanedImages();

    // 2. Export local DB to a Blob
    const blob = await db.export();

    // 2. Check if backup file already exists
    const fileId = await googleDriveSync.getBackupFileId(accessToken);

    // 3. Start Resumable Upload Session
    const initUrl = fileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=resumable`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';

    const metadata = fileId ? {} : {
      name: BACKUP_FILENAME,
      parents: ['appDataFolder']
    };

    const initResponse = await fetch(initUrl, {
      method: fileId ? 'PATCH' : 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'application/json',
        'X-Upload-Content-Length': blob.size.toString()
      },
      body: JSON.stringify(metadata)
    });

    if (!initResponse.ok) {
      const errText = await initResponse.text();
      console.error('Init Upload Error:', errText);
      throw new Error(`Failed to initiate upload session: ${errText}`);
    }

    const uploadUrl = initResponse.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('No upload URL returned from Google Drive');
    }

    // 4. Upload the actual file content
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': blob.size.toString()
      },
      body: blob
    });

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      console.error('Upload Error:', errText);
      throw new Error(`Failed to upload backup: ${errText}`);
    }

    useSyncStore.getState().setLastSyncedAt(Date.now());
  },

  restore: async (interactive: boolean = true): Promise<void> => {
    const accessToken = await googleDriveSync.ensureValidToken(interactive);

    // 1. Find the backup file
    const fileId = await googleDriveSync.getBackupFileId(accessToken);
    if (!fileId) {
      throw new Error('No backup found in Google Drive');
    }

    // 2. Download the file content
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!response.ok) {
      throw new Error('Failed to download backup');
    }

    const blob = await response.blob();

    // 3. Import into Dexie (overwrite)
    await db.import(blob, { clearTablesBeforeImport: true });

    useSyncStore.getState().setLastSyncedAt(Date.now());

    // Hard refresh to reload data in the UI (since zustand stores might need resetting)
    window.location.reload();
  },

  checkAutoBackup: async (): Promise<void> => {
    const { isConnected, lastSyncedAt } = useSyncStore.getState();
    if (!isConnected) return;

    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    const now = Date.now();

    if (!lastSyncedAt || (now - lastSyncedAt > TWELVE_HOURS)) {
      try {
        console.log('[GoogleDriveSync] Running auto background backup...');
        await googleDriveSync.backup(false); // Non-interactive mode (silent refresh only, no popups)
        console.log('[GoogleDriveSync] Auto background backup complete.');
      } catch (e) {
        console.warn('[GoogleDriveSync] Deferred auto background backup until user interaction:', e);
      }
    }
  }

};
