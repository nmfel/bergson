import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SyncState {
  accessToken: string | null;
  isConnected: boolean;
  lastSyncedAt: number | null;
  setAccessToken: (token: string | null) => void;
  setIsConnected: (connected: boolean) => void;
  setLastSyncedAt: (timestamp: number) => void;
  disconnect: () => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      accessToken: null,
      isConnected: false,
      lastSyncedAt: null,
      setAccessToken: (token) => set({ accessToken: token, isConnected: !!token || undefined }),
      setIsConnected: (connected) => set({ isConnected: connected }),
      setLastSyncedAt: (timestamp) => set({ lastSyncedAt: timestamp }),
      disconnect: () => set({ accessToken: null, isConnected: false, lastSyncedAt: null }),
    }),
    {
      name: 'bergson-sync-store',
    }
  )
);
