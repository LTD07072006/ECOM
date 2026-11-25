# Production Observability & Release Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add production-ready observability and release controls for the Site Visit & Logistics feature and existing public APIs without introducing a separate telemetry vendor or exposing sensitive request data.

**Architecture:** Extend the existing `observeApi()` boundary with bounded, structured in-process telemetry and route/provider outcome events. Persist only aggregate minute buckets in PostgreSQL for production replicas, while retaining a bounded local fallback for development and tests. Expose an authenticated internal read-only operations endpoint and dashboard for latency percentiles, status/error rates, provider failures, quota pressure, and cache effectiveness. Add cache headers and a documented release/runbook checklist around deployment, rollback, alerts, and verification.

**Tech Stack:** Next.js App Router, TypeScript, Bun tests, PostgreSQL/Drizzle SQL, React, existing internal operator session, Playwright, Markdown runbooks.

---

### Task 1: Define telemetry event and percentile contracts

**Files:**
- Create: `src/lib/observability.ts`
- Test: `tests/features/observability.test.ts`

**Step 1: Write failing tests**

Cover:
- bounded route/provider/status labels;
- latency aggregation into count, errors, 429s, min, max, p50 and p95;
- no raw query strings, coordinates, tokens, authorization values, or user search text in the event model;
- empty buckets return a stable zero-value envelope.

**Step 2: Run the focused test**

Run: `bun test tests/features/observability.test.ts`

Expected: FAIL because the telemetry module does not exist.

**Step 3: Implement the minimal contract**

Add:
- `ApiTelemetryEvent` with route, status, duration, outcome, provider, fallback and cache state;
- `recordApiTelemetry()` with bounded in-memory retention for local/test use;
- `summarizeTelemetry()` using a deterministic percentile calculation;
- redaction/allow-list helpers that accept only route labels and provider labels.

**Step 4: Run the focused test**

Run: `bun test tests/features/observability.test.ts`

Expected: PASS.

---

### Task 2: Persist aggregate production telemetry buckets

**Files:**
- Create: `drizzle/0018_api_observability.sql`
- Modify: `src/db/schema.ts`
- Create: `src/features/observability/repository.ts`
- Test: `tests/features/observability-repository.test.ts`

**Step 1: Write failing tests**

Test the repository contract with a mocked SQL boundary:
- upsert one minute bucket by route/provider/status/outcome;
- increment request, error, quota and fallback counters;
- maintain bounded latency samples or a bounded histogram suitable for p50/p95;
- query a time window without returning request contents or client identity.

**Step 2: Run the focused test**

Run: `bun test tests/features/observability-repository.test.ts`

Expected: FAIL because the repository/table do not exist.

**Step 3: Implement migration and repository**

Create a table containing only:
- bucket start;
- route label;
- provider label;
- status class/status code;
- request/error/quota/fallback counters;
- bounded latency histogram/count data;
- created/updated timestamps.

Add retention cleanup for buckets older than 30 days. Do not store URLs, query strings, coordinates, tokens, IPs, search text, response bodies, or authorization data.

**Step 4: Run tests and schema checks**

Run: `bun test tests/features/observability-repository.test.ts` and `bun run typecheck`.

Expected: PASS.

---

### Task 3: Instrument API and provider outcomes

**Files:**
- Modify: `src/lib/api-operations.ts`
- Modify: `src/app/api/site-visit/route/route.ts`
- Modify: `src/app/api/map/road-route/route.ts`
- Modify: `src/features/site-visit/route-assessment.ts`
- Test: `tests/api/observability-api.test.ts`

**Step 1: Write failing tests**

Verify:
- every observed API request emits one aggregate event;
- 2xx, 4xx, 429 and 5xx outcomes are distinguishable;
- WeMap live success, fallback, timeout, malformed response and unavailable provider emit provider/outcome metadata;
- logs never contain the hard-coded token, query string, coordinates, or search text;
- quota rejection includes `Retry-After` and increments the quota counter.

**Step 2: Run tests to verify failure**

Run: `bun test tests/api/observability-api.test.ts`

Expected: FAIL for missing telemetry/provider instrumentation.

**Step 3: Implement instrumentation**

Extend `observeApi()` to:
- capture route label, status, duration and outcome;
- record telemetry after the response is available;
- write a single structured `api_request` log with safe fields;
- persist production aggregates asynchronously without delaying the response where safe.

Add explicit provider event recording around WeMap route resolution with provider, mode, fallback, timeout/error class and calculated duration. Keep provider errors normalized and do not log raw exceptions containing URLs or credentials.

**Step 4: Run tests**

Run: `bun test tests/api/observability-api.test.ts tests/features/site-visit-route-fallback.test.ts`.

Expected: PASS.

---

### Task 4: Add safe cache policy and cache metrics

**Files:**
- Modify: `src/app/api/site-visit/context/route.ts`
- Modify: `src/app/api/site-visit/route/route.ts`
- Modify: `src/app/api/map/layers/route.ts`
- Modify: `src/app/api/map/provinces/route.ts`
- Create: `src/lib/cache-policy.ts`
- Test: `tests/features/cache-policy.test.ts`

**Step 1: Write failing tests**

Cover:
- published context/layer/boundary responses use explicit public cache and stale-while-revalidate headers;
- live route responses are `private, no-store` or a narrowly keyed short cache according to policy;
- invalid/error/quota responses are never publicly cached;
- cache state is represented in telemetry without storing request coordinates.

**Step 2: Implement policy**

Centralize cache header construction. Use a short public cache for immutable/published context data and no-store for live route results unless an approved normalized key cache is implemented. Add cache hit/miss counters only at the aggregate level.

**Step 3: Run tests**

Run: `bun test tests/features/cache-policy.test.ts tests/api/site-visit-context.test.ts tests/api/observability-api.test.ts`.

Expected: PASS.

---

### Task 5: Add authenticated operations metrics API

**Files:**
- Create: `src/app/api/internal/observability/route.ts`
- Create: `src/features/observability/metrics-query.ts`
- Test: `tests/api/internal-observability.test.ts`

**Step 1: Write failing tests**

Verify:
- unauthenticated requests are rejected;
- invalid ranges/routes/providers are rejected with 400;
- authorized operators can query at most 24 hours per request;
- response contains p50/p95, request count, 4xx/5xx/429 counts, fallback count, provider errors and cache counters;
- response contains no raw request data or secrets.

**Step 2: Implement endpoint**

Reuse the existing internal operator session/authentication and bounded query validation. Return a stable JSON envelope with a timestamp, requested window, route summaries, provider summaries and quota summaries. Apply private no-store headers and audit access if the existing internal read policy requires it.

**Step 3: Run tests**

Run: `bun test tests/api/internal-observability.test.ts`.

Expected: PASS.

---

### Task 6: Build the internal quota/observability dashboard

**Files:**
- Create: `src/app/internal/observability/page.tsx`
- Create: `src/features/observability/ObservabilityDashboard.tsx`
- Modify: `src/components/SiteHeader.tsx`
- Modify: `src/lib/i18n/en.ts`
- Modify: `src/lib/i18n/vi.ts`
- Create/modify: `src/app/styles/internal.css`
- Test: `tests/e2e/observability-dashboard.spec.ts`

**Step 1: Write the browser test**

Cover:
- internal page is not available to anonymous users;
- authenticated operator sees time window, route table, p50/p95, status/error/quota/fallback counts and provider breakdown;
- loading, unavailable and empty states are accessible;
- no raw token/query/coordinate data is rendered.

**Step 2: Implement the dashboard**

Use the existing internal session flow. Keep the first version table-first and operational: current window, request volume, p50/p95, 5xx/429, provider errors, fallback rate, quota saturation and cache hit rate. Do not add a charting dependency for MVP.

**Step 3: Run the browser test**

Run: `bun run test:e2e -- tests/e2e/observability-dashboard.spec.ts`.

Expected: PASS against the configured preview.

---

### Task 7: Document alerts, deployment, rollback and release evidence

**Files:**
- Create: `docs/phase-9-production-observability-runbook.md`
- Create: `docs/phase-9-release-checklist.md`
- Modify: `docs/sprint4-release-runbook.md`
- Modify: `.env.example`
- Test: `tests/smoke/phase-9-docs.test.ts`

**Step 1: Add the runbook**

Document:
- required environment/migration steps;
- structured event fields and redaction rules;
- dashboards and alert thresholds;
- p50/p95 and 5xx/429/fallback/provider-error thresholds;
- quota exhaustion response;
- WeMap outage/fallback procedure;
- database telemetry retention;
- backup/restore and rollback sequence;
- incident owner and escalation placeholders.

**Step 2: Add the release checklist**

Include checkboxes for:
- migration backup and restore rehearsal;
- token/referrer policy;
- CSP verification;
- route success/fallback/unavailable checks;
- quota and `Retry-After` checks;
- dashboard access;
- E2E and pilot smoke;
- p50/p95 and payload budgets;
- rollback owner/sign-off.

**Step 3: Test documentation invariants**

Assert the docs mention redaction, retention, rollback, provider fallback, quota, p50, p95, CSP and attribution.

**Step 4: Run the docs test**

Run: `bun test tests/smoke/phase-9-docs.test.ts`.

Expected: PASS.

---

### Task 8: Full verification and release gate

**Files:**
- Modify: `package.json` only if a dedicated Phase 9 verification script is useful.

**Step 1: Run focused tests**

```powershell
bun test tests/features/observability.test.ts tests/features/observability-repository.test.ts tests/features/cache-policy.test.ts tests/api/observability-api.test.ts tests/api/internal-observability.test.ts tests/smoke/phase-9-docs.test.ts
```

**Step 2: Run application checks**

```powershell
bun run typecheck
bun run lint
bun run format:check
bun run build
```

**Step 3: Run existing site-visit regression tests**

```powershell
bun test tests/features/site-visit-state.test.ts tests/features/site-visit-context.test.ts tests/features/site-visit-routing.test.ts tests/features/site-visit-compare.test.ts tests/features/site-visit-itinerary.test.ts tests/features/site-visit-route-fallback.test.ts
```

**Step 4: Run browser gates**

```powershell
bun run test:e2e -- tests/e2e/site-visit.spec.ts tests/e2e/observability-dashboard.spec.ts tests/e2e/security-headers.spec.ts
```

**Step 5: Record evidence**

Record command outputs, migration identifier, deployment version, dashboard window, p50/p95, 5xx/429 counts, provider status, quota state and rollback owner in the release checklist. Do not record tokens, raw coordinates, query strings or user search terms.
