import type { Redis } from 'ioredis';

import type { RateLimiter } from '../../infrastructure/redis/rate-limit.js';
import { logger } from '../../utils/logger.js';
import type { CallConfig } from './call-config.js';
import { canTransition, type CallStatus } from './call-rules.js';
import type { CallRecord, PgCallStore } from './call.store.js';
import type { CallMediaProvider } from './media-provider.js';
import type { PushMessage } from './notification-types.js';

export class CallError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class CallService {
  constructor(
    private readonly store: PgCallStore,
    private readonly media: CallMediaProvider,
    private readonly config: CallConfig,
    private readonly limiter: RateLimiter,
    private readonly notify: (message: PushMessage) => Promise<void>,
    private readonly redis: Redis,
    private readonly onPresenceChange?: (userId: string, status: string) => void,
  ) {}

  async create(callerId: string, receiverId: string, callType: 'AUDIO' | 'VIDEO', conversationId: string | null) {
    const limit = await this.limiter.consume(`call:${callerId}`, 5, 60);
    if (!limit.allowed) throw new CallError(429, 'RATE_LIMITED', 'Wait before starting another call.');
    if (callerId === receiverId) throw new CallError(400, 'VALIDATION_ERROR', 'Choose someone else.');
    if (await this.store.blocked(callerId, receiverId)) throw new CallError(403, 'FORBIDDEN', 'This conversation is not available.');
    const rate = await this.store.rate(receiverId, callType);
    if (rate === null) throw new CallError(409, 'RATE_UNAVAILABLE', 'This person has not set a rate.');
    const balance = await this.store.balance(callerId);
    if (balance < Math.max(rate, this.config.minBalance)) throw new CallError(402, 'INSUFFICIENT_BALANCE', 'Add coins before calling.');
    let call: CallRecord;
    try {
      call = await this.store.create({ callerId, receiverId, callType, rate, conversationId });
    } catch {
      throw new CallError(409, 'CALL_IN_PROGRESS', 'Finish the current call first.');
    }
    await this.media.createRoom(call.roomName, this.config.reconnectGraceSeconds + 30).catch((error: unknown) => {
      logger.error('livekit room create failed', { callId: call.id, message: error instanceof Error ? error.message : 'failed' });
    });
    const token = await this.media.generateToken({ identity: callerId, room: call.roomName, ttlSeconds: this.config.tokenTtlSeconds });
    await this.redis.incr('metrics:calls_started');
    logger.info('call created', { callId: call.id, callType, callerId, receiverId });
    await this.notify({
      userId: receiverId,
      type: 'CALL_INCOMING',
      title: callType === 'AUDIO' ? 'Incoming audio call' : 'Incoming video call',
      body: 'Someone is calling you.',
      data: { callId: call.id, callType },
    }).catch((error: unknown) => {
      logger.error('notification enqueue failed', { callId: call.id, message: error instanceof Error ? error.message : 'failed' });
    });
    return { call, token, url: this.config.livekitUrl };
  }

  async accept(userId: string, callId: string) {
    const call = await this.require(callId);
    if (call.receiverId !== userId) throw new CallError(403, 'FORBIDDEN', 'This call is not for you.');
    if (call.createdAt.getTime() + this.config.ringTimeoutSeconds * 1000 < Date.now()) {
      await this.finish(call, 'MISSED', 'timeout', 'CALL_MISSED');
      throw new CallError(410, 'CALL_EXPIRED', 'This call is no longer ringing.');
    }
    if (await this.store.blocked(call.callerId, call.receiverId)) throw new CallError(403, 'FORBIDDEN', 'This conversation is not available.');
    const next = await this.move(call, 'ACCEPTED', null);
    const token = await this.media.generateToken({ identity: userId, room: next.roomName, ttlSeconds: this.config.tokenTtlSeconds });
    await this.redis.incr('metrics:calls_accepted');
    logger.info('call accepted', { callId: call.id });
    return { call: next, token, url: this.config.livekitUrl };
  }

  async decline(userId: string, callId: string) {
    const call = await this.require(callId);
    if (call.receiverId !== userId) throw new CallError(403, 'FORBIDDEN', 'This call is not for you.');
    const next = await this.finish(call, 'DECLINED', 'declined', 'CALL_DECLINED');
    await this.redis.incr('metrics:calls_declined');
    return next;
  }

  async cancel(userId: string, callId: string) {
    const call = await this.require(callId);
    if (call.callerId !== userId) throw new CallError(403, 'FORBIDDEN', 'Only the caller can cancel.');
    return this.finish(call, 'CANCELLED', 'cancelled', 'CALL_ENDED');
  }

  async end(userId: string, callId: string) {
    const call = await this.require(callId);
    if (userId !== call.callerId && userId !== call.receiverId) throw new CallError(403, 'FORBIDDEN', 'This call is not yours.');
    return this.finish(call, 'ENDED', 'hangup', 'CALL_ENDED');
  }

  async incoming(userId: string) {
    return this.store.incoming(userId);
  }

  async markConnected(callId: string) {
    const call = await this.require(callId);
    if (call.status === 'CONNECTED') return call;
    if (call.status === 'ACCEPTED') await this.move(call, 'CONNECTING', null);
    const current = await this.require(callId);
    if (current.status !== 'CONNECTING' && current.status !== 'ACCEPTED') return current;
    const next = await this.move(current.status === 'ACCEPTED' ? current : { ...current, status: 'CONNECTING' }, 'CONNECTED', null);
    logger.info('call connected', { callId });
    return next;
  }

  async onParticipantLeft(callId: string) {
    const call = await this.require(callId);
    if (call.status !== 'CONNECTED' && call.status !== 'CONNECTING') return;
    await this.redis.set(`call:left:${callId}`, '1', 'EX', this.config.reconnectGraceSeconds);
  }

  async sweep() {
    const missed = await this.store.expireRinging(this.config.ringTimeoutSeconds);
    for (const id of missed) {
      logger.info('call missed', { callId: id });
      await this.redis.incr('metrics:calls_missed');
      const call = await this.store.get(id);
      if (call) await this.notifyMissed(call);
    }
    const keys = await this.redis.keys('call:left:*');
    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl > 0) continue;
      const callId = key.slice('call:left:'.length);
      const call = await this.store.get(callId);
      if (call && (call.status === 'CONNECTED' || call.status === 'CONNECTING')) {
        await this.finish(call, 'ENDED', 'disconnect', 'CALL_ENDED');
      }
    }
  }

  async reconcile(callId: string) {
    const outcome = await this.store.reconcile(callId, this.config.billingIntervalSeconds);
    logger.info('billing reconciliation', { callId, outcome });
    if (outcome === 'insufficient') {
      const call = await this.store.get(callId);
      if (call && (call.status === 'CONNECTED' || call.status === 'CONNECTING')) {
        await this.finish(call, 'ENDED', 'insufficient_balance', 'CALL_ENDED');
      }
    }
    return outcome;
  }

  private async require(id: string): Promise<CallRecord> {
    const call = await this.store.get(id);
    if (!call) throw new CallError(404, 'NOT_FOUND', 'This call is not available.');
    return call;
  }

  private async move(call: CallRecord, to: CallStatus, reason: string | null): Promise<CallRecord> {
    if (!canTransition(call.status, to)) throw new CallError(409, 'INVALID_STATE', 'This call can no longer change.');
    const next = await this.store.transition(call.id, call.status, to, reason);
    if (!next) throw new CallError(409, 'INVALID_STATE', 'This call can no longer change.');
    return next;
  }

  private async finish(call: CallRecord, to: Extract<CallStatus, 'ENDED' | 'DECLINED' | 'MISSED' | 'CANCELLED' | 'FAILED'>, reason: string, notice: PushMessage['type']) {
    if (call.status === 'ENDED' || call.status === 'DECLINED' || call.status === 'MISSED' || call.status === 'CANCELLED' || call.status === 'FAILED') {
      return call;
    }
    const next = await this.move(call, to, reason);
    await this.media.endRoom(next.roomName).catch(() => undefined);
    await this.store.reconcile(next.id, this.config.billingIntervalSeconds).catch((error: unknown) => {
      logger.error('billing reconciliation failed', { callId: next.id, message: error instanceof Error ? error.message : 'failed' });
    });
    const target = to === 'DECLINED' || to === 'MISSED' ? next.callerId : next.callerId === call.callerId ? next.receiverId : next.callerId;
    await this.notify({
      userId: target,
      type: notice,
      title: 'Call update',
      body: to === 'MISSED' ? 'You missed a call.' : 'The call has ended.',
      data: { callId: next.id },
    }).catch(() => undefined);
    logger.info('call ended', { callId: next.id, status: to });
    return next;
  }

  private async notifyMissed(call: CallRecord) {
    await this.notify({
      userId: call.callerId,
      type: 'CALL_MISSED',
      title: 'Missed call',
      body: 'The call was not answered.',
      data: { callId: call.id },
    }).catch(() => undefined);
  }
}
