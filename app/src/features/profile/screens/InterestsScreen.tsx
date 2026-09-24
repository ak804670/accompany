import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '@/components/design-system/AppText';
import { OnboardingFrame } from '@/features/profile/components/OnboardingFrame';
import { useProfile } from '@/features/profile/hooks/useProfile';
import type { OnboardingStackParamList } from '@/features/profile/navigation';
import { profileService } from '@/features/profile/services/profile.service';
import type { ProfileInterest } from '@/features/profile/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Interests'>;

export function InterestsScreen({ navigation }: Props) {
  const { profile, setProfile } = useProfile();
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<ProfileInterest[]>([]);
  const [selected, setSelected] = useState<string[]>(profile?.interests.map((item) => item.id) ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    profileService.interests(query).then((items) => {
      if (!cancelled) {
        setOptions(items);
      }
    }).catch((caught: unknown) => {
      if (!cancelled) {
        setError(profileService.failureMessage(caught));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function continueNext() {
    setLoading(true);
    setError(null);
    try {
      setProfile(await profileService.saveInterests(selected));
      navigation.navigate('Preferences');
    } catch (caught) {
      setError(profileService.failureMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingFrame step={3} title="Interests" subtitle="Choose what you like talking about." onBack={() => navigation.navigate('About')} onContinue={() => void continueNext()} loading={loading} error={error}>
      <View className="gap-md">
        <TextInput accessibilityLabel="Search interests" value={query} onChangeText={setQuery} placeholder="Search" className="border border-border px-md py-sm font-inter-regular text-body-m text-foreground" />
        <View className="flex-row flex-wrap gap-sm">
          {options.map((interest) => {
            const active = selected.includes(interest.id);
            return (
              <Pressable key={interest.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => toggle(interest.id)} className={`border px-md py-sm ${active ? 'border-primary bg-primary' : 'border-border'}`}>
                <AppText variant="bodyM" className={active ? 'text-primary-foreground' : ''}>{interest.name}</AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </OnboardingFrame>
  );
}
