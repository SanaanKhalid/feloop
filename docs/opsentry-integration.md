# Opsentry is not integrated

No Opsentry files, databases, agents or production prompts are changed by this alpha.
`examples/opsentry.ts` is a synthetic local capture example only.

If an integration is explicitly requested later, it should choose an authorized
namespace, version predictions, record verified operator corrections (not infer
truth from rephrasing), define a held-out evaluator, and implement a real versioned
deployment adapter with inspection/rollback. Begin in recommendation mode. Do not
enable telemetry or model transfers for real operator conversations without an
application-owned privacy and authorization decision.
