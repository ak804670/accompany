import express from 'express';

import type { NodeEnv } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestContext, requireHttps } from './middleware/request-context.js';
import type { AuthService } from './modules/auth/auth.service.js';
import type { ProfileService } from './modules/profile/profile.service.js';
import { createInterestRouter, createProfileRouter } from './modules/profile/profile.routes.js';
import { createConversationRouter } from './modules/shell/conversations.routes.js';
import { createShellRouter } from './modules/shell/people.routes.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createRatingRouter } from './modules/ratings/rating.routes.js';
import { createCommunicationWebhookRouter } from './modules/communications/webhooks/routes.js';
import type { MediaStorage } from './modules/profile/media-storage.js';
import type { AuditEntry } from './modules/audit/audit-log.js';
import type { CommunicationStore } from './modules/communications/store.js';
import type { Router } from 'express';

export type AppDependencies = {
  authService: AuthService;
  profileService?: ProfileService;
  nodeEnv: NodeEnv;
  communicationWebhooks?: {
    store: CommunicationStore;
    mailjetSecret?: string;
    textbeeSecret?: string;
  };
  audit?: (entry: AuditEntry) => void;
  pool?: import('pg').Pool;
  media?: MediaStorage;
  calls?: { router: Router; webhook: Router };
  wallet?: { router: Router; webhook: Router };
};

export function createApp(deps: AppDependencies) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', deps.nodeEnv === 'development' ? false : 1);
  app.use((request, response, next) => {
    const mediaUpload = request.method === 'POST' && request.path === '/v1/profile/media';
    if (request.method === 'POST' && (request.path === '/webhooks/livekit' || request.path === '/webhooks/payments')) {
      return express.raw({ type: '*/*', limit: '1mb' })(request, response, next);
    }
    return express.json({ limit: mediaUpload ? '4mb' : '16kb' })(request, response, next);
  });
  app.use(requestContext);
  app.use(requireHttps(deps.nodeEnv));
  if (deps.audit) {
    const audit = deps.audit;
    app.use((request, response, next) => {
      response.on('finish', () => {
        if (request.path === '/health') {
          return;
        }
        const requestId = response.locals.requestId as string | undefined;
        const segment = request.path.split('/').filter(Boolean)[1] ?? 'request';
        audit({
          action: `${request.method} ${request.path}`,
          entityType: segment,
          entityId: requestId,
          actorUserId: actorFromAuthorization(request.header('authorization')),
          metadata: {
            status: response.statusCode,
            requestId: requestId ?? null,
            error: response.locals.auditError ?? null,
          },
        });
      });
      next();
    });
  }

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/v1/auth', createAuthRouter(deps.authService));
  if (deps.calls) {
    app.use('/v1', deps.calls.router);
    app.use('/webhooks', deps.calls.webhook);
  }
  if (deps.wallet) {
    app.use('/v1', deps.wallet.router);
    app.use('/webhooks', deps.wallet.webhook);
  }
  if (deps.pool) {
    app.use('/v1', createShellRouter(deps.authService, deps.pool, deps.media));
    app.use('/v1/conversations', createConversationRouter(deps.authService, deps.pool));
    app.use('/v1', createRatingRouter(deps.authService, deps.pool));
  }
  if (deps.profileService) {
    app.use('/v1/profile', createProfileRouter(deps.profileService));
    app.use('/v1/interests', createInterestRouter(deps.profileService));
  }
  if (deps.communicationWebhooks) {
    app.use(createCommunicationWebhookRouter(deps.communicationWebhooks));
  }
  app.use(errorHandler);

  return app;
}

function actorFromAuthorization(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  const payload = header.slice('Bearer '.length).split('.')[1];
  if (!payload) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { sub?: unknown };
    return typeof decoded.sub === 'string' ? decoded.sub : null;
  } catch {
    return null;
  }
}
