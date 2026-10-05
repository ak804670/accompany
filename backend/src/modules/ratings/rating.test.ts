import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { describe, it } from 'node:test';
import express from 'express';
import type { Pool } from 'pg';

import { createRatingRouter } from './rating.routes.js';
import type { AuthService } from '../auth/auth.service.js';
import { RatingRepository } from './rating.repository.js';

describe('rating repository and routes', () => {
  it('creates ratings, calculates summary, and orders by stars or date', async () => {
    const memoryRatings: Array<{
      id: string;
      call_id: string | null;
      rater_id: string;
      rated_user_id: string;
      rating: number;
      comment: string | null;
      created_at: Date;
      updated_at: Date;
    }> = [];

    const mockPool = {
      async query(sql: string, params?: unknown[]) {
        const queryText = sql.trim();

        if (queryText.includes('INSERT INTO acc.t_user_ratings')) {
          const isCallConflict = queryText.includes('ON CONFLICT (call_id, rater_id)');
          const callId = isCallConflict ? (params?.[0] as string) : null;
          const raterId = (isCallConflict ? params?.[1] : params?.[0]) as string;
          const ratedUserId = (isCallConflict ? params?.[2] : params?.[1]) as string;
          const rating = Number(isCallConflict ? params?.[3] : params?.[2]);
          const comment = (isCallConflict ? params?.[4] : params?.[3]) as string | null;

          if (callId) {
            const existing = memoryRatings.find((r) => r.call_id === callId && r.rater_id === raterId);
            if (existing) {
              existing.rating = rating;
              existing.comment = comment;
              existing.updated_at = new Date();
              return { rows: [existing] };
            }
          }

          const record = {
            id: `rating-${memoryRatings.length + 1}`,
            call_id: callId,
            rater_id: raterId,
            rated_user_id: ratedUserId,
            rating,
            comment,
            created_at: new Date(Date.now() + memoryRatings.length * 1000),
            updated_at: new Date(),
          };
          memoryRatings.push(record);
          return { rows: [record] };
        }

        if (queryText.includes('SELECT COALESCE(ROUND(AVG(rating)')) {
          const targetId = params?.[0] as string;
          const userRatings = memoryRatings.filter((r) => r.rated_user_id === targetId);
          if (userRatings.length === 0) {
            return { rows: [{ avg_rating: 0, count_rating: 0 }] };
          }
          const sum = userRatings.reduce((acc, r) => acc + r.rating, 0);
          const avg = Math.round((sum / userRatings.length) * 10) / 10;
          return { rows: [{ avg_rating: avg, count_rating: userRatings.length }] };
        }

        if (queryText.includes('SELECT r.id, r.rating, r.comment, r.created_at')) {
          const targetId = params?.[0] as string;
          const limit = Number(params?.[1]) || 50;
          let list = memoryRatings.filter((r) => r.rated_user_id === targetId);

          if (queryText.includes('ORDER BY r.created_at DESC')) {
            list = [...list].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
          } else {
            // ORDER BY r.rating DESC, r.created_at DESC
            list = [...list].sort((a, b) => {
              if (b.rating !== a.rating) return b.rating - a.rating;
              return b.created_at.getTime() - a.created_at.getTime();
            });
          }

          return {
            rows: list.slice(0, limit).map((r) => ({
              id: r.id,
              rating: r.rating,
              comment: r.comment,
              created_at: r.created_at,
              rater_user_id: r.rater_id,
              rater_name: 'Test Reviewer',
              rater_media_id: null,
            })),
          };
        }

        if (queryText.includes('SELECT 1 FROM acc.t_calls')) {
          return { rows: [{ '1': 1 }] };
        }

        return { rows: [] };
      },
    } as unknown as Pool;

    const repo = new RatingRepository(mockPool);

    // 1. Create rating
    const r1 = await repo.create({
      raterId: '00000000-0000-0000-0000-000000000001',
      ratedUserId: '00000000-0000-0000-0000-000000000002',
      rating: 4,
      comment: 'Good conversation',
    });
    assert.equal(r1.rating, 4);
    assert.equal(r1.comment, 'Good conversation');

    // 2. Create another rating with 5 stars
    const r2 = await repo.create({
      raterId: '00000000-0000-0000-0000-000000000003',
      ratedUserId: '00000000-0000-0000-0000-000000000002',
      rating: 5,
      comment: 'Awesome call!',
    });
    assert.equal(r2.rating, 5);

    // 3. Summary: average of 4 and 5 is 4.5, count 2
    const summary = await repo.getSummary('00000000-0000-0000-0000-000000000002');
    assert.equal(summary.averageRating, 4.5);
    assert.equal(summary.ratingCount, 2);

    // 4. List sorted by rating: 5 star must be on top
    const starSorted = await repo.listForUser('00000000-0000-0000-0000-000000000002', 'rating');
    assert.equal(starSorted[0].rating, 5);
    assert.equal(starSorted[1].rating, 4);

    // 5. List sorted by date: newest first
    const dateSorted = await repo.listForUser('00000000-0000-0000-0000-000000000002', 'date');
    assert.equal(dateSorted[0].id, r2.id);
  });

  it('validates HTTP inputs on rating submission and list', async () => {
    const auth = {
      async session(token: string) {
        if (token !== 'good-token') {
          throw Object.assign(new Error('expired'), { code: 'SESSION_EXPIRED', status: 401, name: 'AuthError' });
        }
        return { user: { id: '00000000-0000-0000-0000-000000000001' } };
      },
    };

    const mockPool = {
      async query(sql: string) {
        if (sql.includes('INSERT INTO acc.t_user_ratings')) {
          return {
            rows: [
              {
                id: 'r-1',
                call_id: null,
                rater_id: '00000000-0000-0000-0000-000000000001',
                rated_user_id: '00000000-0000-0000-0000-000000000002',
                rating: 5,
                comment: 'Great!',
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          };
        }
        if (sql.includes('SELECT COALESCE(ROUND(AVG(rating)')) {
          return { rows: [{ avg_rating: 5, count_rating: 1 }] };
        }
        if (sql.includes('SELECT r.id, r.rating')) {
          return {
            rows: [
              {
                id: 'r-1',
                rating: 5,
                comment: 'Great!',
                created_at: new Date(),
                rater_user_id: '00000000-0000-0000-0000-000000000001',
                rater_name: 'Friend',
                rater_media_id: null,
              },
            ],
          };
        }
        return { rows: [] };
      },
    } as unknown as Pool;

    const app = express();
    app.use(express.json());
    app.use('/v1', createRatingRouter(auth as unknown as AuthService, mockPool));
    app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const status = (err as { status?: number })?.status || 500;
      res.status(status).json({ error: { message: (err as Error).message } });
    });

    const server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // Missing auth
      const noAuth = await fetch(`${baseUrl}/v1/ratings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ratedUserId: '00000000-0000-0000-0000-000000000002', rating: 5 }),
      });
      assert.equal(noAuth.status, 401);

      // Self rating rejected
      const selfRate = await fetch(`${baseUrl}/v1/ratings`, {
        method: 'POST',
        headers: { authorization: 'Bearer good-token', 'content-type': 'application/json' },
        body: JSON.stringify({ ratedUserId: '00000000-0000-0000-0000-000000000001', rating: 5 }),
      });
      assert.equal(selfRate.status, 400);

      // Invalid rating number (< 1 or > 5)
      const invalidRating = await fetch(`${baseUrl}/v1/ratings`, {
        method: 'POST',
        headers: { authorization: 'Bearer good-token', 'content-type': 'application/json' },
        body: JSON.stringify({ ratedUserId: '00000000-0000-0000-0000-000000000002', rating: 6 }),
      });
      assert.equal(invalidRating.status, 400);

      // Valid rating creation
      const validRate = await fetch(`${baseUrl}/v1/ratings`, {
        method: 'POST',
        headers: { authorization: 'Bearer good-token', 'content-type': 'application/json' },
        body: JSON.stringify({
          ratedUserId: '00000000-0000-0000-0000-000000000002',
          rating: 5,
          comment: 'Great!',
        }),
      });
      assert.equal(validRate.status, 201);
      const createdData = (await validRate.json()) as { ok: boolean; rating: { rating: number } };
      assert.equal(createdData.ok, true);
      assert.equal(createdData.rating.rating, 5);

      // Fetch ratings for user
      const list = await fetch(`${baseUrl}/v1/users/00000000-0000-0000-0000-000000000002/ratings?sort=rating`, {
        headers: { authorization: 'Bearer good-token' },
      });
      assert.equal(list.status, 200);
      const listData = (await list.json()) as { averageRating: number; ratings: Array<{ rating: number }> };
      assert.equal(listData.averageRating, 5);
      assert.equal(listData.ratings.length, 1);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  });
});
