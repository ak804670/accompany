import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { OnboardingFrame } from '@/features/profile/components/OnboardingFrame';
import { useProfile } from '@/features/profile/hooks/useProfile';
import type { OnboardingStackParamList } from '@/features/profile/navigation';
import { prepareProfileImage } from '@/features/profile/services/prepare-image';
import { profileService } from '@/features/profile/services/profile.service';
import { routeForStep, type UserProfile } from '@/features/profile/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Certificate'>;

export function CertificateScreen({ navigation }: Props) {
  const { setProfile } = useProfile();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function continueFrom(saved: UserProfile) {
    setProfile(saved);
    if (!saved.complete) navigation.navigate(routeForStep(saved.step));
  }

  async function upload() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is needed to choose a certificate.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled || !result.assets[0]) return;
    setLoading(true);
    setError(null);
    try {
      const prepared = await prepareProfileImage(result.assets[0].uri);
      continueFrom(await profileService.uploadCredential(prepared.bytes, prepared.contentType));
    } catch (caught) {
      setError(profileService.failureMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  async function skip() {
    setLoading(true);
    setError(null);
    try {
      continueFrom(await profileService.skipCredential());
    } catch (caught) {
      setError(profileService.failureMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingFrame
      step={2}
      title="Verification"
      subtitle="You can continue without verification. Your profile will be listed without a verified badge."
      onBack={() => navigation.goBack()}
      onContinue={() => void skip()}
      continueLabel="Continue without verification"
      loading={loading}
      error={error}
    >
      <View className="gap-md">
        <AppText variant="bodyM">Upload a certificate if you have one. It stays private and is not shown on your public profile.</AppText>
        <AppButton variant="outline" disabled={loading} onPress={() => void upload()}>Upload certificate</AppButton>
      </View>
    </OnboardingFrame>
  );
}
