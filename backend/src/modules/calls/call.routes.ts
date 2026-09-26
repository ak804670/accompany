import { Router } from 'express';
import { WebhookReceiver } from 'livekit-server-sdk';

import { AuthError } from '../auth/auth.errors.js';
import type { AuthService } from '../auth/auth.service.js';
import type { CallConfig } from './call-config.js';
import { CallError, CallService } from './call.service.js';
import type { PgCallStore } from './call.store.js';
import { logger } from '../../utils/logger.js';

function bearer(header: string | undefined): string {
  if (!header?.startsWith('Bearer ')) throw new AuthError('SESSION_EXPIRED', 401);
  const token = header.slice('Bearer '.length).trim();
  if (!token) throw new AuthError('SESSION_EXPIRED', 401);
  return token;
}

function publicCall(call: { id: string; callType: string; status: string; roomName: string; rateSnapshot: number; createdAt: Date; callerId: string; receiverId: string; durationSeconds?: number; conversationId?: string | null; endedAt?: Date | null }) {
  return {
    id: call.id,
    callType: call.callType,
    status: call.status,
    roomName: call.roomName,
    rate: call.rateSnapshot,
    createdAt: call.createdAt,
    callerId: call.callerId,
    receiverId: call.receiverId,
    durationSeconds: call.durationSeconds ?? 0,
    conversationId: call.conversationId ?? null,
    endedAt: call.endedAt ?? null,
  };
}

function pageLimit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 25;
  return Math.min(parsed, 30);
}

function parseCursor(value: unknown): { at: string; id: string } | null {
  if (value === undefined) return null;
  if (typeof value !== 'string') return null;
  const [at, id] = value.split('|');
  if (!at || !id || Number.isNaN(Date.parse(at)) || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw new CallError(400, 'VALIDATION_ERROR', 'That page is not available.');
  }
  return { at, id };
}

export function createCallRouter(auth: AuthService, calls: CallService, store: PgCallStore) {
  const router = Router();

  async function userId(header: string | undefined): Promise<string> {
    const session = await auth.session(bearer(header));
    return session.user.id;
  }

  router.post('/calls', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const personId = typeof request.body?.personId === 'string' ? request.body.personId : '';
      const kind = request.body?.kind === 'video' ? 'VIDEO' : request.body?.kind === 'audio' ? 'AUDIO' : '';
      const conversationId = typeof request.body?.conversationId === 'string' ? request.body.conversationId : null;
      if (!personId || !kind) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose a call type.' } });
        return;
      }
      const result = await calls.create(id, personId, kind, conversationId);
      response.status(201).json({ call: publicCall(result.call), token: result.token, url: result.url });
    } catch (error) {
      sendCallError(error, response, next);
    }
  });

  router.get('/calls', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const personId = typeof request.query.personId === 'string' ? request.query.personId : '';
      if (!personId) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose a person.' } });
        return;
      }
      const calls = await store.history(id, personId);
      response.json({ calls: calls.map(publicCall) });
    } catch (error) {
      sendCallError(error, response, next);
    }
  });

  router.get('/calls/recent', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const limit = pageLimit(request.query.limit);
      const cursor = parseCursor(request.query.cursor);
      const rows = await store.recent(id, cursor, limit + 1, request.query.filter === 'missed');
      const page = rows.slice(0, limit);
      const last = page.at(-1);
      response.json({
        calls: page.map((call) => ({
          id: call.id,
          callType: call.callType,
          status: call.status,
          createdAt: call.createdAt,
          callerId: call.callerId,
          receiverId: call.receiverId,
          durationSeconds: call.durationSeconds,
          conversationId: call.conversationId,
          personId: call.personId,
          name: call.name,
        })),
        nextCursor: rows.length > limit && last ? `${last.createdAt.toISOString()}|${last.id}` : null,
      });
    } catch (error) {
      sendCallError(error, response, next);
    }
  });

  router.get('/calls/incoming', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const call = await calls.incoming(id);
      response.json({ call: call ? publicCall(call) : null });
    } catch (error) {
      sendCallError(error, response, next);
    }
  });

  router.post('/calls/:id/accept', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const result = await calls.accept(id, request.params.id);
      response.json({ call: publicCall(result.call), token: result.token, url: result.url });
    } catch (error) {
      sendCallError(error, response, next);
    }
  });

  router.post('/calls/:id/decline', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      response.json({ call: publicCall(await calls.decline(id, request.params.id)) });
    } catch (error) {
      sendCallError(error, response, next);
    }
  });

  router.post('/calls/:id/cancel', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      response.json({ call: publicCall(await calls.cancel(id, request.params.id)) });
    } catch (error) {
      sendCallError(error, response, next);
    }
  });

  router.post('/calls/:id/end', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      response.json({ call: publicCall(await calls.end(id, request.params.id)) });
    } catch (error) {
      sendCallError(error, response, next);
    }
  });

  router.post('/devices', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const platform = request.body?.platform === 'ios' || request.body?.platform === 'android' ? request.body.platform : '';
      const token = typeof request.body?.token === 'string' ? request.body.token.trim() : '';
      if (!platform || !token) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose a device.' } });
        return;
      }
      await store.saveToken(id, platform, token);
      response.status(204).end();
    } catch (error) {
      sendCallError(error, response, next);
    }
  });

  router.delete('/devices/:id', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      await store.deactivateToken(id, request.params.id);
      response.status(204).end();
    } catch (error) {
      sendCallError(error, response, next);
    }
  });

  return router;
}

export function createLiveKitWebhook(config: CallConfig, calls: CallService, store: PgCallStore) {
  const receiver = new WebhookReceiver(config.livekitApiKey, config.livekitApiSecret);
  const router = Router();
  router.post('/livekit', async (request, response, next) => {
    try {
      const raw = Buffer.isBuffer(request.body) ? request.body.toString('utf8') : '';
      const event = await receiver.receive(raw, request.header('authorization'));
      const eventId = event.id || `${event.event}:${event.room?.name ?? ''}:${event.createdAt ?? ''}`;
      const room = event.room?.name ?? '';
      const call = room ? await store.byRoom(room) : null;
      const fresh = await store.claimWebhook(eventId, event.event, call?.id ?? null);
      logger.info('livekit webhook received', { event: event.event, callId: call?.id ?? null, fresh });
      if (fresh && call) {
        if (event.event === 'participant_joined') await calls.markConnected(call.id);
        if (event.event === 'participant_left') await calls.onParticipantLeft(call.id);
        if (event.event === 'room_finished') await calls.end(call.callerId, call.id).catch(() => undefined);
      }
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });
  return router;
}

function sendCallError(error: unknown, response: { status: (code: number) => { json: (body: unknown) => void } }, next: (error: unknown) => void) {
  if (error instanceof CallError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  next(error);
}
