CREATE TABLE acc.outbox_events (
  id UUID DEFAULT gen_random_uuid(),
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT pk_outbox_events PRIMARY KEY (id),
  CONSTRAINT chk_outbox_events_status CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  CONSTRAINT chk_outbox_events_retry_count CHECK (retry_count >= 0),
  CONSTRAINT chk_outbox_events_aggregate_type CHECK (length(btrim(aggregate_type)) > 0),
  CONSTRAINT chk_outbox_events_event_type CHECK (length(btrim(event_type)) > 0)
);

CREATE INDEX idx_outbox_events_pending
  ON acc.outbox_events (created_at)
  WHERE status = 'pending';

CREATE INDEX idx_outbox_events_aggregate
  ON acc.outbox_events (aggregate_type, aggregate_id);
