import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

import { palette, type ColorScheme } from '@/theme/tokens';

export const NAV_THEME: Record<ColorScheme, Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: palette.light.primary,
      background: palette.light.background,
      card: palette.light.surface,
      text: palette.light.text,
      border: palette.light.border,
      notification: palette.light.error,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: palette.dark.primary,
      background: palette.dark.background,
      card: palette.dark.surface,
      text: palette.dark.text,
      border: palette.dark.border,
      notification: palette.dark.error,
    },
  },
};
