# Feloop

A lightweight TypeScript SDK for **reviewed, evidence-driven AI improvements**.
Capture executions and feedback, find recurring scored segments, evaluate an
immutable candidate, approve it, and coordinate deployment or rollback through
your infrastructure. Feloop is a library, not a hosted service or autonomous trainer.

Release target: **0.2.0-alpha.1**, MIT, ESM, Node.js **22 and 24**. No core runtime
dependencies, telemetry, database driver, scheduler, model client, or background daemon.
This checkout prepares the release; it does not imply the npm package is published.

[Canonical documentation](https://feloop.docs.buildwithfern.com/get-started/overview)
· [Starter](examples/prompt-improvement/README.md)
· [Capabilities](SUPPORTED.md) · [Migration](docs/migration.md)
· [Release gates](docs/release-checklist.md) · [Security](SECURITY.md)

## Try the source before publication

```sh
git clone https://github.com/SanaanKhalid/feloop.git
cd feloop
npm ci
npm test
npm run starter -- demo
npm run starter -- demo --reject
```

Repository access is required until the owner explicitly makes it public. Both demos
are **simulated fixtures, not live LLM results**. The accepting demo explicitly
approves its fixture candidate; ordinary recommendations never do that automatically.

After the separate npm release action, install the pinned alpha with
`npm install feloop@0.2.0-alpha.1`. Until then, run `npm pack` in this checkout
and install its actual `.tgz` file in your consumer project.

## Capture a local example

```typescript
import { FeedbackLoop, InMemoryStore } from 'feloop';

const loop = new FeedbackLoop({
  store: new InMemoryStore(), // Development only; use a conforming DB adapter in production.
  namespace: 'support/development',
});
const execution = await loop.recordExecution({
  id: 'request-123', kind: 'prediction', episodeId: 'ticket-123',
  input: { text: 'Please explain this charge.' }, output: { label: 'other' },
  artifacts: { model: 'your-model-version', prompt: 'intent-v1' },
  metadata: { task: 'support-intent' },
});
await loop.recordSignal({
  id: 'review-123', executionId: execution.id, kind: 'correction',
  name: 'verified_correct', value: false, correction: { label: 'billing' },
  source: 'authorized-reviewer', confidence: 1,
});
await loop.close();
```

Creation is insert-only. Same caller ID and identical normalized/sanitized input
returns the original record; conflicting content fails. Updates require a revision.
A namespace is an integrity scope, **not authentication**. Your application chooses
authorized namespaces and verifies correction sources.

## Bring your own PostgreSQL

Install `pg` in your application. `feloop/postgres` accepts your pool without importing
the driver. Construction does not create tables. Review and apply the versioned SQL
in `migrations/001-feedback-store.sql`, or explicitly call `migratePostgres(pool)`
with a migration identity. Production request credentials should not need DDL rights.

```typescript
import { Pool } from 'pg';
import { FeedbackLoop } from 'feloop';
import { PostgresStore, migratePostgres } from 'feloop/postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('Set DATABASE_URL explicitly.');
const pool = new Pool({ connectionString });
await migratePostgres(pool); // Explicit setup, not a constructor side effect.
const loop = new FeedbackLoop({ store: new PostgresStore(pool), namespace: 'support/dev' });
await loop.recordExecution({ kind: 'prediction', input: { text: 'Synthetic setup check' } });
await loop.close(); // Does not close your pool.
await pool.end();
```

Use TLS and your database's credential-management policy. Neither migrations nor
SDK namespaces replace database authorization, encryption, backups, or restore drills.

## Reliability boundary

Evaluation and approval reference exact content, evidence and evaluator versions.
Deployment reserves the target and saves an attempt **before** calling your adapter.
The external call runs outside the database transaction. A valid receipt, candidate
states, lifecycle event and active pointer are finalized atomically afterward.
An uncertain result remains pending until inspection resolves it. Do not retry apply
blindly. An adapter must implement idempotent apply, durable inspect, fenced
`not_applied`, and real rollback. There is no universal exactly-once guarantee.

Default automation only recommends. Experimental auto-apply needs explicit opt-in,
allowed targets, passing metric gates and low-risk prompt/routing changes. Callbacks
run in your process; cancellation is cooperative, **not a sandbox**.

The complete PostgreSQL/OpenAI or Azure OpenAI starter includes real prompt selection, exact-match
holdout evaluation, review, rollback and recovery. Live mode is opt-in, requires
your model/provider credentials/database, sends data to the selected provider and may incur charges. Its small
synthetic dataset is a mechanics demonstration, not evidence of production ROI.
