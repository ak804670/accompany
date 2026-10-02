import { readConfig } from '../src/config/env.js';
import { createPool } from '../src/infrastructure/database/pool.js';

const people = [
  {
    id: 'a1111111-1111-4111-8111-111111111111',
    name: 'Ananya',
    birth: '1999-03-12',
    bio: 'Usually around in the evening, happy to talk.',
    messages: ['Hey, are you around?', 'I was hoping for a quiet conversation.'],
    unread: true,
  },
  {
    id: 'a2222222-2222-4222-8222-222222222222',
    name: 'Rohan',
    birth: '1994-11-02',
    bio: 'I like unhurried conversations.',
    messages: ['Good evening.', 'How has your day been?'],
    unread: false,
  },
  {
    id: 'a3333333-3333-4333-8333-333333333333',
    name: 'Meera',
    birth: '2001-06-18',
    bio: 'Free to talk when you are.',
    messages: ["I'm free if you want to talk."],
    unread: true,
  },
  {
    id: 'a4444444-4444-4444-8444-444444444444',
    name: 'Kabir',
    birth: '1996-01-09',
    bio: 'Here if you feel like saying hello.',
    messages: [] as string[],
    unread: false,
  },
] as const;

const config = readConfig();
const pool = createPool(config.databaseUrl);

try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const person of people) {
      await client.query(
        `INSERT INTO acc.m_users (id, status) VALUES ($1, 'active')
         ON CONFLICT (id) DO UPDATE SET status = 'active', deleted_at = NULL`,
        [person.id],
      );
      await client.query(
        `INSERT INTO acc.m_auth_identities (user_id, provider, provider_subject, email, verified_at)
         VALUES ($1, 'email', $2, $3, NOW())
         ON CONFLICT (provider, provider_subject) DO NOTHING`,
        [person.id, `seed:${person.name.toLowerCase()}`, `${person.name.toLowerCase()}@seed.accompany.test`],
      );
      await client.query(
        `INSERT INTO acc.m_profiles (user_id, display_name, date_of_birth, bio, language_preferences, profile_status, onboarding_step)
         VALUES ($1, $2, $3, $4, ARRAY['en']::text[], 'active', 'complete')
         ON CONFLICT (user_id) DO UPDATE
           SET display_name = EXCLUDED.display_name,
               date_of_birth = EXCLUDED.date_of_birth,
               bio = EXCLUDED.bio,
               profile_status = 'active',
               onboarding_step = 'complete',
               deleted_at = NULL`,
        [person.id, person.name, person.birth, person.bio],
      );
      const isOnline = people.indexOf(person) < 2;
      const lastSeenSql = isOnline
        ? "NOW() + INTERVAL '10 minutes'"
        : "NOW() - INTERVAL '2 hours'";
      await client.query(
        `INSERT INTO acc.presence (user_id, last_seen_at) VALUES ($1, ${lastSeenSql})
         ON CONFLICT (user_id) DO UPDATE SET last_seen_at = ${lastSeenSql}`,
        [person.id],
      );
    }

    const owners = await client.query(
      `SELECT id FROM acc.m_users
       WHERE status = 'active' AND deleted_at IS NULL
         AND id <> ALL($1::uuid[])`,
      [people.map((person) => person.id)],
    );

    for (const owner of owners.rows) {
      for (const person of people) {
        if (person.messages.length === 0) continue;
        const existing = await client.query(
          `SELECT c.id
           FROM acc.conversations c
           JOIN acc.p_conversation_participants a ON a.conversation_id = c.id AND a.user_id = $1
           JOIN acc.p_conversation_participants b ON b.conversation_id = c.id AND b.user_id = $2
           WHERE c.conversation_type = 'direct'
           LIMIT 1`,
          [owner.id, person.id],
        );
        let conversationId = existing.rows[0]?.id as string | undefined;
        if (!conversationId) {
          const created = await client.query(
            `INSERT INTO acc.conversations (created_by, status, conversation_type, started_at)
             VALUES ($1, 'active', 'direct', NOW())
             RETURNING id`,
            [person.id],
          );
          conversationId = created.rows[0].id as string;
          await client.query(
            `INSERT INTO acc.p_conversation_participants (conversation_id, user_id, role)
             VALUES ($1, $2, 'member'), ($1, $3, 'owner')`,
            [conversationId, owner.id, person.id],
          );
        }
        await client.query(`DELETE FROM acc.messages WHERE conversation_id = $1`, [conversationId]);
        for (const [index, body] of person.messages.entries()) {
          await client.query(
            `INSERT INTO acc.messages (conversation_id, sender_id, message_type, content, billing_status, created_at)
             VALUES ($1, $2, 'text', $3, 'not_billable', NOW() - ($4::int * INTERVAL '3 minutes'))`,
            [conversationId, person.id, body, person.messages.length - index],
          );
        }
        if (person.unread) {
          await client.query(
            `DELETE FROM acc.conversation_reads WHERE user_id = $1 AND conversation_id = $2`,
            [owner.id, conversationId],
          );
        } else {
          await client.query(
            `INSERT INTO acc.conversation_reads (user_id, conversation_id, last_read_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (user_id, conversation_id) DO UPDATE SET last_read_at = NOW()`,
            [owner.id, conversationId],
          );
        }
      }
    }
    await client.query('COMMIT');
    console.log(`Seeded ${people.map((person) => person.name).join(', ')} for ${owners.rows.length} account(s).`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
