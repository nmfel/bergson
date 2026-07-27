import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SyncState {
  accessToken: string | null;
  tokenExpiresAt: number | null;
  isConnected: boolean;
  lastSyncedAt: number | null;
  setAccessToken: (token: string | null, expiresInSeconds?: number) => void;
  setIsConnected: (connected: boolean) => void;
  setLastSyncedAt: (timestamp: number) => void;
  disconnect: () => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      accessToken: null,
      tokenExpiresAt: null,
      isConnected: false,
      lastSyncedAt: null,
      setAccessToken: (token, expiresInSeconds = 3600) => set({
        accessToken: token,
        tokenExpiresAt: token ? Date.now() + (expiresInSeconds * 1000) : null,
        isConnected: !!token || undefined
      }),
      setIsConnected: (connected) => set({ isConnected: connected }),
      setLastSyncedAt: (timestamp) => set({ lastSyncedAt: timestamp }),
      disconnect: () => set({ accessToken: null, tokenExpiresAt: null, isConnected: false, lastSyncedAt: null }),
    }),
    {
      name: 'bergson-sync-store',
    }
  )
);

