import type { Pool } from 'pg';

export interface DeviceStore {
  activeTokens(userId: string): Promise<Array<{ id: string; token: string }>>;
  saveToken(userId: string, platform: 'ios' | 'android', token: string): Promise<void>;
  deactivateToken(userId: string, tokenId: string): Promise<void>;
  deactivateUserToken(userId: string, token: string): Promise<void>;
  deactivateTokenValue(token: string): Promise<void>;
}

export class PgDeviceStore implements DeviceStore {
  constructor(private readonly pool: Pool) {}

  async activeTokens(userId: string): Promise<Array<{ id: string; token: string }>> {
    const result = await this.pool.query<{ id: string; token: string }>(
      `SELECT id, token FROM acc.p_device_tokens WHERE user_id = $1 AND is_active`,
      [userId],
    );
    return result.rows;
  }

  async saveToken(userId: string, platform: 'ios' | 'android', token: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO acc.p_device_tokens (user_id, platform, token, is_active)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, is_active = TRUE`,
      [userId, platform, token],
    );
  }

  async deactivateToken(userId: string, tokenId: string): Promise<void> {
    await this.pool.query(
      `UPDATE acc.p_device_tokens SET is_active = FALSE WHERE id = $1 AND user_id = $2`,
      [tokenId, userId],
    );
  }

  async deactivateUserToken(userId: string, token: string): Promise<void> {
    await this.pool.query(
      `UPDATE acc.p_device_tokens SET is_active = FALSE WHERE token = $1 AND user_id = $2`,
      [token, userId],
    );
  }

  async deactivateTokenValue(token: string): Promise<void> {
    await this.pool.query(`UPDATE acc.p_device_tokens SET is_active = FALSE WHERE token = $1`, [token]);
  }
}
