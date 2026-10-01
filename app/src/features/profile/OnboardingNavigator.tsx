import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useProfile } from '@/features/profile/hooks/useProfile';
import type { OnboardingStackParamList } from '@/features/profile/navigation';
import { AboutScreen } from '@/features/profile/screens/AboutScreen';
import { BasicsScreen } from '@/features/profile/screens/BasicsScreen';
import { GenderScreen } from '@/features/profile/screens/GenderScreen';
import { InterestsScreen } from '@/features/profile/screens/InterestsScreen';
import { LocationScreen } from '@/features/profile/screens/LocationScreen';
import { PhotoScreen } from '@/features/profile/screens/PhotoScreen';
import { PreferencesScreen } from '@/features/profile/screens/PreferencesScreen';
import { ReviewScreen } from '@/features/profile/screens/ReviewScreen';
import { routeForStep } from '@/features/profile/types';
import { palette, useTheme } from '@/theme';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  const { resolvedScheme } = useTheme();
  const { profile } = useProfile();
  const initialRouteName = routeForStep(profile?.step ?? 'basics');

  return (
    <Stack.Navigator
      key={initialRouteName}
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette[resolvedScheme].background } }}
    >
      <Stack.Screen name="Basics" component={BasicsScreen} />
      <Stack.Screen name="Gender" component={GenderScreen} />
      <Stack.Screen name="Location" component={LocationScreen} />
      <Stack.Screen name="Photo" component={PhotoScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Interests" component={InterestsScreen} />
      <Stack.Screen name="Preferences" component={PreferencesScreen} />
      <Stack.Screen name="Review" component={ReviewScreen} />
    </Stack.Navigator>
  );
}
