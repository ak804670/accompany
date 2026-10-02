import { memo, useId } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { navGradients, useTheme } from '@/theme';

export type NavBarGradientVariant = 'default' | 'subtle' | 'vibrant';
export type NavBarGradientDirection = 'horizontal' | 'vertical' | 'diagonal';

export type NavBarGradientProps = ViewProps & {
  variant?: NavBarGradientVariant;
  direction?: NavBarGradientDirection;
  colors?: readonly string[];
  opacity?: number;
};

/**
 * Renders an ambient gradient background behind navigation bars and headers.
 * Uses SvgXml for fast, seamless cross-platform performance (iOS, Android, Web).
 */
export const NavBarGradient = memo(function NavBarGradient({
  variant = 'default',
  direction = 'horizontal',
  colors: customColors,
  opacity = 1,
  style,
  testID = 'nav-bar-gradient',
  ...props
}: NavBarGradientProps) {
  const { resolvedScheme } = useTheme();
  const rawId = useId();
  const gradientId = `navBarGradient_${rawId.replace(/[^a-zA-Z0-9_]/g, '')}`;

  const themeColors = navGradients[resolvedScheme][variant];
  const colors: readonly string[] = customColors ?? themeColors;

  const { x1, y1, x2, y2 } = (() => {
    switch (direction) {
      case 'vertical':
        return { x1: '0%', y1: '0%', x2: '0%', y2: '100%' };
      case 'diagonal':
        return { x1: '0%', y1: '0%', x2: '100%', y2: '100%' };
      case 'horizontal':
      default:
        return { x1: '0%', y1: '0%', x2: '100%', y2: '0%' };
    }
  })();

  const count = colors.length;
  const stopsXml = colors
    .map((color: string, index: number) => {
      const offset = count <= 1 ? 0 : Math.round((index / (count - 1)) * 100);
      return `<stop offset="${offset}%" stop-color="${color}" stop-opacity="${opacity}" />`;
    })
    .join('');

  const xml = `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${gradientId}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopsXml}</linearGradient></defs><rect x="0" y="0" width="100%" height="100%" fill="url(#${gradientId})" /></svg>`;

  return (
    <View
      pointerEvents="none"
      testID={testID}
      style={[StyleSheet.absoluteFill, style]}
      {...props}
    >
      <SvgXml xml={xml} width="100%" height="100%" />
    </View>
  );
});

export default NavBarGradient;
