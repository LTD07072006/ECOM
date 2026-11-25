# Phase 9 production release checklist

- [ ] Database backup completed and restore owner confirmed.
- [ ] Migration `0018_api_observability.sql` applied and verified.
- [ ] Telemetry retention/pruning scheduled for 30 days.
- [ ] Token/referrer policy approved and token is not present in logs.
- [ ] CSP includes verified WeMap origins.
- [ ] WeMap attribution and OpenStreetMap attribution visible.
- [ ] Site Visit live route, fallback and unavailable states verified.
- [ ] Quota limit and `Retry-After` behavior verified.
- [ ] Internal observability dashboard access verified with an operator account.
- [ ] Redaction review completed: no query strings, coordinates, search terms or secrets.
- [ ] p50 and p95 latency recorded for the pilot window.
- [ ] 5xx, 429, provider error and fallback counts recorded.
- [ ] Cache hit/miss behavior reviewed.
- [ ] Browser/E2E suite passed.
- [ ] Rollback build, incident owner and escalation contact confirmed.
- [ ] Attribution, licensing and provider terms reviewed.
