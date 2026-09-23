import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

import type { NodeEnv } from '../config/env.js';

export const requestContext: RequestHandler = (request, response, next) => {
  const header = request.header('x-request-id');
  response.locals.requestId = header && header.length <= 100 ? header : randomUUID();
  response.setHeader('X-Request-Id', response.locals.requestId);
  next();
};

export function requireHttps(nodeEnv: NodeEnv): RequestHandler {
  return (request, response, next) => {
    if (nodeEnv === 'development') {
      next();
      return;
    }

    const forwarded = request.header('x-forwarded-proto');
    if (request.secure || forwarded === 'https') {
      next();
      return;
    }

    response.status(403).json({
      error: {
        code: 'AUTH_UNAVAILABLE',
        message: 'Something went wrong. Please try again.',
      },
    });
  };
}

export function clientIp(request: { ip?: string; header: (name: string) => string | undefined }): string {
  return request.ip || request.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
