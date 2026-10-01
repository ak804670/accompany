import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '@/components/design-system/AppText';
import { OnboardingFrame } from '@/features/profile/components/OnboardingFrame';
import { useProfile } from '@/features/profile/hooks/useProfile';
import type { OnboardingStackParamList } from '@/features/profile/navigation';
import { preferenceKeys, preferencesStorage } from '@/services/storage';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Gender'>;

type Gender = 'boy' | 'girl';

export function GenderScreen({ navigation }: Props) {
  const { profile } = useProfile();
  const [gender, setGender] = useState<Gender | null>(null);
  const displayName = profile?.displayName?.trim() || 'there';

  useEffect(() => {
    void preferencesStorage.get(preferenceKeys.gender).then((saved) => {
      if (saved === 'boy' || saved === 'girl') {
        setGender(saved);
      }
    });
  }, []);

  async function continueNext() {
    if (!gender) return;
    await preferencesStorage.set(preferenceKeys.gender, gender);
    navigation.navigate('Location');
  }

  return (
    <OnboardingFrame
      step={1}
      title="What's your gender?"
      subtitle={`Hey ${displayName}, pick one to continue.`}
      onBack={() => navigation.navigate('Basics')}
      onContinue={() => void continueNext()}
      disabled={gender === null}
    >
      <View className="flex-1 justify-center gap-lg">
        {/* Caution Banner */}
        <View className="flex-row items-center justify-center gap-xs rounded-full border border-destructive/20 bg-destructive/10 px-md py-sm">
          <AppText variant="bodyS">⚠️</AppText>
          <AppText variant="caption" tone="error" className="font-semibold text-center">
            Caution: Wrong selection leads to a LIFETIME BAN.
          </AppText>
        </View>

        {/* Gender Choice Cards */}
        <View className="flex-row gap-md">
          {/* Boy Card */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="I am Boy"
            accessibilityState={{ selected: gender === 'boy' }}
            onPress={() => setGender('boy')}
            className={`flex-1 items-center justify-center rounded-2xl border bg-card p-lg shadow-sm ${
              gender === 'boy' ? 'border-primary ring-2 ring-primary/30' : 'border-border'
            }`}
          >
            <View className="mb-md">
              <BoyAvatar size={96} />
            </View>
            <AppText variant="h3" className="font-bold">
              I am Boy
            </AppText>
          </Pressable>

          {/* Girl Card */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="I am Girl"
            accessibilityState={{ selected: gender === 'girl' }}
            onPress={() => setGender('girl')}
            className={`flex-1 items-center justify-center rounded-2xl border bg-card p-lg shadow-sm ${
              gender === 'girl' ? 'border-primary ring-2 ring-primary/30' : 'border-border'
            }`}
          >
            <View className="mb-md">
              <GirlAvatar size={96} />
            </View>
            <AppText variant="h3" className="font-bold">
              I am Girl
            </AppText>
          </Pressable>
        </View>
      </View>
    </OnboardingFrame>
  );
}

function BoyAvatar({ size = 96 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center rounded-full bg-pink-100 overflow-hidden">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="48" fill="#FCE4EC" />
        <Path d="M22 94 C25 72, 75 72, 78 94 Z" fill="#FDD835" />
        <Path d="M46 76 L46 88 M54 76 L54 88" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <Path d="M43 62 L43 72 L57 72 L57 62 Z" fill="#ECC8A4" />
        <Circle cx="50" cy="46" r="18" fill="#ECC8A4" />
        <Path d="M37 46 C37 62, 63 62, 63 46 C60 56, 40 56, 37 46 Z" fill="#795548" />
        <Path d="M42 50 C46 53, 50 51, 50 51 C50 51, 54 53, 58 50 C54 48, 46 48, 42 50 Z" fill="#5D4037" />
        <Path d="M32 42 C32 26, 68 26, 68 42 C64 34, 36 34, 32 42 Z" fill="#795548" />
      </Svg>
    </View>
  );
}

function GirlAvatar({ size = 96 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center rounded-full bg-amber-100 overflow-hidden">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="48" fill="#FFF9C4" />
        <Path d="M46 20 C46 14, 54 14, 54 20 C62 28, 64 45, 58 55 C54 48, 54 30, 46 20 Z" fill="#546E7A" />
        <Circle cx="50" cy="22" r="4" fill="#E91E63" />
        <Path d="M22 94 C25 72, 75 72, 78 94 Z" fill="#64B5F6" />
        <Path d="M44 60 L44 72 L56 72 L56 60 Z" fill="#FFCCBC" />
        <Circle cx="50" cy="46" r="18" fill="#FFCCBC" />
        <Path d="M34 44 C34 28, 66 28, 66 44 C62 34, 50 32, 50 32 C50 32, 38 34, 34 44 Z" fill="#37474F" />
      </Svg>
    </View>
  );
}

export default GenderScreen;
