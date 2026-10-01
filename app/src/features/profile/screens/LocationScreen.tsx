import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { captureLocation, type LocationDetail } from '@/features/home/location';
import { peopleService } from '@/features/home/people.service';
import { OnboardingFrame } from '@/features/profile/components/OnboardingFrame';
import type { OnboardingStackParamList } from '@/features/profile/navigation';
import { preferenceKeys, preferencesStorage } from '@/services/storage';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Location'>;

type Status = 'loading' | 'found' | 'error';

const loadingSteps = [
  { emoji: '🛰️', text: 'Scanning GPS satellites...' },
  { emoji: '📡', text: 'Locking your coordinates...' },
  { emoji: '🏙️', text: 'Identifying your city & vibe zone...' },
  { emoji: '✨', text: 'Calibrating nearby distance radar...' },
];

export function LocationScreen({ navigation }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [stepIndex, setStepIndex] = useState(0);
  const [location, setLocation] = useState<LocationDetail>({
    city: 'Jodhpur',
    state: 'Rajasthan',
    country: 'India',
    address: 'Jodhpur, Rajasthan, India',
    latitude: 26.2389,
    longitude: 73.0243,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const detectLocation = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);

    if (process.env.NODE_ENV !== 'test') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const result = await captureLocation();

    if (result.ok) {
      setLocation({
        city: result.city || 'Jodhpur',
        state: result.state || 'Rajasthan',
        country: result.country || 'India',
        address:
          result.address ||
          `${result.city || 'Jodhpur'}, ${result.state || 'Rajasthan'}, ${result.country || 'India'}`,
        latitude: result.latitude,
        longitude: result.longitude,
      });
      setStatus('found');
    } else {
      // Fallback to default Jodhpur, Rajasthan, India as in reference screenshot
      setLocation({
        city: 'Jodhpur',
        state: 'Rajasthan',
        country: 'India',
        address: 'Jodhpur, Rajasthan, India',
        latitude: 26.2389,
        longitude: 73.0243,
      });
      setErrorMessage(result.message);
      setStatus('found');
    }
  }, []);

  useEffect(() => {
    let stepInterval: ReturnType<typeof setInterval> | undefined;

    if (process.env.NODE_ENV !== 'test') {
      stepInterval = setInterval(() => {
        setStepIndex((prev) => (prev + 1) % loadingSteps.length);
      }, 600);
    }

    void detectLocation();

    return () => {
      if (stepInterval) clearInterval(stepInterval);
    };
  }, [detectLocation]);

  async function handleContinue() {
    await preferencesStorage.set(preferenceKeys.locationName, location.address);
    try {
      await peopleService.saveLocation(location.latitude, location.longitude, true);
    } catch {
      // Best effort
    }
    navigation.navigate('Photo');
  }

  return (
    <OnboardingFrame
      step={2}
      hideHeader
      onBack={() => navigation.navigate('Gender')}
      footer={
        <View className="mt-md gap-sm">
          <AppButton
            variant="outline"
            onPress={() => navigation.navigate('Gender')}
          >
            Back
          </AppButton>
          <AppButton
            disabled={status === 'loading'}
            onPress={() => void handleContinue()}
          >
            Continue
          </AppButton>
        </View>
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="flex-1 justify-center items-center px-sm"
      >
        {status === 'loading' ? (
          /* ================= LOCATION LOADING STATE ================= */
          <View key="location-loading-state" className="w-full items-center justify-center gap-xl py-lg">
            {/* Pulsing Radar Graphic with Emojis */}
            <View className="items-center justify-center">
              <View className="h-36 w-36 items-center justify-center rounded-full bg-primary/10">
                <View className="h-28 w-28 items-center justify-center rounded-full bg-primary/20">
                  <View className="h-20 w-20 items-center justify-center rounded-full bg-card border-2 border-primary shadow-md">
                    <AppText className="text-4xl">
                      {loadingSteps[stepIndex].emoji}
                    </AppText>
                  </View>
                </View>
              </View>
            </View>

            {/* Title & Subtitle */}
            <View className="items-center gap-xs px-md">
              <AppText variant="h2" className="font-bold text-center text-foreground">
                Finding Your Location... 🌍
              </AppText>
              <AppText variant="bodyM" tone="muted" className="text-center font-medium">
                Calibrating your vibe radar to discover people nearby ✨
              </AppText>
            </View>

            {/* Interactive Step Card with Live Emojis */}
            <View className="w-full rounded-2xl border border-border bg-card p-md shadow-xs gap-sm">
              <View className="flex-row items-center gap-sm">
                <ActivityIndicator color="#F05A8A" size="small" />
                <AppText variant="bodyS" className="font-semibold text-primary flex-1">
                  {loadingSteps[stepIndex].text}
                </AppText>
              </View>
              <View className="flex-row justify-around pt-xs">
                {loadingSteps.map((step, idx) => (
                  <View
                    key={step.emoji}
                    style={{ transform: [{ scale: idx === stepIndex ? 1.15 : 1 }] }}
                    className={`h-8 w-8 items-center justify-center rounded-full ${
                      idx === stepIndex ? 'bg-primary/20' : 'bg-muted/40'
                    }`}
                  >
                    <AppText className="text-sm">{step.emoji}</AppText>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          /* ================= LOCATION FOUND STATE (Image Reference) ================= */
          <View key="location-found-state" className="w-full items-center justify-center gap-lg py-lg">
            {/* Green Checkmark Badge */}
            <View className="h-28 w-28 items-center justify-center rounded-full bg-emerald-50">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#34C759] shadow-sm">
                <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M20 6L9 17L4 12"
                    stroke="#FFFFFF"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
            </View>

            {/* Title */}
            <View className="items-center gap-xs">
              <AppText variant="h1" className="font-bold text-center text-foreground">
                Location Found!
              </AppText>
              {errorMessage ? (
                <AppText variant="caption" tone="muted" className="text-center">
                  Using default location for nearby discovery 🧭
                </AppText>
              ) : null}
            </View>

            {/* Address Card matching exact design */}
            <View className="w-full rounded-2xl border border-border bg-card p-lg shadow-sm gap-md">
              {/* Address Header */}
              <View className="flex-row items-center gap-xs">
                <AppText className="text-xl">📍</AppText>
                <AppText variant="h3" className="font-bold text-foreground">
                  Address
                </AppText>
              </View>

              {/* Full Address Text */}
              <AppText variant="bodyM" tone="muted" className="font-medium">
                {location.address}
              </AppText>

              {/* Horizontal Divider Line */}
              <View className="h-px w-full bg-border" />

              {/* 3 Column Grid: CITY, STATE, COUNTRY */}
              <View className="flex-row items-center justify-between">
                {/* CITY */}
                <View className="gap-2xs">
                  <AppText variant="caption" tone="muted" className="font-bold tracking-wider">
                    CITY
                  </AppText>
                  <AppText variant="bodyM" className="font-bold text-foreground">
                    {location.city}
                  </AppText>
                </View>

                {/* STATE */}
                <View className="gap-2xs">
                  <AppText variant="caption" tone="muted" className="font-bold tracking-wider">
                    STATE
                  </AppText>
                  <AppText variant="bodyM" className="font-bold text-foreground">
                    {location.state}
                  </AppText>
                </View>

                {/* COUNTRY */}
                <View className="gap-2xs">
                  <AppText variant="caption" tone="muted" className="font-bold tracking-wider">
                    COUNTRY
                  </AppText>
                  <AppText variant="bodyM" className="font-bold text-foreground">
                    {location.country}
                  </AppText>
                </View>
              </View>
            </View>

            {/* Interactive Location Perks with Emojis */}
            <View className="w-full gap-xs pt-xs">
              <View className="flex-row items-center gap-sm rounded-xl bg-card border border-border/70 px-md py-sm">
                <AppText className="text-lg">🎯</AppText>
                <AppText variant="caption" className="text-foreground/80 font-medium flex-1">
                  Ready to discover matches nearby in your area
                </AppText>
              </View>

              <View className="flex-row items-center gap-sm rounded-xl bg-card border border-border/70 px-md py-sm">
                <AppText className="text-lg">🔒</AppText>
                <AppText variant="caption" className="text-foreground/80 font-medium flex-1">
                  Your exact location is private. Only city & distance are shared
                </AppText>
              </View>
            </View>

            {/* Re-detect or Refresh Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh location"
              onPress={() => void detectLocation()}
              className="flex-row items-center gap-xs pt-2xs active:opacity-70"
            >
              <AppText className="text-sm">🔄</AppText>
              <AppText variant="bodyS" tone="primary" className="font-semibold">
                Detect location again
              </AppText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </OnboardingFrame>
  );
}
export default LocationScreen;
