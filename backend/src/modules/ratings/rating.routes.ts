import { Router } from 'express';
import type { Pool } from 'pg';
import { AuthError } from '../auth/auth.errors.js';
import type { AuthService } from '../auth/auth.service.js';
import { RatingRepository } from './rating.repository.js';

function bearer(header: string | undefined): string {
  if (!header?.startsWith('Bearer ')) {
    throw new AuthError('SESSION_EXPIRED', 401);
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    throw new AuthError('SESSION_EXPIRED', 401);
  }
  return token;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createRatingRouter(auth: AuthService, pool: Pool) {
  const router = Router();
  const repository = new RatingRepository(pool);

  async function userId(header: string | undefined): Promise<string> {
    const session = await auth.session(bearer(header));
    return session.user.id;
  }

  router.post('/ratings', async (request, response, next) => {
    try {
      const raterId = await userId(request.header('authorization'));
      const ratedUserId = typeof request.body?.ratedUserId === 'string' ? request.body.ratedUserId.trim() : '';
      const rawRating = Number(request.body?.rating);
      const comment = typeof request.body?.comment === 'string' ? request.body.comment.trim() : null;
      const callId = typeof request.body?.callId === 'string' && request.body.callId.trim() ? request.body.callId.trim() : null;

      if (!ratedUserId || !UUID_REGEX.test(ratedUserId)) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose a valid person to rate.' } });
        return;
      }

      if (ratedUserId === raterId) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'You cannot rate yourself.' } });
        return;
      }

      if (!Number.isInteger(rawRating) || rawRating < 1 || rawRating > 5) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Rating must be between 1 and 5 stars.' } });
        return;
      }

      if (comment && comment.length > 1000) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Comment cannot exceed 1000 characters.' } });
        return;
      }

      if (callId) {
        if (!UUID_REGEX.test(callId)) {
          response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid call ID.' } });
          return;
        }
        const validCall = await repository.verifyCallParticipants(callId, raterId, ratedUserId);
        if (!validCall) {
          response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Call does not match these participants.' } });
          return;
        }
      }

      const rating = await repository.create({
        callId,
        raterId,
        ratedUserId,
        rating: rawRating,
        comment,
      });

      const summary = await repository.getSummary(ratedUserId);

      response.status(201).json({
        ok: true,
        rating,
        summary,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/users/:userId/ratings', async (request, response, next) => {
    try {
      await userId(request.header('authorization'));
      const targetUserId = request.params.userId;
      if (!targetUserId || !UUID_REGEX.test(targetUserId)) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID.' } });
        return;
      }

      const sort = request.query.sort === 'date' ? 'date' : 'rating';
      const limit = Math.min(Math.max(1, Number(request.query.limit) || 50), 100);

      const [summary, ratings] = await Promise.all([
        repository.getSummary(targetUserId),
        repository.listForUser(targetUserId, sort, limit),
      ]);

      response.json({
        averageRating: summary.averageRating,
        ratingCount: summary.ratingCount,
        ratings,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
