import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppIconButton } from '@/components/design-system/AppIconButton';
import { AppText } from '@/components/design-system/AppText';
import { AccompanyIllustration } from '@/components/illustrations/AccompanyIllustration';
import { walletService } from '@/features/wallet/wallet.service';
import { ApiError } from '@/services/api';

export function WithdrawScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [coins, setCoins] = useState('');
  const [destination, setDestination] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const amount = Number(coins);

  async function submit() {
    setPending(true);
    try {
      await walletService.withdraw(amount, 'upi', destination);
      setNotice({ ok: true, message: 'Withdrawal requested. Coins stay pending until the payout is confirmed.' });
      setConfirming(false);
    } catch (caught) {
      const body = caught instanceof ApiError && caught.body && typeof caught.body === 'object' ? caught.body as { error?: { message?: string } } : null;
      setNotice({ ok: false, message: body?.error?.message || "Couldn't request the withdrawal." });
    } finally {
      setPending(false);
    }
  }

  return (
    <View className="flex-1 bg-background">
      {/* Top Header Nav Bar */}
      <View
        className="border-b border-nav-border bg-nav px-sm pb-2"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center gap-xs">
          <AppIconButton icon="back" size="lg" accessibilityLabel="Go back" onPress={onBack} />
          <AppText variant="h3">Withdraw</AppText>
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="gap-md px-lg py-md pb-xl">
      <AppText variant="bodyS" tone="muted">Only coins you earned from paid calls can be withdrawn. Purchased coins stay available to spend.</AppText>
      <TextInput accessibilityLabel="Coins to withdraw" value={coins} onChangeText={setCoins} keyboardType="number-pad" placeholder="Coins" placeholderTextColor="#8A8178" className="min-h-12 rounded-sm border border-input bg-background px-md text-foreground" />
      <TextInput accessibilityLabel="UPI id" value={destination} onChangeText={setDestination} autoCapitalize="none" placeholder="UPI ID" placeholderTextColor="#8A8178" className="min-h-12 rounded-sm border border-input bg-background px-md text-foreground" />
      {notice ? (
        <View className="items-center gap-sm">
          <AccompanyIllustration name={notice.ok ? 'wallet-success' : 'wallet-failed'} size={120} motion={notice.ok ? 'enter' : 'none'} />
          <AppText className="text-center" variant="bodyS" tone={notice.ok ? 'muted' : 'warning'}>{notice.message}</AppText>
        </View>
      ) : null}
      {confirming ? (
        <View className="gap-sm rounded-md border border-border bg-card p-md">
          <AppText variant="bodyM">Withdraw {amount} earned coins to {destination}?</AppText>
          <View className="flex-row gap-sm">
            <AppButton variant="outline" className="flex-1" onPress={() => setConfirming(false)}>Cancel</AppButton>
            <AppButton className="flex-1" loading={pending} onPress={() => void submit()}>Confirm</AppButton>
          </View>
        </View>
      ) : (
        <AppButton disabled={!Number.isInteger(amount) || amount <= 0 || destination.trim().length < 4} onPress={() => setConfirming(true)}>Review withdrawal</AppButton>
      )}
    </ScrollView>
    </View>
  );
}
