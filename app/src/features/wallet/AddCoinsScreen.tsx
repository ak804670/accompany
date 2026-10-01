import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppIconButton } from '@/components/design-system/AppIconButton';
import { AppText } from '@/components/design-system/AppText';
import { AccompanyIllustration } from '@/components/illustrations/AccompanyIllustration';
import { formatInr, walletService, type CoinPackage } from '@/features/wallet/wallet.service';
import { ApiError } from '@/services/api';

export function AddCoinsScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    void walletService.packages().then((result) => setPackages(result.packages)).catch(() => setNotice({ ok: false, message: "Couldn't load coin packages." }));
  }, []);

  async function buy(item: CoinPackage) {
    setPending(item.id);
    try {
      await walletService.purchase(item.id);
      setNotice({ ok: true, message: 'Payment started. Coins are added after the payment is verified.' });
    } catch (caught) {
      const body = caught instanceof ApiError && caught.body && typeof caught.body === 'object' ? caught.body as { error?: { message?: string } } : null;
      setNotice({ ok: false, message: body?.error?.message || "Couldn't start the payment." });
    } finally {
      setPending(null);
    }
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 8 }}>
    <View className="flex-row items-center gap-sm px-sm">
      <AppIconButton icon="back" size="lg" accessibilityLabel="Go back" onPress={onBack} />
      <AppText variant="h3">Add coins</AppText>
    </View>
    <ScrollView className="flex-1" contentContainerClassName="gap-md px-lg pb-xl">
      <AppText variant="bodyS" tone="muted">Coins are added only after payment is confirmed.</AppText>
      {notice ? (
        <View className="items-center gap-sm">
          <AccompanyIllustration name={notice.ok ? 'wallet-success' : 'wallet-failed'} size={120} motion={notice.ok ? 'enter' : 'none'} />
          <AppText className="text-center" variant="bodyS" tone={notice.ok ? 'muted' : 'warning'}>{notice.message}</AppText>
        </View>
      ) : null}
      {packages.map((item) => (
        <View key={item.id} className="flex-row items-center justify-between rounded-md border border-border bg-card p-md">
          <View>
            <AppText variant="label">{item.coins.toLocaleString('en-IN')} coins</AppText>
            <AppText variant="bodyS" tone="muted">{formatInr(item.priceMinor)}{item.featured ? ' · Popular' : ''}</AppText>
          </View>
          <AppButton loading={pending === item.id} onPress={() => void buy(item)}>Add</AppButton>
        </View>
      ))}
    </ScrollView>
    </View>
  );
}
