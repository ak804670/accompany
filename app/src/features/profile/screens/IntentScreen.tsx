import { useState } from 'react';
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
  return <OnboardingFrame step={0} title="How do you want to use Accompany?" subtitle="You can change this later from your profile." loading={loading} error={error} footer={<><AppButton loading={loading} onPress={() => void chooseAnonymous()}>I’m here to listen</AppButton><AppButton variant="outline" disabled={loading} onPress={chooseProvider}>I want to provide support</AppButton></>}><AppText variant="bodyM">Listeners stay private and never appear in discovery. We’ll give you an alias so your real name isn’t shown.</AppText></OnboardingFrame>;
}
