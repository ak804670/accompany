import { syncResource } from '@/database/sync/queryClient';
import { blockedUserRepository } from '@/database/sqlite/repositories/blockedUserRepository';
import { callRepository } from '@/database/sqlite/repositories/callRepository';
import { conversationRepository } from '@/database/sqlite/repositories/conversationRepository';
import { homeCardRepository } from '@/database/sqlite/repositories/homeCardRepository';
import { messageRepository } from '@/database/sqlite/repositories/messageRepository';
import { profileRepository } from '@/database/sqlite/repositories/profileRepository';
import { userRepository } from '@/database/sqlite/repositories/userRepository';
import { walletRepository } from '@/database/sqlite/repositories/walletRepository';
import { emitLocal, getViewerId, setViewerId } from '@/database/sqlite/memory';
import { chatService, type CallHistoryItem, type ConversationSummary } from '@/features/chat/chat.service';
import { homeFilterKey, INITIAL_BATCH_SIZE } from '@/features/home/discovery';
import { peopleService } from '@/features/home/people.service';
import { profileService } from '@/features/profile/services/profile.service';
import { walletService, type WalletSummary, type WalletTransaction } from '@/features/wallet/wallet.service';
import { socketService, type LiveMessage } from '@/services/realtime/socket';

function conversationIdOf(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const id = (payload as { conversationId?: unknown }).conversationId;
  return typeof id === 'string' ? id : null;
}

function messageIdsOf(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const body = payload as { messageId?: unknown; messageIds?: unknown };
  if (Array.isArray(body.messageIds)) return body.messageIds.filter((id): id is string => typeof id === 'string');
  return typeof body.messageId === 'string' ? [body.messageId] : [];
}

export async function syncConversationList(cursor?: string | null, force = false) {
  const result = await syncResource(['conversations', cursor ?? null], () => chatService.list(cursor), force);
  if (!cursor && result.nextCursor === null) await conversationRepository.replaceAll(result.conversations);
  else await conversationRepository.upsertMany(result.conversations);
  emitLocal('conversations');
  return result;
}

export async function syncConversation(conversationId: string, force = false): Promise<ConversationSummary & { canMessage: boolean; canRespond: boolean }> {
  const conversation = await syncResource(['conversation', conversationId], () => chatService.get(conversationId), force);
  await conversationRepository.save(conversation, { canMessage: conversation.canMessage, canRespond: conversation.canRespond });
  return conversation;
}

export async function syncMessages(conversationId: string, cursor?: string | null, force = false) {
  const result = await syncResource(['messages', conversationId, cursor ?? null], () => chatService.messages(conversationId, cursor), force);
  await messageRepository.upsertMany(conversationId, result.messages);
  return result;
}

export async function syncCalls(cursor?: string | null, missed = false, force = false) {
  const result = await syncResource(['calls-recent', cursor ?? null, missed], () => chatService.recentCalls(cursor, missed), force);
  const calls = Array.isArray(result.calls) ? result.calls : [];
  await callRepository.upsertMany(calls).catch(() => undefined);
  return { calls, nextCursor: result.nextCursor ?? null };
}

export async function syncCallsWith(personId: string, conversationId: string, name: string): Promise<void> {
  const calls = await syncResource(['calls-with', personId], () => chatService.callsWith(personId), false);
  const history: CallHistoryItem[] = calls.map((call) => ({
    ...call,
    personId,
    name,
    conversationId: call.conversationId ?? conversationId,
  }));
  await callRepository.upsertMany(history);
}

export async function syncProfile(force = false) {
  const profile = await syncResource(['profile'], () => profileService.get(), force);
  await profileRepository.saveCurrent(profile).catch(() => undefined);
  return profile;
}

export async function syncRates(force = false) {
  const rates = await syncResource(['profile-rates'], () => profileService.rates(), force);
  await profileRepository.saveRates(rates);
  return rates;
}

export async function syncBlocks(force = false) {
  const people = await syncResource(['blocks'], () => peopleService.blocks(), force);
  await blockedUserRepository.replace(people);
  return people;
}

export async function syncHome(force = false) {
  const filterKey = homeFilterKey(null, []);
  const result = await syncResource(
    ['people-online', null, INITIAL_BATCH_SIZE, null, ''],
    () => peopleService.online({ limit: INITIAL_BATCH_SIZE }),
    force,
  );
  await homeCardRepository.replace(filterKey, result.people, result.nextCursor);
  return result;
}

export async function syncWallet(force = false): Promise<{ summary: WalletSummary; transactions: WalletTransaction[] }> {
  const [summary, history] = await syncResource(
    ['wallet'],
    () => Promise.all([walletService.summary(), walletService.transactions()]),
    force,
  );
  await walletRepository.save(summary, history.transactions);
  return { summary, transactions: history.transactions };
}

export function startBackgroundSync(): void {
  void syncProfile().catch(() => undefined);
  void syncRates().catch(() => undefined);
  void syncConversationList(null).catch(() => undefined);
  void syncCalls(null, false).catch(() => undefined);
  void syncBlocks().catch(() => undefined);
  void syncHome().catch(() => undefined);
  void syncWallet().catch(() => undefined);
}

let stopRealtime: (() => void) | null = null;

export function startRealtimeCache(userId: string | null): void {
  setViewerId(userId);
  if (stopRealtime) return;
  const offs = [
    socketService.subscribe('message:new', (payload) => {
      const message = payload as LiveMessage;
      if (!message?.messageId || !message.conversationId) return;
      void messageRepository.insert({
        id: message.messageId,
        conversationId: message.conversationId,
        senderId: message.senderId,
        body: message.content,
        createdAt: message.createdAt,
        mine: message.senderId === getViewerId(),
        clientMessageId: message.clientMessageId,
        status: 'sent',
      }).catch(() => undefined);
    }),
    socketService.subscribe('message:delivered', (payload) => {
      void messageRepository.markStatus(messageIdsOf(payload), 'delivered').catch(() => undefined);
    }),
    socketService.subscribe('message:read', (payload) => {
      void messageRepository.markStatus(messageIdsOf(payload), 'read').catch(() => undefined);
    }),
    socketService.subscribe('message:failed', (payload) => {
      void messageRepository.markStatus(messageIdsOf(payload), 'failed').catch(() => undefined);
    }),
    socketService.subscribe('conversation:update', (payload) => {
      const id = conversationIdOf(payload);
      if (!id) return;
      void syncConversation(id, true).catch(() => undefined);
    }),
    socketService.subscribe('chat_request:new', (payload) => {
      const id = conversationIdOf(payload);
      if (id) void syncConversation(id, true).catch(() => undefined);
      else void syncConversationList(null, true).catch(() => undefined);
    }),
    socketService.subscribe('chat_request:accepted', (payload) => {
      const id = conversationIdOf(payload);
      if (!id) {
        void syncConversationList(null, true).catch(() => undefined);
        return;
      }
      void conversationRepository.updateStatus(id, 'accepted', { canMessage: true, canRespond: false }).catch(() => undefined);
      void syncConversation(id, true).catch(() => undefined);
    }),
    socketService.subscribe('chat_request:rejected', (payload) => {
      const id = conversationIdOf(payload);
      if (!id) return;
      void conversationRepository.updateStatus(id, 'rejected', { canMessage: false, canRespond: false }).catch(() => undefined);
    }),
    socketService.subscribe('presence:update', (payload) => {
      const body = payload as { userId?: string; online?: boolean };
      if (!body.userId || typeof body.online !== 'boolean') return;
      void userRepository.getPerson(body.userId).then((person) => {
        if (!person) return;
        return userRepository.savePerson({ ...person, online: body.online ?? person.online });
      }).catch(() => undefined);
    }),
  ];
  stopRealtime = () => {
    for (const off of offs) off();
    stopRealtime = null;
  };
}

export function stopRealtimeCache(): void {
  stopRealtime?.();
}
