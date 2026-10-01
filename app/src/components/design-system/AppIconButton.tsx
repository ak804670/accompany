import type { BrandIconName } from '@/assets/icons/registry';

import { AppButton, type AppButtonProps } from '@/components/design-system/AppButton';
import { BrandIcon } from '@/components/icons/BrandIcon';

type AppIconButtonProps = Omit<AppButtonProps, 'children' | 'variant'> & {
  icon: BrandIconName;
  accessibilityLabel: string;
};

export function AppIconButton({ icon, accessibilityLabel, size = 'md', ...props }: AppIconButtonProps) {
  const iconSize = size === 'lg' ? 22 : 18;

  return (
    <AppButton variant="icon" size={size} accessibilityLabel={accessibilityLabel} {...props}>
      <BrandIcon name={icon} size={iconSize} />
    </AppButton>
  );
}
