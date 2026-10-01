import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { OnboardingFrame } from '@/features/profile/components/OnboardingFrame';
import { useProfile } from '@/features/profile/hooks/useProfile';
import type { OnboardingStackParamList } from '@/features/profile/navigation';
import { profileService } from '@/features/profile/services/profile.service';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Review'>;

const communityRules = [
  {
    id: 'genuine',
    title: 'Be Genuine',
    description: 'Real photos, real info. Zero cap.',
    icon: (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2L14.2 8.3L20.5 10.5L14.2 12.7L12 19L9.8 12.7L3.5 10.5L9.8 8.3L12 2Z"
          fill="#F05A8A"
        />
        <Path
          d="M19 16L20 18.5L22.5 19.5L20 20.5L19 23L18 20.5L15.5 19.5L18 18.5L19 16Z"
          fill="#F05A8A"
        />
      </Svg>
    ),
  },
  {
    id: 'respect',
    title: 'Respect the Vibe',
    description: 'Toxic behavior or hate speech = instant ban.',
    icon: (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          fill="#F05A8A"
        />
        <Path
          d="m9 12 2 2 4-4"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    ),
  },
  {
    id: 'spam',
    title: 'No Spam',
    description: 'Keep it natural. No harassment or soliciting.',
    icon: (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8a6 6 0 0 0 6 6h1a6 6 0 0 0 6-6v-3.5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2"
          fill="#F05A8A"
        />
      </Svg>
    ),
  },
  {
    id: 'safe',
    title: 'Stay Safe',
    description: "Don't drop private info too early. Protect your peace.",
    icon: (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Rect x="5" y="10" width="14" height="11" rx="2" fill="#F05A8A" />
        <Path
          d="M8 10V7a4 4 0 0 1 8 0v3"
          stroke="#F05A8A"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <Circle cx="12" cy="15.5" r="1.5" fill="#FFFFFF" />
      </Svg>
    ),
  },
];

export function ReviewScreen({ navigation }: Props) {
  const { setProfile } = useProfile();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function complete() {
    if (!accepted) return;
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
    <OnboardingFrame
      step={7}
      hideHeader
      onBack={() => navigation.navigate('Preferences')}
      loading={loading}
      error={error}
      footer={
        <View className="mt-md gap-sm">
          <AppButton
            variant="outline"
            disabled={loading}
            onPress={() => navigation.navigate('Preferences')}
          >
            Back
          </AppButton>
          <AppButton
            loading={loading}
            disabled={!accepted || loading}
            onPress={() => void complete()}
            accessibilityLabel="Complete profile"
          >
            Let's Go! 🚀
          </AppButton>
        </View>
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="items-center gap-md pb-md"
        className="flex-1"
      >
        {/* Planet Graphic */}
        <PlanetGraphic size={108} />

        {/* Title & Subtitle */}
        <View className="items-center gap-xs px-sm">
          <AppText variant="h1" className="font-bold text-center text-foreground">
            You're Almost In 🚀
          </AppText>
          <AppText
            variant="bodyM"
            className="text-center text-foreground/80 leading-relaxed font-medium"
          >
            Before you start matching, let's run a quick vibe check on the community rules:
          </AppText>
        </View>

        {/* Community Rules List */}
        <View className="w-full gap-md pt-sm">
          {communityRules.map((rule) => (
            <View key={rule.id} className="flex-row items-center gap-md">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-pink-100/70">
                {rule.icon}
              </View>
              <View className="flex-1">
                <AppText variant="h3" className="font-bold text-foreground">
                  {rule.title}
                </AppText>
                <AppText variant="bodyS" className="text-foreground/70 font-medium">
                  {rule.description}
                </AppText>
              </View>
            </View>
          ))}
        </View>

        {/* Terms & Conditions Checkbox */}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          accessibilityLabel="I accept the terms and conditions and privacy policy"
          onPress={() => setAccepted((prev) => !prev)}
          className="flex-row items-center gap-sm pt-md self-start"
        >
          <View
            className={`h-5 w-5 items-center justify-center rounded-xs border ${
              accepted ? 'border-primary bg-primary' : 'border-foreground/40 bg-card'
            }`}
          >
            {accepted ? (
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M20 6L9 17L4 12"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            ) : null}
          </View>
          <AppText variant="bodyS" className="text-foreground/90 font-medium">
            I accept the{' '}
            <AppText variant="bodyS" className="text-primary underline font-medium">
              terms and conditions
            </AppText>{' '}
            and{' '}
            <AppText variant="bodyS" className="text-primary underline font-medium">
              privacy policy
            </AppText>
          </AppText>
        </Pressable>
      </ScrollView>
    </OnboardingFrame>
  );
}

function PlanetGraphic({ size = 108 }: { size?: number }) {
  return (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center rounded-full bg-pink-100/60"
    >
      <Svg width={size * 0.65} height={size * 0.65} viewBox="0 0 80 80" fill="none">
        {/* Planet ring back half */}
        <Path
          d="M12 48 C6 38, 16 26, 38 22 C60 18, 76 25, 76 34 C76 36, 74 38, 70 40"
          stroke="#F05A8A"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Planet core body */}
        <Circle cx="40" cy="40" r="22" fill="#F05A8A" />
        {/* Planet ring front half */}
        <Path
          d="M70 40 C68 46, 56 54, 38 57 C18 60, 4 54, 4 45 C4 43, 6 41, 10 39"
          stroke="#F05A8A"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

export default ReviewScreen;
