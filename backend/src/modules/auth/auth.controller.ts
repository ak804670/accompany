import type { RequestHandler } from 'express';

import { clientIp } from '../../middleware/request-context.js';
import type { AuthService } from './auth.service.js';
import { logoutSchema, refreshSchema, requestOtpSchema, verifyOtpSchema } from './auth.validation.js';

function bearer(header: string | undefined): string | undefined {
  if (!header?.startsWith('Bearer ')) {
    return undefined;
  }

  return header.slice('Bearer '.length).trim() || undefined;
}

export function createAuthController(authService: AuthService) {
  const requestOtp: RequestHandler = async (request, response) => {
    const body = requestOtpSchema.parse(request.body);
    const result = await authService.requestOtp(body.channel, body.destination, {
      ip: clientIp(request),
      requestId: response.locals.requestId as string,
    });
    response.status(200).json(result);
  };

  const verifyOtp: RequestHandler = async (request, response) => {
    const body = verifyOtpSchema.parse(request.body);
    const result = await authService.verifyOtp(body.channel, body.destination, body.otp, body.device, {
      ip: clientIp(request),
      requestId: response.locals.requestId as string,
    });
    response.status(200).json({
      user: result.user,
      session: result.session,
    });
  };

  const refresh: RequestHandler = async (request, response) => {
    const body = refreshSchema.parse(request.body);
    const result = await authService.refresh(body.refreshToken, {
      ip: clientIp(request),
      requestId: response.locals.requestId as string,
    });
    response.status(200).json(result);
  };

  const logout: RequestHandler = async (request, response) => {
    const body = logoutSchema.parse(request.body ?? {});
    await authService.logout(
      { accessToken: bearer(request.header('authorization')), refreshToken: body.refreshToken },
      { ip: clientIp(request), requestId: response.locals.requestId as string },
    );
    response.status(204).send();
  };

  const session: RequestHandler = async (request, response) => {
    const accessToken = bearer(request.header('authorization'));
    if (!accessToken) {
      response.status(401).json({
        error: { code: 'SESSION_EXPIRED', message: 'Your session has expired. Sign in again.' },
      });
      return;
    }

    const result = await authService.session(accessToken);
    response.status(200).json(result);
  };

  return { requestOtp, verifyOtp, refresh, logout, session };
}
