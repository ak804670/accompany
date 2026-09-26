import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Newsreader_400Regular } from '@expo-google-fonts/newsreader/400Regular';
import { Newsreader_500Medium } from '@expo-google-fonts/newsreader/500Medium';
import { PortalHost } from '@rn-primitives/portal';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { ActiveCallScreen } from '@/features/calls/ActiveCallScreen';
import { callManager } from '@/features/calls/call-manager';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppToastHost } from '@/components/design-system/AppToast';
import { AuthProvider } from '@/features/auth';
import { ProfileProvider } from '@/features/profile/ProfileProvider';
import { RootNavigator } from '@/navigation';
import { AppErrorBoundary } from '@/shell/AppErrorBoundary';
import { reportError } from '@/services/monitoring/report-error';
import { ThemeProvider } from '@/theme';

export function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Newsreader_400Regular,
    Newsreader_500Medium,
  });

  useEffect(() => {
    callManager.start();
    return () => callManager.stop();
  }, []);

  useEffect(() => {
    if (fontError) {
      reportError({ error: fontError });
    }

    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <ProfileProvider>
            <RootNavigator />
            <ActiveCallScreen />
            <AppToastHost />
            <PortalHost />
            </ProfileProvider>
          </AuthProvider>
        </SafeAreaProvider>
        </GestureHandlerRootView>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
