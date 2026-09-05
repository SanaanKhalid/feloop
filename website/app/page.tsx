import Link from "next/link";

function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Feloop home">
        <Mark />
        <span>Feloop</span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#autonomy">Autonomy</a>
        <a href="#safety">Safety</a>
      </nav>
      <a href="/docs/" className="nav-cta">
        DOCS <span aria-hidden="true">↗</span>
      </a>
    </header>
  );
}

const code = `const loop = new FeedbackLoop(store)

const turn = await loop.recordExecution({
  namespace: "acme/prod",
  kind: "agent",
  artifacts: { prompt: "support@18" }
})

await loop.recordSignal({
  executionId: turn.id,
  name: "resolved",
  value: true,
  source: "ticket-system"
})

await controller.run({
  policy: { autonomy: "experiment" },
  evaluator: replaySuite
})`;

const loopSteps = [
  ["01", "Capture", "Record the decisions, tools, models, and versions behind every outcome."],
  ["02", "Connect", "Attach human feedback, delayed outcomes, cost, latency, and operational signals."],
  ["03", "Discover", "Find recurring segments with enough support, recurrence, and measurable effect."],
  ["04", "Improve", "Propose, replay, gate, deploy, measure, and roll back through one lifecycle."],
];

const targets = [
  "PROMPTS", "ROUTING", "RETRIEVAL", "MODELS", "DATASETS", "THRESHOLDS",
  "TOOLS", "WORKFLOWS", "AGENT TOPOLOGY", "CODE", "CAPACITY",
];

export default function Home() {
  return (
    <main>
      <div className="announcement">
        <span className="pulse-dot" />
        OPEN SOURCE · MODEL-AGNOSTIC · ZERO RUNTIME DEPENDENCIES
      </div>
      <div className="page-shell">
        <SiteHeader />

        <section className="hero grid-surface">
          <div className="hero-copy">
            <div className="eyebrow"><span>CONTROL PLANE</span> FOR CONTINUOUS AI IMPROVEMENT</div>
            <h1>AI systems that learn from what happens next.</h1>
            <p className="hero-lede">
              Feloop connects production behavior to verified outcomes, finds recurring failure modes, and turns evidence into governed improvements.
            </p>
            <div className="hero-actions">
              <a href="/docs/" className="button button-primary">READ THE DOCS <span>→</span></a>
              <a href="#how-it-works" className="button button-ghost">EXPLORE THE LOOP</a>
            </div>
            <p className="hero-note">Embed it in an existing worker. Keep your models, database, and deployment stack.</p>
          </div>

          <div className="hero-console" aria-label="Feloop TypeScript example">
            <div className="console-bar">
              <div className="console-title"><span className="status-light" /> feedback-loop.ts</div>
              <span>TYPESCRIPT</span>
            </div>
            <pre><code>{code}</code></pre>
            <div className="console-result">
              <span>●</span>
              <div><strong>candidate evaluated</strong><small>accuracy +12.4% · policy compliance 100%</small></div>
              <b>PASS</b>
            </div>
          </div>

          <div className="signal-path" aria-hidden="true">
            <span>EXECUTION</span><i />
            <span>OUTCOME</span><i />
            <span>FINDING</span><i />
            <span>CANDIDATE</span><i />
            <span>BETTER SYSTEM</span>
          </div>
        </section>

        <section className="section" id="how-it-works">
          <div className="section-heading">
            <div className="section-label">[ THE CORE LOOP ]</div>
            <h2>One feedback primitive.<br />Every AI system.</h2>
            <p>From an LLM support agent to a glucose predictor, the mechanics are the same: observe a decision, connect the outcome, and improve only when the evidence survives evaluation.</p>
          </div>
          <div className="step-grid">
            {loopSteps.map(([number, title, body]) => (
              <article className="step-card" key={number}>
                <span className="step-number">{number}</span>
                <div className="step-icon" aria-hidden="true"><span /></div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="architecture-section">
          <div className="architecture-copy">
            <div className="section-label">[ TRACE THE WHOLE SYSTEM ]</div>
            <h2>See the model—and everything around it.</h2>
            <p>Executions form a tree. Trace the root agent, delegated agents, retrievals, model calls, and tools inside one episode. The bottleneck might be a prompt. It might be a queue.</p>
            <a href="/docs/#execution-model" className="text-link">EXPLORE THE EXECUTION MODEL <span>→</span></a>
          </div>
          <div className="trace-diagram" role="img" aria-label="Hierarchical AI execution trace">
            <div className="trace-root"><span className="node-dot hot" />ROOT AGENT<small>episode_1042</small></div>
            <div className="trace-children">
              <div className="trace-node"><span className="node-dot" />CLASSIFIER<small>124 ms</small></div>
              <div className="trace-node active"><span className="node-dot hot" />RESEARCH AGENT<small>1,840 ms</small></div>
              <div className="trace-node"><span className="node-dot" />RESPONSE<small>438 ms</small></div>
            </div>
            <div className="trace-tool"><span className="node-dot warn" />EXTERNAL LOOKUP<small>queue wait: 1,316 ms</small><b>BOTTLENECK</b></div>
            <div className="trace-caption"><span />Recurring across 42 episodes · confidence 0.96</div>
          </div>
        </section>

        <section className="section autonomy-section" id="autonomy">
          <div className="section-heading compact">
            <div className="section-label">[ AUTONOMY, GRADUATED ]</div>
            <h2>Choose how far the loop can go.</h2>
            <p>Start by observing. Add autonomy only when your evidence, replay suite, and application policies are ready.</p>
          </div>
          <div className="mode-list">
            <div className="mode-row"><span>01</span><strong>OBSERVE</strong><p>Detect and rank findings.</p><b>NO MUTATION</b></div>
            <div className="mode-row"><span>02</span><strong>RECOMMEND</strong><p>Create reviewable improvement candidates.</p><b>HUMAN REVIEW</b></div>
            <div className="mode-row"><span>03</span><strong>EXPERIMENT</strong><p>Run replay, benchmarks, or shadow evaluation.</p><b>SANDBOX ONLY</b></div>
            <div className="mode-row selected"><span>04</span><strong>APPLY</strong><p>Deploy reversible changes that pass every gate.</p><b>WITHIN POLICY</b></div>
          </div>
        </section>

        <section className="targets-section">
          <div className="section-label">[ WHAT CAN IMPROVE ]</div>
          <div className="ticker" aria-label="Supported improvement targets">
            {targets.map((target) => <span key={target}>{target}<i>↗</i></span>)}
          </div>
        </section>

        <section className="safety-section" id="safety">
          <div>
            <div className="section-label">[ GOVERNED BY DEFAULT ]</div>
            <h2>The system can optimize inside the boundary. It cannot rewrite the boundary.</h2>
          </div>
          <div className="safety-grid">
            <article><span>01</span><h3>Explicit risk ceiling</h3><p>Every candidate is classified from low to critical. Automatic application stops above the configured limit.</p></article>
            <article><span>02</span><h3>Deterministic gates</h3><p>Accuracy, latency, cost, privacy, and policy constraints all have to pass before promotion.</p></article>
            <article><span>03</span><h3>Protected invariants</h3><p>Authorization, tenant isolation, approvals, and tool allowlists stay outside learned artifacts.</p></article>
            <article><span>04</span><h3>Versioned rollback</h3><p>Every deployment keeps its evidence and predecessor, making regressions explainable and reversible.</p></article>
          </div>
        </section>

        <section className="final-cta grid-surface">
          <div className="loop-glyph" aria-hidden="true">↻</div>
          <div className="section-label">[ CLOSE THE LOOP ]</div>
          <h2>Your model is replaceable.<br />Your learning loop compounds.</h2>
          <p>Start with one execution, one outcome, and one recurring pattern.</p>
          <a href="/docs/" className="button button-primary">GET STARTED <span>→</span></a>
        </section>

        <footer className="site-footer">
          <div className="brand"><Mark /><span>Feloop</span></div>
          <p>A lightweight control plane for measurable AI improvement.</p>
          <div><a href="/docs/">Docs</a><a href="#how-it-works">Architecture</a><span>v0.1.0</span></div>
        </footer>
      </div>
    </main>
  );
}
