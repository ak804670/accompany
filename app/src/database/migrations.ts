import type { AppDatabase } from '@/database/db';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS profiles (
  owner_user_id TEXT PRIMARY KEY NOT NULL,
  profile_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profile_rates (
  owner_user_id TEXT PRIMARY KEY NOT NULL,
  chat INTEGER,
  audio INTEGER,
  video INTEGER,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  owner_user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  name TEXT NOT NULL,
  preview TEXT,
  updated_at TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  online INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  incoming INTEGER NOT NULL DEFAULT 0,
  blocked INTEGER NOT NULL DEFAULT 0,
  can_message INTEGER,
  can_respond INTEGER,
  PRIMARY KEY (owner_user_id, id)
);
CREATE INDEX IF NOT EXISTS conversations_updated ON conversations (owner_user_id, updated_at);

CREATE TABLE IF NOT EXISTS messages (
  owner_user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  client_message_id TEXT,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  mine INTEGER NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (owner_user_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS messages_client_id ON messages (owner_user_id, client_message_id) WHERE client_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_conversation_time ON messages (owner_user_id, conversation_id, created_at);

CREATE TABLE IF NOT EXISTS wallet_snapshots (
  owner_user_id TEXT PRIMARY KEY NOT NULL,
  available_coins INTEGER NOT NULL,
  earned_coins INTEGER NOT NULL,
  held_coins INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  owner_user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  label TEXT NOT NULL,
  direction TEXT NOT NULL,
  coins INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (owner_user_id, id)
);
CREATE INDEX IF NOT EXISTS wallet_transactions_time ON wallet_transactions (owner_user_id, created_at);

CREATE TABLE IF NOT EXISTS coin_packages (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  coins INTEGER NOT NULL,
  price_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  featured INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS discovery_cards (
  owner_user_id TEXT NOT NULL,
  filter_key TEXT NOT NULL,
  person_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  card_json TEXT NOT NULL,
  PRIMARY KEY (owner_user_id, filter_key, person_id)
);
CREATE INDEX IF NOT EXISTS discovery_cards_order ON discovery_cards (owner_user_id, filter_key, position);

CREATE TABLE IF NOT EXISTS discovery_cursors (
  owner_user_id TEXT NOT NULL,
  filter_key TEXT NOT NULL,
  next_cursor TEXT,
  PRIMARY KEY (owner_user_id, filter_key)
);

CREATE TABLE IF NOT EXISTS cache_meta (
  owner_user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  PRIMARY KEY (owner_user_id, key)
);
`;

export async function migrate(db: AppDatabase): Promise<void> {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const version = Number(row?.user_version ?? 0);
  if (version >= 1) return;
  await db.exec(SCHEMA);
  await db.exec('PRAGMA user_version = 1');
}
