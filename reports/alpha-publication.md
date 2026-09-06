# Feloop 0.2.0-alpha.1 publication — September 6, 2026

- Published successfully to npm by `sanaanyl` using explicit `--tag alpha --access public`.
- Source commit: `9f78d6b7659bf3b5a062b65f7bb064c02d6266e9`.
- Annotated Git tag: `v0.2.0-alpha.1`, pushed to the public repository.
- All six CI jobs passed on that commit: Node 22/24 × PostgreSQL 16/17,
  website and Fern. The SDK suite contains 49 tests after the Azure addition.
- Registry SHA-1: `5fee4529475f93bbd535577e1568c565529a41cb`.
- Registry integrity: `sha512-77rGgA14v1SfWnlpVVTfwW4L1CffCHeA4tJo7oOk18W9DgamKt0yuesY43fi81D0zLB0NoCpK0QRfbkCQLRfeQ==`.
  Both match the reviewed local tarball.
- Fresh installation from the public registry on Node 24 passed version, dependency,
  public export, execution capture, adapter-conformance and installed CLI checks.
- GitHub repository is public; private vulnerability reporting is enabled.
- Azure live smoke and its no-candidate limitation are recorded in
  `alpha-live-azure-smoke.json` and the September 6 readiness follow-up.

## Outstanding distribution-tag issue

Registry reads show both `alpha` and `latest` pointing to `0.2.0-alpha.1`, despite
the explicit alpha publication flag. An authenticated `npm dist-tag rm feloop latest`
was rejected by npm with HTTP 400 on September 6. No successful removal is claimed.
Consumers should install the explicit alpha version/channel. This is a prerelease,
not a stable release. Do not unpublish or invent a stable version to work around it.

This document records the release after publication; the release tag continues to
point at the exact tested source used to build the published tarball.
