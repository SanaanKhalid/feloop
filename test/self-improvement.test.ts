import assert from "node:assert/strict";
import test from "node:test";
import {
  FeedbackLoop,
  InMemoryStore,
  SelfImprovementController,
  type AnalyzeOptions,
  type ImprovementRecipe,
} from "../src/index.js";

async function makeLoopWithRecurringBottleneck(): Promise<FeedbackLoop> {
  const loop = new FeedbackLoop(new InMemoryStore());

  for (let index = 0; index < 8; index += 1) {
    const bottleneck = index < 4;
    const timestamp = new Date(Date.UTC(2026, 0, 1 + index * 7)).toISOString();
    const execution = await loop.recordExecution({
      namespace: "client/prod",
      kind: "agent",
      entityId: `workflow-${index}`,
      metadata: {
        agentRole: bottleneck ? "ticket-researcher" : "ticket-classifier",
        resource: bottleneck ? "servicenow_lookup" : "intent_router",
      },
      startedAt: timestamp,
    });
    await loop.recordSignal({
      namespace: "client/prod",
      executionId: execution.id,
      kind: "outcome",
      name: "within_latency_budget",
      value: !bottleneck,
      source: "runtime",
      observedAt: timestamp,
    });
  }

  return loop;
}

const analysis: AnalyzeOptions = {
  namespace: "client/prod",
  dimensions: ["metadata.resource"],
  executionKinds: ["agent"],
  signalNames: ["within_latency_budget"],
  minimumSupport: 2,
  minimumScoredCount: 2,
  minimumEffectSize: 0.2,
  minimumRecurrence: 2,
  timeBucket: "week",
};

function recipe(
  target: "prompt" | "routing" | "agent_topology",
  risk: "low" | "medium" | "high",
): ImprovementRecipe {
  return {
    name: "reduce-servicenow-bottleneck",
    matches: (finding) => finding.dimensions["metadata.resource"] === "servicenow_lookup",
    propose: () => ({
      target: { kind: target, key: "lex-ticket-workflow" },
      proposedChange: {
        action: "cache_repeated_ticket_reads",
        expectedEffect: "lower queue wait without changing authorization",
      },
      risk,
    }),
  };
}

test("recommend mode creates and deduplicates an evidence-backed candidate", async () => {
  const loop = await makeLoopWithRecurringBottleneck();
  const controller = new SelfImprovementController(loop);
  const input = {
    analysis,
    policy: {
      autonomy: "recommend" as const,
      allowedTargets: ["prompt" as const],
    },
    recipes: [recipe("prompt", "medium")],
  };

  const first = await controller.run(input);
  const second = await controller.run(input);

  assert.equal(first.candidates.length, 1);
  assert.equal(first.candidates[0]?.status, "proposed");
  assert.equal(first.candidates[0]?.risk, "medium");
  assert.equal(second.candidates[0]?.id, first.candidates[0]?.id);
  assert.equal((await loop.listCandidates()).length, 1);
});

test("apply mode deploys a low-risk candidate only after evaluation constraints pass", async () => {
  const loop = await makeLoopWithRecurringBottleneck();
  const controller = new SelfImprovementController(loop);
  const applied: string[] = [];

  const result = await controller.run({
    analysis,
    policy: {
      autonomy: "apply",
      allowedTargets: ["routing"],
      maxAutomaticRisk: "low",
      constraints: [
        { metric: "replaySuccess", comparator: "gte", value: 0.95 },
        { metric: "policyCompliance", comparator: "eq", value: 1 },
      ],
    },
    recipes: [recipe("routing", "low")],
    evaluatorName: "opsentry-readonly-replay",
    evaluator: () => ({
      passed: true,
      metrics: { replaySuccess: 0.98, policyCompliance: 1 },
    }),
    deployer: (candidate) => {
      applied.push(candidate.id);
    },
  });

  assert.equal(result.deployed.length, 1);
  assert.equal(result.deployed[0]?.status, "deployed");
  assert.deepEqual(applied, [result.deployed[0]?.id]);
  assert.deepEqual(result.blocked, []);
});

test("apply mode evaluates but does not deploy a change above the automatic risk limit", async () => {
  const loop = await makeLoopWithRecurringBottleneck();
  const controller = new SelfImprovementController(loop);
  let deployCalls = 0;

  const result = await controller.run({
    analysis,
    policy: {
      autonomy: "apply",
      allowedTargets: ["agent_topology"],
      maxAutomaticRisk: "low",
    },
    recipes: [recipe("agent_topology", "high")],
    evaluator: () => ({ passed: true, metrics: { replaySuccess: 1 } }),
    deployer: () => {
      deployCalls += 1;
    },
  });

  assert.equal(result.candidates[0]?.status, "evaluated");
  assert.equal(result.deployed.length, 0);
  assert.equal(deployCalls, 0);
  assert.equal(result.blocked[0]?.reason, "risk_exceeds_policy");
});

test("experiment mode rejects a candidate that misses an evaluation constraint", async () => {
  const loop = await makeLoopWithRecurringBottleneck();
  const controller = new SelfImprovementController(loop);

  const result = await controller.run({
    analysis,
    policy: {
      autonomy: "experiment",
      allowedTargets: ["prompt"],
      constraints: [{ metric: "answerAccuracy", comparator: "gte", value: 0.95 }],
    },
    recipes: [recipe("prompt", "medium")],
    evaluator: () => ({
      passed: true,
      metrics: { answerAccuracy: 0.9 },
    }),
  });

  assert.equal(result.candidates[0]?.status, "evaluated");
  assert.equal(result.candidates[0]?.evaluations[0]?.passed, false);
  assert.match(result.blocked[0]?.detail ?? "", /answerAccuracy must be gte 0.95/);
});
