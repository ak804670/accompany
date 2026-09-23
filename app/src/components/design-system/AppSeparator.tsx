import type { ComponentProps } from 'react';

import { Separator } from '@/components/ui/separator';

type AppSeparatorProps = ComponentProps<typeof Separator>;

export function AppSeparator(props: AppSeparatorProps) {
  return <Separator {...props} />;
}
