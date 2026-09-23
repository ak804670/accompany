-- Directional relationship. One row is one person's connection to another.
-- A mutual connection is two rows once both sides exist. Status stays on each row
-- so pending, accepted, blocked, and removed are not forced into a mapping table.

CREATE TABLE acc.connections (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  connected_user_id UUID NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_connections PRIMARY KEY (id),
  CONSTRAINT fk_connections_user FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_connections_connected_user FOREIGN KEY (connected_user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT uq_connections_user_connected UNIQUE (user_id, connected_user_id),
  CONSTRAINT chk_connections_not_self CHECK (user_id <> connected_user_id),
  CONSTRAINT chk_connections_status CHECK (status IN ('pending', 'accepted', 'blocked', 'removed'))
);

CREATE INDEX idx_connections_connected_user_id ON acc.connections (connected_user_id);

CREATE TRIGGER trg_connections_set_updated_at
BEFORE UPDATE ON acc.connections
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();

CREATE TABLE acc.blocks (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  blocked_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_blocks PRIMARY KEY (id),
  CONSTRAINT fk_blocks_user FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_blocks_blocked_user FOREIGN KEY (blocked_user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT uq_blocks_user_blocked UNIQUE (user_id, blocked_user_id),
  CONSTRAINT chk_blocks_not_self CHECK (user_id <> blocked_user_id)
);

CREATE INDEX idx_blocks_blocked_user_id ON acc.blocks (blocked_user_id);
