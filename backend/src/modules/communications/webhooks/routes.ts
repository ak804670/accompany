import { createHash, timingSafeEqual } from 'node:crypto';

import { Router } from 'express';

import { logger } from '../../../utils/logger.js';
import type { CommunicationStore } from '../store.js';
import { normalizeMailjetEvent, normalizeTextBeeEvent } from './normalize.js';

function authorized(provided: string | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) {
    return false;
  }
  const left = createHash('sha256').update(provided).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}

export function createCommunicationWebhookRouter(input: {
  store: CommunicationStore;
  mailjetSecret?: string;
  textbeeSecret?: string;
}) {
  const router = Router();

  router.post('/webhooks/email/:provider', async (request, response) => {
    if (request.params.provider !== 'mailjet') {
      response.status(404).json({ error: { code: 'UNKNOWN_PROVIDER', message: 'Unknown email provider.' } });
      return;
    }
    if (!authorized(request.header('x-webhook-secret'), input.mailjetSecret)) {
      response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized.' } });
      return;
    }
    const events = normalizeMailjetEvent(request.body);
    for (const event of events) {
      await input.store.markDelivered({
        communicationId: event.communicationId,
        provider: event.provider,
        providerMessageId: event.providerMessageId,
        providerStatus: event.status,
        at: new Date(),
      });
      logger.info('communication webhook', {
        provider: event.provider,
        providerStatus: event.providerStatus,
        status: event.status,
        providerMessageId: event.providerMessageId,
      });
    }
    response.json({ received: events.length });
  });

  router.post('/webhooks/sms/:provider', async (request, response) => {
    if (request.params.provider !== 'textbee') {
      response.status(404).json({ error: { code: 'UNKNOWN_PROVIDER', message: 'Unknown SMS provider.' } });
      return;
    }
    if (!authorized(request.header('x-webhook-secret'), input.textbeeSecret)) {
      response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized.' } });
      return;
    }
    const events = normalizeTextBeeEvent(request.body);
    for (const event of events) {
      await input.store.markDelivered({
        communicationId: event.communicationId,
        provider: event.provider,
        providerMessageId: event.providerMessageId,
        providerStatus: event.status,
        at: new Date(),
      });
      logger.info('communication webhook', {
        provider: event.provider,
        providerStatus: event.providerStatus,
        status: event.status,
        providerMessageId: event.providerMessageId,
      });
    }
    response.json({ received: events.length });
  });

  return router;
}
