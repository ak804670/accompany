import { Router } from 'express';
import express from 'express';

import { AuthError } from '../auth/auth.errors.js';
import type { ProfileService } from './profile.service.js';

function bearer(header: string | undefined): string | undefined {
  if (!header?.startsWith('Bearer ')) {
    return undefined;
  }
  return header.slice('Bearer '.length).trim() || undefined;
}

export function createProfileRouter(service: ProfileService) {
  const router = Router();

  async function userId(request: express.Request): Promise<string> {
    const token = bearer(request.header('authorization'));
    if (!token) {
      throw new AuthError('SESSION_EXPIRED', 401);
    }
    return service.viewer(token);
  }

  router.get('/', async (request, response, next) => {
    try {
      const profile = await service.get(await userId(request));
      response.json({ profile });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (request, response, next) => {
    try {
      const profile = await service.saveBasics(await userId(request), request.body);
      response.status(201).json({ profile });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/', async (request, response, next) => {
    try {
      const profile = await service.update(await userId(request), request.body);
      response.json({ profile });
    } catch (error) {
      next(error);
    }
  });

  router.put('/intent', async (request, response, next) => {
    try { response.json({ profile: await service.setIntent(await userId(request), request.body) }); }
    catch (error) { next(error); }
  });

  router.put('/role', async (request, response, next) => {
    try { response.json({ profile: await service.setRole(await userId(request), request.body) }); }
    catch (error) { next(error); }
  });

  router.post('/complete', async (request, response, next) => {
    try {
      const profile = await service.complete(await userId(request));
      response.json({ profile });
    } catch (error) {
      next(error);
    }
  });

  router.get('/interests', async (request, response, next) => {
    try {
      await userId(request);
      const search = typeof request.query.q === 'string' ? request.query.q : undefined;
      response.json({ interests: await service.interests(search) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/rates', async (request, response, next) => {
    try {
      response.json({ rates: await service.rates(await userId(request)) });
    } catch (error) {
      next(error);
    }
  });

  router.put('/rates', async (request, response, next) => {
    try {
      response.json({ rates: await service.saveRates(await userId(request), request.body) });
    } catch (error) {
      next(error);
    }
  });

  router.put('/media/order', async (request, response, next) => {
    try {
      const profile = await service.reorderMedia(await userId(request), request.body);
      response.json({ profile });
    } catch (error) {
      next(error);
    }
  });

  router.put('/interests', async (request, response, next) => {
    try {
      const profile = await service.replaceInterests(await userId(request), request.body);
      response.json({ profile });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/media',
    express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '2mb' }),
    async (request, response, next) => {
      try {
        const uploaded = mediaUpload(request);
        const profile = await service.addMedia(await userId(request), uploaded.bytes, uploaded.contentType);
        response.status(201).json({ profile });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get('/media/:id', async (request, response, next) => {
    try {
      const file = await service.readMedia(await userId(request), request.params.id);
      response.setHeader('Content-Type', file.contentType);
      response.send(file.bytes);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/media/:id', async (request, response, next) => {
    try {
      const profile = await service.removeMedia(await userId(request), request.params.id);
      response.json({ profile });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function mediaUpload(request: express.Request): { bytes: Buffer; contentType: string | undefined } {
  if (Buffer.isBuffer(request.body)) {
    return { bytes: request.body, contentType: request.header('content-type') };
  }
  const body = request.body as { data?: unknown; contentType?: unknown } | undefined;
  if (!body || typeof body.data !== 'string') {
    return { bytes: Buffer.alloc(0), contentType: undefined };
  }
  return {
    bytes: Buffer.from(body.data, 'base64'),
    contentType: typeof body.contentType === 'string' ? body.contentType : undefined,
  };
}

export function createInterestRouter(service: ProfileService) {
  const router = Router();
  router.get('/', async (request, response, next) => {
    try {
      const token = bearer(request.header('authorization'));
      if (!token) {
        throw new AuthError('SESSION_EXPIRED', 401);
      }
      await service.viewer(token);
      const search = typeof request.query.q === 'string' ? request.query.q : undefined;
      response.json({ interests: await service.interests(search) });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
