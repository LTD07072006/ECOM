# Phase 4 Snapshot Governance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make weekly inquiry report snapshots reproducible, immutable, comparable, exportable, access-controlled, retained, and automatically checked for internal consistency.

**Architecture:** Snapshot creation canonicalizes one reporting period, timezone, filter set, and formula version, computes metrics from that exact period, and stores the result as an immutable record. Corrections create a new record linked to the prior snapshot. Compare/export APIs read stored JSON only, so later inquiry changes cannot alter historical output; a separate snapshot audit table records create/export actions.

**Tech Stack:** Next.js App Router, Zod, PostgreSQL/SQL migrations, Bun test, Playwright.

---

### Task 1: Lock immutable snapshot and formula contracts with pure tests

**Files:**
- Create: `tests/features/inquiry-snapshot-governance.test.ts`
- Modify: `src/features/inquiries/snapshots.ts`
- Modify: `src/features/inquiries/reporting.ts`

1. Write failing tests for the formula version constant, canonical period/filter construction, status-total consistency, stable snapshot comparison, aggregate CSV output, and correction linkage.
2. Run the focused test and verify it fails because governance helpers do not exist.
3. Implement the minimal pure helpers and stored aggregate CSV serializer.
4. Run the focused test until green.

### Task 2: Persist timezone, formula version, correction lineage, and audit

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0006_inquiry_snapshot_governance.sql`
- Modify: `drizzle/meta/_journal.json`
- Create: `tests/db/inquiry-snapshot-governance.integration.test.ts`

1. Add failing integration coverage for immutable snapshot fields, correction lineage, create/export audit events, and retention cleanup.
2. Add `time_zone`, `formula_version`, `corrects_snapshot_id`, and `retention_at` to snapshots; add `inquiry_report_snapshot_audit` with create/export actions.
3. Add repository functions for create, get, compare, audit, and retention cleanup. Never expose an update/delete operation.
4. Run migration and focused PostgreSQL integration tests.

### Task 3: Add compare and stored export APIs

**Files:**
- Create: `src/app/api/internal/inquiries/snapshots/[snapshotId]/route.ts`
- Create: `src/app/api/internal/inquiries/snapshots/compare/route.ts`
- Create: `src/app/api/internal/inquiries/snapshots/export/route.ts`
- Modify: `src/app/api/internal/inquiries/snapshots/route.ts`
- Create: `tests/api/inquiry-snapshot-governance.test.ts`

1. Write failing API tests for steward-only access, same-filter/formula compare, rejection of mismatched snapshots, stored export, and audit events.
2. Require period start/end and timezone to agree; canonicalize filters to the period; store the current formula version.
3. Implement detail, compare, and export endpoints. Export must serialize stored metrics and not query live inquiries.
4. Run focused API tests and verify private fields cannot enter snapshot payloads.

### Task 4: Add dashboard controls and E2E acceptance

**Files:**
- Modify: `src/features/inquiries/InquiryDashboard.tsx`
- Modify: `tests/e2e/investor-inquiry.spec.ts`

1. Add E2E coverage for creating a snapshot, reopening it after an inquiry update, comparing two compatible snapshots, exporting stored metrics, and rejecting incompatible comparisons.
2. Add snapshot list/detail, compare, correction creation, and stored export controls to the steward dashboard.
3. Confirm the old snapshot values remain unchanged after live inquiry updates.
4. Run the focused E2E suite against a production build.

### Task 5: Retention, consistency checks, and documentation

**Files:**
- Modify: `src/db/cleanup-inquiries.ts`
- Modify: `docs/sprint4-pilot-uat.md`
- Modify: `docs/sprint4-release-runbook.md`

1. Add automatic checks that status counts sum to total and snapshot metrics are self-consistent at creation.
2. Add dry-run/apply cleanup for expired snapshots while retaining non-sensitive audit metadata according to the documented period.
3. Document timezone, formula version, immutability, correction workflow, compare/export semantics, steward access, audit, and acceptance evidence.
4. Run lint, all tests, migration, DB integration, build, full E2E, and snapshot immutability smoke verification.
