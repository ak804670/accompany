import type { Pool } from 'pg';

import { interestSlug, normalizeInterestName } from '../shell/interest-names.js';
import type { Interest, OnboardingStep, ProfileMedia, ProfileRecord, StoredMedia } from './profile.types.js';

export type ProfileWrite = {
  displayName?: string;
  dateOfBirth?: string | null;
  bio?: string | null;
  languagePreferences?: string[];
  step?: OnboardingStep;
  profileStatus?: ProfileRecord['profileStatus'];
  accountIntent?: ProfileRecord['accountIntent'];
  supportRole?: ProfileRecord['supportRole'];
  expertSubject?: string | null;
  verificationStatus?: ProfileRecord['verificationStatus'];
  verificationNote?: string | null;
};

export interface ProfileRepository {
  accountStatusOf(userId: string): Promise<string | null>;
  ensureUser(userId: string): Promise<void>;
  getProfile(userId: string): Promise<ProfileRecord | null>;
  saveProfile(userId: string, write: ProfileWrite): Promise<ProfileRecord>;
  listInterests(search?: string): Promise<Interest[]>;
  replaceInterests(userId: string, interestIds: string[], names?: string[]): Promise<Interest[]>;
  addMedia(media: StoredMedia): Promise<void>;
  getMedia(userId: string, mediaId: string): Promise<StoredMedia | null>;
  deleteMedia(userId: string, mediaId: string): Promise<StoredMedia | null>;
  reorderMedia(userId: string, mediaIds: string[]): Promise<boolean>;
  getRates(userId: string): Promise<{ chat: number | null; audio: number | null; video: number | null }>;
  saveRates(userId: string, rates: { chat?: number; audio?: number; video?: number }): Promise<{ chat: number | null; audio: number | null; video: number | null }>;
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
  account_intent: ProfileRecord['accountIntent']; support_role: ProfileRecord['supportRole']; expert_subject: string | null;
  verification_status: ProfileRecord['verificationStatus']; verification_note: string | null;
};

function ratesFrom(rows: Array<{ communication_type: string; rate_coins: number | string }>) {
  const rates = { chat: null as number | null, audio: null as number | null, video: null as number | null };
  for (const row of rows) {
    const amount = Number(row.rate_coins);
    if (row.communication_type === 'message') rates.chat = amount;
    if (row.communication_type === 'voice_call') rates.audio = amount;
    if (row.communication_type === 'video_call') rates.video = amount;
  }
  return rates;
}

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
      `SELECT id, user_id, display_name, date_of_birth, bio, language_preferences, profile_status, onboarding_step,
              account_intent, support_role, expert_subject, verification_status, verification_note
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
      write.accountIntent ?? null, write.supportRole ?? null, write.supportRole !== undefined,
      write.expertSubject === undefined ? null : write.expertSubject, write.expertSubject !== undefined,
      write.verificationStatus ?? null, write.verificationNote === undefined ? null : write.verificationNote,
      write.verificationNote !== undefined,
    ];
    const updated = await this.pool.query(
      `UPDATE acc.m_profiles SET
         display_name = COALESCE($2, display_name),
         date_of_birth = COALESCE($3, date_of_birth),
         bio = CASE WHEN $8::boolean THEN $4 ELSE bio END,
         language_preferences = COALESCE($5::text[], language_preferences),
         profile_status = COALESCE($6, profile_status),
         onboarding_step = COALESCE($7, onboarding_step)
         , account_intent = COALESCE($9, account_intent), support_role = CASE WHEN $11::boolean THEN $10 ELSE support_role END
         , expert_subject = CASE WHEN $13::boolean THEN $12 ELSE expert_subject END
         , verification_status = COALESCE($14, verification_status), verification_note = CASE WHEN $16::boolean THEN $15 ELSE verification_note END
       WHERE user_id = $1 AND deleted_at IS NULL`,
      values,
    );
    if (updated.rowCount === 0) {
      if (!write.displayName?.trim()) {
        throw new Error('profile-name-required');
      }
      await this.pool.query(
        `INSERT INTO acc.m_profiles (user_id, display_name, date_of_birth, bio, language_preferences, profile_status, onboarding_step, account_intent, support_role, expert_subject, verification_status, verification_note)
         VALUES ($1, btrim($2), $3, $4, COALESCE($5::text[], '{}'), COALESCE($6, 'incomplete'), COALESCE($7, 'intent'), COALESCE($8, 'provider'), $9, $10, COALESCE($11, 'none'), $12)`,
        [values[0], values[1], values[2], values[3], values[4], values[5], values[6], values[8], values[9], values[11], values[13], values[14]],
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

  async replaceInterests(userId: string, interestIds: string[], names: string[] = []): Promise<Interest[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const customIds: string[] = [];
      for (const raw of names) {
        const name = normalizeInterestName(raw);
        if (!name) {
          throw new Error('invalid-interest');
        }
        const slug = interestSlug(name);
        const saved = await client.query(
          `INSERT INTO acc.m_interests (name, slug, origin)
           VALUES ($1, $2, 'custom')
           ON CONFLICT (slug) DO UPDATE SET name = acc.m_interests.name
           RETURNING id`,
          [name, slug],
        );
        customIds.push(saved.rows[0].id as string);
      }
      const ids = [...new Set([...interestIds, ...customIds])];
      if (ids.length > 12) {
        throw new Error('invalid-interest');
      }
      const found = await client.query(
        `SELECT id, name, slug FROM acc.m_interests WHERE status = 'active' AND id = ANY($1::uuid[])`,
        [ids],
      );
      if (found.rows.length !== ids.length) {
        throw new Error('unknown-interest');
      }
      await client.query(`DELETE FROM acc.p_user_interests WHERE user_id = $1`, [userId]);
      if (ids.length > 0) {
        await client.query(
          `INSERT INTO acc.p_user_interests (user_id, interest_id)
           SELECT $1, id FROM acc.m_interests WHERE id = ANY($2::uuid[])`,
          [userId, ids],
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

  async reorderMedia(userId: string, mediaIds: string[]): Promise<boolean> {
    const current = await this.userMedia(userId);
    if (current.length !== mediaIds.length || current.some((item) => !mediaIds.includes(item.id))) {
      return false;
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const [index, mediaId] of mediaIds.entries()) {
        await client.query(
          `UPDATE acc.m_profile_media
           SET sort_order = $3, is_primary = $4
           WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
          [mediaId, userId, index, index === 0],
        );
      }
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getRates(userId: string) {
    const result = await this.pool.query(
      `SELECT communication_type, rate_coins FROM acc.m_companion_rates WHERE companion_user_id = $1 AND is_active`,
      [userId],
    );
    return ratesFrom(result.rows);
  }

  async saveRates(userId: string, rates: { chat?: number; audio?: number; video?: number }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO acc.m_companion_profiles (user_id, is_available, availability_status)
         VALUES ($1, FALSE, 'offline')
         ON CONFLICT (user_id) DO NOTHING`,
        [userId],
      );
      const pairs: Array<[string, string, number]> = [];
      if (rates.chat !== undefined) pairs.push(['message', 'per_message', rates.chat]);
      if (rates.audio !== undefined) pairs.push(['voice_call', 'per_minute', rates.audio]);
      if (rates.video !== undefined) pairs.push(['video_call', 'per_minute', rates.video]);
      for (const [communicationType, rateType, amount] of pairs) {
        await client.query(
          `INSERT INTO acc.m_companion_rates (companion_user_id, communication_type, rate_type, rate_coins, is_active)
           VALUES ($1, $2, $3, $4, TRUE)
           ON CONFLICT (companion_user_id, communication_type) WHERE is_active
           DO UPDATE SET rate_coins = EXCLUDED.rate_coins, rate_type = EXCLUDED.rate_type`,
          [userId, communicationType, rateType, amount],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return this.getRates(userId);
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
      accountIntent: row.account_intent ?? 'provider', supportRole: row.support_role ?? null,
      expertSubject: row.expert_subject, verificationStatus: row.verification_status ?? 'none', verificationNote: row.verification_note,
    };
  }
}
