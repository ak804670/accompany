import { useState } from 'react';
import { TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '@/components/design-system/AppText';
import { OnboardingFrame } from '@/features/profile/components/OnboardingFrame';
import { useProfile } from '@/features/profile/hooks/useProfile';
import type { OnboardingStackParamList } from '@/features/profile/navigation';
import { profileService } from '@/features/profile/services/profile.service';

const limit = 500;
type Props = NativeStackScreenProps<OnboardingStackParamList, 'About'>;

export function AboutScreen({ navigation }: Props) {
  const { profile, setProfile } = useProfile();
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function continueNext() {
    setLoading(true);
    setError(null);
    try {
      setProfile(await profileService.update({ bio: bio.trim() }));
      navigation.navigate('Interests');
    } catch (caught) {
      setError(profileService.failureMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingFrame step={4} title="About you" subtitle="A few sentences is enough. You can leave this blank." onBack={() => navigation.navigate('Photo')} onContinue={() => void continueNext()} loading={loading} disabled={bio.trim().length > limit} error={error}>
      <View className="gap-sm">
        <TextInput
          accessibilityLabel="Bio"
          multiline
          value={bio}
          onChangeText={setBio}
          maxLength={limit}
          className="min-h-32 border border-border bg-background p-md font-inter-regular text-body-m text-foreground"
        />
        <AppText variant="caption" tone="muted">{bio.trim().length}/{limit}</AppText>
      </View>
    </OnboardingFrame>
  );
}
