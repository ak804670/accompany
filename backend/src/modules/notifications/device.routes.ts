import { Router } from 'express';

import { AuthError } from '../auth/auth.errors.js';
import type { AuthService } from '../auth/auth.service.js';
import type { DeviceStore } from './device.store.js';

function bearer(header: string | undefined): string {
  if (!header?.startsWith('Bearer ')) {
    throw new AuthError('SESSION_EXPIRED', 401);
  }
  return header.slice('Bearer '.length).trim();
}

export function createDeviceRouter(auth: AuthService, store: DeviceStore) {
  const router = Router();

  async function userId(header: string | undefined): Promise<string> {
    const session = await auth.session(bearer(header));
    return session.user.id;
  }

  router.post('/', async (request, response, next) => {
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
      next(error);
    }
  });

  router.delete('/current', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const token = typeof request.body?.token === 'string'
        ? request.body.token.trim()
        : typeof request.query.token === 'string'
          ? request.query.token.trim()
          : '';
      if (token) {
        await store.deactivateUserToken(id, token);
      }
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      await store.deactivateToken(id, request.params.id);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
