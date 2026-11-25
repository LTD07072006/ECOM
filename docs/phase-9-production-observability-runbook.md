# Phase 9 — Production observability runbook

## Scope

This runbook covers the Site Visit & Logistics API and the shared API observation boundary. Telemetry is aggregate-only: route labels, status, provider, latency, fallback, quota and cache outcomes.

## Redaction and retention

- Never log tokens, authorization headers, URLs, query strings, search text, raw coordinates, request bodies, emails or inquiry content.
- PostgreSQL observability buckets are retained for 30 days, then pruned by the scheduled maintenance process.
- Dashboard access is operator-authenticated and responses are private/no-store.

## Signals and alerts

- Alert when route or API p95 exceeds the release budget for 15 minutes.
- Alert on sustained 5xx, provider timeout/error growth, fallback rate above the agreed pilot threshold, or repeated 429 responses.
- Review quota saturation and cache hit/miss behavior during each pilot window.
- Treat WeMap fallback as advisory and never present it as a traffic guarantee or official truck route.

## WeMap/provider incident

1. Confirm provider errors and timeout counts in the internal observability dashboard.
2. Verify the same-origin route returns a dated baseline fallback and exposes `fallback: true`.
3. Confirm the UI disclaimer and source metadata remain visible.
4. If fallback quality is unacceptable, disable route actions at the gateway and communicate unavailable status; do not silently substitute an official-looking route.
5. Record provider incident time, affected build and recovery time without recording the token or user coordinates.

## Quota incident

Check `429` counts and `Retry-After`. Confirm client/global quota configuration, then reduce pilot load or wait for the window to reset. Do not increase quota in production without an owner and provider-budget approval.

## Deployment and rollback

1. Back up the database and apply the observability migration.
2. Deploy the tagged application build with production secrets from the secret manager.
3. Verify `/api/health`, `/site-visit`, context, live route, fallback route and the internal dashboard.
4. Run the release checklist and record p50/p95, 5xx/429, provider and quota evidence.
5. On regression, switch traffic to the previous compatible build. Preserve the telemetry and application logs needed for incident review.
