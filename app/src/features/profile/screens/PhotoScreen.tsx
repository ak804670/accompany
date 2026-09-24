import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { OnboardingFrame } from '@/features/profile/components/OnboardingFrame';
import { useProfile } from '@/features/profile/hooks/useProfile';
import type { OnboardingStackParamList } from '@/features/profile/navigation';
import { profileService } from '@/features/profile/services/profile.service';
import { prepareProfileImage } from '@/features/profile/services/prepare-image';
import { profileImageConfig } from '@/services/media/image-config';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Photo'>;

const tips = [
  'Choose photos that feel like you',
  'Clear, well-lit photos work best',
  'Include a mix of moments and expressions',
  'Your first photo should make you easy to recognize',
];

export function PhotoScreen({ navigation }: Props) {
  const { profile, setProfile } = useProfile();
  const photos = profile?.media ?? [];
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [frameWidth, setFrameWidth] = useState(0);
  const [frameHeight, setFrameHeight] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const scroller = useRef<ScrollView>(null);
  const active = photos[index];
  const canAdd = photos.length < profileImageConfig.maxPhotos;

  useEffect(() => {
    let cancelled = false;
    for (const photo of photos) {
      if (previews[photo.id]) {
        continue;
      }
      profileService.photoPreview(photo.id).then((uri) => {
        if (!cancelled && uri) {
          setPreviews((current) => ({ ...current, [photo.id]: uri }));
        }
      }).catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [photos, previews]);

  function show(next: number) {
    const bounded = Math.max(0, Math.min(next, Math.max(photos.length - 1, 0)));
    setIndex(bounded);
    if (frameWidth > 0) {
      scroller.current?.scrollTo({ x: bounded * frameWidth, animated: true });
    }
  }

  async function choose(source: 'camera' | 'gallery') {
    if (!canAdd) {
      return;
    }
    const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(source === 'camera' ? 'Camera access is needed to take a photo.' : 'Photo library access is needed to choose a photo.');
      return;
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled || !result.assets[0]) {
      return;
    }
    setStatus('Processing photo...');
    setError(null);
    try {
      const before = new Set(photos.map((photo) => photo.id));
      const prepared = await prepareProfileImage(result.assets[0].uri);
      const saved = await profileService.uploadPhoto(prepared.bytes, prepared.contentType);
      const added = saved.media.find((photo) => !before.has(photo.id));
      if (added) {
        setPreviews((current) => ({ ...current, [added.id]: prepared.uri }));
      }
      setProfile(saved);
      const nextIndex = added ? saved.media.findIndex((photo) => photo.id === added.id) : saved.media.length - 1;
      setIndex(Math.max(nextIndex, 0));
    } catch {
      setError('We couldn\'t add that photo. Try another one.');
    } finally {
      setStatus(null);
    }
  }

  async function remove() {
    if (!active) {
      return;
    }
    setStatus('Processing photo...');
    setError(null);
    try {
      const saved = await profileService.removePhoto(active.id);
      setProfile(saved);
      setIndex((current) => Math.max(0, Math.min(current, saved.media.length - 1)));
    } catch {
      setError('We couldn\'t update your photos. Try again.');
    } finally {
      setStatus(null);
    }
  }

  return (
    <OnboardingFrame step={1} title="Add your photos" subtitle="A few genuine photos help people get to know you." onBack={() => navigation.navigate('Basics')} onContinue={() => navigation.navigate('About')} loading={status !== null} disabled={photos.length === 0} error={error}>
      <View className="flex-1 justify-between">
        <View className="flex-1 items-center justify-center">
          <View
            className="aspect-[4/5] w-full overflow-hidden rounded-sm bg-muted"
            onLayout={(event) => {
              setFrameWidth(event.nativeEvent.layout.width);
              setFrameHeight(event.nativeEvent.layout.height);
            }}
          >
            {photos.length > 0 && frameWidth > 0 && frameHeight > 0 ? (
              <ScrollView
                ref={scroller}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={{ position: 'absolute', width: frameWidth, height: frameHeight }}
                onMomentumScrollEnd={(event) => {
                  const next = Math.round(event.nativeEvent.contentOffset.x / frameWidth);
                  setIndex(next);
                }}
              >
                {photos.map((photo) => (
                  <Image key={photo.id} source={previews[photo.id] ? { uri: previews[photo.id] } : undefined} accessibilityLabel={photo.isPrimary ? 'Primary profile photo' : 'Profile photo'} style={{ width: frameWidth, height: frameHeight }} resizeMode="cover" />
                ))}
              </ScrollView>
            ) : (
              <View className="flex-1 items-center justify-center px-lg">
                <AppText variant="bodyM" tone="muted">Your photos will appear here.</AppText>
              </View>
            )}
            {active ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Remove photo" className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full bg-background/80" onPress={() => void remove()}>
                <AppText variant="bodyM">×</AppText>
              </Pressable>
            ) : null}
            {status ? (
              <View className="absolute inset-0 items-center justify-center gap-sm bg-background/80">
                <ActivityIndicator size="large" />
                <AppText variant="bodyM">{status}</AppText>
              </View>
            ) : null}
          </View>
          {photos.length > 0 ? (
            <View className="mt-sm items-center gap-xs">
              <View className="flex-row gap-xs">
                {photos.map((photo, photoIndex) => (
                  <Pressable key={photo.id} accessibilityRole="button" accessibilityLabel={`Photo ${photoIndex + 1}`} onPress={() => show(photoIndex)}>
                    <View className={`h-1.5 w-1.5 rounded-full ${photoIndex === index ? 'bg-primary' : 'bg-muted'}`} />
                  </Pressable>
                ))}
              </View>
              <AppText variant="caption" tone="muted">{photos.length} / {profileImageConfig.maxPhotos}</AppText>
            </View>
          ) : null}
        </View>
        <View className="gap-sm pt-lg">
          {canAdd ? (
            <>
              <AppButton variant="outline" disabled={status !== null} onPress={() => void choose('camera')}>Take a photo</AppButton>
              <AppButton variant="outline" disabled={status !== null} onPress={() => void choose('gallery')}>Add photo</AppButton>
            </>
          ) : null}
          <AppText variant="label">Photo tips</AppText>
          {tips.map((tip) => (
            <AppText key={tip} variant="caption" tone="muted">• {tip}</AppText>
          ))}
        </View>
      </View>
    </OnboardingFrame>
  );
}
