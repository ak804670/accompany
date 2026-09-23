import type { LucideIcon } from 'lucide-react-native';

import { AppButton, type AppButtonProps } from '@/components/design-system/AppButton';
import { Icon } from '@/components/ui/icon';

type AppIconButtonProps = Omit<AppButtonProps, 'children' | 'variant'> & {
  icon: LucideIcon;
  accessibilityLabel: string;
};

export function AppIconButton({ icon, accessibilityLabel, ...props }: AppIconButtonProps) {
  return (
    <AppButton variant="icon" accessibilityLabel={accessibilityLabel} {...props}>
      <Icon as={icon} className="size-4" />
    </AppButton>
  );
}
