-- Accompany schema: acc
-- Development reset: database/reset.sql (never run in production)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS acc;

CREATE OR REPLACE FUNCTION acc.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
