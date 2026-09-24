CREATE TABLE IF NOT EXISTS acc.presence (
  user_id UUID PRIMARY KEY REFERENCES acc.m_users (id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS acc.conversation_reads (
  user_id UUID NOT NULL REFERENCES acc.m_users (id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES acc.conversations (id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, conversation_id)
);
