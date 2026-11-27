# Site Visit Map Logistics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let investors place or adjust an arbitrary survey point on the WeMap and connect logistics table rows to highlighted, fitted route lines.

**Architecture:** Keep the selected survey point in `SiteVisitWorkspace` as the single source of truth. Extend the existing URL state serializer/parser so arbitrary coordinates survive sharing. Make `SiteVisitMap` emit map clicks and drag updates, and render the current logistics overview as route features with a selected destination. Make `LogisticsNetworkPanel` expose row selection and route metadata without owning map state.

**Tech Stack:** Next.js App Router, React client components, TypeScript, WeMap GL, GeoJSON, Bun tests.

---

### Task 1: Define placement and logistics-selection behavior with tests

**Files:**
- Modify: `tests/features/site-visit-state.test.ts`
- Modify or create: `tests/features/logistics-overview.test.ts`
- Test: `tests/features/site-visit-state.test.ts`

**Steps:**
1. Add a failing test that serializes and parses an unlabeled/free-form candidate using a stable generated label and exact longitude/latitude.
2. Add a failing test that identifies the selected logistics leg and preserves `live`, `baseline`, and `unavailable` statuses in the overview data used by the UI.
3. Run the focused tests and confirm they fail for the missing behavior.
4. Keep the tests minimal and focused on pure state/overview behavior.

### Task 2: Add free-form map placement and URL persistence

**Files:**
- Modify: `src/features/site-visit/SiteVisitMap.tsx`
- Modify: `src/features/site-visit/SiteVisitWorkspace.tsx`
- Modify: `src/features/site-visit/site-visit-state.ts`
- Modify: `src/app/styles/site-visit.css`
- Test: `tests/features/site-visit-state.test.ts`

**Steps:**
1. Add an `onCandidateChange` callback to `SiteVisitMap` and handle a map click on the empty map canvas.
2. Create a candidate label such as `Pinned location` for a free-form point and use the map's longitude/latitude.
3. Configure the candidate marker as draggable and emit the updated coordinates on drag end.
4. Update workspace state through one callback so search selection, map placement, and marker dragging share the same route-reset behavior.
5. Keep the existing URL synchronization and ensure the generated label is encoded/decoded safely.
6. Add a visible status/action hint explaining that users can click the map and drag the pin.
7. Run the focused state tests and the relevant component/type checks.

### Task 3: Render and select logistics routes on the map

**Files:**
- Modify: `src/features/site-visit/SiteVisitMap.tsx`
- Modify: `src/features/site-visit/SiteVisitWorkspace.tsx`
- Modify: `src/features/site-visit/LogisticsNetworkPanel.tsx`
- Modify: `src/features/site-visit/LogisticsMatrix.tsx`
- Modify: `src/features/map/logistics-overview.ts`
- Test: `tests/features/logistics-overview.test.ts`

**Steps:**
1. Add a selected destination code to workspace state and pass it to both the map and logistics panel.
2. Add a row-selection callback to the logistics matrix/panel.
3. Render each available logistics leg as a GeoJSON line feature on the map, with properties for destination code, route mode, status, distance, and duration.
4. Use separate visual treatment for live road routes, baseline/straight-line estimates, and unavailable routes; unavailable legs should retain a table label but have no misleading line.
5. Highlight the selected line and call `fitBounds` using the candidate point and destination geometry when a row is selected.
6. Make clicking a rendered route select the corresponding logistics row.
7. Ensure route sources/layers are updated rather than duplicated and are removed on cleanup.
8. Run focused overview and component tests.

### Task 4: Verify the complete flow

**Files:**
- Modify: `tests/e2e/site-visit.spec.ts` if existing selectors need coverage

**Steps:**
1. Add or update an E2E scenario for opening Site Visit with a shared coordinate URL.
2. Verify the candidate marker appears, dragging changes the URL coordinates, and a map click creates a candidate.
3. Verify selecting a logistics row updates the selected route state and map presentation.
4. Run typecheck, focused tests, formatter/lint, production build, and the Site Visit E2E test.
5. Review the diff and confirm unrelated user changes remain untouched.
