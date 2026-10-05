import { useState } from 'react';
import { TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { OnboardingFrame } from '@/features/profile/components/OnboardingFrame';
import { useProfile } from '@/features/profile/hooks/useProfile';
import type { OnboardingStackParamList } from '@/features/profile/navigation';
import { profileService } from '@/features/profile/services/profile.service';
type Props = NativeStackScreenProps<OnboardingStackParamList, 'Role'>;
const roles = ['friendly', 'astrologer', 'counselor', 'expert'] as const;
export function RoleScreen({ navigation }: Props) {
  const { profile, setProfile } = useProfile(); const [role, setRole] = useState<typeof roles[number]>(profile?.supportRole ?? 'friendly'); const [subject, setSubject] = useState(profile?.expertSubject ?? ''); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  async function next() { setLoading(true); setError(null); try { setProfile(await profileService.setRole(role, subject)); navigation.navigate(role === 'friendly' ? 'Basics' : 'Certificate'); } catch (e) { setError(profileService.failureMessage(e)); } finally { setLoading(false); } }
  return <OnboardingFrame step={1} title="Choose your support role" subtitle="Choose one role for your profile." onBack={() => navigation.goBack()} onContinue={() => void next()} loading={loading} error={error}><View className="gap-sm">{roles.map((item) => <AppButton key={item} variant={role === item ? 'primary' : 'outline'} onPress={() => setRole(item)}>{item[0].toUpperCase() + item.slice(1)}</AppButton>)}{role === 'expert' ? <TextInput value={subject} onChangeText={setSubject} placeholder="Expert subject" maxLength={80} className="rounded-sm border border-input px-3 py-3 text-foreground" /> : null}{role === 'counselor' ? <AppText variant="caption">Counseling here is supportive conversation, not emergency care.</AppText> : null}</View></OnboardingFrame>;
}
