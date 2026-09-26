ALTER TABLE acc.messages
  ADD COLUMN IF NOT EXISTS client_message_id TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_messages_client_message
  ON acc.messages (conversation_id, sender_id, client_message_id)
  WHERE client_message_id IS NOT NULL;
