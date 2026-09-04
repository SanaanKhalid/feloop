# AI Feedback Loop

A dependency-light, model-agnostic TypeScript framework for connecting production AI executions to later feedback and outcomes, detecting recurring patterns, and managing evaluated improvement candidates.

The core does not host models, fine-tune them, deploy infrastructure, or replace an observability platform. It provides the small coordination layer between those systems.

## Status

Version `0.1.0` implements:

- hierarchical AI executions such as turns, inferences, retrievals, tools, and workflows;
- execution-level and delayed episode-level feedback signals;
- mandatory namespaces for client and environment isolation;
- structured recurring-pattern detection with support, effect, recurrence, entity, confidence, and correction-consensus evidence;
- prompt, routing, rule, retrieval, model, dataset, threshold, tool-schema, workflow, agent-topology, code, capacity, and custom candidates;
- evaluator callbacks, approval, deployment, superseding, and rollback;
- an optional governed self-improvement controller with observe, recommend, experiment, and apply modes;
- in-memory and local single-process JSON stores;
- a small analysis CLI; and
- a runnable Opsentry example.

## Design

```text
AI execution -> signal/outcome -> recurring finding -> candidate
             -> evaluation -> approval -> deployment -> continued measurement
```

The framework distinguishes:

- an **execution**, which is something an AI system predicted, generated, retrieved, routed, or did;
- an **episode**, which joins multiple executions to a conversation, ticket, meal, incident, or task;
- a **signal**, which is a rating, correction, reward, approval, tool result, or delayed outcome;
- a **finding**, which is repeated evidence within a segment; and
- a **candidate**, which is a versioned proposed change evaluated before deployment.

See [Architecture](docs/architecture.md) and [Opsentry integration](docs/opsentry-integration.md).

## Develop

Requires Node.js 22 or newer.

```bash
npm install
npm run typecheck
npm test
```

Run the end-to-end Opsentry example:

```bash
npm run example:opsentry
```

Run the delegated-agent bottleneck and self-improvement example:

```bash
npm run example:self-improving
```

## Quick start

```ts
import { FeedbackLoop, JsonFileStore } from "ai-feedback-loop";

const feedback = new FeedbackLoop(
  new JsonFileStore(".feedback-loop/local.json"),
);

const turn = await feedback.recordExecution({
  namespace: "acme/prod",
  kind: "turn",
  episodeId: "ticket-RITM0012345",
  entityId: "operator-hash",
  input: {
    message: "Remove MFA for this user",
  },
  output: {
    intent: "disable_per_user_mfa",
  },
  artifacts: {
    model: "gpt-5-chat",
    prompt: "lex-core@18",
    policy: "approval-policy@8",
    application: "opsentry@0.1.0",
  },
  metadata: {
    task: "identity.mfa",
    operatorIdHash: "operator-hash",
  },
});

await feedback.recordSignal({
  namespace: "acme/prod",
  executionId: turn.id,
  kind: "correction",
  name: "operator_correct",
  value: false,
  correction: {
    intent: "delete_authentication_methods",
    firstTool: "list_user_authentication_methods",
  },
  source: "operator",
});
```

## Find repeated patterns

Dimensions are JSON paths on the stored execution. The analyzer tests individual dimensions and combinations up to `maximumDimensionDepth`.

```ts
const findings = await feedback.analyze({
  namespace: "acme/prod",
  dimensions: [
    "metadata.task",
    "artifacts.prompt",
    "metadata.route",
  ],
  maximumDimensionDepth: 2,
  executionKinds: ["turn"],
  signalNames: ["operator_correct", "ticket_resolved"],
  minimumSupport: 20,
  minimumScoredCount: 10,
  minimumEffectSize: 0.1,
  minimumRecurrence: 3,
  minimumDistinctEntities: 2,
  entityPath: "metadata.operatorIdHash",
  timeBucket: "week",
});
```

By default, booleans, numbers, and common positive/negative strings are converted to scores. Supply `score(signal)` for application-specific objectives, multi-objective weighting, or metrics whose lower values are better.

## Turn evidence into a candidate

```ts
const candidate = await feedback.createCandidateFromFinding({
  finding: findings[0]!,
  target: {
    kind: "prompt",
    key: "lex-core",
  },
  proposedChange: {
    from: "lex-core@18",
    to: "lex-core@19",
    instruction: "Disambiguate disabling MFA from deleting authentication methods.",
  },
});

await feedback.evaluateCandidate(candidate.id, "historical-replay", async () => ({
  passed: true,
  metrics: {
    intentAccuracy: 0.94,
    approvalCompliance: 1,
  },
}));

await feedback.approveCandidate(candidate.id);
await feedback.deployCandidate(candidate.id);
```

Deployment only changes candidate state. An application adapter remains responsible for applying the prompt, route, model, or configuration pointer. This keeps side effects explicit and application-controlled.

## Governed self-improvement

`SelfImprovementController` closes the loop without giving the framework unrestricted access to production. It analyzes evidence, invokes application-supplied improvement recipes, evaluates proposals, and optionally calls a deployment adapter.

```ts
import { SelfImprovementController } from "ai-feedback-loop";

const controller = new SelfImprovementController(feedback);

await controller.run({
  analysis: {
    namespace: "acme/prod",
    dimensions: ["metadata.resource"],
    executionKinds: ["tool"],
    signalNames: ["within_latency_budget"],
  },
  policy: {
    autonomy: "apply",
    allowedTargets: ["routing"],
    maxAutomaticRisk: "low",
    constraints: [
      { metric: "answerAccuracy", comparator: "gte", value: 0.95 },
      { metric: "policyCompliance", comparator: "eq", value: 1 },
    ],
  },
  recipes: [{
    name: "deduplicate-read-only-lookups",
    matches: (finding) =>
      finding.dimensions["metadata.resource"] === "servicenow_lookup",
    propose: () => ({
      target: { kind: "routing", key: "lex-ticket-reads" },
      proposedChange: { version: "ticket-reads@2", cacheWithinEpisode: true },
      risk: "low",
    }),
  }],
  evaluator: replayCandidateWithMockedTools,
  deployer: updateClientScopedVersionPointer,
});
```

Autonomy is intentionally graduated:

- `observe`: find trends only;
- `recommend`: create reviewable candidates;
- `experiment`: run candidates through the evaluator but do not deploy; and
- `apply`: deploy only candidates within the configured risk ceiling and metric constraints.

Agent, workflow, code, model, dataset, capacity, and topology changes can be represented, but risky changes should remain in recommend or experiment mode. Recipes can call an LLM, trainer, or optimizer; they are adapters rather than runtime dependencies.

## Hierarchical executions

Record tool, retrieval, or additional model steps under a turn:

```ts
const tool = await feedback.recordExecution({
  namespace: turn.namespace,
  kind: "tool",
  episodeId: turn.episodeId,
  parentExecutionId: turn.id,
  input: {
    name: "list_user_authentication_methods",
  },
});

await feedback.completeExecution(tool.id, {
  output: {
    status: "success",
  },
});
```

Signals may target a precise execution or an entire episode. When analysis is restricted to `executionKinds: ["turn"]`, a delayed episode outcome is attributed once to the turn instead of once per tool step.

## CLI

Analyze a local JSON store:

```bash
npm run build
node dist/src/cli.js analyze \
  --store .feedback-loop/local.json \
  --namespace acme/prod \
  --dimensions metadata.task,artifacts.prompt \
  --signal-names operator_correct \
  --min-support 20 \
  --min-effect 0.1
```

List candidates:

```bash
node dist/src/cli.js candidates \
  --store .feedback-loop/local.json \
  --namespace acme/prod
```

## Storage

`InMemoryStore` is intended for tests and examples. `JsonFileStore` is intended for local, single-process development and uses serialized temporary-file replacement.

Production systems should implement the small `FeedbackStore` interface using their transactional database. The framework has no runtime dependencies and does not require applications to adopt a particular database.

## Privacy and safety

- Redact or tokenize sensitive payloads before calling the framework.
- Use a namespace such as `client/environment` on every record.
- Do not pool client data unless contracts, consent, and isolation policy explicitly allow it.
- Treat implicit behavior as weaker evidence than corrections or verified outcomes.
- Keep approval, authorization, tenant isolation, and tool allowlists outside learned prompts and models.
- Replay candidates with mocked or read-only tools before deployment.
- Do not train directly on negative examples; pair them with a verified correction first.

## Non-goals

The core intentionally does not provide model hosting, prompt generation, fine-tuning jobs, vector storage, annotation UI, queues, a web dashboard, or automatic production mutation. Those belong in optional adapters.
