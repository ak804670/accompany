CREATE TABLE acc.audit_logs (
  id UUID DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_audit_logs PRIMARY KEY (id),
  CONSTRAINT fk_audit_logs_m_users FOREIGN KEY (actor_user_id) REFERENCES acc.m_users (id) ON DELETE SET NULL,
  CONSTRAINT chk_audit_logs_action CHECK (length(btrim(action)) > 0),
  CONSTRAINT chk_audit_logs_entity_type CHECK (length(btrim(entity_type)) > 0)
);

CREATE INDEX idx_audit_logs_entity ON acc.audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor_created ON acc.audit_logs (actor_user_id, created_at DESC);
CREATE INDEX idx_audit_logs_created_at ON acc.audit_logs (created_at DESC);
