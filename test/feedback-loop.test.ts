import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FeedbackLoop, InMemoryStore, JsonFileStore } from "../src/index.js";

test("records a hierarchical execution and validates signal namespaces", async () => {
  const loop = new FeedbackLoop(new InMemoryStore());
  const turn = await loop.recordExecution({
    namespace: "client/prod",
    kind: "turn",
    episodeId: "ticket-1",
    input: { message: "Inspect the ticket" },
  });
  const tool = await loop.recordExecution({
    namespace: "client/prod",
    kind: "tool",
    episodeId: "ticket-1",
    parentExecutionId: turn.id,
    input: { tool: "get_servicenow_ticket" },
  });

  await loop.recordSignal({
    namespace: "client/prod",
    executionId: tool.id,
    kind: "tool_result",
    name: "tool_success",
    value: true,
    source: "runtime",
  });

  await assert.rejects(
    loop.recordSignal({
      namespace: "other/prod",
      executionId: tool.id,
      kind: "rating",
      name: "helpful",
      value: true,
      source: "operator",
    }),
    /same namespace/,
  );
});

test("detects a recurring negative segment with correction consensus", async () => {
  const loop = new FeedbackLoop(new InMemoryStore());
  const namespace = "client/prod";

  for (let index = 0; index < 20; index += 1) {
    const isMfa = index < 10;
    const timestamp = new Date(Date.UTC(2026, 0, 1 + index * 3)).toISOString();
    const execution = await loop.recordExecution({
      namespace,
      kind: "turn",
      entityId: `operator-${index % 4}`,
      metadata: { task: isMfa ? "mfa" : "group" },
      startedAt: timestamp,
    });
    await loop.recordSignal({
      namespace,
      executionId: execution.id,
      kind: isMfa ? "correction" : "rating",
      name: "correct",
      value: !isMfa,
      ...(isMfa ? { correction: { intent: "delete_auth_methods" } } : {}),
      source: "operator",
      observedAt: timestamp,
    });
  }

  const findings = await loop.analyze({
    namespace,
    dimensions: ["metadata.task"],
    executionKinds: ["turn"],
    signalNames: ["correct"],
    minimumSupport: 5,
    minimumScoredCount: 5,
    minimumEffectSize: 0.2,
    minimumRecurrence: 2,
    minimumDistinctEntities: 2,
    timeBucket: "week",
  });

  const mfa = findings.find((finding) => finding.dimensions["metadata.task"] === "mfa");
  assert.ok(mfa);
  assert.equal(mfa.support, 10);
  assert.equal(mfa.meanScore, 0);
  assert.equal(mfa.baselineScore, 0.5);
  assert.equal(mfa.effectSize, -0.5);
  assert.equal(mfa.correctionCounts['{"intent":"delete_auth_methods"}'], 10);
  assert.ok((mfa.confidence ?? 0) > 0.9);
});

test("attributes an episode outcome to a selected execution kind", async () => {
  const loop = new FeedbackLoop(new InMemoryStore());
  const turn = await loop.recordExecution({
    namespace: "client/prod",
    kind: "turn",
    episodeId: "ticket-1",
    metadata: { route: "identity" },
  });
  await loop.recordExecution({
    namespace: "client/prod",
    kind: "tool",
    episodeId: "ticket-1",
    parentExecutionId: turn.id,
  });
  await loop.recordSignal({
    namespace: "client/prod",
    episodeId: "ticket-1",
    kind: "outcome",
    name: "ticket_resolved",
    value: true,
    source: "servicenow",
  });

  const findings = await loop.analyze({
    namespace: "client/prod",
    dimensions: ["metadata.route"],
    executionKinds: ["turn"],
    minimumSupport: 1,
    minimumScoredCount: 1,
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.scoredCount, 1);
});

test("evaluates, deploys, supersedes, and rolls back candidates", async () => {
  const loop = new FeedbackLoop(new InMemoryStore());

  async function deploy(version: string) {
    const candidate = await loop.createCandidate({
      namespace: "client/prod",
      target: { kind: "prompt", key: "lex-core" },
      proposedChange: { version },
      evidence: { source: "test" },
    });
    await loop.evaluateCandidate(candidate.id, "test", () => ({
      passed: true,
      metrics: { accuracy: 1 },
    }));
    await loop.approveCandidate(candidate.id);
    return loop.deployCandidate(candidate.id);
  }

  const first = await deploy("18");
  const second = await deploy("19");
  assert.equal((await loop.getCandidate(first.id))?.status, "superseded");
  assert.equal(second.status, "deployed");

  const restored = await loop.rollbackCandidate(second.id);
  assert.equal(restored?.id, first.id);
  assert.equal(restored?.status, "deployed");
  assert.equal((await loop.getCandidate(second.id))?.status, "superseded");
});

test("persists local development state in the JSON store", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ai-feedback-loop-"));
  const filePath = join(directory, "state.json");

  try {
    const writer = new FeedbackLoop(new JsonFileStore(filePath));
    const execution = await writer.recordExecution({
      id: "exec-persisted",
      namespace: "local/dev",
      kind: "prediction",
      input: { value: 1 },
    });
    await writer.recordSignal({
      namespace: "local/dev",
      executionId: execution.id,
      kind: "outcome",
      name: "correct",
      value: true,
      source: "test",
    });
    await writer.close();

    const raw = JSON.parse(await readFile(filePath, "utf8")) as {
      executions: unknown[];
      signals: unknown[];
    };
    assert.equal(raw.executions.length, 1);
    assert.equal(raw.signals.length, 1);

    const reader = new FeedbackLoop(new JsonFileStore(filePath));
    assert.equal((await reader.getExecution("exec-persisted"))?.namespace, "local/dev");
    await reader.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

