import {
  FeedbackLoop,
  InMemoryStore,
  SelfImprovementController,
} from "../src/index.js";

const loop = new FeedbackLoop(new InMemoryStore());
const namespace = "acme/prod";

// Lex delegates ticket research to a child agent, which then calls a resource.
// The local intent route is healthy; repeated ServiceNow reads miss the latency budget.
for (let index = 0; index < 20; index += 1) {
  const usesServiceNow = index < 12;
  const occurredAt = new Date(Date.UTC(2026, 4, 1 + index * 4)).toISOString();
  const episodeId = `incident-${1000 + index}`;
  const root = await loop.recordExecution({
    namespace,
    kind: "agent",
    episodeId,
    entityId: `operator-${index % 5}`,
    artifacts: { application: "opsentry@0.1.0", prompt: "lex-core@18" },
    metadata: { agentRole: "lex-orchestrator" },
    startedAt: occurredAt,
  });
  const child = await loop.recordExecution({
    namespace,
    kind: "agent",
    episodeId,
    parentExecutionId: root.id,
    metadata: {
      agentRole: usesServiceNow ? "ticket-researcher" : "intent-classifier",
    },
    startedAt: occurredAt,
  });
  const resource = await loop.recordExecution({
    namespace,
    kind: "tool",
    episodeId,
    parentExecutionId: child.id,
    metadata: {
      resource: usesServiceNow ? "servicenow_lookup" : "local_intent_router",
      queueWaitMs: usesServiceNow ? 900 + index * 30 : 5,
    },
    startedAt: occurredAt,
    completedAt: occurredAt,
  });
  await loop.recordSignal({
    namespace,
    executionId: resource.id,
    kind: "outcome",
    name: "within_latency_budget",
    value: !usesServiceNow,
    source: "runtime",
    observedAt: occurredAt,
  });
}

let activeRoutingVersion = "ticket-reads@1";
const controller = new SelfImprovementController(loop);
const result = await controller.run({
  analysis: {
    namespace,
    dimensions: ["metadata.resource"],
    executionKinds: ["tool"],
    signalNames: ["within_latency_budget"],
    minimumSupport: 5,
    minimumScoredCount: 5,
    minimumEffectSize: 0.2,
    minimumRecurrence: 3,
    timeBucket: "week",
  },
  policy: {
    autonomy: "apply",
    allowedTargets: ["routing"],
    maxAutomaticRisk: "low",
    maximumCandidatesPerRun: 2,
    constraints: [
      { metric: "p95LatencyImprovement", comparator: "gte", value: 0.2 },
      { metric: "answerAccuracy", comparator: "gte", value: 0.95 },
      { metric: "tenantIsolation", comparator: "eq", value: 1 },
      { metric: "approvalCompliance", comparator: "eq", value: 1 },
    ],
  },
  recipes: [
    {
      name: "deduplicate-read-only-ticket-fetches",
      matches: (finding) =>
        finding.dimensions["metadata.resource"] === "servicenow_lookup" &&
        (finding.effectSize ?? 0) < 0,
      propose: () => ({
        target: { kind: "routing", key: "lex-ticket-reads" },
        proposedChange: {
          from: "ticket-reads@1",
          to: "ticket-reads@2",
          action: "reuse identical read-only lookups within one ticket episode",
          invalidation: "end of agent turn",
        },
        risk: "low",
      }),
    },
  ],
  evaluatorName: "opsentry-historical-replay",
  evaluator: () => ({
    passed: true,
    metrics: {
      p95LatencyImprovement: 0.31,
      answerAccuracy: 0.98,
      tenantIsolation: 1,
      approvalCompliance: 1,
    },
    notes: "Passed redacted replay with mocked write tools.",
  }),
  deployer: () => {
    // A real Opsentry adapter would atomically update a client-scoped version pointer.
    activeRoutingVersion = "ticket-reads@2";
  },
});

process.stdout.write(
  `${JSON.stringify(
    {
      bottleneck: result.findings.find(
        (finding) => finding.dimensions["metadata.resource"] === "servicenow_lookup",
      ),
      activeRoutingVersion,
      deployedCandidate: result.deployed[0],
      blocked: result.blocked,
    },
    null,
    2,
  )}\n`,
);

await loop.close();
