import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  ["overview", "Overview"],
  ["installation", "Installation"],
  ["analysis", "Pattern analysis"],
  ["candidates", "Candidates"],
  ["self-improvement", "Self-improvement"],
  ["architecture", "Architecture"],
  ["execution-model", "Execution model"],
  ["signals", "Signals & outcomes"],
  ["evaluation", "Evaluation"],
  ["deployment", "Deployment & rollback"],
  ["fine-tuning", "Fine-tuning"],
  ["agent-systems", "Agent systems"],
  ["storage", "Storage"],
  ["security", "Privacy & safety"],
  ["production", "Production operation"],
  ["api", "API reference"],
  ["pitfalls", "Common pitfalls"],
  ["faq", "FAQ"],
];

function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function CodeBlock({ title, children }: { title: string; children: string }) {
  return (
    <div className="doc-code">
      <div className="doc-code-bar"><span>{title}</span><span>TYPESCRIPT</span></div>
      <pre><code>{children}</code></pre>
    </div>
  );
}

function DocSection({
  id,
  number,
  title,
  intro,
  children,
}: {
  id: string;
  number: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section className="doc-section" id={id}>
      <div className="doc-kicker">{number} / DOCUMENTATION</div>
      <h2>{title}</h2>
      <p className="doc-intro">{intro}</p>
      {children}
    </section>
  );
}

function FieldTable({ rows }: { rows: Array<[string, string, string]> }) {
  return (
    <div className="field-table">
      <div className="field-row field-head"><span>FIELD</span><span>REQUIRED</span><span>PURPOSE</span></div>
      {rows.map(([field, required, purpose]) => (
        <div className="field-row" key={field}>
          <code>{field}</code><span>{required}</span><p>{purpose}</p>
        </div>
      ))}
    </div>
  );
}

const quickStart = [
  'import { FeedbackLoop, JsonFileStore } from "feloop";',
  "",
  "const loop = new FeedbackLoop(",
  '  new JsonFileStore(".feedback-loop/local.json")',
  ");",
  "",
  "const execution = await loop.recordExecution({",
  '  namespace: "acme/prod",',
  '  kind: "turn",',
  '  episodeId: "ticket-1842",',
  '  entityId: "operator-hash",',
  '  input: { message: "Remove MFA for this user" },',
  '  output: { intent: "disable_per_user_mfa" },',
  "  artifacts: {",
  '    model: "model@4",',
  '    prompt: "support-core@18",',
  '    policy: "approval-policy@8"',
  "  },",
  '  metadata: { task: "identity.mfa" }',
  "});",
  "",
  "await loop.recordSignal({",
  '  namespace: "acme/prod",',
  "  executionId: execution.id,",
  '  kind: "correction",',
  '  name: "operator_correct",',
  "  value: false,",
  '  correction: { intent: "delete_authentication_methods" },',
  '  source: "operator"',
  "});",
].join("\n");

export default function DocsPage() {
  return (
    <main className="docs-page">
      <header className="docs-header">
        <Link href="/" className="brand"><Mark /><span>Feloop</span></Link>
        <div className="docs-version"><span className="pulse-dot" /> DOCS / v0.1.0</div>
        <Link href="/" className="docs-home">HOME ↗</Link>
      </header>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          <div className="sidebar-label">DOCUMENTATION</div>
          <nav aria-label="Documentation">
            {navigation.map(([id, label], index) => (
              <a href={"#" + id} key={id}><span>{String(index + 1).padStart(2, "0")}</span>{label}</a>
            ))}
          </nav>
        </aside>

        <article className="docs-content">
          <section className="docs-hero grid-surface" id="overview">
            <div className="doc-kicker">COMPLETE GUIDE / VERSION 0.1.0</div>
            <h1>Build a learning loop around any AI system.</h1>
            <p>Feloop is a dependency-light TypeScript coordination layer for connecting production AI behavior to later feedback and outcomes, detecting recurring patterns, and governing how improvements are proposed, evaluated, deployed, and rolled back.</p>
            <div className="docs-callouts">
              <div><strong>MODEL-AGNOSTIC</strong><span>LLMs, classifiers, predictors, agents, and workflows</span></div>
              <div><strong>EMBEDDABLE</strong><span>No required service, queue, model host, or vector database</span></div>
              <div><strong>GOVERNED</strong><span>Evidence, risk, evaluation, policy, promotion, and rollback</span></div>
            </div>
          </section>

          <DocSection
            id="installation"
            number="01"
            title="Installation and first loop"
            intro="The current repository is a TypeScript package for Node.js 22 or newer. Use the in-memory store for tests, the JSON store for local development, and an application database adapter in production."
          >
            <h3>Install from source</h3>
            <CodeBlock title="terminal">git clone YOUR_REPOSITORY_URL{"\n"}cd ai-feedback-loop{"\n"}npm install{"\n"}npm run typecheck{"\n"}npm test</CodeBlock>
            <div className="doc-note"><strong>Package status</strong><p>The package is currently private and has not been published to npm. Its package name is <code>feloop</code>; the core class remains <code>FeedbackLoop</code>. The local checkout is still named <code>ai-feedback-loop</code>.</p></div>
            <h3>Minimal end-to-end example</h3>
            <CodeBlock title="feedback-loop.ts">{quickStart}</CodeBlock>
            <p>This example creates one execution and one correction signal. The important property is durable attribution: the correction points back to the exact model, prompt, policy, application version, input, and output that produced the behavior.</p>
          </DocSection>

          <DocSection
            id="analysis"
            number="02"
            title="Pattern analysis"
            intro="The analyzer turns isolated feedback into recurring findings. It segments executions by JSON-path dimensions, joins matching signals, scores them, compares each segment with the namespace baseline, and applies support, recurrence, and breadth thresholds."
          >
            <CodeBlock title="analyze-patterns.ts">{[
              "const findings = await loop.analyze({",
              '  namespace: "acme/prod",',
              '  dimensions: ["metadata.task", "metadata.route", "artifacts.prompt"],',
              "  maximumDimensionDepth: 2,",
              '  executionKinds: ["turn"],',
              '  signalNames: ["operator_correct", "ticket_resolved"],',
              "  minimumSupport: 20,",
              "  minimumScoredCount: 10,",
              "  minimumEffectSize: 0.10,",
              "  minimumRecurrence: 3,",
              "  minimumDistinctEntities: 2,",
              '  entityPath: "metadata.operatorIdHash",',
              '  timeBucket: "week"',
              "});",
            ].join("\n")}</CodeBlock>
            <h3>How segmentation works</h3>
            <ol>
              <li>The store returns executions and signals inside the requested namespace and time window.</li>
              <li>Execution and signal filters remove irrelevant operation types and metrics.</li>
              <li>The analyzer generates every dimension combination up to <code>maximumDimensionDepth</code>. With three dimensions and a depth of two, it evaluates three one-field and three two-field segments.</li>
              <li>Signals are attached by execution ID and, unless disabled, by episode ID.</li>
              <li>Each eligible signal becomes a numeric score. Signal confidence is used as its weight.</li>
              <li>Segments below the support, scored-count, recurrence, entity, or effect threshold are removed.</li>
              <li>The remaining findings are ranked by absolute effect multiplied by the square root of scored count.</li>
            </ol>
            <FieldTable rows={[
              ["dimensions", "yes", "JSON paths evaluated as segment keys, for example metadata.task or artifacts.prompt."],
              ["maximumDimensionDepth", "no", "Largest combination size. Defaults to the smaller of two or the number of supplied dimensions."],
              ["executionKinds", "no", "Limits analysis to selected operation kinds."],
              ["signalNames / signalKinds", "no", "Limits which evidence contributes to the analysis."],
              ["since / until", "no", "ISO time bounds applied to execution and signal queries."],
              ["minimumSupport", "no", "Minimum unique executions in a segment. Default: 5."],
              ["minimumScoredCount", "no", "Minimum scoreable signals. Default: 2."],
              ["minimumEffectSize", "no", "Minimum absolute difference from baseline. Default: 0."],
              ["minimumRecurrence", "no", "Minimum distinct time buckets containing evidence. Default: 1."],
              ["minimumDistinctEntities", "no", "Minimum unique people, devices, tenants, or other entities. Default: 0."],
              ["timeBucket", "no", "Day, week, or month. Default: week."],
              ["includeEpisodeSignals", "no", "Includes delayed episode outcomes by default. Set false for direct signals only."],
              ["entityPath", "no", "Alternative JSON path for breadth counting; otherwise entityId is used."],
              ["score", "no", "Application-defined function that maps a signal to a number or excludes it with undefined."],
            ]} />
            <h3>Default scoring</h3>
            <p>Booleans become 1 or 0. Finite numbers remain numeric. Common positive strings such as <code>correct</code>, <code>resolved</code>, and <code>approved</code> become 1; negative strings such as <code>incorrect</code>, <code>reopened</code>, and <code>denied</code> become 0. Everything else is excluded unless a custom scorer handles it.</p>
            <CodeBlock title="custom-score.ts">{[
              "const findings = await loop.analyze({",
              '  namespace: "acme/prod",',
              '  dimensions: ["metadata.resource"],',
              '  signalNames: ["latency_ms", "resolved"],',
              "  score: (signal) => {",
              '    if (signal.name === "latency_ms" && typeof signal.value === "number") {',
              "      return Math.max(0, 1 - signal.value / 5000);",
              "    }",
              '    if (signal.name === "resolved") return signal.value === true ? 1 : 0;',
              "    return undefined;",
              "  }",
              "});",
            ].join("\n")}</CodeBlock>
            <h3>Reading a finding</h3>
            <div className="metric-grid">
              <div><strong>support</strong><p>Unique executions matching the segment.</p></div>
              <div><strong>scoredCount</strong><p>Signals successfully converted to numeric scores.</p></div>
              <div><strong>meanScore</strong><p>Confidence-weighted score inside the segment.</p></div>
              <div><strong>baselineScore</strong><p>Confidence-weighted score across all selected evidence.</p></div>
              <div><strong>effectSize</strong><p>Segment mean minus baseline. Negative values identify underperformance.</p></div>
              <div><strong>confidence</strong><p>An approximate two-sided normal confidence for the segment-versus-rest difference.</p></div>
              <div><strong>recurrence</strong><p>Number of day, week, or month buckets containing segment evidence.</p></div>
              <div><strong>distinctEntities</strong><p>Breadth across users, operators, accounts, devices, or another entity path.</p></div>
              <div><strong>correctionCounts</strong><p>Frequency of each stable, structured correction value.</p></div>
              <div><strong>counterexamples</strong><p>Better-performing executions in the segment, useful for contrast and replay.</p></div>
            </div>
            <div className="doc-note warning"><strong>Statistical scope</strong><p>The confidence value is a lightweight prioritization heuristic, not a causal claim or a substitute for an experiment. Correlated samples, selection bias, label drift, and repeated signals from one episode can overstate certainty. Use holdouts, replay, or controlled experiments before promotion.</p></div>
          </DocSection>

          <DocSection
            id="candidates"
            number="03"
            title="Improvement candidates"
            intro="A finding says where behavior differs. A candidate says exactly what should change, why, how risky it is, and whether it has passed evaluation. Keeping these concepts separate prevents analytics from silently mutating production."
          >
            <div className="type-strip">
              {["prompt", "routing", "rule", "retrieval", "model", "dataset", "threshold", "tool_schema", "workflow", "agent_topology", "code", "capacity", "custom"].map((kind) => <code key={kind}>{kind}</code>)}
            </div>
            <div className="lifecycle">
              {["proposed", "evaluated", "approved", "deployed"].map((state, index) => (
                <div key={state}><span>{index + 1}</span><strong>{state}</strong></div>
              ))}
              <i>or</i>
              <div><span>×</span><strong>rejected</strong></div>
              <div><span>↶</span><strong>superseded</strong></div>
            </div>
            <FieldTable rows={[
              ["target.kind", "yes", "The change surface, such as prompt, routing, dataset, model, workflow, or capacity."],
              ["target.key", "yes", "Stable logical identity, such as lex-core or ticket-retriever. Versions belong in the proposed change."],
              ["proposedChange", "yes", "A JSON-safe patch, version descriptor, training job specification, or structured plan."],
              ["evidence", "yes", "The finding, examples, replay set, metrics, or provenance that motivated the proposal."],
              ["risk", "no", "Low, medium, high, or critical. Defaults to medium."],
              ["metadata", "no", "Owner, recipe, ticket, experiment, expiration, or application-specific governance data."],
              ["evaluations", "managed", "Append-only evaluation results recorded by the lifecycle."],
              ["status / timestamps", "managed", "Lifecycle state and approval, deployment, superseding, or rejection time."],
            ]} />
            <CodeBlock title="candidate-lifecycle.ts">{[
              "const candidate = await loop.createCandidateFromFinding({",
              "  finding: findings[0]!,",
              '  target: { kind: "prompt", key: "lex-core" },',
              "  proposedChange: {",
              '    from: "lex-core@18",',
              '    to: "lex-core@19",',
              '    instruction: "Separate disabling MFA from deleting auth methods."',
              "  },",
              '  risk: "medium"',
              "});",
              "",
              "const evaluated = await loop.evaluateCandidate(",
              "  candidate.id,",
              '  "historical-replay-v3",',
              "  replayCandidate",
              ");",
              "",
              "if (evaluated.evaluations.at(-1)?.passed) {",
              "  await loop.approveCandidate(candidate.id);",
              "  await applyVersionPointer(candidate);",
              "  await loop.deployCandidate(candidate.id);",
              "}",
            ].join("\n")}</CodeBlock>
            <h3>Lifecycle invariants</h3>
            <ul>
              <li>Only a candidate whose latest evaluation passed can be approved.</li>
              <li>Only an approved candidate can be marked deployed.</li>
              <li>Deploying a candidate supersedes the currently deployed candidate with the same namespace, target kind, and target key.</li>
              <li>A deployed candidate is rolled back, not rejected.</li>
              <li>Rollback supersedes the current candidate and restores the most recently superseded version when one exists.</li>
              <li>Rejected, deployed, and superseded candidates cannot be evaluated again.</li>
            </ul>
          </DocSection>

          <DocSection
            id="self-improvement"
            number="04"
            title="Governed self-improvement"
            intro="Self-improvement is a controller over the same primitives, not an unrestricted recursive agent. The application supplies recipes, evaluation, and deployment. Policy determines how far the controller may proceed."
          >
            <div className="autonomy-grid">
              <div><span>01</span><strong>observe</strong><p>Analyze and return findings. Create or change nothing.</p></div>
              <div><span>02</span><strong>recommend</strong><p>Generate deduplicated, reviewable candidates but do not evaluate or deploy them.</p></div>
              <div><span>03</span><strong>experiment</strong><p>Create and evaluate candidates. Stop before approval and production deployment.</p></div>
              <div className="active"><span>04</span><strong>apply</strong><p>Evaluate, enforce constraints and risk, call the deployment adapter, then record deployment.</p></div>
            </div>
            <CodeBlock title="self-improvement.ts">{[
              "const controller = new SelfImprovementController(loop);",
              "",
              "const result = await controller.run({",
              "  analysis: {",
              '    namespace: "acme/prod",',
              '    dimensions: ["metadata.resource"],',
              '    executionKinds: ["tool"],',
              '    signalNames: ["within_latency_budget"],',
              "    minimumSupport: 25,",
              "    minimumRecurrence: 3",
              "  },",
              "  policy: {",
              '    autonomy: "apply",',
              '    allowedTargets: ["routing"],',
              '    maxAutomaticRisk: "low",',
              "    maximumCandidatesPerRun: 3,",
              "    constraints: [",
              '      { metric: "answerAccuracy", comparator: "gte", value: 0.95 },',
              '      { metric: "policyCompliance", comparator: "eq", value: 1 },',
              '      { metric: "p95LatencyMs", comparator: "lte", value: 1800 }',
              "    ]",
              "  },",
              "  recipes: [deduplicateReadOnlyLookups],",
              '  evaluatorName: "replay-and-policy-suite@4",',
              "  evaluator: replayCandidateWithMockedTools,",
              "  deployer: updateClientScopedVersionPointer",
              "});",
            ].join("\n")}</CodeBlock>
            <h3>The controller, step by step</h3>
            <ol>
              <li>Run the configured analysis and collect recurring findings.</li>
              <li>Ask every recipe whether it matches each finding.</li>
              <li>Ask matching recipes for zero, one, or several structured proposals.</li>
              <li>Enforce the per-run candidate budget and allowed target kinds.</li>
              <li>Create a stable SHA-256 improvement key from the finding, recipe, target, and proposed change.</li>
              <li>Reuse an existing open candidate or block a duplicate terminal candidate when deduplication is enabled.</li>
              <li>Stop after creation in recommend mode.</li>
              <li>Evaluate the candidate and apply every metric constraint in experiment and apply modes.</li>
              <li>In apply mode, enforce the automatic risk ceiling, approve, call the external deployer, and only then record the deployed state.</li>
            </ol>
            <h3>Recipe contract</h3>
            <CodeBlock title="recipe.ts">{[
              "const operatorCorrectionRecipe: ImprovementRecipe = {",
              '  name: "clarify-recurring-intent-confusion",',
              "  matches: (finding) =>",
              '    (finding.effectSize ?? 0) < -0.10 &&',
              "    finding.recurrence >= 3 &&",
              "    finding.distinctEntities >= 2,",
              "  propose: async (finding) => ({",
              '    target: { kind: "prompt", key: "lex-core" },',
              "    proposedChange: await generatePromptPatch({",
              "      dimensions: finding.dimensions,",
              "      correctionCounts: finding.correctionCounts,",
              "      counterexamples: finding.counterexampleExecutionIds",
              "    }),",
              '    risk: "medium",',
              '    metadata: { owner: "it-ai-platform" }',
              "  })",
              "};",
            ].join("\n")}</CodeBlock>
            <p>A recipe may be deterministic or may call an LLM, trainer, optimizer, or coding agent. That system proposes a change; it does not get implicit authority to deploy it. The proposal remains data that must pass evaluation and policy.</p>
            <h3>Policy defaults and block reasons</h3>
            <div className="two-column">
              <div>
                <h4>Defaults</h4>
                <ul>
                  <li><code>maxAutomaticRisk</code>: low</li>
                  <li><code>maximumCandidatesPerRun</code>: 10</li>
                  <li><code>deduplicate</code>: true</li>
                  <li><code>allowedTargets</code>: always required</li>
                </ul>
              </div>
              <div>
                <h4>Observable blocks</h4>
                <ul>
                  <li>candidate budget reached</li>
                  <li>target not allowed</li>
                  <li>duplicate terminal candidate</li>
                  <li>evaluation failed</li>
                  <li>risk exceeds policy</li>
                  <li>deployment adapter failed</li>
                </ul>
              </div>
            </div>
            <div className="doc-note"><strong>Safe failure behavior</strong><p>If physical deployment fails, the candidate remains approved and the run reports <code>deployment_failed</code>. The core does not pretend the change reached production. An operator or retry workflow can inspect and reconcile it.</p></div>
          </DocSection>

          <DocSection
            id="architecture"
            number="05"
            title="Architecture"
            intro="Feloop is the coordination layer between production behavior and application-controlled improvement. It owns the durable vocabulary and lifecycle; it deliberately does not own model inference, training, hosting, scheduling, or physical deployment."
          >
            <div className="doc-pipeline" aria-label="Feedback loop lifecycle">
              {["CAPTURE", "CORRELATE", "ANALYZE", "PROPOSE", "EVALUATE", "PROMOTE", "MEASURE"].map((step, index) => (
                <div key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong>{index < 6 && <i>→</i>}</div>
              ))}
            </div>
            <h3>What the core owns</h3>
            <div className="two-column">
              <div>
                <h4>Durable records</h4>
                <ul>
                  <li>Executions and hierarchical execution trees</li>
                  <li>Conversation, task, incident, or prediction episodes</li>
                  <li>Direct feedback and delayed outcome signals</li>
                  <li>Recurring, evidence-backed findings</li>
                  <li>Versioned improvement candidates and evaluations</li>
                </ul>
              </div>
              <div>
                <h4>Lifecycle controls</h4>
                <ul>
                  <li>Namespace isolation and parent-child validation</li>
                  <li>Pattern thresholds and application-specific scoring</li>
                  <li>Risk classes, metric constraints, and candidate budgets</li>
                  <li>Approval, deployment state, superseding, and rollback</li>
                  <li>Four graduated autonomy modes</li>
                </ul>
              </div>
            </div>
            <h3>What remains an adapter</h3>
            <p>Your application continues to own the database, annotation UI, LLM calls, prompt generator, fine-tuning provider, replay harness, experiment platform, version registry, scheduler, observability backend, and deployment mechanism. This boundary is what keeps the core small and provider-independent.</p>
            <div className="doc-note warning"><strong>Important boundary</strong><p>Candidate deployment inside the core is a lifecycle transition. A deployment adapter must perform the real external change. The controller calls that adapter only after evaluation and policy gates pass.</p></div>
          </DocSection>

          <DocSection
            id="execution-model"
            number="06"
            title="Execution model"
            intro="An execution is one observable operation performed by an AI-enabled system. A simple classifier may record one prediction. An agentic system can record a tree containing the root agent, subagents, retrievals, model calls, workflows, and tools."
          >
            <div className="type-strip">
              {["agent", "turn", "inference", "prediction", "tool", "workflow", "retrieval", "custom"].map((kind) => <code key={kind}>{kind}</code>)}
            </div>
            <FieldTable rows={[
              ["namespace", "yes", "The client, tenant, product, or environment boundary. Parent, child, and signal records must agree."],
              ["kind", "yes", "The execution category used for filtering and attribution."],
              ["episodeId", "no", "Joins operations and delayed outcomes belonging to the same conversation, task, ticket, meal, or incident."],
              ["parentExecutionId", "no", "Connects this operation to the execution that invoked or delegated it."],
              ["entityId", "no", "A redacted user, operator, device, account, or workflow identity used to measure breadth."],
              ["input / output", "no", "JSON-safe application payloads. Redact sensitive material before capture."],
              ["artifacts", "no", "Versions of the model, dataset, prompt, router, tool schema, knowledge, policy, and application."],
              ["metadata", "no", "Structured analysis dimensions such as task, route, agent role, resource, latency, cost, and retry count."],
              ["startedAt / completedAt", "no", "ISO timestamps. The framework supplies the current time when appropriate."],
            ]} />
            <h3>Hierarchical agent execution</h3>
            <CodeBlock title="execution-tree.ts">{[
              "const root = await loop.recordExecution({",
              '  namespace: "acme/prod",',
              '  kind: "agent",',
              '  episodeId: "incident-1042",',
              '  metadata: { agentRole: "orchestrator" }',
              "});",
              "",
              "const child = await loop.recordExecution({",
              "  namespace: root.namespace,",
              '  kind: "agent",',
              "  episodeId: root.episodeId,",
              "  parentExecutionId: root.id,",
              '  metadata: { agentRole: "ticket-researcher" }',
              "});",
              "",
              "const tool = await loop.recordExecution({",
              "  namespace: root.namespace,",
              '  kind: "tool",',
              "  episodeId: root.episodeId,",
              "  parentExecutionId: child.id,",
              '  metadata: { resource: "ticket-api", queueWaitMs: 840 }',
              "});",
              "",
              "await loop.completeExecution(tool.id, {",
              '  output: { status: "success" },',
              "  metadata: { durationMs: 1120 }",
              "});",
            ].join("\n")}</CodeBlock>
            <p>When a parent ID is provided, the framework verifies that the parent exists and uses the same namespace. If both records have an episode ID, they must match. These checks prevent accidental cross-tenant or cross-task trees.</p>
            <h3>What to capture</h3>
            <p>Capture observable decisions and structured evidence: classifications, extracted fields, selected routes, retrieved document identifiers, approval decisions, tool names, sanitized arguments, outcomes, duration, cost, and versions. Do not capture hidden chain-of-thought. Store only the minimum payload required for attribution, replay, and analysis.</p>
          </DocSection>

          <DocSection
            id="signals"
            number="07"
            title="Signals and outcomes"
            intro="A signal is evidence observed during or after an execution. It can target one precise operation or an entire episode, allowing outcomes that arrive hours or days later to remain attributable."
          >
            <div className="type-strip">
              {["rating", "correction", "outcome", "reward", "approval", "tool_result", "custom"].map((kind) => <code key={kind}>{kind}</code>)}
            </div>
            <FieldTable rows={[
              ["namespace", "yes", "Must match the targeted execution and isolation boundary."],
              ["executionId / episodeId", "one", "At least one attribution target is required."],
              ["kind", "yes", "The evidence category."],
              ["name", "yes", "An application-defined metric such as resolved, operator_correct, latency_ms, or glucose_delta."],
              ["value", "yes", "The JSON-safe observed value."],
              ["correction", "no", "The verified replacement answer, intent, route, label, tool, or structured target."],
              ["source", "yes", "Who or what produced the evidence: operator, customer, evaluator, tool, sensor, or business system."],
              ["confidence", "no", "Evidence weight from 0 to 1. Defaults to 1; this is not model confidence."],
              ["metadata", "no", "Context about collection, validation, reason codes, or source versions."],
              ["observedAt", "no", "When the outcome was observed, independently of when the execution ran."],
            ]} />
            <h3>Evidence strength</h3>
            <div className="evidence-list">
              <div><span>STRONGEST</span><strong>Verified correction or real-world outcome</strong><p>A confirmed label, successful action, durable resolution, sensor reading, or business result provides an actionable target.</p></div>
              <div><span>STRONG</span><strong>Approval plus successful execution</strong><p>Useful when approval is meaningful and the downstream operation confirms that the plan worked.</p></div>
              <div><span>MODERATE</span><strong>Explicit rating</strong><p>Thumbs up or down helps prioritize a segment, but a negative rating alone does not say what the correct behavior should be.</p></div>
              <div><span>WEAK</span><strong>Implicit behavior</strong><p>Restatement, abandonment, or silence can be a discovery signal, but should not become training truth without verification.</p></div>
            </div>
            <h3>Direct versus episode signals</h3>
            <p>Use an execution signal when the evidence belongs to one model call, retrieval, or tool. Use an episode signal when the result belongs to the whole task. If analysis is restricted to root turns, an episode outcome is attributed once to the selected turn instead of being copied to every child operation.</p>
            <div className="doc-note"><strong>Training rule</strong><p>Never train directly on a negative example. Pair it with a verified correction or exclude it from supervised training. Dislike is evidence of a problem, not a trustworthy target.</p></div>
          </DocSection>

          <DocSection
            id="evaluation"
            number="08"
            title="Evaluation"
            intro="Evaluation is the proof boundary between an attractive proposal and an acceptable change. The framework stores the result, but your evaluator defines the test corpus, model calls, simulations, metrics, and acceptance logic."
          >
            <h3>A layered evaluation stack</h3>
            <div className="evidence-list">
              <div><span>LAYER 01</span><strong>Schema and static checks</strong><p>Validate prompt templates, structured output schemas, tool signatures, route graphs, configuration shape, token limits, and required policy clauses.</p></div>
              <div><span>LAYER 02</span><strong>Historical replay</strong><p>Run the candidate against representative failures, verified corrections, counterexamples, and untouched holdout cases. Mock mutating tools.</p></div>
              <div><span>LAYER 03</span><strong>Safety and policy</strong><p>Test prompt injection, authorization, tenant isolation, prohibited actions, escalation behavior, refusal quality, and sensitive-data handling.</p></div>
              <div><span>LAYER 04</span><strong>Shadow or canary traffic</strong><p>Measure live distributions without changing user-visible behavior, then expose a bounded traffic slice if the change is reversible.</p></div>
              <div><span>LAYER 05</span><strong>Outcome verification</strong><p>Measure the real task result: resolution, accuracy, glucose response, operator override, business KPI, cost, and latency.</p></div>
            </div>
            <CodeBlock title="candidate-evaluator.ts">{[
              "const replayCandidate: CandidateEvaluator = async (candidate) => {",
              "  const suite = await loadFrozenReplaySet(candidate.evidence);",
              "  const results = await runCandidateInSandbox(candidate, suite);",
              "",
              "  const metrics = {",
              "    answerAccuracy: results.accuracy,",
              "    policyCompliance: results.policyCompliance,",
              "    regressionRate: results.regressionRate,",
              "    p95LatencyMs: results.p95LatencyMs,",
              "    costPerEpisode: results.costPerEpisode",
              "  };",
              "",
              "  return {",
              "    passed:",
              "      metrics.answerAccuracy >= 0.95 &&",
              "      metrics.policyCompliance === 1 &&",
              "      metrics.regressionRate <= 0.01,",
              "    metrics,",
              '    notes: "Frozen holdout plus adversarial safety suite"',
              "  };",
              "};",
            ].join("\n")}</CodeBlock>
            <h3>Protect against overfitting</h3>
            <ul>
              <li>Separate discovery data from evaluation and final holdout data.</li>
              <li>Include counterexamples where current behavior was already correct.</li>
              <li>Slice metrics by tenant, task, language, model, route, and risk class.</li>
              <li>Require non-regression on safety, authorization, and policy metrics even when average quality improves.</li>
              <li>Freeze replay-set and evaluator versions in candidate metadata so results are reproducible.</li>
              <li>Use confidence intervals or sequential-testing controls for online experiments.</li>
            </ul>
            <div className="doc-note warning"><strong>No single magic score</strong><p>A blended reward can hide a catastrophic regression. Keep hard safety and policy constraints separate from optimization metrics, and require each invariant to pass.</p></div>
          </DocSection>

          <DocSection
            id="deployment"
            number="09"
            title="Deployment and rollback"
            intro="The framework records governed state; the deployment adapter performs the real change. This split lets every product deploy through its existing configuration service, feature-flag system, model registry, workflow engine, or infrastructure pipeline."
          >
            <CodeBlock title="deployment-adapter.ts">{[
              "async function deployer(candidate: AdaptationCandidate) {",
              "  const version = validateVersionedChange(candidate.proposedChange);",
              "",
              "  await configurationRegistry.createImmutableVersion({",
              "    namespace: candidate.namespace,",
              "    target: candidate.target,",
              "    candidateId: candidate.id,",
              "    value: version",
              "  });",
              "",
              "  await featureFlags.setPointer({",
              "    namespace: candidate.namespace,",
              "    key: candidate.target.key,",
              "    version: version.id,",
              "    rolloutPercent: 5",
              "  });",
              "}",
            ].join("\n")}</CodeBlock>
            <h3>Recommended deployment sequence</h3>
            <ol>
              <li>Create an immutable version of the proposed artifact.</li>
              <li>Verify it is addressable by namespace, target key, version, and candidate ID.</li>
              <li>Start with shadowing or a small canary for reversible low-risk changes.</li>
              <li>Record the candidate as deployed only after the external adapter succeeds.</li>
              <li>Continue emitting executions with the new artifact version.</li>
              <li>Compare post-deployment outcomes with the baseline and guardrails.</li>
              <li>Move the pointer back and call <code>rollbackCandidate</code> if a stop condition fires.</li>
            </ol>
            <h3>Rollback semantics</h3>
            <p><code>rollbackCandidate</code> marks the current candidate superseded and restores the most recently superseded candidate for the same namespace, target kind, and key. If there is no previous version, it returns <code>undefined</code>. Your adapter must still revert the external version pointer; the framework cannot infer how your runtime is deployed.</p>
            <div className="two-column">
              <div><h4>Good automatic targets</h4><ul><li>Feature-flag percentages</li><li>Read-only routing weights</li><li>Retrieval parameters</li><li>Capacity within a hard budget</li><li>Low-risk prompt variants behind a canary</li></ul></div>
              <div><h4>Keep human approval</h4><ul><li>Permissions and identity policy</li><li>Mutating tool authorization</li><li>Medical or financial behavior</li><li>Code with broad blast radius</li><li>Model or dataset changes without mature evals</li></ul></div>
            </div>
          </DocSection>

          <DocSection
            id="fine-tuning"
            number="10"
            title="Fine-tuning and dataset improvement"
            intro="Fine-tuning is one possible actuator, not the feedback loop itself. Most observed failures should first be triaged across prompt, context, retrieval, routing, tool design, policy, or data before committing to model training."
          >
            <h3>From feedback to a training set</h3>
            <div className="doc-pipeline compact-pipeline">
              {["DISCOVER", "VERIFY", "REDACT", "DEDUP", "SPLIT", "TRAIN", "EVAL", "REGISTER"].map((step, index) => (
                <div key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong>{index < 7 && <i>→</i>}</div>
              ))}
            </div>
            <ol>
              <li>Use findings to identify recurring failure segments and correction consensus.</li>
              <li>Require an authoritative corrected answer, label, action, or outcome for supervised examples.</li>
              <li>Redact secrets and personal data; record consent, provenance, and retention controls.</li>
              <li>Deduplicate near-identical episodes so one customer or template does not dominate.</li>
              <li>Split by entity and time, not random message alone, to reduce leakage.</li>
              <li>Create a dataset candidate that references an immutable manifest and schema.</li>
              <li>Train through a provider-specific adapter and create a model candidate for the resulting checkpoint.</li>
              <li>Evaluate against frozen holdouts, safety suites, counterexamples, cost, and latency.</li>
              <li>Register the approved model version and deploy through the same governed lifecycle.</li>
            </ol>
            <CodeBlock title="dataset-candidate.ts">{[
              "const datasetCandidate = await loop.createCandidateFromFinding({",
              "  finding,",
              '  target: { kind: "dataset", key: "lex-intent-corrections" },',
              "  proposedChange: {",
              '    manifest: "s3://training/lex-intents/2026-09-03.jsonl",',
              '    schema: "chat-supervised@2",',
              "    records: 1842,",
              '    provenancePolicy: "verified-operator-corrections-only",',
              '    splitPolicy: "entity-and-time-isolated"',
              "  },",
              '  risk: "high"',
              "});",
            ].join("\n")}</CodeBlock>
            <h3>When not to fine-tune</h3>
            <p>If the answer depends on frequently changing facts, improve retrieval. If a deterministic policy exists, use a rule or tool. If the wrong model receives the request, improve routing. If the tool contract is ambiguous, fix the schema. Fine-tune when repeated, well-labeled behavior should be internalized and the expected gain survives a holdout evaluation.</p>
            <div className="doc-note warning"><strong>Do not train on raw conversations by default</strong><p>Production transcripts contain noise, secrets, private data, incorrect assistant outputs, operator shorthand, and correlated examples. Build a provenance-aware dataset pipeline and retain the ability to remove or expire source records.</p></div>
          </DocSection>

          <DocSection
            id="agent-systems"
            number="11"
            title="Self-improving agent systems"
            intro="Agent improvement extends the same loop from answers to orchestration. Parent-child executions reveal which agent, tool, queue, handoff, or workflow step causes cost, latency, failure, or repeated delegation."
          >
            <h3>What the tree makes measurable</h3>
            <div className="metric-grid">
              <div><strong>Delegation quality</strong><p>Did the orchestrator choose the right specialist for the task?</p></div>
              <div><strong>Tool reliability</strong><p>Which calls fail, retry, time out, or require operator repair?</p></div>
              <div><strong>Bottlenecks</strong><p>Which child contributes the largest queue or execution delay?</p></div>
              <div><strong>Duplicate work</strong><p>Which retrievals or tools repeat inside one episode?</p></div>
              <div><strong>Topology</strong><p>Would merging, splitting, or parallelizing agent roles improve outcomes?</p></div>
              <div><strong>Capacity</strong><p>Would bounded concurrency or caching remove a stable resource constraint?</p></div>
            </div>
            <CodeBlock title="bottleneck-recipe.ts">{[
              "const bottleneckRecipe: ImprovementRecipe = {",
              '  name: "cache-repeated-read-only-lookups",',
              "  matches: (finding) =>",
              '    finding.dimensions["metadata.resource"] === "ticket-api" &&',
              "    (finding.meanScore ?? 1) < 0.70 &&",
              "    finding.recurrence >= 3,",
              "  propose: () => ({",
              '    target: { kind: "routing", key: "ticket-read-path" },',
              "    proposedChange: {",
              '      version: "ticket-read-path@2",',
              "      cacheWithinEpisode: true,",
              "      coalesceConcurrentReads: true",
              "    },",
              '    risk: "low"',
              "  })",
              "};",
            ].join("\n")}</CodeBlock>
            <h3>The bounded self-improvement pattern</h3>
            <p>An observer can identify that a tool or subagent is a bottleneck. A proposer can generate a routing, capacity, code, workflow, or topology candidate. A sandbox evaluator can replay representative execution trees. A policy can automatically apply only reversible low-risk changes. The new execution version then emits fresh evidence, closing the next measurement cycle.</p>
            <p>This is how an agent can improve its own surrounding system without receiving unrestricted authority: observation is broad, proposal is structured, evaluation is isolated, permission is narrow, deployment is explicit, and rollback is always available.</p>
            <div className="doc-note"><strong>Recursive does not mean uncontrolled</strong><p>If an agent proposes a change to the evaluator, policy, or deployment mechanism itself, treat that as a separate high- or critical-risk candidate evaluated by an independent control plane.</p></div>
          </DocSection>

          <DocSection
            id="storage"
            number="12"
            title="Storage and integration"
            intro="The core depends on a small FeedbackStore interface. This allows tests, local prototypes, and production applications to use the same lifecycle while keeping database and infrastructure choices outside the package."
          >
            <div className="two-column">
              <div><h4>InMemoryStore</h4><p>Fast and ephemeral. Use in unit tests, examples, and process-local experiments. Data disappears when the process exits.</p></div>
              <div><h4>JsonFileStore</h4><p>Durable enough for local development and single-process demos. It is not intended for concurrent writers or distributed production workloads.</p></div>
            </div>
            <CodeBlock title="feedback-store.ts">{[
              "interface FeedbackStore {",
              "  saveExecution(value: AiExecution): Promise<void>;",
              "  getExecution(id: string): Promise<AiExecution | undefined>;",
              "  listExecutions(options?: ExecutionListOptions): Promise<AiExecution[]>;",
              "",
              "  saveSignal(value: FeedbackSignal): Promise<void>;",
              "  listSignals(options?: SignalListOptions): Promise<FeedbackSignal[]>;",
              "",
              "  saveCandidate(value: AdaptationCandidate): Promise<void>;",
              "  getCandidate(id: string): Promise<AdaptationCandidate | undefined>;",
              "  listCandidates(options?: CandidateListOptions): Promise<AdaptationCandidate[]>;",
              "",
              "  close(): Promise<void>;",
              "}",
            ].join("\n")}</CodeBlock>
            <h3>Production adapter requirements</h3>
            <ul>
              <li>Enforce unique IDs and upsert records atomically.</li>
              <li>Index namespace plus time for execution and signal queries.</li>
              <li>Index namespace, target key, and status for candidate operations.</li>
              <li>Preserve JSON values without lossy serialization.</li>
              <li>Use optimistic concurrency or transactions around candidate state transitions.</li>
              <li>Encrypt data at rest and in transit, and enforce namespace-scoped authorization.</li>
              <li>Support retention, export, erasure, legal hold, and audit requirements appropriate to the product.</li>
            </ul>
            <h3>Suggested relational model</h3>
            <CodeBlock title="schema-outline.sql">{[
              "executions(id, namespace, kind, episode_id, parent_execution_id,",
              "           entity_id, input_json, output_json, artifacts_json,",
              "           metadata_json, started_at, completed_at, created_at, updated_at)",
              "",
              "signals(id, namespace, execution_id, episode_id, kind, name,",
              "        value_json, correction_json, source, confidence,",
              "        metadata_json, observed_at, created_at)",
              "",
              "candidates(id, namespace, target_kind, target_key, proposed_change_json,",
              "           evidence_json, risk, status, metadata_json, timestamps...)",
              "",
              "evaluations(id, candidate_id, passed, metrics_json, notes, evaluator, created_at)",
            ].join("\n")}</CodeBlock>
          </DocSection>

          <DocSection
            id="security"
            number="13"
            title="Privacy, security, and safety"
            intro="A feedback system sees both production inputs and downstream outcomes, so its data can be more sensitive than ordinary logs. Treat capture, access, training eligibility, and deployment authority as distinct security boundaries."
          >
            <h3>Minimum data discipline</h3>
            <div className="check-grid">
              <div><span>01</span><p>Redact secrets, access tokens, credentials, and unnecessary personal data before calling <code>recordExecution</code>.</p></div>
              <div><span>02</span><p>Use pseudonymous entity identifiers. Keep any re-identification map outside the feedback store.</p></div>
              <div><span>03</span><p>Separate observability retention from training consent and training retention.</p></div>
              <div><span>04</span><p>Restrict raw payload access; most analysts need aggregate findings and sampled redacted evidence.</p></div>
              <div><span>05</span><p>Version policies and authorizers in <code>artifacts</code> so every action is auditable.</p></div>
              <div><span>06</span><p>Treat corrections as untrusted until their source and authority are verified.</p></div>
              <div><span>07</span><p>Never let user-controlled content directly rewrite a system prompt, tool schema, rule, or training set.</p></div>
              <div><span>08</span><p>Sign or otherwise authenticate deployable artifact versions and deployment events.</p></div>
            </div>
            <h3>Threats to model improvement loops</h3>
            <div className="field-table threat-table">
              <div className="field-row field-head"><span>THREAT</span><span>EXAMPLE</span><span>CONTROL</span></div>
              <div className="field-row"><code>feedback poisoning</code><span>Coordinated false ratings</span><p>Source trust, rate limits, entity breadth, anomaly detection, verified outcomes, and manual review.</p></div>
              <div className="field-row"><code>prompt injection</code><span>Transcript contains deployment instructions</span><p>Data-only parsing, structured proposals, isolated generation, policy gates, and no ambient credentials.</p></div>
              <div className="field-row"><code>cross-tenant leakage</code><span>Evidence or candidate crosses a namespace</span><p>Namespace checks in the core plus row-level authorization in storage and deployment.</p></div>
              <div className="field-row"><code>unsafe optimization</code><span>Latency improves by skipping safety checks</span><p>Independent hard constraints and policy invariants that cannot be traded away.</p></div>
              <div className="field-row"><code>runaway changes</code><span>Agent repeatedly applies variants</span><p>Candidate budgets, stable deduplication, risk ceilings, rollout limits, cooldowns, and stop switches.</p></div>
            </div>
            <div className="doc-note warning"><strong>Regulated use</strong><p>For medical, employment, credit, legal, safety, or other high-impact decisions, keep qualified humans accountable, validate applicable regulatory obligations, and do not use this framework alone as evidence that a system is safe or compliant.</p></div>
          </DocSection>

          <DocSection
            id="production"
            number="14"
            title="Production operation"
            intro="A mature loop runs as a set of small, observable jobs around the application rather than inside the user request path. Capture should be fast; analysis, proposal generation, evaluation, and deployment should run asynchronously."
          >
            <div className="production-map">
              <div><span>REQUEST PATH</span><strong>AI application</strong><p>Record executions and immediate signals through a non-blocking sink.</p></div>
              <i>→</i>
              <div><span>DATA PLANE</span><strong>Feedback store</strong><p>Durable, namespace-scoped evidence and lifecycle records.</p></div>
              <i>→</i>
              <div><span>CONTROL PLANE</span><strong>Scheduled analyzer</strong><p>Find patterns, propose candidates, evaluate, and promote under policy.</p></div>
            </div>
            <h3>Recommended cadence</h3>
            <ul>
              <li><strong>Per request:</strong> enqueue a sanitized execution record; never make model latency depend on analysis.</li>
              <li><strong>On outcome:</strong> attach the signal by execution or episode ID, even if it arrives days later.</li>
              <li><strong>Hourly or daily:</strong> run analysis for high-volume products and emit finding summaries.</li>
              <li><strong>Daily or weekly:</strong> generate candidates after minimum recurrence and breadth are satisfied.</li>
              <li><strong>Continuously:</strong> run deterministic unit and safety checks for new candidates.</li>
              <li><strong>On approval:</strong> run shadow, canary, or bounded rollout through the deployment adapter.</li>
              <li><strong>After deployment:</strong> monitor objective, guardrail, cost, and latency signals until the evaluation window closes.</li>
            </ul>
            <h3>Operational telemetry</h3>
            <p>Track capture failures, signal lag, unattributed signal rate, analysis duration, findings by segment, candidates by status and risk, evaluator failures, constraint failures, deployment failures, rollback rate, time to approval, post-deployment effect, and storage growth. Alert on broken attribution, authorization failures, or a sudden change in feedback distribution.</p>
            <h3>Rollout maturity ladder</h3>
            <div className="autonomy-grid">
              <div><span>PHASE 1</span><strong>instrument</strong><p>Capture only. Validate data quality and attribution.</p></div>
              <div><span>PHASE 2</span><strong>recommend</strong><p>Humans inspect findings and candidates.</p></div>
              <div><span>PHASE 3</span><strong>experiment</strong><p>Automate replay, safety, and shadow evaluation.</p></div>
              <div className="active"><span>PHASE 4</span><strong>bounded apply</strong><p>Automate reversible, low-risk, well-evaluated changes.</p></div>
            </div>
          </DocSection>

          <DocSection
            id="api"
            number="15"
            title="API reference"
            intro="The public package exports the core contracts, analyzer, FeedbackLoop, self-improvement controller, store interface, and the two built-in stores."
          >
            <h3>FeedbackLoop methods</h3>
            <div className="api-list">
              <div><code>new FeedbackLoop(store, options?)</code><p>Creates a loop. Optional clock and ID factory hooks make deterministic tests easy.</p></div>
              <div><code>recordExecution(input)</code><p>Validates hierarchy and stores a new execution.</p></div>
              <div><code>completeExecution(id, input?)</code><p>Adds output, merges metadata, and sets completion time.</p></div>
              <div><code>recordSignal(input)</code><p>Validates attribution and confidence, then stores feedback or an outcome.</p></div>
              <div><code>analyze(options)</code><p>Returns recurring segment findings.</p></div>
              <div><code>createCandidate(input)</code><p>Creates a proposed candidate from arbitrary evidence.</p></div>
              <div><code>createCandidateFromFinding(input)</code><p>Copies finding evidence into a new candidate.</p></div>
              <div><code>evaluateCandidate(id, name, evaluator)</code><p>Runs an evaluator, appends its result, and moves the candidate to evaluated.</p></div>
              <div><code>approveCandidate(id)</code><p>Approves only when the latest evaluation passed.</p></div>
              <div><code>deployCandidate(id)</code><p>Marks an approved candidate deployed and supersedes its previous deployed version.</p></div>
              <div><code>rejectCandidate(id, reason?)</code><p>Rejects a non-deployed candidate and optionally records a reason.</p></div>
              <div><code>rollbackCandidate(id)</code><p>Supersedes a deployed candidate and restores the latest previous version.</p></div>
              <div><code>getExecution(id)</code><p>Returns one execution when present.</p></div>
              <div><code>getCandidate(id)</code><p>Returns one candidate when present.</p></div>
              <div><code>listCandidates(options?)</code><p>Filters candidates by namespace, target key, and status.</p></div>
              <div><code>close()</code><p>Closes the configured store.</p></div>
            </div>
            <h3>SelfImprovementController</h3>
            <div className="api-list">
              <div><code>new SelfImprovementController(loop)</code><p>Wraps one FeedbackLoop instance.</p></div>
              <div><code>run(input)</code><p>Analyzes, proposes, evaluates, and optionally deploys according to the supplied autonomy policy.</p></div>
            </div>
            <h3>Deterministic testing hooks</h3>
            <CodeBlock title="deterministic-test.ts">{[
              "let counter = 0;",
              "const loop = new FeedbackLoop(new InMemoryStore(), {",
              '  clock: () => new Date("2026-09-03T12:00:00.000Z"),',
              '  idFactory: (prefix) => prefix + "_" + ++counter',
              "});",
            ].join("\n")}</CodeBlock>
          </DocSection>

          <DocSection
            id="pitfalls"
            number="16"
            title="Common pitfalls"
            intro="The mechanics are small; the difficult work is choosing truthful signals, preventing correlated or adversarial data from becoming ground truth, and matching autonomy to the maturity of evaluation."
          >
            <div className="pitfall-list">
              <div><span>01</span><strong>Optimizing thumbs-up rate alone</strong><p>Pair preference with resolution, correctness, safety, and long-term outcomes.</p></div>
              <div><span>02</span><strong>Treating every correction as truth</strong><p>Verify source authority and look for consensus or downstream success.</p></div>
              <div><span>03</span><strong>Ignoring artifact versions</strong><p>Without exact model, prompt, router, knowledge, policy, and app versions, attribution becomes guesswork.</p></div>
              <div><span>04</span><strong>Creating tiny segments</strong><p>Require support, recurrence, entity breadth, and meaningful effect before acting.</p></div>
              <div><span>05</span><strong>Leaking the discovery set into evaluation</strong><p>Use separate counterexamples and frozen holdouts.</p></div>
              <div><span>06</span><strong>Applying changes before the external deploy succeeds</strong><p>Call the adapter first, then record deployed state.</p></div>
              <div><span>07</span><strong>Starting at apply mode</strong><p>Build evidence quality and evaluator trust in observe, recommend, and experiment first.</p></div>
              <div><span>08</span><strong>Letting the optimizer change its own guardrails</strong><p>Keep policy, evaluator, permissions, and deployment controls in an independent trust boundary.</p></div>
            </div>
          </DocSection>

          <DocSection
            id="faq"
            number="17"
            title="Frequently asked questions"
            intro="The short answers to the design decisions that most often determine whether a feedback loop remains lightweight, useful, and safe."
          >
            <div className="faq-list">
              <details open><summary>Is this an observability platform?</summary><p>No. It records the minimum durable execution, signal, finding, and candidate contracts needed for improvement. Export to your existing logs, traces, metrics, warehouse, or experiment platform.</p></details>
              <details><summary>Does it automatically fine-tune a model?</summary><p>No provider is built into the core. A recipe can create a dataset or model candidate, an evaluator can run a training and validation pipeline, and a deployer can promote the resulting version.</p></details>
              <details><summary>Can it automatically improve itself?</summary><p>Yes, within explicit boundaries. In apply mode it can turn recurring evidence into a proposal, evaluate the proposal, enforce metrics and risk, and invoke a deployment adapter. High-impact or weakly evaluated changes should remain human-approved.</p></details>
              <details><summary>Does it work for non-LLM machine learning?</summary><p>Yes. A prediction can be an execution, a later label or sensor measurement can be a signal, and a feature, threshold, dataset, or model version can be a candidate.</p></details>
              <details><summary>How does this fit a support or operations chat?</summary><p>Record each assistant turn with task, route, model, prompt, policy, and app versions. Attach operator corrections and ticket outcomes. Analyze recurring task and route segments. Propose prompt, retrieval, routing, rule, or model changes, then replay them before a controlled rollout.</p></details>
              <details><summary>Is the package lightweight?</summary><p>Yes. The core is TypeScript with no required runtime model provider, service, queue, vector database, or hosted control plane. Production teams add only the adapters they need.</p></details>
              <details><summary>What is the first safe production milestone?</summary><p>Instrument one high-value workflow in observe mode, capture verified outcomes, and prove attribution quality. Add recommendation and replay only after the data is trustworthy.</p></details>
              <details><summary>Why use namespaces?</summary><p>They form the mandatory client or environment boundary across executions, signals, findings, and candidates. Production storage and deployers must enforce the same boundary.</p></details>
            </div>
            <div className="docs-end">
              <Mark />
              <strong>Observe. Explain. Improve. Verify. Repeat.</strong>
              <Link href="/">BACK TO FEEDBACKLOOP ↗</Link>
            </div>
          </DocSection>
        </article>

        <aside className="docs-rail">
          <div className="rail-card">
            <span>ON THIS PAGE</span>
            <a href="#installation">Install</a>
            <a href="#execution-model">Capture</a>
            <a href="#analysis">Analyze</a>
            <a href="#self-improvement">Improve</a>
          </div>
          <div className="rail-card status-card"><span>PACKAGE</span><b><i /> ALPHA</b><p>Core lifecycle implemented and covered by automated tests.</p></div>
        </aside>
      </div>
    </main>
  );
}
