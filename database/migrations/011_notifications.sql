CREATE TABLE acc.notifications (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_notifications PRIMARY KEY (id),
  CONSTRAINT fk_notifications_m_users FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT chk_notifications_type CHECK (length(btrim(type)) > 0)
);

CREATE INDEX idx_notifications_user_created
  ON acc.notifications (user_id, created_at DESC);

CREATE INDEX idx_notifications_user_unread
  ON acc.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;
