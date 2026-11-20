# Sprint 2 Map Profile Comparison Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the Release 1 vertical slice with boundary-ready geometry coverage, provenance-aware population/area/density profile context, geography comparison, shortlist tray actions, and JSON/CSV export without publishing unlicensed polygons or inferred investment scores.

**Architecture:** Keep the Next.js monolith and server-side catalog loader. Add explicit geometry status to geography records, keep `point_only` as the current public state, and derive coverage counts from the same catalog used by the map. Expose comparison and export through Route Handlers backed by the public catalog; keep shortlist IDs in localStorage and fetch full profiles only when the user requests comparison/export.

**Tech Stack:** Bun, Next.js App Router, TypeScript, Drizzle ORM, PostgreSQL/PostGIS, Zod, Bun test, Playwright.

---

## Integration checkpoint — current Sprint 1 contracts

- Reuse Sprint 1's `dataset_versions` governance, `geo_boundaries`, metadata types, repository and `getProfile().administrativeDataset`; no duplicate migration/model.
- Production loader has no demo fallback. DB failure is `mode: unavailable`; APIs return 503. An unpublished catalog is empty, not an invented release.
- Synthetic fixtures remain test/demo seed only. Tests inject fixtures at the loader boundary; do not publish them to make UI tests pass.
- Preserve population observation UUIDs; area/density have separate namespaces and decimal types. Official importer uses `POP_AVG`; UI must render contract observations rather than assume `POP_TOTAL`.
- Boundary option 1 remains in force: no boundary import or publication in Sprint 2. Coverage follows actual public catalog, not a fixed count of eight.
- Work in this directory without commits/worktrees (no Git repository). Do not overwrite concurrently changing Sprint 1 repository/importer/migration work.
- Verification blocker at this checkpoint: Docker Linux daemon unavailable. Unit/API and browser fixture tests can run independently; real DB checks remain separate.
- UI: retain existing teal/paper map workspace, add a saved-place tray and wide comparison section below the map. On mobile these become normal-flow panels, not overlapping overlays. Missing data and stale saved IDs remain explicit.

### Task 1: Add geometry status and coverage metadata

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/<generated-sprint-2-migration>.sql` via `bun run db:generate`
- Modify: `src/db/seed-data.ts`
- Modify: `src/db/seed.ts`
- Modify: `src/features/geography/types.ts`
- Modify: `src/features/geography/database-repository.ts`
- Modify: `src/features/map/MapWorkspace.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/features/geography/coverage.test.ts`

**Step 1: Write the failing test**

Assert every current geography has `geometryStatus: "point_only"`, no public boundary is claimed, and coverage counts report zero boundary-ready units and all current units as point-only.

**Step 2: Run test to verify it fails**

Run: `bun test tests/features/geography/coverage.test.ts`

Expected: FAIL because geometry status and coverage are not represented.

**Step 3: Write minimal implementation**

Add a checked `geometry_status` column with values `not_available`, `point_only`, `boundary_available`, `boundary_verified`, or `restricted`. Seed all current records as `point_only`, map the field from the database, add a pure coverage summarizer, and render a visible coverage card/legend stating that no administrative boundary is available.

**Step 4: Run test to verify it passes**

Run: `bun test tests/features/geography/coverage.test.ts`

Expected: PASS.

### Task 2: Add profile context indicators

**Files:**
- Modify: `src/db/seed-data.ts`
- Modify: `src/db/seed.ts`
- Modify: `src/features/profile/GeoProfilePanel.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/db/seed-data.test.ts`
- Test: `tests/features/geography.test.ts`

**Step 1: Write the failing test**

Assert the catalog contains `POP_TOTAL`, `AREA_TOTAL`, and `POP_DENSITY` definitions/observations, all unavailable demo observations remain null rather than zero, and profile output contains unit, period, quality, source, and limitations for each context indicator.

**Step 2: Run test to verify it fails**

Run: `bun test tests/db/seed-data.test.ts tests/features/geography.test.ts`

Expected: FAIL because area and density indicators do not exist.

**Step 3: Write minimal implementation**

Add unavailable observations for total area and population density. Render profile context rows as separate metric cards, preserve `No data available`, and explicitly label all three as context only. Do not fill values from population or derive density without an approved source.

**Step 4: Run test to verify it passes**

Run: `bun test tests/db/seed-data.test.ts tests/features/geography.test.ts`

Expected: PASS.

### Task 3: Implement comparison service and API

**Files:**
- Modify: `src/features/geography/domain.ts`
- Create: `src/app/api/geographies/compare/route.ts`
- Create: `tests/api/geographies-compare.test.ts`
- Modify: `package.json` only if test path scripts need updating

**Step 1: Write the failing test**

Test comparison of two valid geography IDs, unavailable values returning null, rejection of fewer than two or more than three IDs, not-found handling, and incompatibility when geography versions/periods/units/definitions differ.

**Step 2: Run test to verify it fails**

Run: `bun test tests/api/geographies-compare.test.ts`

Expected: FAIL because the compare route/expanded rows do not exist.

**Step 3: Write minimal implementation**

Load one public catalog, resolve profiles, expand comparison rows across shared indicators, and return stable metadata. Never produce a ranking or normalize values. Return `compatible: false` with a reason when direct comparison is not valid.

**Step 4: Run test to verify it passes**

Run: `bun test tests/api/geographies-compare.test.ts`

Expected: PASS.

### Task 4: Build shortlist tray and comparison panel

**Files:**
- Create: `src/features/shortlist/ShortlistTray.tsx`
- Create: `src/features/comparison/ComparisonPanel.tsx`
- Modify: `src/features/shortlist/ShortlistButton.tsx`
- Modify: `src/features/map/MapWorkspace.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/features/shortlist.test.ts`

**Step 1: Write the failing test**

Add tests for shortlist removal, stable deduplication, and selecting up to three records for comparison.

**Step 2: Run test to verify it fails**

Run: `bun test tests/features/shortlist.test.ts`

Expected: FAIL because tray selection/removal helpers do not exist.

**Step 3: Write minimal implementation**

Render saved places in a tray, allow removal, show a compare action when two or three places are saved, and render a comparison table with explicit unavailable cells. Dispatch a browser event after localStorage changes so the tray and button stay synchronized.

**Step 4: Run test to verify it passes**

Run: `bun test tests/features/shortlist.test.ts`

Expected: PASS.

### Task 5: Add JSON and CSV export

**Files:**
- Create: `src/app/api/geographies/export/route.ts`
- Create: `src/features/shortlist/export.ts`
- Modify: `src/features/shortlist/ShortlistTray.tsx`
- Create: `tests/api/geographies-export.test.ts`

**Step 1: Write the failing test**

Test JSON export envelope, CSV headers/escaping, invalid format, missing IDs, and the absence of ranking/ROI claims in exported data.

**Step 2: Run test to verify it fails**

Run: `bun test tests/api/geographies-export.test.ts`

Expected: FAIL because the export route does not exist.

**Step 3: Write minimal implementation**

Export selected public profiles with source, period, unit, geography version, quality, and limitation fields. Use `Content-Disposition` for downloads and escape CSV values. Export is context data only and must not add computed investment scores.

**Step 4: Run test to verify it passes**

Run: `bun test tests/api/geographies-export.test.ts`

Expected: PASS.

### Task 6: Update database migration, docs, and E2E flow

**Files:**
- Modify: `README.md`
- Modify: `docs/data-dictionary.md`
- Modify: `tests/e2e/investor-workspace.spec.ts`
- Modify: `package.json`

**Step 1: Write the failing E2E assertions**

Extend the browser flow to assert point-only coverage, save two places, open comparison, and trigger JSON export.

**Step 2: Run test to verify it fails**

Run: `bun run build` then `python skills/webapp-testing/scripts/with_server.py --server "C:\Users\Hp\.bun\bin\bun.exe --bun next start -H 127.0.0.1 -p 3000" --port 3000 --timeout 60 -- C:\Users\Hp\.bun\bin\bun.exe x playwright test tests/e2e/investor-workspace.spec.ts`

Expected: FAIL because the new UI actions are missing.

**Step 3: Write minimal implementation**

Document Sprint 2 limitations, migration commands, coverage semantics, comparison compatibility, and export behavior. Keep the Bun unit test script separate from Playwright files.

**Step 4: Run full verification**

Run sequentially:

```text
docker compose up -d db
bun run db:generate
bun run db:migrate
bun run db:seed
bun run test
bun run lint
bun run build
$env:RUN_DB_TESTS = "1"; bun run test:db
python skills/webapp-testing/scripts/with_server.py --server "C:\Users\Hp\.bun\bin\bun.exe --bun next start -H 127.0.0.1 -p 3000" --port 3000 --timeout 60 -- C:\Users\Hp\.bun\bin\bun.exe x playwright test tests/e2e/investor-workspace.spec.ts
```

Expected: all unit/API/database/E2E checks pass; database remains on `127.0.0.1:55432`; no polygon is published.
