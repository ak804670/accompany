import { useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { OnboardingFrame } from '@/features/profile/components/OnboardingFrame';
import { useProfile } from '@/features/profile/hooks/useProfile';
import type { OnboardingStackParamList } from '@/features/profile/navigation';
import { profileService } from '@/features/profile/services/profile.service';
type Props = NativeStackScreenProps<OnboardingStackParamList, 'Intent'>;
export function IntentScreen({ navigation }: Props) {
  const { setProfile } = useProfile(); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  async function chooseAnonymous() { setLoading(true); setError(null); try { setProfile(await profileService.setIntent('anonymous')); navigation.navigate('Basics'); } catch (e) { setError(profileService.failureMessage(e)); } finally { setLoading(false); } }
  function chooseProvider() { navigation.navigate('Basics', { intent: 'provider' }); }
  return <OnboardingFrame step={0} title="How do you want to use Accompany?" subtitle="Choose what brings you here." loading={loading} error={error} footer={<View className="gap-sm"><AppButton loading={loading} onPress={() => void chooseAnonymous()}>I’m looking for someone to accompany me</AppButton><AppButton variant="outline" disabled={loading} onPress={chooseProvider}>I’m here to accompany others</AppButton></View>}><AppText variant="bodyM">Choose the first option if you’re looking for company and support. Choose the second if you’re here to provide companionship. Anonymous accounts stay private and never appear in discovery.</AppText></OnboardingFrame>;
}
