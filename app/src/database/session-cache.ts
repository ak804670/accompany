import { clearUserCache, openDatabase } from '@/database/db';
import { chatRepository, clearChatMemory } from '@/database/repositories/chatRepository';
import { clearCoinMemory, coinRepository } from '@/database/repositories/coinRepository';
import { clearMessageMemory } from '@/database/repositories/messageRepository';
import { clearProfileMemory, profileRepository } from '@/database/repositories/profileRepository';
import { chatService } from '@/features/chat/chat.service';
import { profileService } from '@/features/profile/services/profile.service';
import { walletService } from '@/features/wallet/wallet.service';

export type WarmResult = {
  chatsSynced: boolean;
};

let generation = 0;
let warm: { userId: string; promise: Promise<WarmResult> } | null = null;

export function bumpProfileGeneration(): number {
  generation += 1;
  return generation;
}

export function profileGeneration(): number {
  return generation;
}

export function resetSessionCache(): void {
  generation += 1;
  warm = null;
  clearProfileMemory();
  clearChatMemory();
  clearMessageMemory();
  clearCoinMemory();
}

export async function wipeUserCache(userId: string): Promise<void> {
  resetSessionCache();
  try {
    await clearUserCache(userId);
  } catch {
    // Rows stay scoped by owner id if the database cannot be opened.
  }
}

export function warmSession(userId: string): Promise<WarmResult> {
  if (warm?.userId === userId) return warm.promise;
  const promise = run(userId).finally(() => {
    if (warm?.promise === promise) warm = null;
  });
  warm = { userId, promise };
  return promise;
}

async function run(userId: string): Promise<WarmResult> {
  try {
    await openDatabase();
  } catch {
    // Screens fall back to the network when local storage is unavailable.
  }
  const [chatsSynced] = await Promise.all([
    syncChats(userId),
    syncWallet(userId),
    syncRates(userId),
  ]);
  return { chatsSynced };
}

async function syncChats(userId: string): Promise<boolean> {
  try {
    const result = await chatService.list();
    await chatRepository.savePage(userId, result.conversations, result.unread, result.nextCursor, 'replace');
    return true;
  } catch {
    return false;
  }
}

export async function syncWallet(userId: string): Promise<boolean> {
  try {
    const summary = await walletService.summary();
    await coinRepository.saveSummary(userId, summary);
  } catch {
    return false;
  }
  try {
    const history = await walletService.transactions();
    await coinRepository.saveTransactions(userId, history.transactions);
  } catch {
    // The confirmed balance is already stored.
  }
  return true;
}

async function syncRates(userId: string): Promise<void> {
  try {
    const next = await profileService.rates();
    await profileRepository.saveRates(userId, next);
  } catch {
    // Rates stay on their previous snapshot until a later successful read.
  }
}
