import type { CallEvent, CallHistoryItem, ChatMessage, ConversationSummary } from '@/features/chat/chat.service';
import type { OnlinePerson } from '@/features/home/people.service';
import type { UserProfile } from '@/features/profile/types';
import type { WalletSummary, WalletTransaction } from '@/features/wallet/wallet.service';

export type CachedConversation = {
  summary: ConversationSummary;
  canMessage: boolean;
  canRespond: boolean;
  messages: ChatMessage[];
  calls: CallEvent[];
};

export type HomeSnapshot = {
  people: OnlinePerson[];
  cursor: string | null;
};

export type RateSnapshot = { chat: number | null; audio: number | null; video: number | null };

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();
const conversations = new Map<string, CachedConversation>();
const homes = new Map<string, HomeSnapshot>();
let conversationList: ConversationSummary[] | null = null;
let profile: UserProfile | null = null;
let rates: RateSnapshot | null = null;
let calls: CallHistoryItem[] | null = null;
let blocks: Array<{ userId: string; name: string }> | null = null;
let wallet: { summary: WalletSummary; transactions: WalletTransaction[] } | null = null;
let viewerId = 'me';

export function setViewerId(id: string | null): void {
  viewerId = id && id.length > 0 ? id : 'me';
}

export function getViewerId(): string {
  return viewerId;
}

export function emitLocal(topic: string): void {
  const set = listeners.get(topic);
  if (!set) return;
  for (const listener of set) listener();
}

export function subscribeLocal(topic: string, listener: Listener): () => void {
  const set = listeners.get(topic) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(topic, set);
  return () => set.delete(listener);
}

export function rememberConversation(bundle: CachedConversation): void {
  const previous = conversations.get(bundle.summary.id);
  conversations.set(bundle.summary.id, {
    ...bundle,
    messages: bundle.messages.length > 0 ? bundle.messages : previous?.messages ?? [],
    calls: bundle.calls.length > 0 ? bundle.calls : previous?.calls ?? [],
  });
}

export function peekConversation(id: string): CachedConversation | null {
  return conversations.get(id) ?? null;
}

export function rememberMessages(conversationId: string, messages: ChatMessage[]): void {
  const current = conversations.get(conversationId);
  if (!current) return;
  conversations.set(conversationId, { ...current, messages });
}

export function forgetConversations(): void {
  conversations.clear();
  conversationList = null;
}

export function rememberConversationList(items: ConversationSummary[]): void {
  conversationList = items;
  for (const item of items) {
    const previous = conversations.get(item.id);
    if (previous) {
      conversations.set(item.id, { ...previous, summary: item });
    }
  }
}

export function peekConversationList(): ConversationSummary[] | null {
  return conversationList;
}

export function rememberHome(filterKey: string, snapshot: HomeSnapshot): void {
  homes.set(filterKey, snapshot);
}

export function peekHome(filterKey: string): HomeSnapshot {
  return homes.get(filterKey) ?? { people: [], cursor: null };
}

export function peekPerson(userId: string): OnlinePerson | null {
  for (const snapshot of homes.values()) {
    const found = snapshot.people.find((person) => person.userId === userId);
    if (found) return found;
  }
  return null;
}

export function rememberProfile(next: UserProfile | null): void {
  profile = next;
}

export function peekProfile(): UserProfile | null {
  return profile;
}

export function rememberRates(next: RateSnapshot | null): void {
  rates = next;
}

export function peekRates(): RateSnapshot | null {
  return rates;
}

export function rememberCalls(next: CallHistoryItem[]): void {
  calls = next;
}

export function peekCalls(): CallHistoryItem[] | null {
  return calls;
}

export function rememberBlocks(next: Array<{ userId: string; name: string }>): void {
  blocks = next;
}

export function peekBlocks(): Array<{ userId: string; name: string }> | null {
  return blocks;
}

export function rememberWallet(summary: WalletSummary, transactions: WalletTransaction[]): void {
  wallet = { summary, transactions };
}

export function peekWallet(): { summary: WalletSummary; transactions: WalletTransaction[] } | null {
  return wallet;
}

export function resetMemory(): void {
  conversations.clear();
  homes.clear();
  conversationList = null;
  profile = null;
  rates = null;
  calls = null;
  blocks = null;
  wallet = null;
  viewerId = 'me';
  listeners.clear();
}
