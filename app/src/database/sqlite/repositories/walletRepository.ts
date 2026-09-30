import { getDatabase } from '@/database/sqlite/database';
import { rememberWallet, peekWallet } from '@/database/sqlite/memory';
import type { WalletSummary, WalletTransaction } from '@/features/wallet/wallet.service';

function now(): string {
  return new Date().toISOString();
}

export const walletRepository = {
  peek(): { summary: WalletSummary; transactions: WalletTransaction[] } | null {
    return peekWallet();
  },

  async read(): Promise<{ summary: WalletSummary | null; transactions: WalletTransaction[] }> {
    const db = await getDatabase();
    const summary = await db.first<{ available_coins: number; earned_coins: number; held_coins: number }>(
      'SELECT available_coins, earned_coins, held_coins FROM coin_balance WHERE id = 1',
    );
    const rows = await db.all<{ payload: string }>('SELECT payload FROM wallet_transactions ORDER BY created_at DESC');
    const transactions = rows.map((row) => JSON.parse(row.payload) as WalletTransaction);
    const mapped = summary
      ? { availableCoins: summary.available_coins, earnedCoins: summary.earned_coins, heldCoins: summary.held_coins }
      : null;
    if (mapped) rememberWallet(mapped, transactions);
    return { summary: mapped, transactions };
  },

  async save(summary: WalletSummary, transactions: WalletTransaction[]): Promise<void> {
    const db = await getDatabase();
    const stamped = now();
    await db.transaction(async () => {
      await db.run(
        `INSERT INTO coin_balance (id, available_coins, earned_coins, held_coins, updated_at) VALUES (1, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET available_coins = excluded.available_coins, earned_coins = excluded.earned_coins, held_coins = excluded.held_coins, updated_at = excluded.updated_at`,
        [summary.availableCoins, summary.earnedCoins, summary.heldCoins, stamped],
      );
      await db.run('DELETE FROM wallet_transactions');
      for (const item of transactions) {
        await db.run('INSERT INTO wallet_transactions (id, payload, created_at) VALUES (?, ?, ?)', [
          item.id,
          JSON.stringify(item),
          item.createdAt,
        ]);
      }
    });
    rememberWallet(summary, transactions);
  },
};
