export const palette = {
  light: {
    background: '#F7F4EF',
    surface: '#FFFCF8',
    text: '#1C1916',
    textMuted: '#5E574F',
    border: '#E3DBD1',
    primary: '#C7377A',
    primaryDark: '#A62965',
    primaryLight: '#F06091',
    primaryLighter: '#F7A9C1',
    primaryLightest: '#FDE4ED',
    primaryForeground: '#FBF7F2',
    success: '#29995C',
    warning: '#EB9E1F',
    error: '#D6333D',
    coin: '#F2A82B',
    online: '#32B86B',
  },
  dark: {
    background: '#12110F',
    surface: '#1C1A17',
    text: '#F3EEE6',
    textMuted: '#B7AFA3',
    border: '#3A342E',
    primary: '#C7377A',
    primaryDark: '#A62965',
    primaryLight: '#F06091',
    primaryLighter: '#F7A9C1',
    primaryLightest: '#24141E',
    primaryForeground: '#FBF7F2',
    success: '#29995C',
    warning: '#EB9E1F',
    error: '#D6333D',
    coin: '#F2A82B',
    online: '#32B86B',
  },
} as const;

export type ColorScheme = keyof typeof palette;

/** 4-based spacing. Prefer space over filling the screen. */
export const spacing = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
  64: 64,
} as const;

/** Tight radii. Full is reserved for avatars and status dots. */
export const radius = {
  4: 4,
  8: 8,
  12: 12,
  999: 999,
} as const;

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'Newsreader_500Medium',
  displayRegular: 'Newsreader_400Regular',
} as const;

export const typography = {
  display: { fontSize: 40, lineHeight: 48, letterSpacing: -0.4, fontFamily: fontFamily.display },
  h1: { fontSize: 32, lineHeight: 40, letterSpacing: -0.3, fontFamily: fontFamily.display },
  h2: { fontSize: 26, lineHeight: 34, letterSpacing: -0.2, fontFamily: fontFamily.display },
  h3: { fontSize: 20, lineHeight: 28, fontFamily: fontFamily.semibold },
  bodyL: { fontSize: 17, lineHeight: 26, fontFamily: fontFamily.regular },
  bodyM: { fontSize: 15, lineHeight: 22, fontFamily: fontFamily.regular },
  bodyS: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.regular },
  label: { fontSize: 13, lineHeight: 18, letterSpacing: 0.2, fontFamily: fontFamily.medium },
  caption: { fontSize: 11, lineHeight: 16, letterSpacing: 0.6, fontFamily: fontFamily.medium },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Editorial image treatment. Overlays stay short and at the bottom only. */
export const photography = {
  discoveryAspect: 3 / 4,
  profileAspect: 4 / 5,
  avatar: 'circle' as const,
  discoveryRadius: 0,
  thumbRadius: radius[4],
  overlay: 'bottom-only' as const,
} as const;
