import { z } from 'zod';

import { AuthError } from './auth.errors.js';
import type { AuthChannel } from './auth.types.js';

const e164 = /^\+[1-9]\d{7,14}$/;

export function normalizeDestination(channel: AuthChannel, destination: string): string {
  const value = destination.trim();

  if (channel === 'email') {
    const email = value.toLowerCase();

    if (!z.string().email().safeParse(email).success || email.length > 320) {
      throw new AuthError('INVALID_DESTINATION', 400);
    }

    return email;
  }

  const compact = value.replace(/[\s()-]/g, '');

  if (!e164.test(compact)) {
    throw new AuthError('INVALID_DESTINATION', 400);
  }

  return compact;
}

export const requestOtpSchema = z.object({
  channel: z.enum(['phone', 'email']),
  destination: z.string().trim().min(1).max(320),
});

export const verifyOtpSchema = z.object({
  channel: z.enum(['phone', 'email']),
  destination: z.string().trim().min(1).max(320),
  otp: z.string().regex(/^\d{6}$/),
  device: z
    .object({
      deviceIdentifier: z.string().trim().min(1).max(200),
      platform: z.string().trim().min(1).max(32),
      appVersion: z.string().trim().max(32).optional(),
    })
    .optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().trim().min(20).max(500),
});

export const logoutSchema = z.object({
  refreshToken: z.string().trim().min(20).max(500).optional(),
});
