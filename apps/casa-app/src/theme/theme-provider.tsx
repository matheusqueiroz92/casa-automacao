import * as SystemUI from 'expo-system-ui';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import { themes, type AppColors, type ThemeName } from './tokens';

type ThemePreference = ThemeName | 'system';

type ThemeContextValue = {
  colors: AppColors;
  themeName: ThemeName;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');

  const themeName: ThemeName =
    preference === 'system' ? (systemTheme === 'light' ? 'light' : 'dark') : preference;

  const toggleTheme = useCallback(() => {
    setPreference((current) => {
      const resolved = current === 'system' ? (systemTheme === 'light' ? 'light' : 'dark') : current;
      return resolved === 'dark' ? 'light' : 'dark';
    });
  }, [systemTheme]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(themes[themeName].background);
  }, [themeName]);

  const value = useMemo(
    () => ({ colors: themes[themeName], themeName, preference, setPreference, toggleTheme }),
    [preference, themeName, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme deve ser usado dentro de AppThemeProvider');
  }

  return context;
}
