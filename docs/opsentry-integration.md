# Opsentry Integration

Opsentry is the first reference integration for Feloop. The framework remains independent of Lex, Azure OpenAI, ServiceNow, Microsoft Graph, and Opsentry's policy engine.

## Integration topology

```text
Opsentry client -> Opsentry API -> Azure OpenAI and tools
                       |
                       +-> FeedbackLoop -> Opsentry Azure SQL adapter

Opsentry worker -> FeedbackLoop.analyze -> candidate/evaluation records
```

No new deployed service is required.

## 1. Durable turn identity

At the beginning of `executeAgentChatTurn`, record a `turn` execution and return its ID as `turnId` in `AgentChatResponsePayload`.

The execution should include:

- namespace: `${clientSlug}/${environment}`;
- episode ID: stable chat session or ServiceNow ticket identity;
- entity ID: a one-way operator identifier;
- redacted operator message and recent context;
- model, prompt, router, knowledge, policy, and application versions; and
- route, inferred task, intent, reasoning effort, and client-safe metadata.

Complete the execution after the final response is sanitized. Failures should still complete the turn with error metadata so operational failures are measurable.

## 2. Child execution steps

Create child executions for model generations, retrievals, and tool calls when step-level feedback is useful. Record structured tool arguments and results only after applying Opsentry's redaction rules.

Do not persist hidden chain-of-thought. Preserve only classification, extracted fields, policy evidence, selected workflow, approvals, tool calls, and action results.

## 3. Client response and history

Add `turnId`, `promptVersion`, and `modelVersion` to the API response and the client's `ChatMessage` type. Retain the local UI message ID for rendering.

When sending the next message, include `replyToTurnId` or turn IDs on history items. This permits deterministic attribution of corrections such as "No, I meant remove the registered methods" to the preceding Lex response.

## 4. Feedback endpoint

Add an authenticated endpoint such as:

```http
POST /api/agent/feedback
```

```json
{
  "turnId": "exec_...",
  "rating": "negative",
  "reasons": ["wrong_intent", "wrong_tool"],
  "correction": {
    "intent": "delete_authentication_methods",
    "firstTool": "list_user_authentication_methods"
  }
}
```

Validate that the target execution belongs to the authenticated client namespace before recording any signal.

## 5. Evidence sources

Translate existing Opsentry events into signals:

| Source | Suggested signal | Confidence |
| --- | --- | --- |
| Corrected response or action | `operator_correction` | 1.0 |
| Operator selected a different tool | `tool_correction` | 1.0 |
| Ticket resolved and stayed resolved | `ticket_resolved` | 0.9 |
| Ticket reopened | `ticket_reopened` | 0.9 |
| Approved plan followed by successful tool result | `approved_execution_success` | 0.85 |
| Explicit thumbs up/down | `operator_rating` | 0.7 |
| Operator restated the request | `possible_restatement` | 0.4 |
| Silence or session abandonment | Do not score by default | n/a |

Approval and tool outcomes should point to the relevant child execution when available. ServiceNow outcomes should normally point to the ticket episode.

## 6. Initial pattern job

Run analysis from the existing Opsentry worker on a daily or weekly schedule. Start with structured dimensions:

```ts
await feedback.analyze({
  namespace: `${clientSlug}/${environment}`,
  dimensions: [
    "metadata.taskKey",
    "metadata.intent",
    "metadata.route",
    "artifacts.prompt",
    "artifacts.model"
  ],
  maximumDimensionDepth: 2,
  executionKinds: ["turn"],
  minimumSupport: 20,
  minimumScoredCount: 10,
  minimumEffectSize: 0.1,
  minimumRecurrence: 3,
  minimumDistinctEntities: 2,
  entityPath: "metadata.operatorIdHash",
  timeBucket: "week"
});
```

Add semantic clustering only after structured findings are useful. Text embeddings and vector infrastructure are not required for the first implementation.

## 7. Candidate scope

Choose the candidate namespace and target based on where evidence recurs:

- one operator: preference or vocabulary memory;
- several operators in one client: client prompt/policy pack;
- several opted-in clients: deidentified product-level candidate; or
- many verified examples with stable targets: fine-tuning dataset candidate.

Never use one client's raw records to modify another client's prompt or model.

## 8. Evaluation

Use Opsentry's existing injected API tests as the first replay harness. Convert accepted production corrections into redacted, immutable fixtures and run the champion and candidate with mocked tool results.

Required gates should include:

- intent and tool-selection accuracy;
- required-field extraction;
- unnecessary clarification rate;
- approval compliance;
- unsafe write attempts;
- response usefulness;
- latency and cost; and
- regressions on unrelated task families.

The policy engine, tenant boundary, tool allowlist, and required approval checks remain protected application invariants. A prompt or fine-tuned model cannot override them.

## 9. Promotion

The framework records approval and deployment state. An Opsentry deployment adapter updates the applicable version pointer only after evaluation. Begin with human approval; automatic promotion can be enabled later for explicitly low-risk, client-scoped configuration changes.

Start with historical replay, then shadow evaluation, and only then limited production exposure. Retain the previous candidate for one-step rollback.

## 10. Self-improving Opsentry

Opsentry's agent runtime remains responsible for running or spawning agents. The feedback framework observes that delegation tree and can recommend or safely apply a changed prompt, route, workflow, model, or topology through Opsentry-owned adapters.

For one Lex interaction, the tree might be:

```text
operator message
  -> Lex orchestrator agent
      -> ticket-research agent
          -> ServiceNow lookup tool
      -> classification model
  -> operator correction and eventual ticket outcome
```

Record each useful node with the same `episodeId` and a `parentExecutionId`. Include redacted input/output plus structured duration, queue wait, token cost, retry count, route, agent role, and resource metadata. This allows the same analysis layer to learn both behavior patterns (for example, how operators phrase MFA requests) and systems patterns (for example, ServiceNow lookups consuming most of the turn latency).

Run `SelfImprovementController` from the existing worker with an autonomy policy:

- `observe`: surface operator-language trends and bottlenecks;
- `recommend`: create a prompt, routing, workflow, model, capacity, or agent-topology candidate;
- `experiment`: run the candidate against redacted replay fixtures or shadow traffic; and
- `apply`: call an Opsentry deployment adapter only for allowed, low-risk changes that pass every gate.

A typical closed loop is:

1. Repeated operator corrections reveal that “remove MFA” means delete registered methods for a particular client.
2. A prompt recipe proposes a new client prompt-pack version.
3. Replay measures intent accuracy, tool choice, policy compliance, latency, and unrelated-task regressions.
4. The version pointer changes only if all constraints pass and its risk is within policy.
5. New production turns continue to record outcomes against the new version.
6. A regression monitor rolls back through the candidate lifecycle or alerts an operator.

The bottleneck path is identical: repeated resource signals can propose request-local caching, routing, concurrency, batching, capacity, or topology changes. Code, model, capacity, and agent-topology proposals should normally remain in `recommend` or `experiment`; automatic `apply` should start with reversible configuration pointers.

Do not fine-tune directly on raw chat logs. Build datasets only from redacted examples with a verified correction or real-world outcome, preserve client namespaces, hold out evaluation data, and retain a human-readable record of why each training example was accepted.

## Suggested implementation sequence

1. Build the Opsentry `FeedbackStore` Azure SQL adapter.
2. Add durable turns and return `turnId` from chat.
3. Add explicit feedback and correction controls.
4. Connect approval, tool, workflow, and ServiceNow outcomes.
5. Run read-only structured analysis and review findings manually.
6. Extract and version Lex prompt packs.
7. Add replay evaluation and manual prompt promotion.
8. Enable `recommend`, then `experiment`, for approved improvement recipes.
9. Allow `apply` only for reversible, low-risk client-scoped pointers.
10. Add training-dataset export after verified corrections accumulate.
