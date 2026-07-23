import React, { useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../sidebar/Sidebar';
import { Toaster } from 'sonner';
import { useShortcuts } from '../../utils/shortcuts';
import { pageRepository } from '../../db/repositories/pageRepository';
import { CommandPalette } from '../common/CommandPalette';
import { googleDriveSync } from '../../services/googleDriveSync';
import { useSyncStore } from '../../store/syncStore';

export const MainLayout: React.FC = () => {
  const { accentColor, theme, fontFamily } = useSettingsStore();

  useShortcuts();
  
  useEffect(() => {
    // Apply saved accent color
    document.documentElement.style.setProperty('--accent', accentColor);
    document.documentElement.style.setProperty('--ring', accentColor);
    document.documentElement.style.setProperty('--primary', accentColor);
  }, [accentColor]);

  useEffect(() => {
    // Apply theme
    const html = document.documentElement;
    html.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      html.classList.add(systemTheme);
    } else {
      html.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => {
    // Apply font family
    const html = document.documentElement;
    html.classList.remove('font-sans', 'font-serif', 'font-mono');
    html.classList.add(`font-${fontFamily}`);
  }, [fontFamily]);

  useEffect(() => {
    // Run trash cleanup, silent cloud auth check, and auto-backup on app startup
    pageRepository.cleanupTrash().catch(console.error);
    if (useSyncStore.getState().isConnected || useSyncStore.getState().accessToken) {
      googleDriveSync.ensureValidToken()
        .then(() => googleDriveSync.checkAutoBackup())
        .catch(console.warn);
    }
  }, []);

  return (
    <div className="flex h-screen w-full bg-background text-text-primary overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col bg-background relative overflow-hidden">
        <Outlet />
      </main>
      <Toaster theme="dark" position="bottom-right" />
      <CommandPalette />
    </div>
  );
};
