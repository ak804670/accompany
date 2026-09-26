import { apiClient } from '@/services/api';

export type WalletSummary = { availableCoins: number; earnedCoins: number; heldCoins: number };
export type CoinPackage = { id: string; name: string; coins: number; priceMinor: number; currency: string; featured: boolean };
export type WalletTransaction = { id: string; label: string; direction: 'credit' | 'debit'; coins: number; status: string; createdAt: string };

export function formatInr(minor: number): string {
  const rupees = Math.trunc(minor / 100);
  const paise = Math.abs(minor % 100);
  return `₹${rupees}.${String(paise).padStart(2, '0')}`;
}

export const walletService = {
  summary: () => apiClient.get<WalletSummary>('/v1/wallet'),
  transactions: () => apiClient.get<{ transactions: WalletTransaction[] }>('/v1/wallet/transactions'),
  packages: () => apiClient.get<{ packages: CoinPackage[] }>('/v1/coin-packages'),
  purchase: (packageId: string) => apiClient.post('/v1/coin-purchases', { packageId, idempotencyKey: crypto.randomUUID() }),
  withdraw: (coins: number, method: string, destination: string) => apiClient.post('/v1/withdrawals', {
    coins, method, destination, idempotencyKey: crypto.randomUUID(),
  }),
};
