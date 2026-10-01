import { useState } from 'react';
import { ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { LanguageTagInput } from '@/components/profile/LanguageTagInput';
import { OnboardingFrame } from '@/features/profile/components/OnboardingFrame';
import { useProfile } from '@/features/profile/hooks/useProfile';
import type { OnboardingStackParamList } from '@/features/profile/navigation';
import { profileService } from '@/features/profile/services/profile.service';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Preferences'>;

export function PreferencesScreen({ navigation }: Props) {
  const { profile, setProfile } = useProfile();
  const [selected, setSelected] = useState<string[]>(profile?.languagePreferences ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle(code: string) {
    setSelected((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  }

  function remove(code: string) {
    setSelected((current) => current.filter((item) => item !== code));
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
    <OnboardingFrame
      step={6}
      title="Languages"
      subtitle="Which languages are you comfortable talking in?"
      onBack={() => navigation.navigate('Interests')}
      onContinue={() => void continueNext()}
      loading={loading}
      error={error}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="pb-md"
        className="flex-1"
      >
        <LanguageTagInput
          selected={selected}
          onToggle={toggle}
          onRemove={remove}
        />
      </ScrollView>
    </OnboardingFrame>
  );
}
