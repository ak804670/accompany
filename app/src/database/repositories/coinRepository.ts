import { openDatabase } from '@/database/db';
import type { CoinPackage, WalletSummary, WalletTransaction } from '@/features/wallet/wallet.service';

type SummaryRow = { available_coins: number; earned_coins: number; held_coins: number };
type TransactionRow = {
  id: string;
  label: string;
  direction: 'credit' | 'debit';
  coins: number;
  status: string;
  created_at: string;
};
type PackageRow = {
  id: string;
  name: string;
  coins: number;
  price_minor: number;
  currency: string;
  featured: number;
};

const summaries = new Map<string, WalletSummary>();
const transactions = new Map<string, WalletTransaction[]>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeWallet(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearCoinMemory(): void {
  summaries.clear();
  transactions.clear();
}

export const coinRepository = {
  peekSummary(ownerUserId: string): WalletSummary | null {
    return summaries.get(ownerUserId) ?? null;
  },

  async getSummary(ownerUserId: string): Promise<WalletSummary | null> {
    const remembered = summaries.get(ownerUserId);
    if (remembered) return remembered;
    try {
      const db = await openDatabase();
      const row = await db.first<SummaryRow>(
        'SELECT available_coins, earned_coins, held_coins FROM wallet_snapshots WHERE owner_user_id = ?',
        [ownerUserId],
      );
      if (!row) return null;
      const summary = { availableCoins: row.available_coins, earnedCoins: row.earned_coins, heldCoins: row.held_coins };
      summaries.set(ownerUserId, summary);
      return summary;
    } catch {
      return null;
    }
  },

  async saveSummary(ownerUserId: string, summary: WalletSummary): Promise<void> {
    summaries.set(ownerUserId, summary);
    const db = await openDatabase();
    await db.run(
      `INSERT INTO wallet_snapshots (owner_user_id, available_coins, earned_coins, held_coins, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(owner_user_id) DO UPDATE SET
         available_coins = excluded.available_coins,
         earned_coins = excluded.earned_coins,
         held_coins = excluded.held_coins,
         updated_at = excluded.updated_at`,
      [ownerUserId, summary.availableCoins, summary.earnedCoins, summary.heldCoins, new Date().toISOString()],
    );
    emit();
  },

  async getTransactions(ownerUserId: string): Promise<WalletTransaction[]> {
    const remembered = transactions.get(ownerUserId);
    if (remembered) return remembered;
    try {
      const db = await openDatabase();
      const rows = await db.all<TransactionRow>(
        `SELECT id, label, direction, coins, status, created_at
         FROM wallet_transactions WHERE owner_user_id = ? ORDER BY created_at DESC`,
        [ownerUserId],
      );
      const items = rows.map((row) => ({
        id: row.id,
        label: row.label,
        direction: row.direction,
        coins: row.coins,
        status: row.status,
        createdAt: row.created_at,
      }));
      transactions.set(ownerUserId, items);
      return items;
    } catch {
      return [];
    }
  },

  async saveTransactions(ownerUserId: string, items: WalletTransaction[]): Promise<void> {
    transactions.set(ownerUserId, items);
    const db = await openDatabase();
    await db.exec('BEGIN');
    try {
      await db.run('DELETE FROM wallet_transactions WHERE owner_user_id = ?', [ownerUserId]);
      for (const item of items) {
        await db.run(
          `INSERT INTO wallet_transactions (owner_user_id, id, label, direction, coins, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [ownerUserId, item.id, item.label, item.direction, item.coins, item.status, item.createdAt],
        );
      }
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  },

  async getPackages(): Promise<CoinPackage[]> {
    try {
      const db = await openDatabase();
      const rows = await db.all<PackageRow>('SELECT id, name, coins, price_minor, currency, featured FROM coin_packages');
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        coins: row.coins,
        priceMinor: row.price_minor,
        currency: row.currency,
        featured: row.featured === 1,
      }));
    } catch {
      return [];
    }
  },

  async savePackages(items: CoinPackage[]): Promise<void> {
    const db = await openDatabase();
    await db.exec('BEGIN');
    try {
      await db.run('DELETE FROM coin_packages');
      for (const item of items) {
        await db.run(
          `INSERT INTO coin_packages (id, name, coins, price_minor, currency, featured) VALUES (?, ?, ?, ?, ?, ?)`,
          [item.id, item.name, item.coins, item.priceMinor, item.currency, item.featured ? 1 : 0],
        );
      }
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  },
};
