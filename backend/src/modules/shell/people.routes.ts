import { Router } from 'express';
import type { Pool } from 'pg';

import { AuthError } from '../auth/auth.errors.js';
import type { AuthService } from '../auth/auth.service.js';
import type { MediaStorage } from '../profile/media-storage.js';
import {
  parseDiscoveryLimit,
  parseRadiusKm,
  ratesFromRows,
  relationshipFrom,
  roundDistanceKm,
  toPublicPerson,
  type PersonRelationship,
  type PublicRates,
} from './discovery.js';


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

  router.put('/me/location', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const latitude = Number(request.body?.latitude);
      const longitude = Number(request.body?.longitude);
      const discovery = request.body?.discoveryEnabled !== false;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Location is not available.' } });
        return;
      }
      await pool.query(
        `UPDATE acc.m_profiles
         SET latitude = $2, longitude = $3, location_updated_at = NOW(), location_discovery = $4
         WHERE user_id = $1 AND deleted_at IS NULL`,
        [id, latitude, longitude, discovery],
      );
      response.json({ location: { discoveryEnabled: discovery } });
    } catch (error) {
      next(error);
    }
  });

  router.get(['/people/online', '/people/discover'], async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const cursor = typeof request.query.cursor === 'string' ? request.query.cursor : null;
      const pageSize = parseDiscoveryLimit(request.query.limit);
      const radius = parseRadiusKm(request.query.distance);
      if (request.query.distance !== undefined && radius === null) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose a distance of 5, 10, 25, or 50 km.' } });
        return;
      }
      const interestIds = parseUuidList(request.query.interests);
      const viewer = await pool.query(
        `SELECT latitude, longitude FROM acc.m_profiles WHERE user_id = $1 AND location_discovery`,
        [id],
      );
      const viewerLat = viewer.rows[0]?.latitude ?? null;
      const viewerLng = viewer.rows[0]?.longitude ?? null;
      if (radius !== null && (viewerLat === null || viewerLng === null)) {
        response.status(400).json({ error: { code: 'LOCATION_REQUIRED', message: 'Turn on location to see people nearby.' } });
        return;
      }
      const radiusMeters = radius === null ? null : radius * 1000;
      const result = await pool.query(
        `SELECT p.user_id, pr.display_name, pr.date_of_birth, pr.bio, media.id AS media_id, p.last_seen_at,
                CASE
                  WHEN $4::float8 IS NULL OR pr.latitude IS NULL OR NOT pr.location_discovery THEN NULL
                  ELSE earth_distance(ll_to_earth($4::float8, $5::float8), ll_to_earth(pr.latitude, pr.longitude))
                END AS distance_meters
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
           AND NOT EXISTS (
             SELECT 1 FROM acc.blocks b
             WHERE (b.user_id = $1 AND b.blocked_user_id = p.user_id)
                OR (b.user_id = p.user_id AND b.blocked_user_id = $1)
           )
           AND (
             $6::uuid[] IS NULL
             OR EXISTS (
               SELECT 1 FROM acc.p_user_interests ui
               WHERE ui.user_id = p.user_id AND ui.interest_id = ANY($6::uuid[])
             )
           )
           AND (
             $7::float8 IS NULL
             OR (
               pr.location_discovery
               AND pr.latitude IS NOT NULL
               AND earth_box(ll_to_earth($4::float8, $5::float8), $7::float8) @> ll_to_earth(pr.latitude, pr.longitude)
               AND earth_distance(ll_to_earth($4::float8, $5::float8), ll_to_earth(pr.latitude, pr.longitude)) <= $7::float8
             )
           )
         ORDER BY p.last_seen_at DESC
         LIMIT $3`,
        [id, cursor, pageSize + 1, viewerLat, viewerLng, interestIds, radiusMeters],
      );
      const rows = result.rows.slice(0, pageSize);
      const people = await decoratePeople(pool, id, rows);
      response.json({
        people,
        hasMore: result.rows.length > pageSize,
        nextCursor: result.rows.length > pageSize ? rows.at(-1)?.last_seen_at?.toISOString?.() ?? null : null,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/people/:userId', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const result = await pool.query(
        `SELECT pr.user_id, pr.display_name, pr.date_of_birth, pr.bio, media.id AS media_id,
                (presence.last_seen_at > NOW() - INTERVAL '45 seconds') AS online,
                CASE
                  WHEN viewer.latitude IS NULL OR pr.latitude IS NULL OR NOT pr.location_discovery OR NOT viewer.location_discovery THEN NULL
                  ELSE earth_distance(ll_to_earth(viewer.latitude, viewer.longitude), ll_to_earth(pr.latitude, pr.longitude))
                END AS distance_meters
         FROM acc.m_profiles pr
         LEFT JOIN acc.presence presence ON presence.user_id = pr.user_id
         LEFT JOIN acc.m_profiles viewer ON viewer.user_id = $2
         LEFT JOIN LATERAL (
           SELECT id FROM acc.m_profile_media
           WHERE user_id = pr.user_id AND is_primary AND deleted_at IS NULL
           LIMIT 1
         ) media ON TRUE
         WHERE pr.user_id = $1 AND pr.deleted_at IS NULL AND pr.profile_status = 'active'`,
        [request.params.userId, id],
      );
      const row = result.rows[0];
      if (!row || row.user_id === id) {
        response.status(404).json({ error: { code: 'NOT_FOUND', message: 'This person is not available.' } });
        return;
      }
      const [person] = await decoratePeople(pool, id, [row], true);
      response.json({ person });
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

  router.get('/blocks', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const result = await pool.query(
        `SELECT b.blocked_user_id AS user_id, pr.display_name
         FROM acc.blocks b
         JOIN acc.m_profiles pr ON pr.user_id = b.blocked_user_id
         WHERE b.user_id = $1
         ORDER BY b.created_at DESC`,
        [id],
      );
      response.json({
        people: result.rows.map((row) => ({ userId: row.user_id, name: String(row.display_name).trim() })),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/users/:userId/block', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const other = request.params.userId;
      if (!other || other === id) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose someone to block.' } });
        return;
      }
      await pool.query(
        `INSERT INTO acc.blocks (user_id, blocked_user_id) VALUES ($1, $2)
         ON CONFLICT (user_id, blocked_user_id) DO NOTHING`,
        [id, other],
      );
      response.status(201).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/users/:userId/block', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      await pool.query(`DELETE FROM acc.blocks WHERE user_id = $1 AND blocked_user_id = $2`, [id, request.params.userId]);
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

async function decoratePeople(pool: Pool, viewerId: string, rows: Array<Record<string, unknown>>, withRelationship = false) {
  const ids = rows.map((row) => String(row.user_id));
  if (ids.length === 0) return [];
  const [interests, rates, relations] = await Promise.all([
    pool.query(
      `SELECT p.user_id, i.name,
              EXISTS (
                SELECT 1 FROM acc.p_user_interests mine
                WHERE mine.user_id = $2 AND mine.interest_id = i.id
              ) AS shared
       FROM acc.p_user_interests p
       JOIN acc.m_interests i ON i.id = p.interest_id AND i.status = 'active'
       WHERE p.user_id = ANY($1::uuid[])
       ORDER BY i.name`,
      [ids, viewerId],
    ),
    pool.query(
      `SELECT companion_user_id, communication_type, rate_coins
       FROM acc.m_companion_rates
       WHERE is_active AND companion_user_id = ANY($1::uuid[])`,
      [ids],
    ),
    withRelationship
      ? pool.query(
          `SELECT conversation_id, other_id, status, created_by, blocked_by_viewer, blocked_viewer FROM (
             SELECT c.id AS conversation_id, c.status, c.created_by, other_user.user_id AS other_id,
                    EXISTS (SELECT 1 FROM acc.blocks b WHERE b.user_id = $2 AND b.blocked_user_id = other_user.user_id) AS blocked_by_viewer,
                    EXISTS (SELECT 1 FROM acc.blocks b WHERE b.user_id = other_user.user_id AND b.blocked_user_id = $2) AS blocked_viewer
             FROM acc.p_conversation_participants mine
             JOIN acc.conversations c ON c.id = mine.conversation_id AND c.conversation_type = 'direct'
             JOIN acc.p_conversation_participants other_user
               ON other_user.conversation_id = c.id AND other_user.user_id = ANY($1::uuid[])
             WHERE mine.user_id = $2 AND mine.left_at IS NULL
           ) rel`,
          [ids, viewerId],
        )
      : pool.query(
          `SELECT NULL::uuid AS conversation_id, blocked.blocked_user_id AS other_id, NULL::text AS status, NULL::uuid AS created_by,
                  TRUE AS blocked_by_viewer, FALSE AS blocked_viewer
           FROM acc.blocks blocked
           WHERE blocked.user_id = $2 AND blocked.blocked_user_id = ANY($1::uuid[])
           UNION ALL
           SELECT NULL::uuid AS conversation_id, blocked.user_id AS other_id, NULL::text AS status, NULL::uuid AS created_by,
                  FALSE AS blocked_by_viewer, TRUE AS blocked_viewer
           FROM acc.blocks blocked
           WHERE blocked.blocked_user_id = $2 AND blocked.user_id = ANY($1::uuid[])`,
          [ids, viewerId],
        ),
  ]);
  return rows.map((row) => {
    const userId = String(row.user_id);
    const tags = interests.rows.filter((item) => item.user_id === userId);
    const rateRows = rates.rows.filter((item) => item.companion_user_id === userId);
    const relation = relations.rows.find((item) => item.other_id === userId);
    const meters = row.distance_meters === null || row.distance_meters === undefined ? null : Number(row.distance_meters);
    const relationship: PersonRelationship = relation
      ? relationshipFrom({
          viewerId,
          blockedByViewer: Boolean(relation.blocked_by_viewer),
          blockedViewer: Boolean(relation.blocked_viewer),
          status: relation.status,
          createdBy: relation.created_by,
        })
      : 'none';
    return toPublicPerson(row, {
      age: ageFrom(row.date_of_birth as Date | string | null),
      interests: tags.map((item) => String(item.name)),
      sharedInterests: tags.filter((item) => item.shared).map((item) => String(item.name)),
      rates: ratesFromRows(rateRows) satisfies PublicRates,
      distanceKm: meters === null ? null : roundDistanceKm(meters),
      relationship,
      conversationId: relation?.conversation_id ? String(relation.conversation_id) : null,
    });
  });
}

function parseUuidList(value: unknown): string[] | null {
  const raw = Array.isArray(value) ? value.join(',') : typeof value === 'string' ? value : '';
  const ids = raw.split(',').map((item) => item.trim()).filter(Boolean);
  if (ids.length === 0) return null;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (ids.some((id) => !uuid.test(id))) {
    return null;
  }
  return ids;
}

function ageFrom(value: Date | string | null): number | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - date.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < date.getUTCMonth() ||
    (today.getUTCMonth() === date.getUTCMonth() && today.getUTCDate() < date.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function contentTypeForKey(key: string): string {
  if (key.endsWith('.png')) return 'image/png';
  if (key.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export { ageFrom };
