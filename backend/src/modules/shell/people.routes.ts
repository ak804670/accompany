import { Router } from 'express';
import type { Pool } from 'pg';

import { AuthError } from '../auth/auth.errors.js';
import type { AuthService } from '../auth/auth.service.js';
import type { MediaStorage } from '../profile/media-storage.js';

const pageSize = 30;

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

export function createShellRouter(auth: AuthService, pool: Pool, media?: MediaStorage) {
  const router = Router();

  async function userId(header: string | undefined): Promise<string> {
    const session = await auth.session(bearer(header));
    return session.user.id;
  }

  router.post('/presence', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      await pool.query(
        `INSERT INTO acc.presence (user_id, last_seen_at) VALUES ($1, NOW())
         ON CONFLICT (user_id) DO UPDATE SET last_seen_at = NOW()`,
        [id],
      );
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.get('/people/online', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const cursor = typeof request.query.cursor === 'string' ? request.query.cursor : null;
      const result = await pool.query(
        `SELECT p.user_id, pr.display_name, pr.date_of_birth, pr.bio, media.id AS media_id, p.last_seen_at
         FROM acc.presence p
         JOIN acc.m_profiles pr ON pr.user_id = p.user_id AND pr.deleted_at IS NULL
         LEFT JOIN LATERAL (
           SELECT id FROM acc.m_profile_media
           WHERE user_id = p.user_id AND is_primary AND deleted_at IS NULL
           LIMIT 1
         ) media ON TRUE
         WHERE p.user_id <> $1
           AND pr.profile_status = 'active'
           AND p.last_seen_at > NOW() - INTERVAL '45 seconds'
           AND ($2::timestamptz IS NULL OR p.last_seen_at < $2::timestamptz)
         ORDER BY p.last_seen_at DESC
         LIMIT $3`,
        [id, cursor, pageSize + 1],
      );
      const rows = result.rows.slice(0, pageSize);
      const nextCursor = result.rows.length > pageSize ? rows.at(-1)?.last_seen_at?.toISOString?.() ?? null : null;
      response.json({
        people: rows.map((row) => ({
          userId: row.user_id,
          name: String(row.display_name).trim(),
          age: ageFrom(row.date_of_birth),
          bio: row.bio,
          mediaId: row.media_id,
          online: true,
        })),
        nextCursor,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/people/:userId', async (request, response, next) => {
    try {
      await userId(request.header('authorization'));
      const result = await pool.query(
        `SELECT pr.user_id, pr.display_name, pr.date_of_birth, pr.bio, media.id AS media_id,
                (presence.last_seen_at > NOW() - INTERVAL '45 seconds') AS online
         FROM acc.m_profiles pr
         LEFT JOIN acc.presence presence ON presence.user_id = pr.user_id
         LEFT JOIN LATERAL (
           SELECT id FROM acc.m_profile_media
           WHERE user_id = pr.user_id AND is_primary AND deleted_at IS NULL
           LIMIT 1
         ) media ON TRUE
         WHERE pr.user_id = $1 AND pr.deleted_at IS NULL AND pr.profile_status = 'active'`,
        [request.params.userId],
      );
      const row = result.rows[0];
      if (!row) {
        response.status(404).json({ error: { code: 'NOT_FOUND', message: 'This person is not available.' } });
        return;
      }
      response.json({
        person: {
          userId: row.user_id,
          name: String(row.display_name).trim(),
          age: ageFrom(row.date_of_birth),
          bio: row.bio,
          mediaId: row.media_id,
          online: Boolean(row.online),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/people/:userId/photo', async (request, response, next) => {
    try {
      await userId(request.header('authorization'));
      if (!media) {
        response.status(404).end();
        return;
      }
      const result = await pool.query(
        `SELECT storage_key FROM acc.m_profile_media
         WHERE user_id = $1 AND is_primary AND deleted_at IS NULL AND moderation_status <> 'rejected'
         LIMIT 1`,
        [request.params.userId],
      );
      const key = result.rows[0]?.storage_key as string | undefined;
      if (!key) {
        response.status(404).end();
        return;
      }
      const bytes = await media.read(key);
      response.setHeader('Content-Type', contentTypeForKey(key));
      response.setHeader('Cache-Control', 'private, max-age=60');
      response.send(bytes);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function ageFrom(value: Date | string | null): number | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const today = new Date();
  let age = today.getUTCFullYear() - date.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < date.getUTCMonth() ||
    (today.getUTCMonth() === date.getUTCMonth() && today.getUTCDate() < date.getUTCDate());
  if (beforeBirthday) {
    age -= 1;
  }
  return age;
}

function contentTypeForKey(key: string): string {
  if (key.endsWith('.png')) return 'image/png';
  if (key.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export { ageFrom };
