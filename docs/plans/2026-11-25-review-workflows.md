# Evidence & Legal Review Workflows Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement the plan task-by-task.

**Goal:** Persist site-verification evidence and legal review decisions with role-gated audit trails, expiry, revalidation, and an internal review UI.

**Architecture:** Site evidence uses one current record per industrial-park field plus append-only audit events. Legal references and entry requirements retain their public advisory model while gaining reviewer metadata and an append-only review audit. Existing named operator identities authorize steward writes and reviewer decisions; public pages never treat these records as investment certification.

**Tech Stack:** Next.js App Router, React 19, TypeScript, PostgreSQL/PostGIS, Drizzle schema/migrations, Zod, Bun/Vitest-compatible tests.

---

### Task 1: Domain transitions and failing API contracts

- Add domain transition tests for approve/reject/revalidate.
- Add internal API tests for authenticated listing, steward create, reviewer decision, and legal review.
- Run the focused tests and confirm failures are caused by missing workflow code.

### Task 2: Database persistence

- Add migration `0018_review_workflows.sql` for current evidence, evidence audit, and legal review audit/metadata.
- Add matching Drizzle tables and constraints in `src/db/schema.ts`.
- Keep source URLs HTTPS-only, values bounded by API body size, and audit rows append-only by application contract.

### Task 3: Repositories and internal APIs

- Implement `site-verification-repository.ts` with list/create/review functions and audit writes in transactions.
- Extend `legal-readiness-repository.ts` with review list/update functions and audit writes.
- Add `/api/internal/site-verification` and `/api/internal/legal-readiness`, using `releaseIdentity`, `observeApi`, bounded JSON, Zod, and role checks.
- Document routes and schemas in OpenAPI.

### Task 4: Internal review UI

- Add `/internal/reviews` with token/session login, evidence list, legal list, reviewer actions, rejection notes, and revalidation controls.
- Add internal navigation and bilingual labels.
- Keep advisory disclaimer prominent; do not expose certification or recommendation language.

### Task 5: Verification

- Run focused tests, full feature/API tests, typecheck, scoped formatting/lint, OpenAPI contract, and diff checks.
- Run DB integration tests only when a disposable Postgres/PostGIS runtime is available; report skips separately.
