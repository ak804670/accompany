import { ChevronLeft } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppIconButton } from '@/components/design-system/AppIconButton';
import { AppText } from '@/components/design-system/AppText';
import { IllustratedState } from '@/components/illustrations/IllustratedState';
import { type WalletSummary, type WalletTransaction } from '@/features/wallet/wallet.service';
import { walletRepository } from '@/database/sqlite/repositories/walletRepository';
import { syncWallet } from '@/database/sync/syncEngine';

type WalletScreenProps = { onBack: () => void; onAdd: () => void; onWithdraw: () => void };

export function WalletScreen({ onBack, onAdd, onWithdraw }: WalletScreenProps) {
  const insets = useSafeAreaInsets();
  const seeded = walletRepository.peek();
  const [summary, setSummary] = useState<WalletSummary | null>(seeded?.summary ?? null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(seeded?.transactions ?? []);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(Boolean(seeded));

  useFocusEffect(useCallback(() => {
    let active = true;
    void walletRepository.read().then((cached) => {
      if (!active) return;
      if (cached.summary) {
        setSummary(cached.summary);
        setTransactions(cached.transactions);
        setReady(true);
      }
    }).catch(() => undefined);
    void syncWallet().then((wallet) => {
      if (!active) return;
      setSummary(wallet.summary);
      setTransactions(wallet.transactions);
      setError(null);
    }).catch(() => {
      if (active && !walletRepository.peek()) setError("Couldn't load your coins.");
    }).finally(() => {
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, []));

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 8 }}>
    <View className="flex-row items-center gap-sm px-sm">
      <AppIconButton icon={ChevronLeft} size="lg" accessibilityLabel="Go back" onPress={onBack} />
      <AppText variant="h3">Wallet</AppText>
    </View>
    <ScrollView className="flex-1" contentContainerClassName="gap-lg px-lg pb-xl">
      <View className="items-center gap-xs rounded-md border border-border bg-card p-lg">
        <AppText variant="caption" tone="muted">Coin balance</AppText>
        <AppText variant="h1">{summary ? summary.availableCoins.toLocaleString('en-IN') : '—'}</AppText>
        <AppText variant="bodyS" tone="muted">Coins</AppText>
        <AppText variant="caption" tone="muted">{summary ? `${summary.earnedCoins} earned · ${summary.heldCoins} pending` : ''}</AppText>
        <View className="mt-sm w-full flex-row gap-sm">
          <AppButton className="flex-1" onPress={onAdd}>Add coins</AppButton>
          <AppButton className="flex-1" variant="outline" onPress={onWithdraw}>Withdraw</AppButton>
        </View>
      </View>
      {error ? <AppText variant="bodyS" tone="warning">{error}</AppText> : null}
      <View className="gap-sm">
        <AppText variant="label">Recent activity</AppText>
        {!error && ready && transactions.length === 0 ? (
          <IllustratedState name="wallet-empty" size={140} title="No coin activity yet." body="Purchases and call earnings will show up here." />
        ) : transactions.map((item) => (
          <View key={item.id} className="flex-row items-center justify-between border-b border-border py-sm">
            <View>
              <AppText variant="bodyM">{item.label}</AppText>
              <AppText variant="caption" tone="muted">{item.status}</AppText>
            </View>
            <AppText variant="label">{item.direction === 'credit' ? '+' : '-'}{item.coins}</AppText>
          </View>
        ))}
      </View>
    </ScrollView>
    </View>
  );
}
