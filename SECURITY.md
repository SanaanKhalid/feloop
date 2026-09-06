# Security

Only the newest alpha is targeted for fixes; there is no support SLA or promise of
backports. Breaking changes may occur between alpha releases.

## Reporting

Use GitHub's **Report a vulnerability** / private advisory flow on
[SanaanKhalid/loopiter](https://github.com/SanaanKhalid/feloop/security/advisories/new).
The maintainer must enable private vulnerability reporting before public release.
If it is unavailable, open a non-sensitive issue asking for a private contact channel;
do not include exploit details, credentials, customer records or logs publicly.
Please include the version, expected behavior, a minimal synthetic reproduction and
the affected trust boundary. No third-party/customer testing is authorized by this file.

## Application responsibilities

- Authenticate users, authorize namespace/target access, and verify correction provenance.
- Keep secrets out of recorded payloads. Configure deterministic sanitization and payload
  limits; a failed sanitizer fails the operation instead of saving raw content.
- The hook covers capture, candidate content, completions, evaluation results and
  deployment receipts. Actor IDs, namespaces, record IDs and version identifiers are
  operational identifiers: use non-sensitive identifiers; these are not anonymized for you.
- Encrypt and back up your database; restrict SQL and application credentials.
- Treat model/feedback content as untrusted data, never executable policy.
- Run untrusted plugins/callbacks in an application-owned isolation boundary. The SDK
  cannot sandbox JavaScript or revoke an external operation after cancellation.
- Restrict deployment credentials, implement inspection/fencing and maintain a recovery runbook.
- Coordinate namespace deletion with stopped writers and resolved attempts. Deletion
  erases evidence/history, not external deployments, provider copies or backups.

Loopiter sends no telemetry. The optional starter explicitly sends selected text to
OpenAI or Azure OpenAI in live mode. `store:false` is not a zero-retention or compliance guarantee.
Review your provider agreement and retention configuration before sending real data.
