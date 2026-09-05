# Architecture

## Core boundary

Feloop is an embeddable coordination library. It owns the durable vocabulary and lifecycle between production execution and application-controlled improvement:

```text
capture -> correlate -> analyze -> propose -> evaluate -> approve -> deploy state
```

It deliberately does not own the infrastructure used to generate, train, host, or physically deploy an AI artifact.

The optional `SelfImprovementController` orchestrates these same primitives. It does not add a second data model or require a separate service.

## Data model

### Execution

An execution represents one observable AI-system operation. `kind` identifies whether it is an agent, turn, model inference, prediction, retrieval, tool call, workflow, or custom step.

Executions can form a tree through `parentExecutionId`. An `episodeId` joins the tree and later real-world outcomes. `namespace` is mandatory and should represent the application's data-isolation boundary.

`artifacts` records every version that may have affected behavior. A compound AI system can record model, prompt, router, tool schema, knowledge, policy, and application versions on the same execution.

### Signal

A signal is evidence observed after or during an execution. It can target a precise execution or an episode. Its confidence expresses evidentiary weight, not model confidence.

Corrections are stored separately from the original value. This preserves negative evidence while providing a usable target for supervised evaluation or training.

### Finding

The structured analyzer reads executions and their attached signals, then evaluates categorical segments generated from configured JSON paths.

For each segment it reports:

- execution support;
- scored signal count;
- weighted segment and baseline scores;
- effect size;
- approximate difference confidence;
- recurrence across UTC time buckets;
- distinct affected entities;
- representative execution IDs; and
- correction consensus.

The confidence value is an inexpensive normal approximation intended for prioritization, not a replacement for a domain-specific statistical evaluation. Applications can provide their own scoring function and use custom evaluation gates.

### Candidate

A candidate describes a proposed change to a named target. Candidate state transitions are explicit:

```text
proposed -> evaluated -> approved -> deployed -> superseded
                         \-> rejected
```

Deployment is a registry transition. The application decides whether and how to apply the proposed change. Deploying a candidate supersedes the currently deployed candidate for the same namespace, target kind, and key. Rollback restores the most recently superseded candidate.

Every candidate has a risk classification. The controller compares it with the policy's automatic-risk ceiling before promotion. Risk does not replace application authorization; it is an additional gate.

## Governed self-improvement

A self-improving system is a closed, measured control loop:

```text
goal and invariants
        |
        v
agent execution tree -> outcomes and resource signals -> recurring finding
        ^                                                |
        |                                                v
deployed version <- guarded promotion <- evaluation <- proposed change
```

The execution tree makes delegation observable. For example, a Lex root agent can create a ticket-research subagent, which calls ServiceNow. Each node records elapsed time, queue wait, cost, failures, and outcome signals. Analysis by `metadata.agentRole`, `metadata.resource`, or `metadata.route` can show that the ServiceNow lookup—not the reasoning model—is the repeated bottleneck.

An improvement recipe converts a matching finding into a typed proposal. Recipes can be ordinary functions, an LLM prompt optimizer, a training job planner, or an infrastructure optimizer. They can target prompts, retrieval, routing, models, datasets, thresholds, tool schemas, workflows, agent topology, code, or capacity.

The controller exposes four autonomy levels:

| Level | Framework action | Production mutation |
| --- | --- | --- |
| `observe` | Detect and rank findings | Never |
| `recommend` | Create deduplicated candidates | Never |
| `experiment` | Create and evaluate candidates | Never |
| `apply` | Evaluate, approve, call the deployment adapter, and register deployment | Only within policy |

An `apply` policy must explicitly list allowed target kinds. Automatic changes must pass the application evaluator, every metric constraint, the per-run candidate budget, and the maximum risk setting. Terminal proposals are deduplicated so a scheduled controller does not repeatedly apply the same change.

Protected invariants—authorization, tenant isolation, approval requirements, tool allowlists, privacy rules, and spend limits—remain deterministic application policy. The system may optimize within them, but it may not learn or rewrite them.

Model retraining follows the same lifecycle. A recipe can propose a model or dataset version, while an evaluator launches the external fine-tuning job and compares its artifact against the current champion. The framework records evidence and lifecycle state; it does not ship a training runtime.

## Runtime profile

The core has no runtime package dependencies. Applications may embed it directly in an API process and invoke analysis from an existing worker or scheduled job.

```text
application API -> FeedbackLoop -> FeedbackStore implementation
application worker -> FeedbackLoop.analyze(...)
```

No additional network service is required.

## Extension points

- `FeedbackStore`: transactional application database adapter.
- `AnalyzeOptions.score`: maps domain-specific signals to an objective score.
- `CandidateEvaluator`: replays or scores a candidate using application infrastructure.
- `ImprovementRecipe`: turns recurring findings into bounded, typed proposals.
- `CandidateDeployer`: applies an approved version through application-controlled infrastructure.
- Candidate target and proposed-change payloads: allow application-specific deployment adapters without coupling them to the core.

Future optional packages can provide embedding detectors, prompt optimizers, training providers, SQL adapters, dashboards, or annotation workflows without changing the core contract.
