import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { InterestTagInput, isUuid } from '@/components/profile/InterestTagInput';
import { OnboardingFrame } from '@/features/profile/components/OnboardingFrame';
import { useProfile } from '@/features/profile/hooks/useProfile';
import type { OnboardingStackParamList } from '@/features/profile/navigation';
import { profileService } from '@/features/profile/services/profile.service';
import type { ProfileInterest } from '@/features/profile/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Interests'>;
type Tag = { id?: string; name: string };

export function InterestsScreen({ navigation }: Props) {
  const { profile, setProfile } = useProfile();
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<ProfileInterest[]>([]);
  const [selected, setSelected] = useState<Tag[]>(profile?.interests.map((item) => ({ id: item.id, name: item.name })) ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    profileService.interests(query).then((items) => {
      if (!cancelled) setOptions(items);
    }).catch((caught: unknown) => {
      if (!cancelled) setError(profileService.failureMessage(caught));
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  function toggle(interest: ProfileInterest) {
    setSelected((current) => {
      const exists = current.some((item) => item.name.toLowerCase() === interest.name.toLowerCase());
      return exists ? current.filter((item) => item.name.toLowerCase() !== interest.name.toLowerCase()) : [...current, interest];
    });
  }

  async function continueNext() {
    setLoading(true);
    setError(null);
    try {
      const interestIds = selected.flatMap((item) => (item.id && isUuid(item.id) ? [item.id] : []));
      const names = selected.filter((item) => !item.id || !isUuid(item.id)).map((item) => item.name.trim());
      setProfile(await profileService.saveInterests(interestIds, names));
      navigation.navigate('Preferences');
    } catch (caught) {
      setError(profileService.failureMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingFrame
      step={5}
      title="Choose 5 things you're really into"
      subtitle="You can select up to 5 interests for your profile."
      onBack={() => navigation.navigate('About')}
      onContinue={() => void continueNext()}
      loading={loading}
      disabled={selected.length === 0 || loading}
      error={error}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="pb-md"
        className="flex-1"
      >
        <InterestTagInput
          options={options}
          selected={selected}
          query={query}
          onQueryChange={setQuery}
          onToggle={toggle}
          onAddCustom={(name) => setSelected((current) => [...current, { name }])}
          onRemove={(name) => setSelected((current) => current.filter((item) => item.name !== name))}
        />
      </ScrollView>
    </OnboardingFrame>
  );
}

export default InterestsScreen;
