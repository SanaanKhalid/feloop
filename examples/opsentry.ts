import { FeedbackLoop, InMemoryStore } from "../src/index.js";

const loop = new FeedbackLoop(new InMemoryStore());
const namespace = "acme/prod";

for (let index = 0; index < 24; index += 1) {
  const isMfaRequest = index < 14;
  const occurredAt = new Date(Date.UTC(2026, 7, 1 + index)).toISOString();
  const execution = await loop.recordExecution({
    namespace,
    kind: "turn",
    episodeId: `ticket-RITM${String(1000 + index)}`,
    entityId: `operator-${index % 4}`,
    input: {
      message: isMfaRequest ? "Remove MFA for this user" : "Add Alex to the Finance group",
    },
    output: {
      intent: isMfaRequest ? "disable_per_user_mfa" : "add_user_to_group",
    },
    artifacts: {
      model: "gpt-5-chat",
      prompt: "lex-core@18",
      application: "opsentry@0.1.0",
    },
    metadata: {
      task: isMfaRequest ? "identity.mfa" : "identity.group_membership",
      operatorIdHash: `operator-${index % 4}`,
    },
    startedAt: occurredAt,
    completedAt: occurredAt,
  });

  await loop.recordSignal({
    namespace,
    executionId: execution.id,
    ...(execution.episodeId ? { episodeId: execution.episodeId } : {}),
    kind: isMfaRequest ? "correction" : "outcome",
    name: "operator_correct",
    value: !isMfaRequest,
    ...(isMfaRequest
      ? {
          correction: {
            intent: "delete_authentication_methods",
            firstTool: "list_user_authentication_methods",
          },
        }
      : {}),
    source: isMfaRequest ? "operator" : "tool_result",
    observedAt: occurredAt,
  });
}

const findings = await loop.analyze({
  namespace,
  dimensions: ["metadata.task", "artifacts.prompt"],
  maximumDimensionDepth: 2,
  executionKinds: ["turn"],
  signalNames: ["operator_correct"],
  minimumSupport: 5,
  minimumScoredCount: 5,
  minimumEffectSize: 0.1,
  minimumRecurrence: 2,
  minimumDistinctEntities: 2,
  timeBucket: "week",
});

const mfaFinding = findings.find(
  (finding) => finding.dimensions["metadata.task"] === "identity.mfa",
);

if (!mfaFinding) {
  throw new Error("The example did not find the expected MFA trend.");
}

const candidate = await loop.createCandidateFromFinding({
  finding: mfaFinding,
  target: {
    kind: "prompt",
    key: "lex-core",
  },
  proposedChange: {
    from: "lex-core@18",
    to: "lex-core@19",
    instruction:
      "Distinguish disabling per-user MFA from deleting registered authentication methods.",
  },
});

const evaluated = await loop.evaluateCandidate(candidate.id, "opsentry-replay", async () => ({
  passed: true,
  metrics: {
    intentAccuracyBefore: 0.72,
    intentAccuracyAfter: 0.94,
    approvalCompliance: 1,
  },
  notes: "Passed redacted historical replay with mocked tools.",
}));

await loop.approveCandidate(evaluated.id);
const deployed = await loop.deployCandidate(evaluated.id);

process.stdout.write(
  `${JSON.stringify(
    {
      topFinding: mfaFinding,
      deployedCandidate: deployed,
    },
    null,
    2,
  )}\n`,
);

await loop.close();
