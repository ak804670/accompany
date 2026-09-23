import { Router } from 'express';

import type { AuthService } from './auth.service.js';
import { createAuthController } from './auth.controller.js';

export function createAuthRouter(authService: AuthService) {
  const controller = createAuthController(authService);
  const router = Router();

  router.post('/request-otp', controller.requestOtp);
  router.post('/verify-otp', controller.verifyOtp);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  router.get('/session', controller.session);

  return router;
}
