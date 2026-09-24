import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '@/components/design-system/AppText';
import { OnboardingFrame } from '@/features/profile/components/OnboardingFrame';
import { useProfile } from '@/features/profile/hooks/useProfile';
import type { OnboardingStackParamList } from '@/features/profile/navigation';
import { profileService } from '@/features/profile/services/profile.service';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
];

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Preferences'>;

export function PreferencesScreen({ navigation }: Props) {
  const { profile, setProfile } = useProfile();
  const [selected, setSelected] = useState<string[]>(profile?.languagePreferences ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle(code: string) {
    setSelected((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  }

  async function continueNext() {
    setLoading(true);
    setError(null);
    try {
      setProfile(await profileService.update({ languagePreferences: selected }));
      navigation.navigate('Review');
    } catch (caught) {
      setError(profileService.failureMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingFrame step={4} title="Languages" subtitle="Which languages are you comfortable talking in?" onBack={() => navigation.navigate('Interests')} onContinue={() => void continueNext()} loading={loading} error={error}>
      <View className="gap-sm">
        {languages.map((language) => {
          const active = selected.includes(language.code);
          return (
            <Pressable key={language.code} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => toggle(language.code)} className={`border px-md py-md ${active ? 'border-primary' : 'border-border'}`}>
              <AppText variant="bodyL">{language.label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </OnboardingFrame>
  );
}
