import type { Pool } from 'pg';
import type { CreateRatingInput, PublicRating, UserRating, UserRatingSummary } from './rating.types.js';

export class RatingRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateRatingInput): Promise<UserRating> {
    const comment = input.comment?.trim() ? input.comment.trim() : null;

    if (input.callId) {
      const result = await this.pool.query<{
        id: string;
        call_id: string | null;
        rater_id: string;
        rated_user_id: string;
        rating: number;
        comment: string | null;
        created_at: Date;
        updated_at: Date;
      }>(
        `INSERT INTO acc.t_user_ratings (call_id, rater_id, rated_user_id, rating, comment)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (call_id, rater_id) WHERE call_id IS NOT NULL
         DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW()
         RETURNING id, call_id, rater_id, rated_user_id, rating, comment, created_at, updated_at`,
        [input.callId, input.raterId, input.ratedUserId, input.rating, comment],
      );
      const row = result.rows[0];
      return {
        id: row.id,
        callId: row.call_id,
        raterId: row.rater_id,
        ratedUserId: row.rated_user_id,
        rating: Number(row.rating),
        comment: row.comment,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }

    const result = await this.pool.query<{
      id: string;
      call_id: string | null;
      rater_id: string;
      rated_user_id: string;
      rating: number;
      comment: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO acc.t_user_ratings (rater_id, rated_user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING id, call_id, rater_id, rated_user_id, rating, comment, created_at, updated_at`,
      [input.raterId, input.ratedUserId, input.rating, comment],
    );
    const row = result.rows[0];
    return {
      id: row.id,
      callId: row.call_id,
      raterId: row.rater_id,
      ratedUserId: row.rated_user_id,
      rating: Number(row.rating),
      comment: row.comment,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getSummary(userId: string): Promise<UserRatingSummary> {
    const result = await this.pool.query<{ avg_rating: number | string | null; count_rating: number | string }>(
      `SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float8 AS avg_rating,
              COUNT(*)::int AS count_rating
       FROM acc.t_user_ratings
       WHERE rated_user_id = $1`,
      [userId],
    );
    const row = result.rows[0];
    return {
      averageRating: row?.avg_rating ? Number(row.avg_rating) : 0,
      ratingCount: row?.count_rating ? Number(row.count_rating) : 0,
    };
  }

  async getSummaries(userIds: string[]): Promise<Map<string, UserRatingSummary>> {
    const map = new Map<string, UserRatingSummary>();
    if (userIds.length === 0) return map;

    const result = await this.pool.query<{
      rated_user_id: string;
      avg_rating: number | string | null;
      count_rating: number | string;
    }>(
      `SELECT rated_user_id,
              COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float8 AS avg_rating,
              COUNT(*)::int AS count_rating
       FROM acc.t_user_ratings
       WHERE rated_user_id = ANY($1::uuid[])
       GROUP BY rated_user_id`,
      [userIds],
    );

    for (const row of result.rows) {
      map.set(row.rated_user_id, {
        averageRating: row.avg_rating ? Number(row.avg_rating) : 0,
        ratingCount: row.count_rating ? Number(row.count_rating) : 0,
      });
    }

    return map;
  }

  async listForUser(
    userId: string,
    sort: 'rating' | 'date' = 'rating',
    limit = 50,
  ): Promise<PublicRating[]> {
    const orderBy =
      sort === 'date'
        ? 'r.created_at DESC'
        : 'r.rating DESC, r.created_at DESC';

    const result = await this.pool.query<{
      id: string;
      rating: number;
      comment: string | null;
      created_at: Date;
      rater_user_id: string;
      rater_name: string | null;
      rater_media_id: string | null;
    }>(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              r.rater_id AS rater_user_id,
              pr.display_name AS rater_name,
              media.id AS rater_media_id
       FROM acc.t_user_ratings r
       LEFT JOIN acc.m_profiles pr ON pr.user_id = r.rater_id AND pr.deleted_at IS NULL
       LEFT JOIN LATERAL (
         SELECT id FROM acc.m_profile_media
         WHERE user_id = r.rater_id AND is_primary AND deleted_at IS NULL
         LIMIT 1
       ) media ON TRUE
       WHERE r.rated_user_id = $1
       ORDER BY ${orderBy}
       LIMIT $2`,
      [userId, limit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      rating: Number(row.rating),
      comment: row.comment,
      createdAt: row.created_at.toISOString(),
      rater: {
        userId: row.rater_user_id,
        name: row.rater_name?.trim() || 'Member',
        mediaId: row.rater_media_id ? String(row.rater_media_id) : null,
      },
    }));
  }

  async verifyCallParticipants(callId: string, raterId: string, ratedUserId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM acc.t_calls
       WHERE id = $1 AND (
         (caller_id = $2 AND receiver_id = $3) OR
         (caller_id = $3 AND receiver_id = $2)
       )
       LIMIT 1`,
      [callId, raterId, ratedUserId],
    );
    return Boolean(result.rows[0]);
  }
}
