import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { AuthError } from '../modules/auth/auth.errors.js';
import { ProfileError } from '../modules/profile/profile.errors.js';
import { logger } from '../utils/logger.js';

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const requestId = response.locals.requestId as string | undefined;
  const message = error instanceof Error ? error.message : 'Unknown error';
  const code = error instanceof AuthError || error instanceof ProfileError ? error.code : error instanceof ZodError ? 'VALIDATION_ERROR' : 'AUTH_UNAVAILABLE';
  response.locals.auditError = { code, message };

  if (error instanceof AuthError) {
    logger.error(error.code, { requestId, path: request.path, message: error.message, status: error.status });
    response.setHeader('X-Request-Id', requestId ?? '');
    if (error.retryAfterSeconds) {
      response.setHeader('Retry-After', String(error.retryAfterSeconds));
    }
    response.status(error.status).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (error instanceof ProfileError) {
    logger.error(error.code, { requestId, path: request.path, message: error.message, status: error.status });
    response.status(error.status).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (error instanceof ZodError) {
    logger.error('VALIDATION_ERROR', { requestId, path: request.path, message });
    if (request.path.startsWith('/v1/profile') || request.path.startsWith('/v1/interests')) {
      response.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Check the information and try again.' },
      });
      return;
    }
    const invalidOtp = error.issues.some((issue) => issue.path.includes('otp'));
    response.status(400).json({
      error: invalidOtp
        ? { code: 'INVALID_OTP', message: 'That code is not valid. Try again.' }
        : {
            code: 'INVALID_DESTINATION',
            message: 'Check the information and try again.',
          },
    });
    return;
  }

  logger.error('Unhandled error', {
    requestId,
    path: request.path,
    message: error instanceof Error ? error.message : 'Unknown error',
  });
  response.status(500).json({
    error: {
      code: 'AUTH_UNAVAILABLE',
      message: 'Something went wrong. Please try again.',
    },
  });
};
