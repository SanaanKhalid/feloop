BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('feloop/starter/schema', 0));
CREATE TABLE IF NOT EXISTS feloop_starter_schema_migrations (
  version integer PRIMARY KEY,
  installed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS feloop_starter_prompts (
  namespace text NOT NULL, version text NOT NULL, fragment text NOT NULL,
  PRIMARY KEY(namespace, version)
);
CREATE TABLE IF NOT EXISTS feloop_starter_active (
  namespace text PRIMARY KEY, version text NOT NULL
);
CREATE TABLE IF NOT EXISTS feloop_starter_receipts (
  namespace text NOT NULL, attempt_id text NOT NULL, receipt jsonb,
  PRIMARY KEY(namespace, attempt_id)
);
INSERT INTO feloop_starter_schema_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
COMMIT;
