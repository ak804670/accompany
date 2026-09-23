import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { TypographyVariant } from '@/theme';

const textVariants = cva('text-foreground', {
  variants: {
    variant: {
      display: 'font-newsreader-medium text-display',
      h1: 'font-newsreader-medium text-h1',
      h2: 'font-newsreader-medium text-h2',
      h3: 'font-inter-semibold text-h3',
      bodyL: 'font-inter-regular text-body-l',
      bodyM: 'font-inter-regular text-body-m',
      bodyS: 'font-inter-regular text-body-s',
      label: 'font-inter-semibold text-label',
      caption: 'font-inter-medium text-caption',
    },
    tone: {
      default: '',
      muted: 'text-muted-foreground',
      primary: 'text-primary',
      success: 'text-success',
      warning: 'text-warning',
      error: 'text-destructive',
    },
  },
  defaultVariants: {
    variant: 'bodyM',
    tone: 'default',
  },
});

type AppTextProps = Omit<ComponentProps<typeof Text>, 'variant'> &
  VariantProps<typeof textVariants> & {
    variant?: TypographyVariant;
  };

export function AppText({ variant, tone, className, ...props }: AppTextProps) {
  return <Text className={cn(textVariants({ variant, tone }), className)} {...props} />;
}
