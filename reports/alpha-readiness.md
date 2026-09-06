# Feloop 0.2.0-alpha.1 — local validation record

## September 6 follow-up

- Azure OpenAI live smoke completed using the existing Azure CLI identity and an
  in-memory Microsoft Entra token. No provider key was needed, printed or saved.
- Deployment/model: `gpt-5.4-mini`; Azure deployment metadata reports version
  `2026-03-17`. The Responses API reported model `gpt-5.4-mini` for all six requests.
- Six synthetic correction examples were classified correctly (764 input tokens,
  73 output tokens reported). Feloop returned `No recurring verified errors.`
  There was no candidate, so live proposal generation, held-out evaluation,
  approval, deployment and rollback were **not exercised** in this run. This is
  the permitted no-candidate outcome, not evidence of self-improvement or ROI.
- Actual report: [alpha-live-azure-smoke.json](./alpha-live-azure-smoke.json).
  It retains baseline predictions, prompt/model identifiers, holdout hash,
  evaluator version, measured latency and token counts. Text/timestamps in the
  fixture manifest are synthetic; createdAt records the actual capture time.
- Azure transport regression tests cover resource URL/deployment routing, key vs
  token authentication, refreshed tokens per request, cancellation and invalid
  credentials/endpoints. Local Node 24/PostgreSQL 17 suite: 49 passed, none skipped;
  documentation compilation, package installation and Fern validation passed.
- npm identity is now verified as `sanaanyl`, with verified email and 2FA enabled.
  Publication remains a separate release action. Repository public access and a
  working public security-reporting channel remain outstanding.
- The previous CI failure was Fern's unauthenticated deployed-redirect notice.
  Local validation permits only that exact notice in CI; other warnings fail.
  Authenticated validation passed locally. All six remote jobs passed on
  `55761f2` before this Azure addition; the Azure commit requires its own CI run.

The original September 5 record below is historical; the follow-up above supersedes
its statements about missing live credentials and unverified npm identity.

Validated September 5, 2026 (America/Chicago), in the working tree based on
`bc8cc91dd5c9cb627f80718a85cafb46eb873fb0`. This is implementation/release preparation,
not a published release, penetration test or claim of production model improvement.

## Completed locally

| Check | Result |
| --- | --- |
| Node 22.23.2 + PostgreSQL 16 | 47 tests passed, 0 skipped |
| Node 22.23.2 + PostgreSQL 17 | 47 tests passed, 0 skipped |
| Node 24.20.0 + PostgreSQL 16 | 47 tests passed, 0 skipped |
| Node 24.20.0 + PostgreSQL 17 | 47 tests passed, 0 skipped |
| SDK build/typecheck | Pass |
| Development stores and PG conformance | Pass |
| PG independent-process CAS and independent-pool deployment contention | Pass |
| Prepare/apply/receipt/rollback fault recovery, uncertain target blocking, late-operation fencing | Pass |
| Simulated starter accepted/rejected candidates and interrupted-deployment recovery | Pass; not live-model results |
| Actual npm tarball → clean consumer install/import/typecheck/CLI/migration asset | Pass on Node 22 and 24; core does not install or require pg |
| Runnable docs | 7 complete TypeScript examples compile, including the landing page |
| Fern 5.113.1 | Pass, no warnings; MDX warnings are treated as failures by the gate |
| Website build/typecheck/lint on Node 24 | Pass; existing design and Sites project retained |
| Local HTTP home, /docs, /docs/ | 200; canonical Fern links present |
| Legacy docs anchors | All 18 mapped and unit-tested; browser execution of redirects was not automated |
| Dependency audits | Root and website: 0 findings at validation time |
| Git diff whitespace checks | Pass |

The website retains its polymorphic UI primitives: only the stylistic
`jsx-a11y/prefer-tag-over-role` rule is disabled for `components/ui/**`. Other
accessibility/correctness checks remain enabled. The addon no longer supplies a
non-keyboard click-only focus shortcut; its actual input remains focusable. Carousel
and media-query state use external-store subscriptions. No visual redesign was done.

The ten original reproductions are covered by positive regression tests in
`test/feedback-loop.test.ts` and `test/self-improvement.test.ts`: namespace collisions,
concurrent active candidates, incorrect rollback lineage, stale evaluation overwriting
rejection, episode outcome fan-out, zero-weight evidence, delayed outcomes, invalid
risk, duplicate external application after persistence failure and proposal overrun.
Additional regression tests cover malformed adapters/JSON/receipts, evaluation identity,
conflicting approvals, missing metrics, cancellation, fences and migration history.

## Fixed synthetic analysis measurements

Raw outputs are retained in `alpha-benchmark-node22.json` and
`alpha-benchmark-node24.json`. Dataset fixed-v1 has 10,000 executions, 10,000 signals,
5,000 episodes and two structured dimensions, using InMemoryStore on macOS arm64.

| Runtime | Analysis elapsed | Heap before / after | RSS after |
| --- | --- | --- | --- |
| Node 22.23.2 | 371.44 ms | 30,561,800 / 49,352,016 bytes | 173,047,808 bytes |
| Node 24.20.0 | 359.14 ms | 33,575,112 / 80,029,352 bytes | 291,373,056 bytes |

Single local snapshots, not general throughput guarantees or isolated peak-analysis
memory measurements. Runtime/GC and other machine activity affect these values.
Use windows/query caps and measure the consuming application's real workload.

## Still required before release

- **Live OpenAI smoke: NOT RUN.** OPENAI_API_KEY, OPENAI_MODEL and a user-owned live
  DATABASE_URL were not configured. Test PostgreSQL containers and simulated responses
  do not substitute for this gate. Follow the starter's explicit `smoke --live --report`
  runbook, retain the actual result and review any subsequent serving-version drill.
- **npm identity/ownership: unverified.** Registry lookup returned E404 for `feloop`;
  `npm whoami` returned ENEEDAUTH. This is not a name reservation or proof of rights.
  Recheck immediately before an explicitly approved alpha publication.
- **Remote CI: not executed here.** A read-only-permission GitHub Actions workflow
  is prepared; its local-equivalent checks passed. Push and inspect its actual jobs
  only when authorized. No claimed green remote run or branch protection verification.
- **Public security reporting/access:** maintainer must enable/verify GitHub private
  vulnerability reporting and deliberately choose repository/website access policy.
- **Publication:** no npm publish, git push, repository visibility change, Fern publish
  or public Sites deployment was performed. Existing hosting project ID is preserved.

See `docs/release-checklist.md` for the owner-controlled release sequence. The core
remains dependency-free; pg and the provider implementation are outside the core.
The alpha is a scoped library, not a hosted service, training platform or Opsentry integration.
