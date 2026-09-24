import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '@/components/design-system/AppText';
import { OnboardingFrame } from '@/features/profile/components/OnboardingFrame';
import { useProfile } from '@/features/profile/hooks/useProfile';
import type { OnboardingStackParamList } from '@/features/profile/navigation';
import { profileService } from '@/features/profile/services/profile.service';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Review'>;

export function ReviewScreen({ navigation }: Props) {
  const { profile, setProfile } = useProfile();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function complete() {
    setLoading(true);
    setError(null);
    try {
      setProfile(await profileService.complete());
    } catch (caught) {
      setError(profileService.failureMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingFrame step={5} title="Review" subtitle="This is what people will see." onBack={() => navigation.navigate('Preferences')} onContinue={() => void complete()} continueLabel="Complete profile" loading={loading} error={error}>
      <View className="gap-md">
        <View className="h-40 w-full bg-muted" />
        <AppText variant="h2">{profile?.displayName}</AppText>
        <AppText variant="bodyM">{profile?.bio || 'No bio yet.'}</AppText>
        <AppText variant="caption" tone="muted">Interests</AppText>
        <AppText variant="bodyM">{profile?.interests.map((item) => item.name).join(', ') || 'None selected'}</AppText>
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Basics')}>
          <AppText variant="bodyM">Edit name</AppText>
        </Pressable>
      </View>
    </OnboardingFrame>
  );
}
