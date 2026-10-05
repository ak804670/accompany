CREATE TABLE acc.t_user_ratings (
  id UUID DEFAULT gen_random_uuid(),
  call_id UUID,
  rater_id UUID NOT NULL,
  rated_user_id UUID NOT NULL,
  rating SMALLINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_t_user_ratings PRIMARY KEY (id),
  CONSTRAINT fk_t_user_ratings_call FOREIGN KEY (call_id) REFERENCES acc.t_calls (id) ON DELETE SET NULL,
  CONSTRAINT fk_t_user_ratings_rater FOREIGN KEY (rater_id) REFERENCES acc.m_users (id) ON DELETE CASCADE,
  CONSTRAINT fk_t_user_ratings_rated FOREIGN KEY (rated_user_id) REFERENCES acc.m_users (id) ON DELETE CASCADE,
  CONSTRAINT chk_t_user_ratings_not_self CHECK (rater_id <> rated_user_id),
  CONSTRAINT chk_t_user_ratings_value CHECK (rating >= 1 AND rating <= 5)
);

CREATE UNIQUE INDEX uq_t_user_ratings_call_rater
  ON acc.t_user_ratings (call_id, rater_id)
  WHERE call_id IS NOT NULL;

CREATE INDEX idx_t_user_ratings_rated_user ON acc.t_user_ratings (rated_user_id, created_at DESC);
CREATE INDEX idx_t_user_ratings_rated_user_stars ON acc.t_user_ratings (rated_user_id, rating DESC, created_at DESC);
CREATE INDEX idx_t_user_ratings_rater ON acc.t_user_ratings (rater_id);
