BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('feloop/schema/v2', 0));
CREATE TABLE IF NOT EXISTS feloop_schema_migrations (
  version integer PRIMARY KEY,
  installed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS feloop_records (
  namespace text COLLATE "C" NOT NULL,
  collection text NOT NULL CHECK (collection IN ('executions','signals','candidates','targets','attempts','events','historical')),
  id text COLLATE "C" NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  payload jsonb NOT NULL,
  observed_at timestamptz NOT NULL,
  PRIMARY KEY(namespace, collection, id),
  CHECK (payload->>'namespace' = namespace AND payload->>'id' = id AND (payload->>'revision')::integer = revision)
);
CREATE INDEX IF NOT EXISTS feloop_records_time ON feloop_records(namespace, collection, observed_at, id);
INSERT INTO feloop_schema_migrations(version) VALUES (1) ON CONFLICT DO NOTHING;
COMMIT;
