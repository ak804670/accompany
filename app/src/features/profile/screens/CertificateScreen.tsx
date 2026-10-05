import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '@/components/design-system/AppText';
import { OnboardingFrame } from '@/features/profile/components/OnboardingFrame';
import type { OnboardingStackParamList } from '@/features/profile/navigation';
type Props = NativeStackScreenProps<OnboardingStackParamList, 'Certificate'>;
export function CertificateScreen({ navigation }: Props) {
  return <OnboardingFrame step={2} title="Verification" subtitle="You can continue without verification. Your profile will be listed without a verified badge." onBack={() => navigation.goBack()} onContinue={() => navigation.navigate('Gender')} continueLabel="Continue without verification"><AppText variant="bodyM">Certificate upload will be available here.</AppText></OnboardingFrame>;
}
