import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { AuthError } from '../modules/auth/auth.errors.js';
import { logger } from '../utils/logger.js';

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const requestId = response.locals.requestId as string | undefined;

  if (error instanceof AuthError) {
    response.setHeader('X-Request-Id', requestId ?? '');
    if (error.retryAfterSeconds) {
      response.setHeader('Retry-After', String(error.retryAfterSeconds));
    }
    response.status(error.status).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (error instanceof ZodError) {
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

  logger.error('Unhandled error', { requestId, path: request.path });
  response.status(500).json({
    error: {
      code: 'AUTH_UNAVAILABLE',
      message: 'Something went wrong. Please try again.',
    },
  });
};
