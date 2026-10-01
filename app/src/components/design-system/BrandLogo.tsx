import { Image, View, type ImageSourcePropType, type ViewProps } from 'react-native';

import { AppText } from '@/components/design-system/AppText';
import { cn } from '@/lib/utils';
import type { TypographyVariant } from '@/theme';

const logoMark = require('@/assets/logo/icon.png') as ImageSourcePropType;
const appIconLight = require('@/assets/logo/app-icon-light.png') as ImageSourcePropType;

export type BrandLogoSize = 'sm' | 'md' | 'lg' | 'xl';

export type BrandLogoProps = ViewProps & {
  size?: BrandLogoSize | number;
  showWordmark?: boolean;
  wordmarkVariant?: TypographyVariant;
  variant?: 'mark' | 'icon';
  className?: string;
  testID?: string;
};

const sizeConfig: Record<BrandLogoSize, { iconSize: number; textVariant: TypographyVariant; gap: string }> = {
  sm: { iconSize: 24, textVariant: 'h3', gap: 'gap-2' },
  md: { iconSize: 34, textVariant: 'h2', gap: 'gap-2.5' },
  lg: { iconSize: 42, textVariant: 'h1', gap: 'gap-3' },
  xl: { iconSize: 52, textVariant: 'display', gap: 'gap-3.5' },
};

export function BrandLogo({
  size = 'md',
  showWordmark = true,
  wordmarkVariant,
  variant = 'mark',
  className,
  testID = 'brand-logo',
  ...props
}: BrandLogoProps) {
  const isNamedSize = typeof size === 'string' && size in sizeConfig;
  const config = isNamedSize ? sizeConfig[size as BrandLogoSize] : sizeConfig.md;
  const iconSize = typeof size === 'number' ? size : config.iconSize;
  const textVariant = wordmarkVariant ?? config.textVariant;
  const imageSource = variant === 'icon' ? appIconLight : logoMark;

  return (
    <View
      testID={testID}
      accessibilityRole="header"
      accessibilityLabel="Accompany"
      className={cn('flex-row items-center', config.gap, className)}
      {...props}>
      <Image
        source={imageSource}
        style={{ width: iconSize, height: iconSize }}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="Accompany logo"
      />
      {showWordmark ? (
        <AppText variant={textVariant} className="font-newsreader-medium text-foreground tracking-tight">
          Accompany
        </AppText>
      ) : null}
    </View>
  );
}
