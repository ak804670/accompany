import { AppText } from '@/components/design-system/AppText';

type AuthErrorProps = {
  message: string | null;
};

export function AuthError({ message }: AuthErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <AppText variant="bodyS" tone="error" accessibilityRole="alert">
      {message}
    </AppText>
  );
}
