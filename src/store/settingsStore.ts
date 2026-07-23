import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light' | 'system';
export type FontFamily = 'sans' | 'serif' | 'mono';

interface SettingsState {
  accentColor: string;
  fullWidth: boolean;
  theme: ThemeMode;
  fontFamily: FontFamily;
  panOnEmptyClick: boolean;
  setAccentColor: (color: string) => void;
  setFullWidth: (fullWidth: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setFontFamily: (font: FontFamily) => void;
  setPanOnEmptyClick: (pan: boolean) => void;
}

// Available predefined accent colors
export const ACCENT_COLORS = [
  { name: 'Blue', value: '230 99% 65%' }, // Default
  { name: 'Purple', value: '270 95% 65%' },
  { name: 'Green', value: '150 90% 45%' },
  { name: 'Orange', value: '30 99% 55%' },
  { name: 'Rose', value: '340 90% 60%' },
];

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      accentColor: ACCENT_COLORS[0].value,
      fullWidth: false,
      theme: 'dark',
      fontFamily: 'sans',
      panOnEmptyClick: true,
      setAccentColor: (color) => {
        set({ accentColor: color });
        // Immediately apply to root
        document.documentElement.style.setProperty('--accent', color);
        document.documentElement.style.setProperty('--ring', color);
        document.documentElement.style.setProperty('--primary', color);
      },
      setFullWidth: (fullWidth) => set({ fullWidth }),
      setTheme: (theme) => set({ theme }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setPanOnEmptyClick: (pan) => set({ panOnEmptyClick: pan }),
    }),
    {
      name: 'bergson-settings',
    }
  )
);
