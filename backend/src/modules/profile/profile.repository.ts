import type { Pool } from 'pg';

import type { Interest, OnboardingStep, ProfileMedia, ProfileRecord, StoredMedia } from './profile.types.js';

export type ProfileWrite = {
  displayName?: string | null;
  dateOfBirth?: string | null;
  bio?: string | null;
  languagePreferences?: string[];
  profileStatus?: ProfileRecord['profileStatus'];
  step?: OnboardingStep;
};

export interface ProfileRepository {
  accountStatusOf(userId: string): Promise<string | null>;
  ensureUser(userId: string): Promise<void>;
  getProfile(userId: string): Promise<ProfileRecord | null>;
  saveProfile(userId: string, write: ProfileWrite): Promise<ProfileRecord>;
  listInterests(search?: string): Promise<Interest[]>;
  replaceInterests(userId: string, interestIds: string[]): Promise<Interest[]>;
  addMedia(media: StoredMedia): Promise<void>;
  getMedia(userId: string, mediaId: string): Promise<StoredMedia | null>;
  deleteMedia(userId: string, mediaId: string): Promise<StoredMedia | null>;
}

type ProfileRow = {
  id: string;
  user_id: string;
  display_name: string;
  date_of_birth: Date | null;
  bio: string | null;
  language_preferences: string[];
  profile_status: ProfileRecord['profileStatus'];
  onboarding_step: OnboardingStep;
};

function contentTypeForKey(storageKey: string): string {
  if (storageKey.endsWith('.png')) {
    return 'image/png';
  }
  if (storageKey.endsWith('.webp')) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

function dateOnly(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString().slice(0, 10);
}

export class PgProfileRepository implements ProfileRepository {
  constructor(private readonly pool: Pool) {}

  async accountStatusOf(userId: string): Promise<string | null> {
    const result = await this.pool.query(`SELECT status FROM acc.m_users WHERE id = $1 AND deleted_at IS NULL`, [userId]);
    return (result.rows[0]?.status as string | undefined) ?? null;
  }

  async ensureUser(userId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO acc.m_users (id, status)
       VALUES ($1, 'active')
       ON CONFLICT (id) DO NOTHING`,
      [userId],
    );
  }

  async getProfile(userId: string): Promise<ProfileRecord | null> {
    const result = await this.pool.query(
      `SELECT id, user_id, display_name, date_of_birth, bio, language_preferences, profile_status, onboarding_step
       FROM acc.m_profiles WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId],
    );
    const row = result.rows[0] as ProfileRow | undefined;
    if (!row) {
      return null;
    }
    const [interests, media] = await Promise.all([this.userInterests(userId), this.userMedia(userId)]);
    return this.assemble(row, interests, media);
  }

  async saveProfile(userId: string, write: ProfileWrite): Promise<ProfileRecord> {
    const values = [
      userId,
      write.displayName ?? null,
      write.dateOfBirth ?? null,
      write.bio === undefined ? null : write.bio,
      write.languagePreferences ?? null,
      write.profileStatus ?? null,
      write.step ?? null,
      write.bio !== undefined,
    ];
    const updated = await this.pool.query(
      `UPDATE acc.m_profiles SET
         display_name = COALESCE($2, display_name),
         date_of_birth = COALESCE($3, date_of_birth),
         bio = CASE WHEN $8::boolean THEN $4 ELSE bio END,
         language_preferences = COALESCE($5::text[], language_preferences),
         profile_status = COALESCE($6, profile_status),
         onboarding_step = COALESCE($7, onboarding_step)
       WHERE user_id = $1 AND deleted_at IS NULL`,
      values,
    );
    if (updated.rowCount === 0) {
      await this.pool.query(
        `INSERT INTO acc.m_profiles (user_id, display_name, date_of_birth, bio, language_preferences, profile_status, onboarding_step)
         VALUES ($1, btrim($2), $3, $4, COALESCE($5::text[], '{}'), COALESCE($6, 'incomplete'), COALESCE($7, 'basics'))`,
        values,
      );
    }
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error('profile missing after save');
    }
    return profile;
  }

  async listInterests(search?: string): Promise<Interest[]> {
    const result = await this.pool.query(
      `SELECT id, name, slug FROM acc.m_interests
       WHERE status = 'active' AND ($1::text IS NULL OR name ILIKE '%' || $1 || '%' OR slug ILIKE '%' || $1 || '%')
       ORDER BY name
       LIMIT 50`,
      [search?.trim() || null],
    );
    return result.rows as Interest[];
  }

  async replaceInterests(userId: string, interestIds: string[]): Promise<Interest[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const found = await client.query(
        `SELECT id, name, slug FROM acc.m_interests WHERE status = 'active' AND id = ANY($1::uuid[])`,
        [interestIds],
      );
      if (found.rows.length !== interestIds.length) {
        throw new Error('unknown-interest');
      }
      await client.query(`DELETE FROM acc.p_user_interests WHERE user_id = $1`, [userId]);
      if (interestIds.length > 0) {
        await client.query(
          `INSERT INTO acc.p_user_interests (user_id, interest_id)
           SELECT $1, id FROM acc.m_interests WHERE id = ANY($2::uuid[])`,
          [userId, interestIds],
        );
      }
      await client.query('COMMIT');
      return found.rows as Interest[];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async addMedia(media: StoredMedia): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO acc.m_profile_media (id, user_id, media_type, storage_key, is_primary, moderation_status, sort_order)
         VALUES (
           $1,
           $2,
           'image',
           $3,
           NOT EXISTS (SELECT 1 FROM acc.m_profile_media WHERE user_id = $2 AND deleted_at IS NULL AND is_primary),
           'pending',
           COALESCE((SELECT MAX(sort_order) + 1 FROM acc.m_profile_media WHERE user_id = $2 AND deleted_at IS NULL), 0)
         )`,
        [media.id, media.userId, media.storageKey],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getMedia(userId: string, mediaId: string): Promise<StoredMedia | null> {
    const result = await this.pool.query(
      `SELECT id, user_id, storage_key, is_primary FROM acc.m_profile_media
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [mediaId, userId],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return {
      id: row.id as string,
      userId: row.user_id as string,
      storageKey: row.storage_key as string,
      contentType: contentTypeForKey(row.storage_key as string),
      isPrimary: row.is_primary as boolean,
    };
  }

  async deleteMedia(userId: string, mediaId: string): Promise<StoredMedia | null> {
    const existing = await this.getMedia(userId, mediaId);
    if (!existing) {
      return null;
    }
    await this.pool.query(
      `UPDATE acc.m_profile_media SET deleted_at = NOW(), is_primary = FALSE WHERE id = $1 AND user_id = $2`,
      [mediaId, userId],
    );
    if (existing.isPrimary) {
      await this.pool.query(
        `UPDATE acc.m_profile_media SET is_primary = TRUE
         WHERE id = (
           SELECT id FROM acc.m_profile_media
           WHERE user_id = $1 AND deleted_at IS NULL
           ORDER BY sort_order, created_at
           LIMIT 1
         )`,
        [userId],
      );
    }
    return existing;
  }

  private async userInterests(userId: string): Promise<Interest[]> {
    const result = await this.pool.query(
      `SELECT i.id, i.name, i.slug
       FROM acc.p_user_interests p
       JOIN acc.m_interests i ON i.id = p.interest_id
       WHERE p.user_id = $1
       ORDER BY i.name`,
      [userId],
    );
    return result.rows as Interest[];
  }

  private async userMedia(userId: string): Promise<ProfileMedia[]> {
    const result = await this.pool.query(
      `SELECT id, is_primary FROM acc.m_profile_media
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY sort_order, created_at`,
      [userId],
    );
    return result.rows.map((row) => ({
      id: row.id as string,
      isPrimary: row.is_primary as boolean,
      contentType: 'image/jpeg',
    }));
  }

  private assemble(row: ProfileRow, interests: Interest[], media: ProfileMedia[]): ProfileRecord {
    return {
      id: row.id,
      userId: row.user_id,
      displayName: row.display_name.trim() ? row.display_name : null,
      dateOfBirth: dateOnly(row.date_of_birth),
      bio: row.bio,
      languagePreferences: row.language_preferences ?? [],
      profileStatus: row.profile_status,
      step: row.onboarding_step,
      interests,
      media,
      complete: false,
    };
  }
}
