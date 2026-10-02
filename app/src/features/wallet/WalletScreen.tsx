import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppIconButton } from '@/components/design-system/AppIconButton';
import { AppText } from '@/components/design-system/AppText';
import { BrandIcon } from '@/components/icons/BrandIcon';
import { NavBarGradient } from '@/components/navigation/NavBarGradient';
import { IllustratedState } from '@/components/illustrations/IllustratedState';
import { coinRepository } from '@/database/repositories/coinRepository';
import { syncWallet } from '@/database/session-cache';
import { useSession } from '@/features/auth';
import { walletService, type WalletSummary, type WalletTransaction } from '@/features/wallet/wallet.service';

type WalletScreenProps = { onBack: () => void; onAdd: () => void; onWithdraw: () => void };

export function WalletScreen({ onBack, onAdd, onWithdraw }: WalletScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    const userId = user?.id;
    void (async () => {
      let showedCache = false;
      if (userId) {
        const [cachedSummary, cachedTransactions] = await Promise.all([
          coinRepository.getSummary(userId),
          coinRepository.getTransactions(userId),
        ]);
        if (!active) return;
        if (cachedSummary) {
          setSummary(cachedSummary);
          setTransactions(cachedTransactions);
          setReady(true);
          showedCache = true;
        }
      }
      try {
        if (userId) {
          const synced = await syncWallet(userId);
          if (!synced) throw new Error('wallet');
          const [freshSummary, freshTransactions] = await Promise.all([
            coinRepository.getSummary(userId),
            coinRepository.getTransactions(userId),
          ]);
          if (!active) return;
          if (freshSummary) setSummary(freshSummary);
          setTransactions(freshTransactions);
        } else {
          const [wallet, history] = await Promise.all([walletService.summary(), walletService.transactions()]);
          if (!active) return;
          setSummary(wallet);
          setTransactions(history.transactions);
        }
        if (active) setError(null);
      } catch {
        if (active && !showedCache) setError("Couldn't load your coins.");
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => { active = false; };
  }, [user?.id]));

  return (
    <View className="flex-1 bg-background">
      {/* Top Header Nav Bar */}
      <View
        className="relative overflow-hidden border-b border-nav-border px-sm pb-2"
        style={{ paddingTop: insets.top + 8 }}
      >
        <NavBarGradient />
        <View className="flex-row items-center gap-xs">
          <AppIconButton icon="back" size="lg" accessibilityLabel="Go back" onPress={onBack} />
          <AppText variant="h3">Wallet</AppText>
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="gap-lg px-lg py-md pb-xl">
      <View className="items-center gap-xs rounded-md border border-border bg-card p-lg">
        <View className="flex-row items-center gap-xs">
          <BrandIcon name="coins" size={18} />
          <AppText variant="caption" tone="muted">Coin balance</AppText>
        </View>
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
