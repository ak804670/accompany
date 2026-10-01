import { useId } from 'react';
import { SvgXml } from 'react-native-svg';

import { iconRegistry, type BrandIconName } from '@/assets/icons/registry';

type BrandIconProps = {
  name: BrandIconName;
  size?: number;
};

/** Renders an Accompany pack icon without recoloring its artwork. */
export function BrandIcon({ name, size = 24 }: BrandIconProps) {
  const gradientId = `accompanyGradient-${useId().replace(/:/g, '')}`;
  const xml = iconRegistry[name].replaceAll('accompanyGradient', gradientId);

  return <SvgXml xml={xml} width={size} height={size} />;
}
