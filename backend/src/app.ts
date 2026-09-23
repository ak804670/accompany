import express from 'express';

import type { NodeEnv } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestContext, requireHttps } from './middleware/request-context.js';
import type { AuthService } from './modules/auth/auth.service.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createCommunicationWebhookRouter } from './modules/communications/webhooks/routes.js';
import type { CommunicationStore } from './modules/communications/store.js';

export type AppDependencies = {
  authService: AuthService;
  nodeEnv: NodeEnv;
  communicationWebhooks?: {
    store: CommunicationStore;
    mailjetSecret?: string;
    textbeeSecret?: string;
  };
};

export function createApp(deps: AppDependencies) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', deps.nodeEnv === 'development' ? false : 1);
  app.use(express.json({ limit: '16kb' }));
  app.use(requestContext);
  app.use(requireHttps(deps.nodeEnv));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/v1/auth', createAuthRouter(deps.authService));
  if (deps.communicationWebhooks) {
    app.use(createCommunicationWebhookRouter(deps.communicationWebhooks));
  }
  app.use(errorHandler);

  return app;
}
