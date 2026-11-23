# Province Sub-areas Implementation Plan

**Goal:** Explore published commune-level units and curated investment areas without confusing the two.

**Architecture:** `province-districts.ts` models both scopes. A province-scoped public route returns the active public catalogue's children; polygon retrieval is limited to the selected child and published sources. The existing MapLibre instance highlights one selected geometry and filters linked locations. Compare two or three profiles within the open province.

1. Test classification, parent scoping, unavailable data and GeoJSON output in `tests/features/province-districts.test.ts`; implement the model after seeing the tests fail.
2. Add the public endpoint and document its methods in `docs/openapi.yaml`. No migration or new administrative level.
3. Wire the bilingual district panel into `GeoProfilePanel.tsx`, selection into `MapWorkspace.tsx`, and highlight into `ProvinceMap.tsx`. Keep analysis locations advisory and use only sourced polygon geometry.
4. Run the requested verification commands in order and report gaps. Broader sourced demographic coverage and the five-year simulator are separate increments.
