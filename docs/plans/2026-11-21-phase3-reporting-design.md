# Phase 3 Inquiry Reporting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend inquiry reporting with one shared filter contract, complete-result pagination/metrics/CSV semantics, weekly and geography/country/sector analytics, and auditable weekly report snapshots for the pilot.

**Architecture:** Keep raw inquiry values and existing privacy boundaries intact. Introduce a shared parsed filter type and repository queries that distinguish paginated rows from the complete filtered report set; derive dashboard metrics, trends, breakdowns, and CSV from the same complete set. Store only non-sensitive snapshot metadata, filters, and computed metrics in a dedicated PostgreSQL table.

**Tech Stack:** Next.js App Router, React, Zod, PostgreSQL/Drizzle-compatible SQL, Bun test, Playwright.

---

### Task 1: Lock the reporting contract with pure tests

**Files:**
- Modify: `tests/features/inquiry-reporting.test.ts`
- Create: `tests/features/inquiry-reporting-phase3.test.ts`
- Modify: `src/features/inquiries/reporting.ts`

1. Write failing tests for shared filters, page metadata, Unicode/case/whitespace normalization, ISO weekly trend, unique total counting for multi-geography inquiries, geography breakdown, country/sector breakdown, and CSV row count beyond 100.
2. Run the focused tests and verify they fail for missing Phase 3 exports/behavior.
3. Implement pure reporting helpers and explicit report types.
4. Run focused reporting tests until green.

### Task 2: Add repository-wide filtering and pagination

**Files:**
- Modify: `src/features/inquiries/repository.ts`
- Modify: `src/app/api/internal/inquiries/route.ts`
- Modify: `tests/db/inquiry.integration.test.ts`
- Create: `tests/api/internal-inquiries-reporting.test.ts`

1. Add failing API tests for `page`, `pageSize`, `from`, `to`, `geographyIds`, stable pagination metadata, and complete metrics/CSV independent of page size.
2. Add a safe geography filter using `geography_ids && uuid[]` and validate IDs with Zod.
3. Split repository access into paginated rows and unbounded report rows; use the same filter object for both.
4. Return `data`, `pagination`, and complete-set `metrics` from JSON; make CSV use the complete filtered set and accept more than 100 rows.
5. Run API and PostgreSQL integration tests.

### Task 3: Add Phase 3 analytics

**Files:**
- Modify: `src/features/inquiries/reporting.ts`
- Modify: `tests/features/inquiry-reporting-phase3.test.ts`
- Modify: `src/app/api/internal/inquiries/route.ts`

1. Add failing tests for weekly trend, geography statistics where each inquiry contributes once per related geography, and normalized country/sector grouping.
2. Implement deterministic analytics from the complete filtered row set.
3. Add the analytics fields to the internal JSON response without exposing private fields.
4. Run focused and API tests.

### Task 4: Add snapshot persistence and API

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0005_inquiry_report_snapshots.sql`
- Modify: `drizzle/meta/_journal.json`
- Create: `src/features/inquiries/snapshots.ts`
- Create: `src/app/api/internal/inquiries/snapshots/route.ts`
- Create: `tests/db/inquiry-snapshots.integration.test.ts`
- Create: `tests/api/inquiry-snapshots.test.ts`

1. Write failing tests for weekly snapshot creation, stored period/filter/metrics, authorization, and rejection of email/message/note fields.
2. Add a snapshot table with period start/end, filters JSON, metrics JSON, creator, and created timestamp; do not store inquiry content or personal contact data.
3. Implement transactional snapshot insertion and a steward-only POST/GET API.
4. Run migration and PostgreSQL snapshot tests.

### Task 5: Update steward dashboard

**Files:**
- Modify: `src/features/inquiries/InquiryDashboard.tsx`
- Modify: `tests/e2e/investor-inquiry.spec.ts`

1. Add E2E coverage for date range, geography, pagination, complete metrics, CSV export beyond 100 rows, and weekly snapshot creation.
2. Add date inputs, geography ID filter, page controls, pagination summary, trend/breakdown sections, and snapshot controls.
3. Ensure CSV download uses current filters but not current page.
4. Run the focused E2E test against a production build.

### Task 6: Documentation and full verification

**Files:**
- Modify: `docs/sprint4-pilot-uat.md`
- Modify: `docs/sprint4-release-runbook.md`

1. Document the shared filter contract, unique inquiry counting, multi-geography breakdown semantics, normalization rules, and snapshot retention/usage.
2. Run lint, unit/API/features tests, database integration, migration, production build, full E2E, and API consistency smoke tests.
3. Confirm dashboard metrics equal metrics computed from the exported complete CSV for a result set over 100 rows.
