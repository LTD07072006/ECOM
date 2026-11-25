# Site Visit & Logistics Tab Implementation Roadmap

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a separate `Site Visit & Logistics` tab where an investor can find a candidate site, inspect nearby infrastructure, calculate routes to key logistics destinations, compare sites, and plan a site visit without duplicating the primary provincial indicator map.

**Architecture:** Keep the existing `/` map workspace as the macro screening surface. Add a new `/site-visit` route with its own client map workspace and URL state. Use WeMap GL JS for rendering, geocoding, markers, GeoJSON layers, and routing where supported; keep the platform's published infrastructure and provenance data as the source of business facts. Route estimates must remain advisory, dated, and separate from official geography or statistical observations.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Bun, WeMap GL JS (`wemap-gl-js`), GeoJSON, existing PostgreSQL/PostGIS repositories, Zod, Vitest/Bun tests, Playwright.

---

## Product boundary

### The new tab answers

> “Given a specific candidate location, how practical is it to reach the infrastructure and destinations that matter for this investment?”

It must support:

- Search an address, industrial park, or place with WeGeocoder.
- Select a candidate site and show its coordinates, source, and verification status.
- Show nearby airports, seaports, ICDs, expressway nodes, and industrial parks from the published catalogue.
- Calculate an advisory route from the candidate site to a fixed catalogue destination.
- Compare two or three candidate sites using the same destinations and metrics.
- Create a small site-visit itinerary and calculate the ordered route summary.
- Share the current analysis through a URL.

It must not initially include:

- A second provincial choropleth or indicator selector.
- A duplicate 34-province browsing experience.
- A formal investment score presented as a fact.
- A traffic guarantee or truck-specific route unless WeMap explicitly supports and documents it.
- Isochrones in the MVP. Add them only after a confirmed WeMap isochrone API or a separately approved provider is available.

## Domain terms

- **Candidate site:** A location being evaluated; it may be a published industrial park, a user-selected geocoded place, or a verified internal site.
- **Destination:** A published infrastructure or business location used as a route endpoint.
- **Route assessment:** A dated, provider-backed estimate between a candidate site and destination. It is not a permanent fact.
- **Site visit itinerary:** An ordered list of candidate sites and destinations used to plan field work.
- **Advisory geometry:** A point or route used for exploration, not an official administrative boundary.

---

## Roadmap overview

| Phase | Outcome | Suggested scope |
|---|---|---:|
| 0. SDK and product spike | Confirm WeMap integration, token policy, routing response, and licensing | 1–2 days |
| 1. Tab shell and URL state | A separate navigable page with a stable empty/loading/error experience | 1–2 days |
| 2. Candidate site search | Search, select, and persist a candidate site | 2–3 days |
| 3. Infrastructure context | Nearby published infrastructure on the WeMap canvas | 2–3 days |
| 4. Logistics route assessment | Route to fixed destinations with fallback and provenance | 3–5 days |
| 5. Compare mode | Compare two or three sites using repeatable metrics | 3–4 days |
| 6. Site-visit planner | Ordered itinerary, route summary, and shareable state | 3–5 days |
| 7. Hardening and release | Accessibility, quotas, observability, documentation, and browser verification | 2–4 days |
| 8. Optional reachability | Isochrone/travel-time areas after provider confirmation | Separate epic |

The roadmap should be implemented in this order. Do not begin with a generic “map clone”; every phase must connect to a site-selection or site-visit decision.

---

## Phase 0 — WeMap technical and commercial spike

**Objective:** Remove uncertainty before adding the dependency or exposing a public token.

### Verify

1. Confirm the exact npm package and version for `wemap-gl-js` from the current WeMap guide.
2. Verify whether the provided API key is browser-safe, whether referrer restrictions are available, and which domains are approved.
3. Confirm the supported style URL and required CSS import.
4. Run a minimal map with one marker and one GeoJSON source/layer.
5. Run WeGeocoder autocomplete and record the response shape.
6. Run WeRouting for a car route and record distance, duration, geometry, errors, and rate-limit behavior.
7. Confirm whether routing supports waypoints and whether it has traffic, truck profile, or isochrone support. Do not infer these from the SDK slide deck.
8. Check attribution and caching requirements.

### Deliverables

- `docs/research/wemap-integration-spike.md`
- A minimal disposable example or a temporary test page, not yet part of the public tab.
- A decision on whether the route response is rendered directly in the browser or proxied through a same-origin route.

### Exit criteria

- WeMap map loads with the approved token in a local browser.
- A route can be rendered or a documented limitation is recorded.
- Token restrictions, attribution, rate limits, and fallback behavior are known.

---

## Phase 1 — Separate tab shell

**Files:**

- Create: `src/app/site-visit/page.tsx`
- Create: `src/features/site-visit/SiteVisitWorkspace.tsx`
- Create: `src/features/site-visit/site-visit-state.ts`
- Modify: the shared navigation component discovered from the existing shell/header implementation.
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/vi.ts`
- Modify: `src/app/styles/map.css` or create `src/app/styles/site-visit.css` if the styles are materially separate.
- Test: `tests/features/site-visit-state.test.ts`, `tests/smoke/site-visit.test.ts`

### Build

- Add a clearly named navigation item such as `Site visit` / `Khảo sát địa điểm`.
- Render an empty state explaining the workflow: search a place, choose a destination, then calculate a route.
- Add loading, missing-token, provider-unavailable, and no-results states before wiring real data.
- Keep the page independent from `MapWorkspace`; share only domain repositories, i18n, and low-level map utilities.
- Encode candidate coordinates, selected destination, compare IDs, itinerary IDs, and locale-safe display state in the URL.

### Tests

- URL state round-trips valid coordinates and selected IDs.
- Invalid coordinates, excessive itinerary length, and unknown destination IDs are rejected or ignored safely.
- The smoke test finds the new page landmark and navigation link.

---

## Phase 2 — Candidate site search and selection

**Files:**

- Create: `src/features/site-visit/CandidateSearch.tsx`
- Create: `src/features/site-visit/candidate-sites.ts`
- Create: `src/app/api/site-visit/geocode/route.ts` if geocoding must be proxied.
- Create: `src/features/site-visit/wemap-client.ts`
- Test: `tests/features/candidate-sites.test.ts`, `tests/api/site-visit-geocode.test.ts`

### Build

- Add a debounced search field with abortable requests and keyboard navigation.
- Normalize a WeGeocoder result into the platform model: label, longitude, latitude, source, and optional provider ID.
- Allow a published industrial park or infrastructure record to be selected directly without geocoding it again.
- Show a candidate card with source and verification labels.
- Add “drop a pin” only if the WeMap interaction is stable; otherwise defer manual pinning.
- Never present a geocoder result as an official boundary or verified investment site.

### Tests

- Provider results normalize consistently.
- Empty, duplicate, malformed, and provider-error responses are handled.
- Selecting a result updates URL state and map center.
- Stale search responses cannot overwrite a newer query.

---

## Phase 3 — Infrastructure context layer

**Files:**

- Create: `src/features/site-visit/SiteContextMap.tsx`
- Create: `src/features/site-visit/site-context.ts`
- Create: `src/app/api/site-visit/context/route.ts` if a bounded proximity query is needed.
- Modify: existing map repository/query modules only through a reusable read function; do not duplicate seed data.
- Test: `tests/features/site-context.test.ts`, `tests/api/site-visit-context.test.ts`, `tests/e2e/site-visit-map.spec.ts`

### Build

- Render the selected candidate marker.
- Render infrastructure as GeoJSON source/layers: airport, seaport, industrial park, ICD, and expressway node.
- Use distinct accessible symbols/colors and a legend.
- Add a distance filter as a secondary context control, clearly labeled as straight-line/reference distance until route estimates exist.
- Click or keyboard-selecting a feature opens a concise detail panel with name, type, province, source, and data quality.
- Reuse `InfrastructureKind`, existing infrastructure repositories, and provenance metadata where possible.

### Tests

- Context query returns only published and supported infrastructure kinds.
- GeoJSON feature properties are complete and safe for popup rendering.
- Missing coordinates and missing source URLs do not break the map.
- E2E test selects a candidate and toggles one context layer.

---

## Phase 4 — Logistics route assessment

**Files:**

- Create: `src/features/site-visit/RouteAssessmentPanel.tsx`
- Create: `src/features/site-visit/route-assessment.ts`
- Create: `src/app/api/site-visit/routes/route.ts`
- Modify: `src/features/map/road-connectivity.ts` only if shared provider/fallback logic can be generalized safely.
- Test: `tests/features/site-visit-routing.test.ts`, `tests/api/site-visit-routes.test.ts`, `tests/e2e/site-visit-routing.spec.ts`

### Build

- Start with a fixed, published destination catalogue: major seaports, airports, ICDs, and expressway nodes already represented in the platform.
- Validate origin and destination IDs server-side; do not accept arbitrary server-side URLs or provider parameters from the browser.
- Return a stable envelope containing origin, destination, provider, mode, distance, duration, route geometry, observed/calculated time, fallback status, and source/attribution.
- Prefer a same-origin route handler to protect provider details, enforce budgets, normalize errors, and make fallback behavior consistent.
- Reuse the existing route fallback pattern from `src/features/map/road-connectivity.ts` where appropriate, but distinguish WeMap live estimates from dated baseline estimates.
- Render the route line on WeMap and fit the camera to it.
- Show the disclaimer: estimated route, not traffic guarantee, truck route, legal access route, or official boundary.

### Tests

- Provider success normalizes distance, duration, and geometry.
- Provider timeout, rate limit, malformed geometry, and unavailable key use the documented fallback or return a safe unavailable state.
- Requests reject unknown destination IDs, invalid coordinates, excessive waypoint counts, and unsupported profiles.
- Route responses do not expose secrets.
- Repeated identical requests are bounded by the intended cache/limit policy.

### MVP exit criteria

- A user can search/select a candidate site, choose a destination, calculate a route, and understand the result's uncertainty and source.
- The route can be shared through a URL and restored after reload.

---

## Phase 5 — Compare mode

**Files:**

- Create: `src/features/site-visit/SiteComparison.tsx`
- Create: `src/features/site-visit/comparison-model.ts`
- Modify: `src/features/site-visit/site-visit-state.ts`
- Test: `tests/features/site-comparison.test.ts`, `tests/e2e/site-visit-compare.spec.ts`

### Build

- Allow a maximum of three candidate sites.
- Keep the destination set constant while comparing so the metrics are comparable.
- Display distance, duration, route status, data freshness, and verification status side by side.
- Explicitly label missing values; never convert unavailable routes to zero.
- Allow “open in main map/profile” without losing the site-visit analysis URL.
- Do not create a single opaque winner score in the MVP. If a ranking is later needed, show component metrics and explain the weights.

### Tests

- Comparison accepts one to three valid candidates only.
- Results remain aligned by destination ID.
- Mixed live/fallback/unavailable results are distinguishable.
- Removing a site updates URL state and table output deterministically.

---

## Phase 6 — Site-visit itinerary

**Files:**

- Create: `src/features/site-visit/ItineraryBuilder.tsx`
- Create: `src/features/site-visit/itinerary.ts`
- Create: `src/app/api/site-visit/itinerary/route.ts` only if route sequencing needs server aggregation.
- Modify: `src/features/site-visit/SiteContextMap.tsx`
- Test: `tests/features/site-itinerary.test.ts`, `tests/e2e/site-visit-itinerary.spec.ts`

### Build

- Let the user add up to five stops from selected candidates and published destinations.
- Support reorder, remove, clear, and restore from URL state.
- Calculate pairwise legs with a bounded request policy; show partial results if one leg fails.
- Display total distance, total estimated travel time, and per-leg status.
- Add a lightweight visit checklist and notes only if persistence requirements are confirmed. For the first release, local state plus a shareable URL is sufficient; do not introduce accounts prematurely.
- Provide a print-friendly summary or export only after the core workflow is stable.

### Tests

- Itinerary ordering is deterministic.
- Duplicate stops are rejected or merged.
- Partial provider failures do not erase successful legs.
- Maximum stop count and request budget are enforced.
- Share/reload preserves the itinerary.

---

## Phase 7 — Hardening, accessibility, and release

### Security and operations

- Store the browser token only in the approved public environment variable, such as `NEXT_PUBLIC_WEMAP_TOKEN`, after the provider confirms it is a public client token.
- Restrict the token by allowed origins/referrers where supported.
- Add CSP `connect-src` and any required style/font/image origins only after verifying actual WeMap requests.
- Add rate limits and timeouts to same-origin route handlers.
- Do not log tokens, full user search strings, or sensitive coordinates unnecessarily.
- Add attribution required by WeMap and any underlying data providers.
- Record provider, calculated time, fallback mode, and dataset release in route/result metadata.

### UX and accessibility

- Keyboard-accessible search results, layer toggles, destination selectors, and itinerary reorder controls.
- Announce route loading and errors through `role="status"` or an alert region.
- Ensure route and marker meaning is not conveyed by color alone.
- Test mobile layout with the map and details panel stacked rather than squeezed.
- Keep the primary action visible: `Tìm địa điểm`, `Tính tuyến`, or `Thêm vào chuyến khảo sát`.

### Verification

Run:

```powershell
bun test tests/features/site-visit-state.test.ts tests/features/candidate-sites.test.ts tests/features/site-context.test.ts tests/features/site-visit-routing.test.ts tests/features/site-comparison.test.ts tests/features/site-itinerary.test.ts
bun run typecheck
bun run lint
bun run format:check
bun run build
bun run test:e2e -- tests/e2e/site-visit-map.spec.ts tests/e2e/site-visit-routing.spec.ts tests/e2e/site-visit-compare.spec.ts tests/e2e/site-visit-itinerary.spec.ts
```

The browser suite must verify at minimum:

1. The tab loads without a token and explains the unavailable state.
2. A candidate can be searched and selected.
3. Infrastructure layers render and are interactive.
4. A route success, fallback, timeout, and unavailable state are distinguishable.
5. The URL restores the selected site, destination, comparison, and itinerary.
6. The tab does not alter the primary `/` map state.

---

## Phase 8 — Optional travel-time reachability

Treat isochrones as a separate epic, not a hidden MVP task.

### Trigger conditions

- WeMap confirms a supported isochrone/service-area endpoint, or a separate provider is approved.
- Licensing permits rendering the returned polygon on WeMap.
- The team defines whether the result is driving, walking, cycling, or truck-oriented.
- Data freshness and traffic assumptions are visible to users.

### Potential feature

Show 15/30/60-minute estimated reachability around a candidate and count published infrastructure inside each polygon. Use the result for comparison, not as an authoritative administrative boundary.

### Additional work

- Provider adapter and quota policy.
- Polygon validation/simplification.
- GeoJSON fill/outline layer.
- Point-in-polygon aggregation in PostGIS or a bounded server query.
- Tests for invalid/self-intersecting polygons and provider fallback.

---

## Suggested release slices

### Release A — Useful first slice

- Phase 0 complete.
- Phase 1 complete.
- Phase 2 complete.
- Phase 3 complete.
- A candidate can be selected and its nearby infrastructure inspected.

### Release B — Decision-support slice

- Phase 4 complete.
- Route assessment panel, fixed destinations, fallback, provenance, and shareable URL.

### Release C — Collaboration slice

- Phase 5 and Phase 6 complete.
- Compare sites and prepare a site-visit itinerary.

### Release D — Advanced analysis

- Phase 8 only after the provider and data contract are confirmed.

## Open decisions to resolve during Phase 0

1. Is the existing WeMap API key permitted in a browser, and which production origins are allowed?
2. Does the current WeMap account provide routing for the expected Vietnam coverage and usage volume?
3. Is route geometry returned as GeoJSON, encoded polyline, or another format?
4. Are traffic, truck routing, waypoint routing, and isochrones supported by the provisioned product?
5. Should geocoding and routing be proxied through Next.js for quotas and response normalization?
6. Which destinations are approved for the first published catalogue?
7. Are itinerary notes private/local or shared with an authenticated team?

## Definition of done for the tab

- The tab has a distinct purpose and does not duplicate provincial map controls.
- Candidate site, infrastructure context, route assessment, compare mode, and itinerary behavior are covered by unit/API/browser tests.
- Every route result carries provider, time, mode, and fallback/provenance information.
- Missing or advisory data is not represented as a definitive measurement.
- The WeMap token and provider limits are handled according to the confirmed account policy.
- The primary map remains unchanged and its existing tests continue to pass.
