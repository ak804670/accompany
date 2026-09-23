CREATE TABLE acc.reports (
  id UUID DEFAULT gen_random_uuid(),
  reported_by UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  conversation_id UUID,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT pk_reports PRIMARY KEY (id),
  CONSTRAINT fk_reports_reported_by FOREIGN KEY (reported_by) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_reports_reported_user FOREIGN KEY (reported_user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_reports_conversations FOREIGN KEY (conversation_id) REFERENCES acc.conversations (id) ON DELETE RESTRICT,
  CONSTRAINT chk_reports_not_self CHECK (reported_by <> reported_user_id),
  CONSTRAINT chk_reports_status CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
  CONSTRAINT chk_reports_reason CHECK (length(btrim(reason)) > 0)
);

CREATE INDEX idx_reports_reported_user_created
  ON acc.reports (reported_user_id, created_at DESC);

CREATE TABLE acc.user_restrictions (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  restriction_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  CONSTRAINT pk_user_restrictions PRIMARY KEY (id),
  CONSTRAINT fk_user_restrictions_m_users FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_user_restrictions_created_by FOREIGN KEY (created_by) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT chk_user_restrictions_type CHECK (restriction_type IN ('chat', 'discovery', 'withdrawal', 'account')),
  CONSTRAINT chk_user_restrictions_window CHECK (ends_at IS NULL OR ends_at > starts_at),
  CONSTRAINT chk_user_restrictions_reason CHECK (length(btrim(reason)) > 0)
);

CREATE INDEX idx_user_restrictions_user_id ON acc.user_restrictions (user_id, starts_at DESC);
