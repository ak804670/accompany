import * as SystemUI from 'expo-system-ui';
import { useColorScheme } from 'nativewind';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { preferenceKeys, preferencesStorage } from '@/services/storage';
import { palette, type ColorScheme } from '@/theme/tokens';

export type ThemePreference = ColorScheme | 'system';

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedScheme: ColorScheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const hydrated = useRef(false);
  const setColorSchemeRef = useRef(setColorScheme);

  useEffect(() => {
    setColorSchemeRef.current = setColorScheme;
  }, [setColorScheme]);

  useEffect(() => {
    let active = true;

    preferencesStorage.get(preferenceKeys.theme).then((stored) => {
      if (!active || hydrated.current) {
        return;
      }

      hydrated.current = true;

      if (isThemePreference(stored)) {
        setPreferenceState(stored);
        setColorSchemeRef.current(stored);
        return;
      }

      setColorSchemeRef.current('system');
    });

    return () => {
      active = false;
    };
  }, []);

  const resolvedScheme: ColorScheme = colorScheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palette[resolvedScheme].background);
  }, [resolvedScheme]);

  const setPreference = useCallback((next: ThemePreference) => {
    hydrated.current = true;
    setPreferenceState(next);
    setColorSchemeRef.current(next);
    void preferencesStorage.set(preferenceKeys.theme, next);
  }, []);

  const value = useMemo(
    () => ({ preference, resolvedScheme, setPreference }),
    [preference, resolvedScheme, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return value;
}
