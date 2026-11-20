# Vietnam Investor Platform Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first runnable Release 1 vertical slice of the Vietnam investor attraction platform with Next.js, Bun, Drizzle ORM, PostgreSQL/PostGIS, map-first exploration, geography search, provenance-aware population observations, and shortlist actions.

**Architecture:** Use one Next.js App Router application for the public web experience and backend Route Handlers. Keep domain and query logic in server-side modules, with Drizzle as the only application database access layer. Use PostGIS-ready geography storage, but only expose boundary rendering when licensed geometry is available; the first seed can use representative point geometry and clearly label it as non-boundary map context.

**Tech Stack:** Bun, Next.js, TypeScript, Drizzle ORM, PostgreSQL 16 + PostGIS, MapLibre GL JS, Zod, Vitest, Playwright.

---

### Task 1: Create the application shell and local database runtime

**Files:**
- Create: `package.json`
- Create: `bunfig.toml`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `docker-compose.yml`
- Create: `Dockerfile`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `src/lib/env.ts`

**Step 1: Write the failing smoke test**

Create a test that expects the root route to render the product name and a map workspace landmark.

**Step 2: Run test to verify it fails**

Run: `bun test tests/smoke/home.test.ts`

Expected: FAIL because the Next.js application does not exist.

**Step 3: Write minimal implementation**

Initialize a Bun-managed Next.js app manually so the repository keeps its existing documentation and skill directories. Add the Docker Compose PostgreSQL/PostGIS service with a persistent volume and healthcheck. Configure the app for server-side database access and add a minimal accessible shell.

**Step 4: Run test to verify it passes**

Run: `bun test tests/smoke/home.test.ts`

Expected: PASS.

**Step 5: Commit**

Run: `git add package.json bunfig.toml next.config.ts tsconfig.json .env.example docker-compose.yml Dockerfile src tests && git commit -m "chore: scaffold next bun application"`

### Task 2: Add Drizzle schema for provenance-aware Release 1 data

**Files:**
- Create: `drizzle.config.ts`
- Create: `src/db/schema.ts`
- Create: `src/db/client.ts`
- Create: `drizzle/0000_initial.sql`
- Modify: `package.json`
- Test: `tests/db/schema.test.ts`

**Step 1: Write the failing test**

Test that the schema exports source registry, dataset versions, geography versions, geo units, indicator definitions, and observations, and that the migration contains the PostGIS extension and core constraints.

**Step 2: Run test to verify it fails**

Run: `bun test tests/db/schema.test.ts`

Expected: FAIL because Drizzle schema and migration are missing.

**Step 3: Write minimal implementation**

Model the existing `database/market-entry/schema.sql` in Drizzle. Use UUIDs, explicit status enums/checks, self-referencing geography hierarchy, provenance foreign keys, observation period fields, quality status, missing reason, numeric/text value separation, and a plain PostGIS `geometry` column for future geometry ingestion. Do not infer demand or create score-eligible population indicators.

**Step 4: Run test to verify it passes**

Run: `bun test tests/db/schema.test.ts`

Expected: PASS.

### Task 3: Add seed data and database commands

**Files:**
- Create: `src/db/seed.ts`
- Create: `src/db/seed-data.ts`
- Create: `tests/db/seed.test.ts`
- Modify: `package.json`

**Step 1: Write the failing test**

Test that the seed dataset contains Vietnam, a small set of provinces, normalized names, one population indicator, and observations with source, period, unit, and quality metadata.

**Step 2: Run test to verify it fails**

Run: `bun test tests/db/seed.test.ts`

Expected: FAIL because seed data is missing.

**Step 3: Write minimal implementation**

Add deterministic demo records for Release 1. Mark the data as demo/official-source placeholders where a real licensed dataset has not yet been supplied. Store representative point geometry only if used by the map and label it as point context, not an administrative boundary. Add `db:generate`, `db:migrate`, `db:seed`, and `db:check` scripts.

**Step 4: Run test to verify it passes**

Run: `bun test tests/db/seed.test.ts`

Expected: PASS.

### Task 4: Implement geography and profile server queries

**Files:**
- Create: `src/features/geography/geography.repository.ts`
- Create: `src/features/geography/geography.service.ts`
- Create: `src/features/geography/geography.types.ts`
- Create: `tests/features/geography/geography.service.test.ts`

**Step 1: Write the failing test**

Cover search by code, Vietnamese name, and accent-insensitive normalized name; confirm results include level and parent context. Cover profile retrieval with observations and provenance.

**Step 2: Run test to verify it fails**

Run: `bun test tests/features/geography/geography.service.test.ts`

Expected: FAIL because the service does not exist.

**Step 3: Write minimal implementation**

Implement parameterized Drizzle queries. Search only public/active records, cap result count, and never turn unavailable observations into zero. Profile responses must include source citation, period, unit, quality, method note, and limitations.

**Step 4: Run test to verify it passes**

Run: `bun test tests/features/geography/geography.service.test.ts`

Expected: PASS.

### Task 5: Expose typed Next.js API routes

**Files:**
- Create: `src/app/api/geographies/route.ts`
- Create: `src/app/api/geographies/[geoId]/route.ts`
- Create: `src/app/api/health/route.ts`
- Create: `src/lib/http.ts`
- Create: `tests/api/geographies.test.ts`

**Step 1: Write the failing test**

Test successful search/profile responses, validation errors, not-found responses, and health output.

**Step 2: Run test to verify it fails**

Run: `bun test tests/api/geographies.test.ts`

Expected: FAIL because routes are missing.

**Step 3: Write minimal implementation**

Validate query parameters with Zod, return stable JSON envelopes, avoid leaking database errors, and include explicit `data_status` metadata. The API must distinguish `unavailable` from numeric zero.

**Step 4: Run test to verify it passes**

Run: `bun test tests/api/geographies.test.ts`

Expected: PASS.

### Task 6: Build the map-first investor workspace

**Files:**
- Create: `src/features/map/MapWorkspace.tsx`
- Create: `src/features/map/map-data.ts`
- Create: `src/features/search/GeoSearch.tsx`
- Create: `src/features/profile/GeoProfilePanel.tsx`
- Create: `src/features/provenance/SourceBadge.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/e2e/investor-workspace.spec.ts`

**Step 1: Write the failing browser test**

Test that an investor can open the workspace, search for a province using an unaccented term, select a result, see profile data and provenance, and see the map context without a false boundary claim.

**Step 2: Run test to verify it fails**

Run: `bunx playwright test tests/e2e/investor-workspace.spec.ts`

Expected: FAIL because the workspace is missing.

**Step 3: Write minimal implementation**

Use a dark cartographic canvas with a restrained warm editorial panel, clear map legend, search-first interaction, keyboard focus states, responsive layout, and explicit “context point / boundary not available” copy. Use MapLibre with a configurable style URL; fall back to a readable local map state when no token/style is configured. Keep the map primary and profile content secondary.

**Step 4: Run test to verify it passes**

Run: `bunx playwright test tests/e2e/investor-workspace.spec.ts`

Expected: PASS.

### Task 7: Add shortlist behavior without authentication

**Files:**
- Create: `src/features/shortlist/shortlist-store.ts`
- Create: `src/features/shortlist/ShortlistButton.tsx`
- Create: `src/features/shortlist/ShortlistTray.tsx`
- Create: `tests/features/shortlist/shortlist-store.test.ts`
- Modify: `src/app/page.tsx`

**Step 1: Write the failing test**

Test adding/removing a geo unit, persistence across reload, and duplicate prevention.

**Step 2: Run test to verify it fails**

Run: `bun test tests/features/shortlist/shortlist-store.test.ts`

Expected: FAIL because shortlist behavior is missing.

**Step 3: Write minimal implementation**

Use a small client-side store backed by localStorage. Keep shortlist records to stable geo IDs and display names; do not treat shortlist membership as investment intent or a qualified lead.

**Step 4: Run test to verify it passes**

Run: `bun test tests/features/shortlist/shortlist-store.test.ts`

Expected: PASS.

### Task 8: Verify local runtime and document setup

**Files:**
- Create: `README.md`
- Create: `docs/data-dictionary.md`
- Create: `.gitignore`
- Modify: `.env.example`

**Step 1: Write the failing setup check**

Add a script that checks the database health, required environment variables, and application health route.

**Step 2: Run it to verify the environment is incomplete**

Run: `bun run db:check`

Expected: FAIL or report missing Bun/database setup before services are started.

**Step 3: Write minimal implementation**

Document Bun installation, Docker Compose startup, migration, seed, development server, tests, Mapbox style configuration, data limitations, and the rule that population is context rather than demand evidence.

**Step 4: Run full verification**

Run:

```text
docker compose up -d db
bun install
bun run db:migrate
bun run db:seed
bun test
bun run build
```

Expected: database healthy, tests pass, and Next.js production build succeeds.

**Step 5: Commit**

Run: `git add . && git commit -m "feat: add release one investor map foundation"`
