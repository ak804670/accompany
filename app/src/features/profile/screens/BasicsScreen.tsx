import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppInput } from '@/components/design-system/AppInput';
import { AppText } from '@/components/design-system/AppText';
import { OnboardingFrame } from '@/features/profile/components/OnboardingFrame';
import { useProfile } from '@/features/profile/hooks/useProfile';
import type { OnboardingStackParamList } from '@/features/profile/navigation';
import { profileService } from '@/features/profile/services/profile.service';
import { preferencesStorage } from '@/services/storage/preferences-storage';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Basics'>;

function adultCutoff(today = new Date()): Date {
  return new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
}

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromIso(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function label(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function BasicsScreen({ navigation }: Props) {
  const { profile, setProfile } = useProfile();
  const [name, setName] = useState(profile?.displayName ?? '');
  const [date, setDate] = useState<Date | null>(profile?.dateOfBirth ? fromIso(profile.dateOfBirth) : null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const latestAdultDate = adultCutoff();

  useEffect(() => {
    if (profile?.displayName) {
      return;
    }
    preferencesStorage.get('onboarding.displayName').then((saved) => {
      if (saved) {
        setName(saved);
      }
    }).catch(() => undefined);
  }, [profile?.displayName]);

  const trimmed = name.trim();
  const nameError = trimmed.length === 0 ? 'Enter the name people should use.' : trimmed.length > 80 ? 'Use 80 characters or fewer.' : null;

  function onDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS !== 'ios') {
      setShowPicker(false);
    }
    if (event.type === 'dismissed' || !selected) {
      return;
    }
    if (selected.getTime() > latestAdultDate.getTime()) {
      setError('You need to be 18 or older.');
      return;
    }
    setError(null);
    setDate(selected);
  }

  async function continueNext() {
    if (nameError || !date) {
      setError(nameError ?? 'Choose your date of birth.');
      return;
    }
    if (date.getTime() > latestAdultDate.getTime()) {
      setError('You need to be 18 or older.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const saved = await profileService.saveBasics(trimmed, toIso(date));
      await preferencesStorage.remove('onboarding.displayName');
      setProfile(saved);
      navigation.navigate('Photo');
    } catch (caught) {
      setError(profileService.failureMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingFrame step={0} title="What should people call you?" subtitle="Your name and date of birth stay on your profile." onContinue={() => void continueNext()} loading={loading} error={error}>
      <View className="gap-lg">
        <AppInput value={name} onChangeText={(value) => { setName(value); void preferencesStorage.set('onboarding.displayName', value); }} accessibilityLabel="Display name" autoCapitalize="words" maxLength={80} error={name !== '' ? nameError ?? undefined : undefined} />
        <Pressable accessibilityRole="button" accessibilityLabel="Date of birth" className="h-12 justify-center rounded-sm border border-input bg-background px-3" onPress={() => setShowPicker(true)}>
          <AppText variant="bodyM" tone={date ? 'default' : 'muted'}>{date ? label(date) : 'Date of birth'}</AppText>
        </Pressable>
        {showPicker ? (
          <DateTimePicker
            value={date ?? latestAdultDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={latestAdultDate}
            minimumDate={new Date(1900, 0, 1)}
            onChange={onDateChange}
          />
        ) : null}
        <AppText variant="caption">You need to be 18 or older.</AppText>
      </View>
    </OnboardingFrame>
  );
}
