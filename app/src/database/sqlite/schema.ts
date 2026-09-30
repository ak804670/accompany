export const DATA_TABLES = [
  'users',
  'profiles',
  'current_profile',
  'profile_rates',
  'conversations',
  'messages',
  'chat_requests',
  'calls',
  'blocked_users',
  'home_cards',
  'coin_balance',
  'wallet_transactions',
  'sync_metadata',
] as const;

export const MIGRATION_001 = `
CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  is_online INTEGER NOT NULL DEFAULT 0,
  last_seen TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY NOT NULL,
  bio TEXT,
  location TEXT,
  latitude REAL,
  longitude REAL,
  interests TEXT,
  audio_rate REAL,
  video_rate REAL,
  chat_rate REAL,
  payload TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE current_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE profile_rates (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  chat REAL,
  audio REAL,
  video REAL,
  updated_at TEXT NOT NULL
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY NOT NULL,
  other_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  last_message_id TEXT,
  last_message_text TEXT,
  last_message_type TEXT,
  last_message_at TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  incoming INTEGER NOT NULL DEFAULT 0,
  online INTEGER NOT NULL DEFAULT 0,
  blocked INTEGER NOT NULL DEFAULT 0,
  can_message INTEGER NOT NULL DEFAULT 0,
  can_respond INTEGER NOT NULL DEFAULT 0,
  payload TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  receiver_id TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  client_message_id TEXT,
  mine INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);

CREATE TABLE chat_requests (
  id TEXT PRIMARY KEY NOT NULL,
  sender_id TEXT,
  receiver_id TEXT,
  initial_message TEXT,
  status TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE calls (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT,
  caller_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  person_id TEXT,
  name TEXT,
  call_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT,
  ended_at TEXT,
  duration INTEGER,
  created_at TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE INDEX idx_calls_created ON calls (created_at DESC);

CREATE TABLE blocked_users (
  user_id TEXT NOT NULL,
  blocked_user_id TEXT NOT NULL,
  name TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, blocked_user_id)
);

CREATE TABLE home_cards (
  user_id TEXT NOT NULL,
  filter_key TEXT NOT NULL,
  position INTEGER NOT NULL,
  is_available INTEGER NOT NULL DEFAULT 1,
  payload TEXT NOT NULL,
  cached_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (filter_key, user_id)
);

CREATE TABLE coin_balance (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  available_coins INTEGER NOT NULL,
  earned_coins INTEGER NOT NULL,
  held_coins INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE wallet_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE sync_metadata (
  key TEXT PRIMARY KEY NOT NULL,
  synced_at TEXT NOT NULL
);
`;
