# Investor Inquiry MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a public, provenance-aware investment inquiry funnel from geography profiles and shortlist into a token-protected steward dashboard.

**Architecture:** Store inquiries and their immutable submission context in PostgreSQL. The public API validates a minimal contact form, applies a honeypot and shared rate limit, resolves submitted geography IDs against the currently published catalog, and returns only a reference code. The internal API uses `RELEASE_STEWARD_TOKEN`; status changes and notes are committed with audit events in one transaction. Inquiry records are retained for 12 months after the last update, after which a scheduled/operator cleanup anonymizes personal data while preserving aggregate audit history.

**Tech Stack:** Next.js App Router route handlers, React client components, Drizzle ORM/PostgreSQL, Zod, Bun tests, Playwright E2E.

---

## Product decisions

- Public submission requires a valid email and inquiry message.
- Name, organization, country, sector, and consent are optional except consent must be true when supplied as a contact preference.
- Country and sector are user-provided free text; they are not inferred as verified facts.
- Entry points are geography profile and shortlist tray.
- Server stores submitted geography IDs, geography version, published dataset references, and submission timestamp.
- Public response contains only `submitted`, `referenceCode`, and a generic confirmation message.
- Statuses are `new`, `contacted`, `qualified`, and `closed`.
- `closed` requires a reason: `spam`, `duplicate`, `out_of_scope`, or `resolved`.
- Steward may move `new` or `contacted` directly to `closed` with a reason.
- Steward token is role-level only; every state/note update still creates an audit event.
- Email, inquiry content, and internal notes must not enter operational logs.
- Retention is 12 months after `updated_at`; cleanup anonymizes personal data and inquiry content while retaining non-personal reporting fields.

### Task 1: Add database schema and migration

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0004_investor_inquiries.sql`
- Modify: `drizzle/meta/_journal.json` and generate matching snapshot metadata if required by the repository workflow
- Test: `tests/db/schema.test.ts`

**Steps:**
1. Add `investorInquiries` with UUID, reference code, required email/message, optional contact fields, status, close reason, created/updated timestamps, retention timestamp, and provenance JSON/text fields.
2. Add `inquiryAudit` with event ID, inquiry ID, actor role, action, status transition, note, and timestamp.
3. Add checks for status, close reason, email/message lengths, and closed-reason consistency.
4. Add indexes for reference code, status/updated timestamp, email hash if needed for duplicate detection, and geography IDs.
5. Add migration SQL with the same constraints and foreign keys where applicable.
6. Add schema tests for table exports and constraint definitions.
7. Run `bun test tests/db/schema.test.ts` and verify the migration applies on the disposable/local database.

### Task 2: Add inquiry domain validation and repository

**Files:**
- Create: `src/features/inquiries/types.ts`
- Create: `src/features/inquiries/validation.ts`
- Create: `src/features/inquiries/repository.ts`
- Create: `src/features/inquiries/audit.ts`
- Test: `tests/features/inquiries.test.ts`
- Test: `tests/db/inquiry-repository.test.ts`

**Steps:**
1. Define strict Zod schemas for public submission, internal list filters, status transitions, close reasons, and notes.
2. Enforce normalized email, bounded message length, bounded optional fields, maximum geography IDs, and honeypot acceptance only when empty.
3. Define legal transitions: `new → contacted|qualified|closed`, `contacted → qualified|closed`, `qualified → closed`; reject reopening in MVP.
4. Implement published-catalog provenance resolution for each submitted geography ID. Reject unknown IDs and do not fall back to synthetic catalog data.
5. Implement create/list/get/update operations with parameterized Drizzle queries.
6. Use a single transaction for every status/note update plus its audit row.
7. Implement a cleanup operation that anonymizes personal fields and inquiry text when `updated_at` is older than 12 months; preserve reference code, status, non-personal provenance and audit timestamps.
8. Write unit tests first for validation, transitions, close reasons, honeypot, retention cutoff and provenance rejection; run them red before implementation and green after.

### Task 3: Add public inquiry API

**Files:**
- Create: `src/app/api/inquiries/route.ts`
- Create or modify: `src/lib/api-operations.ts` if a reusable route budget is needed
- Test: `tests/api/inquiries.test.ts`

**Steps:**
1. Add `POST /api/inquiries` with strict JSON/content-type and bounded body parsing.
2. Apply the shared public route quota using the existing PostgreSQL-backed quota mechanism; return `429` and `Retry-After` when rejected.
3. Validate the payload and return field-safe `400` errors without echoing email or message.
4. Resolve provenance server-side from published data and create the inquiry/audit transaction.
5. Return a non-sequential reference code and generic confirmation only.
6. Ensure exceptions and telemetry labels never include body fields, authorization, email, message, or notes.
7. Test successful creation, invalid email, missing message, oversized body, honeypot, unknown geography, rate limiting, and response redaction.

### Task 4: Add steward inquiry API and dashboard

**Files:**
- Create: `src/app/api/internal/inquiries/route.ts`
- Create: `src/app/api/internal/inquiries/[referenceCode]/route.ts`
- Create: `src/features/inquiries/InquiryDashboard.tsx`
- Create: `src/app/internal/inquiries/page.tsx`
- Test: `tests/api/internal-inquiries.test.ts`
- Test: `tests/e2e/investor-inquiry.spec.ts`

**Steps:**
1. Reuse `releaseRole` and require the steward role for all inquiry operations.
2. Add GET list filters for status, country, sector, geography, reference code, and bounded date range.
3. Add GET detail by reference code with provenance and audit history, excluding anonymized personal values when cleanup has run.
4. Add PATCH for status and/or internal note. Require a close reason for `closed`; reject illegal transitions.
5. Record the role, action and note in the same database transaction as the state change.
6. Add dashboard token sign-in/sign-out, list/detail views, filters, status controls, close-reason selection, and note form.
7. Never render raw email/message in list views; show them only in the protected detail view.
8. Add keyboard-accessible labels, focus states, status/alert announcements, and explicit “token identifies the steward role, not an individual operator” notice.
9. Add API tests for `401`, `403`, filtering, redaction, transition rules, audit creation and transaction failure behavior.
10. Add E2E coverage for unauthenticated gate, steward sign-in, list/detail, contacted update, early close with reason, note update and sign-out.

### Task 5: Add public form and funnel entry points

**Files:**
- Create: `src/features/inquiries/InquiryForm.tsx`
- Create: `src/features/inquiries/InquiryDialog.tsx`
- Modify: `src/features/profile/GeoProfilePanel.tsx`
- Modify: `src/features/shortlist/ShortlistTray.tsx`
- Modify: `src/features/map/MapWorkspace.tsx`
- Test: `tests/features/inquiry-ui.test.ts`
- Test: `tests/e2e/investor-inquiry.spec.ts`

**Steps:**
1. Add reusable dialog/form with required email/message, optional name/organization/country/sector, geography context, hidden honeypot, and consent checkbox.
2. Add profile CTA that opens the form with the current geography preselected.
3. Add shortlist CTA that opens the form with up to 20 saved geography IDs and a human-readable summary.
4. Submit through the public API and display only the reference code in confirmation.
5. Preserve entered form values on validation failure; clear them after success or explicit close.
6. Add no-data and unavailable-map states that still permit search/profile inquiry.
7. Add keyboard, mobile viewport, reduced-motion and accessibility checks.

### Task 6: Add retention operation and documentation

**Files:**
- Create: `src/db/cleanup-inquiries.ts`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/sprint4-release-runbook.md`
- Modify: `docs/sprint4-pilot-uat.md`
- Test: `tests/db/inquiry-retention.test.ts`

**Steps:**
1. Add `db:cleanup:inquiries` command requiring an explicit database URL and a dry-run/default-safe mode.
2. Require `--apply` for destructive anonymization and print only counts/reference codes, never personal values.
3. Document the 12-month policy, operator responsibility, backup/restore implications, and audit preservation.
4. Add pilot UAT tasks for opening the inquiry from profile and shortlist, receiving a reference code, and steward processing.
5. Test cutoff behavior, idempotency, dry-run behavior and no logging of personal data.

### Task 7: Full verification

**Files:**
- No new files unless a failing regression identifies a gap.

**Steps:**
1. Run `bun run lint`.
2. Run `bun run test`.
3. Run `RUN_DB_TESTS=1 bun run test:db` with `DATABASE_URL` set.
4. Run `bun run db:migrate` against the local database and verify no public dataset changes.
5. Run `bun run build`.
6. Start exactly one production server on `3013` with `DATABASE_URL` set.
7. Run all E2E tests against `E2E_BASE_URL=http://127.0.0.1:3013`.
8. Check every asset referenced by production HTML returns 200.
9. Verify only intended ports/processes are running and `.next` remains isolated from `.next-dev`.
10. Record actual test counts, migration status, API smoke results and any remaining pilot blockers.
