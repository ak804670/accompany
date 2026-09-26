import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';

import { AccompanyIllustration } from '@/components/illustrations/AccompanyIllustration';
import { reportError } from '@/services/monitoring/report-error';
import { palette } from '@/theme/tokens';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError({
      error,
      componentStack: info.componentStack ?? undefined,
    });
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback message={__DEV__ ? this.state.error.message : undefined} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ message }: { message?: string }) {
  const { colorScheme } = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background }}>
      <AccompanyIllustration name="error-generic" size={160} />
      <Text style={{ marginTop: 16, fontSize: 20, color: colors.text }}>Something went wrong.</Text>
      {message ? <Text style={{ marginTop: 12, textAlign: 'center', color: colors.textMuted }}>{message}</Text> : null}
    </View>
  );
}
