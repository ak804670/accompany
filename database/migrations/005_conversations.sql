CREATE TABLE acc.conversations (
  id UUID DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  status TEXT NOT NULL,
  conversation_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  CONSTRAINT pk_conversations PRIMARY KEY (id),
  CONSTRAINT fk_conversations_m_users FOREIGN KEY (created_by) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT chk_conversations_status CHECK (status IN ('pending', 'active', 'ended', 'blocked')),
  CONSTRAINT chk_conversations_type CHECK (conversation_type IN ('direct', 'group'))
);

CREATE INDEX idx_conversations_created_by ON acc.conversations (created_by);

CREATE TRIGGER trg_conversations_set_updated_at
BEFORE UPDATE ON acc.conversations
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();

CREATE TABLE acc.p_conversation_participants (
  id UUID DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_p_conversation_participants PRIMARY KEY (id),
  CONSTRAINT fk_p_conversation_participants_conversations FOREIGN KEY (conversation_id) REFERENCES acc.conversations (id) ON DELETE RESTRICT,
  CONSTRAINT fk_p_conversation_participants_m_users FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT uq_p_conversation_participants_conversation_user UNIQUE (conversation_id, user_id),
  CONSTRAINT chk_p_conversation_participants_role CHECK (role IN ('owner', 'member'))
);

CREATE INDEX idx_p_conversation_participants_user_id ON acc.p_conversation_participants (user_id);

CREATE TABLE acc.messages (
  id UUID DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID,
  message_type TEXT NOT NULL,
  content TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  billing_status TEXT NOT NULL DEFAULT 'pending',
  billing_transaction_id UUID,
  CONSTRAINT pk_messages PRIMARY KEY (id),
  CONSTRAINT fk_messages_conversations FOREIGN KEY (conversation_id) REFERENCES acc.conversations (id) ON DELETE RESTRICT,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT chk_messages_type CHECK (message_type IN ('text', 'image', 'system')),
  CONSTRAINT chk_messages_sender CHECK (message_type = 'system' OR sender_id IS NOT NULL),
  CONSTRAINT chk_messages_text_content CHECK (message_type <> 'text' OR content IS NOT NULL),
  CONSTRAINT chk_messages_billing_status CHECK (
    billing_status IN ('not_billable', 'pending', 'charged', 'refunded', 'failed')
  ),
  CONSTRAINT chk_messages_system_not_billable CHECK (
    message_type <> 'system' OR billing_status = 'not_billable'
  ),
  CONSTRAINT chk_messages_charged_has_transaction CHECK (
    billing_status NOT IN ('charged', 'refunded') OR billing_transaction_id IS NOT NULL
  ),
  CONSTRAINT chk_messages_not_billable_has_no_transaction CHECK (
    billing_status <> 'not_billable' OR billing_transaction_id IS NULL
  )
);

CREATE INDEX idx_messages_conversation_created
  ON acc.messages (conversation_id, created_at DESC);

CREATE INDEX idx_messages_billing_transaction
  ON acc.messages (billing_transaction_id)
  WHERE billing_transaction_id IS NOT NULL;

CREATE TRIGGER trg_messages_set_updated_at
BEFORE UPDATE ON acc.messages
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();

CREATE TABLE acc.voice_calls (
  id UUID DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  caller_user_id UUID NOT NULL,
  receiver_user_id UUID NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds BIGINT NOT NULL DEFAULT 0,
  rate_coins_per_minute BIGINT,
  coins_charged BIGINT NOT NULL DEFAULT 0,
  ended_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_voice_calls PRIMARY KEY (id),
  CONSTRAINT fk_voice_calls_conversations FOREIGN KEY (conversation_id) REFERENCES acc.conversations (id) ON DELETE RESTRICT,
  CONSTRAINT fk_voice_calls_caller FOREIGN KEY (caller_user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_voice_calls_receiver FOREIGN KEY (receiver_user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT chk_voice_calls_not_self CHECK (caller_user_id <> receiver_user_id),
  CONSTRAINT chk_voice_calls_status CHECK (
    status IN ('initiated', 'ringing', 'answered', 'completed', 'missed', 'rejected', 'cancelled', 'failed')
  ),
  CONSTRAINT chk_voice_calls_rate_non_negative CHECK (rate_coins_per_minute IS NULL OR rate_coins_per_minute >= 0),
  CONSTRAINT chk_voice_calls_rate_when_connected CHECK (
    status NOT IN ('answered', 'completed') OR rate_coins_per_minute IS NOT NULL
  ),
  CONSTRAINT chk_voice_calls_duration_non_negative CHECK (duration_seconds >= 0),
  CONSTRAINT chk_voice_calls_coins_non_negative CHECK (coins_charged >= 0),
  CONSTRAINT chk_voice_calls_times CHECK (
    (answered_at IS NULL OR answered_at >= started_at)
    AND (ended_at IS NULL OR ended_at >= started_at)
  ),
  CONSTRAINT chk_voice_calls_ended_reason CHECK (
    ended_reason IS NULL OR ended_reason IN (
      'hangup', 'missed', 'rejected', 'cancelled', 'failed', 'insufficient_balance'
    )
  )
);

CREATE INDEX idx_voice_calls_conversation_started
  ON acc.voice_calls (conversation_id, started_at DESC);

CREATE INDEX idx_voice_calls_caller ON acc.voice_calls (caller_user_id, started_at DESC);
CREATE INDEX idx_voice_calls_receiver ON acc.voice_calls (receiver_user_id, started_at DESC);

CREATE INDEX idx_voice_calls_active
  ON acc.voice_calls (conversation_id)
  WHERE status IN ('initiated', 'ringing', 'answered');

CREATE TRIGGER trg_voice_calls_set_updated_at
BEFORE UPDATE ON acc.voice_calls
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();

CREATE TABLE acc.video_calls (
  id UUID DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  caller_user_id UUID NOT NULL,
  receiver_user_id UUID NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds BIGINT NOT NULL DEFAULT 0,
  rate_coins_per_minute BIGINT,
  coins_charged BIGINT NOT NULL DEFAULT 0,
  ended_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_video_calls PRIMARY KEY (id),
  CONSTRAINT fk_video_calls_conversations FOREIGN KEY (conversation_id) REFERENCES acc.conversations (id) ON DELETE RESTRICT,
  CONSTRAINT fk_video_calls_caller FOREIGN KEY (caller_user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_video_calls_receiver FOREIGN KEY (receiver_user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT chk_video_calls_not_self CHECK (caller_user_id <> receiver_user_id),
  CONSTRAINT chk_video_calls_status CHECK (
    status IN ('initiated', 'ringing', 'answered', 'completed', 'missed', 'rejected', 'cancelled', 'failed')
  ),
  CONSTRAINT chk_video_calls_rate_non_negative CHECK (rate_coins_per_minute IS NULL OR rate_coins_per_minute >= 0),
  CONSTRAINT chk_video_calls_rate_when_connected CHECK (
    status NOT IN ('answered', 'completed') OR rate_coins_per_minute IS NOT NULL
  ),
  CONSTRAINT chk_video_calls_duration_non_negative CHECK (duration_seconds >= 0),
  CONSTRAINT chk_video_calls_coins_non_negative CHECK (coins_charged >= 0),
  CONSTRAINT chk_video_calls_times CHECK (
    (answered_at IS NULL OR answered_at >= started_at)
    AND (ended_at IS NULL OR ended_at >= started_at)
  ),
  CONSTRAINT chk_video_calls_ended_reason CHECK (
    ended_reason IS NULL OR ended_reason IN (
      'hangup', 'missed', 'rejected', 'cancelled', 'failed', 'insufficient_balance'
    )
  )
);

CREATE INDEX idx_video_calls_conversation_started
  ON acc.video_calls (conversation_id, started_at DESC);

CREATE INDEX idx_video_calls_caller ON acc.video_calls (caller_user_id, started_at DESC);
CREATE INDEX idx_video_calls_receiver ON acc.video_calls (receiver_user_id, started_at DESC);

CREATE INDEX idx_video_calls_active
  ON acc.video_calls (conversation_id)
  WHERE status IN ('initiated', 'ringing', 'answered');

CREATE TRIGGER trg_video_calls_set_updated_at
BEFORE UPDATE ON acc.video_calls
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();
