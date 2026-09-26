export const LEDGER_TYPES = [
  'coin_purchase',
  'voice_call_debit',
  'voice_call_credit',
  'video_call_debit',
  'video_call_credit',
  'refund',
  'withdrawal',
  'bonus',
  'adjustment',
] as const;

export type LedgerType = (typeof LEDGER_TYPES)[number];

export type WalletSnapshot = {
  balance: number;
  earned: number;
  held: number;
};

export function spend(wallet: WalletSnapshot, coins: number): WalletSnapshot | null {
  if (!Number.isInteger(coins) || coins <= 0 || wallet.balance < coins) return null;
  const balance = wallet.balance - coins;
  return { balance, held: wallet.held, earned: Math.min(wallet.earned, balance) };
}

export function earn(wallet: WalletSnapshot, coins: number): WalletSnapshot | null {
  if (!Number.isInteger(coins) || coins <= 0) return null;
  return { balance: wallet.balance + coins, earned: wallet.earned + coins, held: wallet.held };
}

export function holdForWithdrawal(wallet: WalletSnapshot, coins: number, minimum: number): WalletSnapshot | null {
  if (!Number.isInteger(coins) || coins < minimum || wallet.earned < coins) return null;
  return { balance: wallet.balance - coins, earned: wallet.earned - coins, held: wallet.held + coins };
}

export function releaseHold(wallet: WalletSnapshot, coins: number): WalletSnapshot | null {
  if (!Number.isInteger(coins) || coins <= 0 || wallet.held < coins) return null;
  return { balance: wallet.balance + coins, earned: wallet.earned + coins, held: wallet.held - coins };
}

export function captureHold(wallet: WalletSnapshot, coins: number): WalletSnapshot | null {
  if (!Number.isInteger(coins) || coins <= 0 || wallet.held < coins) return null;
  return { ...wallet, held: wallet.held - coins };
}

export function payoutMinor(coins: number, paisePerCoin: number): number {
  if (!Number.isInteger(coins) || !Number.isInteger(paisePerCoin) || coins < 0 || paisePerCoin < 0) return 0;
  return coins * paisePerCoin;
}

export function publicLabel(type: string): 'Added' | 'Spent' | 'Earned' | 'Withdrawn' | 'Refund' | 'Adjustment' {
  if (type === 'coin_purchase') return 'Added';
  if (type.endsWith('_debit')) return 'Spent';
  if (type.endsWith('_credit')) return 'Earned';
  if (type === 'withdrawal') return 'Withdrawn';
  if (type === 'refund') return 'Refund';
  return 'Adjustment';
}
