import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { useSession } from '@/features/auth';
import { OnboardingNavigator } from '@/features/profile/OnboardingNavigator';
import { useProfile } from '@/features/profile/hooks/useProfile';
import type { AuthStackParamList, AuthenticatedStackParamList } from '@/features/auth/navigation';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { VerifyOtpScreen } from '@/features/auth/screens/VerifyOtpScreen';
import { WelcomeScreen } from '@/features/auth/screens/WelcomeScreen';
import { MainShell } from '@/features/shell/MainShell';
import { NAV_THEME, palette, useTheme } from '@/theme';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AuthenticatedStackParamList>();

function SessionChecking() {
  return (
    <View testID="session-checking" className="flex-1 justify-end gap-xl bg-background px-lg pb-3xl">
      <View className="gap-sm">
        <View className="h-3 w-40 bg-muted" />
        <View className="h-3 w-24 bg-muted" />
      </View>
      <AppText variant="h1">Accompany</AppText>
    </View>
  );
}

function ProfileGate({ colors }: { colors: { background: string } }) {
  const profileState = useProfile();
  const screenOptions = {
    headerShown: false,
    contentStyle: { backgroundColor: colors.background },
  };

  if (!profileState.profile) {
    return (
      <View testID="profile-checking" className="flex-1 justify-end bg-background px-lg pb-3xl">
        <AppText variant="h1">Accompany</AppText>
        {profileState.error ? (
          <AppButton className="mt-lg" onPress={() => void profileState.refresh()}>Try again</AppButton>
        ) : null}
      </View>
    );
  }

  if (!profileState.profile.complete) {
    return <OnboardingNavigator />;
  }

  return (
    <AppStack.Navigator screenOptions={screenOptions}>
      <AppStack.Screen name="Home" component={MainShell} />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { resolvedScheme } = useTheme();
  const session = useSession();
  const colors = palette[resolvedScheme];
  const screenOptions = {
    headerShown: false,
    contentStyle: { backgroundColor: colors.background },
  };

  return (
    <NavigationContainer theme={NAV_THEME[resolvedScheme]}>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      {session.isChecking ? (
        <SessionChecking />
      ) : session.isAuthenticated ? (
        <ProfileGate colors={colors} />
      ) : (
        <AuthStack.Navigator screenOptions={screenOptions}>
          <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
