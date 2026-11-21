# Pilot-Ready MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the inquiry MVP into a pilot-ready workflow with a usable public form, complete steward operations, database/E2E coverage, privacy safeguards, and updated pilot documentation.

**Architecture:** Keep the existing public inquiry API and PostgreSQL transaction boundary. Add small tested domain helpers for request limits, redacted responses, and retention; expand the steward API/UI around the existing role token; verify the complete profile-to-dashboard flow against the real local database without changing public data.

**Tech Stack:** Next.js App Router, React, Zod, Drizzle/PostgreSQL, Bun test, Playwright.

---

### Task 1: Public form contract and UX

**Files:** `src/features/inquiries/InquiryForm.tsx`, `src/features/inquiries/InquiryDialog.tsx`, `tests/features/inquiry-ui.test.ts`

1. Write failing tests for consent, named geography context, preserved input on failure, success reference, and honeypot.
2. Implement a reusable accessible dialog/form with required email/message/consent, optional fields, named geography summary, pending/error/success states, and no raw personal data in confirmation.
3. Run focused UI/domain tests.

### Task 2: Steward API and dashboard operations

**Files:** `src/app/api/internal/inquiries/*`, `src/features/inquiries/InquiryDashboard.tsx`, `tests/api/internal-inquiries.test.ts`, `tests/features/inquiry-dashboard.test.ts`

1. Write failing tests for list filters, detail redaction, status/close validation, note audit, and unauthorized access.
2. Add geography/date filters, detail loading, status update, close reason, note submission, audit timeline, and token clearing.
3. Run API/dashboard tests and TypeScript validation.

### Task 3: Database integration and E2E

**Files:** `tests/db/inquiry.integration.test.ts`, `tests/e2e/investor-inquiry.spec.ts`, `playwright.config.ts`

1. Add integration coverage for create/provenance/audit/rollback/retention using an explicit test database guard.
2. Add Playwright coverage for public submission, confirmation reference, steward dashboard, status update, close reason, and note.
3. Run tests against the configured local PostgreSQL and production server on port 3013.

### Task 4: Privacy, rate limit, and retention hardening

**Files:** `src/lib/api-operations.ts`, `src/app/api/inquiries/route.ts`, `src/db/cleanup-inquiries.ts`, `tests/api/inquiries.test.ts`, `tests/db/inquiry-retention.test.ts`

1. Write failing tests for request-size handling, per-client rate limiting, redacted logging, dry-run/apply retention, and idempotency.
2. Implement bounded body reading, client-aware quota keying without storing message/email, safe cleanup output, and retention tests.
3. Verify operational logs contain no email, inquiry message, or internal note.

### Task 5: UAT and runbook

**Files:** `docs/sprint4-pilot-uat.md`, `docs/sprint4-release-runbook.md`, `README.md`

1. Document pilot setup, public tasks, steward tasks, privacy/retention checks, rollback, and evidence collection.
2. Add explicit known limitation that the shared token identifies a role, not an operator.
3. Run lint, unit/API/DB tests, build, migration check, E2E, and asset integrity verification.
