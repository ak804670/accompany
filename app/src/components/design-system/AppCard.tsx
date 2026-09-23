import type { ComponentProps, ReactNode } from 'react';

import { AppText } from '@/components/design-system/AppText';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type AppCardProps = ComponentProps<typeof Card> & {
  title?: string;
  description?: string;
  footer?: ReactNode;
};

export function AppCard({
  title,
  description,
  footer,
  children,
  className,
  ...props
}: AppCardProps) {
  return (
    <Card className={cn('rounded-md', className)} {...props}>
      {title || description ? (
        <CardHeader>
          {title ? (
            <CardTitle>
              <AppText variant="h3">{title}</AppText>
            </CardTitle>
          ) : null}
          {description ? (
            <CardDescription>
              <AppText variant="bodyS" tone="muted">
                {description}
              </AppText>
            </CardDescription>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent>{children}</CardContent>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}
