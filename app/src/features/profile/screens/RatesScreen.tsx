import { useState } from 'react';
import { TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '@/components/design-system/AppText';
import { OnboardingFrame } from '@/features/profile/components/OnboardingFrame';
import type { OnboardingStackParamList } from '@/features/profile/navigation';
import { profileService } from '@/features/profile/services/profile.service';
type Props = NativeStackScreenProps<OnboardingStackParamList, 'Rates'>;
export function RatesScreen({ navigation }: Props) {
  const [chat, setChat] = useState(''); const [audio, setAudio] = useState(''); const [video, setVideo] = useState(''); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  async function next() { const rates = { chat: Number(chat) || undefined, audio: Number(audio) || undefined, video: Number(video) || undefined }; if (!rates.chat && !rates.audio && !rates.video) { setError('Add at least one rate.'); return; } setLoading(true); setError(null); try { await profileService.saveRates(rates); navigation.navigate('Review'); } catch (e) { setError(profileService.failureMessage(e)); } finally { setLoading(false); } }
  const field = (label: string, value: string, onChangeText: (v: string) => void) => <View><AppText variant="label">{label}</AppText><TextInput value={value} onChangeText={onChangeText} keyboardType="number-pad" placeholder="Coins" className="rounded-sm border border-input px-3 py-3 text-foreground" /></View>;
  return <OnboardingFrame step={7} title="Set your rates" subtitle="Add at least one way people can connect." onBack={() => navigation.goBack()} onContinue={() => void next()} loading={loading} error={error}><View className="gap-md">{field('Chat', chat, setChat)}{field('Audio', audio, setAudio)}{field('Video', video, setVideo)}</View></OnboardingFrame>;
}
