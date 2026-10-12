import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppColors, darkColors, lightColors } from '../theme/colors';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: AppColors;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const THEME_STORAGE_KEY = 'zuna_theme';
const STORAGE_KEY = THEME_STORAGE_KEY;
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  // Fresh install always starts in LIGHT mode. Dark is used only after the user switches to it
  // (that choice is saved in AsyncStorage and restored on every next launch).
  const [mode, setModeState] = useState<ThemeMode>('light');
  // Children render only after the saved theme is read, so a dark-mode user never sees a light flash.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') setModeState(saved);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const isDark = mode === 'system' ? scheme === 'dark' : mode === 'dark';

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => setMode(isDark ? 'light' : 'dark'), [isDark, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, isDark, colors: isDark ? darkColors : lightColors, setMode, toggleTheme }),
    [mode, isDark, setMode, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{ready ? children : null}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}