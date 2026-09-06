import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), "feloop-package-"));
function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} failed with exit ${result.status}`);
}
try {
  // pack invokes prepack: a clean checkout must not rely on stale dist output.
  run("npm", ["pack", "--pack-destination", temporary], root);
  const tarballs = (await readdir(temporary)).filter((name) =>
    name.endsWith(".tgz"),
  );
  assert.equal(tarballs.length, 1);
  await writeFile(
    join(temporary, "package.json"),
    JSON.stringify({
      name: "feloop-clean-consumer",
      private: true,
      type: "module",
    }),
  );
  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      resolve(temporary, tarballs[0]),
      "typescript@5.9.3",
      "@types/node@24",
    ],
    temporary,
  );
  const installed = JSON.parse(
    await readFile(join(temporary, "node_modules/feloop/package.json"), "utf8"),
  );
  assert.equal(installed.version, "0.2.0-alpha.1");
  assert.equal(installed.license, "MIT");
  assert.equal(installed.bin?.feloop, "dist/src/cli.js");
  assert.equal(Object.keys(installed.dependencies ?? {}).length, 0);
  assert.match(
    await readFile(join(temporary, "node_modules/feloop/LICENSE"), "utf8"),
    /MIT License/,
  );
  await assert.rejects(
    readFile(join(temporary, "node_modules/pg/package.json")),
  );
  await writeFile(
    join(temporary, "consumer.mts"),
    `
import { FeedbackLoop, InMemoryStore } from 'feloop';
import { PostgresStore, migratePostgres } from 'feloop/postgres';
import { runStoreConformance } from 'feloop/testing';
const store = new InMemoryStore();
const loop = new FeedbackLoop({ store, namespace: 'tarball' });
await loop.recordExecution({ id: 'installed', kind: 'prediction' });
if ((await loop.getExecution('installed'))?.revision !== 1) throw new Error('Bad capture');
if ((await runStoreConformance(store)).length !== 8) throw new Error('Bad conformance');
let migrated = false;
const pool = { connect: async () => ({ query: async (sql: string) => { migrated = sql.includes('feloop_records'); return { rows: [], rowCount: 0 }; }, release() {} }) };
new PostgresStore(pool);
if (migrated) throw new Error('Construction migrated');
await migratePostgres(pool);
if (!migrated) throw new Error('Packaged migration missing');
await loop.close();
console.log('Clean installed tarball: imports, declarations, capture, conformance and migration asset passed.');
`,
  );
  run(
    process.execPath,
    [
      "node_modules/typescript/bin/tsc",
      "consumer.mts",
      "--outDir",
      "built",
      "--strict",
      "--skipLibCheck",
      "--target",
      "ES2022",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
    ],
    temporary,
  );
  run(process.execPath, ["built/consumer.mjs"], temporary);
  run(
    process.execPath,
    ["node_modules/.bin/feloop", "--help"],
    temporary,
  );
} finally {
  // Only the exact temporary consumer directory created by this script is removed.
  await rm(temporary, { recursive: true, force: true });
}
