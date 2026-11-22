# Acceptance Matrix & Implementation Status (ECOM)

- **Version:** 1.1.0
- **Updated:** 2026-11-23
- **Status:** Active pilot baseline (automated checks enforced in `.github/workflows/release-checks.yml`)
- **API Contract:** [docs/openapi.yaml](openapi.yaml)
- **Entity Matrix:** [docs/entity-feature-matrix.md](entity-feature-matrix.md)

> Automated checks verify code, schema, PostGIS integrity, and browser journeys against synthetic/published data. Passing CI does not replace pilot-owner UAT, source-owner boundary approval, or independent legal counsel review.

## Functional Requirements (F01–F07)

| ID | Capability | Runtime Implementation | Automated Evidence | Status |
| --- | --- | --- | --- | --- |
| **F01** | Interactive Vietnam administrative map, choropleth & infrastructure layers | `src/features/map/ProvinceMap.tsx`, `LayerControls.tsx`, `GET /api/map/provinces`, `GET /api/map/layers` | `tests/e2e/published-release.spec.ts`, `tests/features/geography/database-integrity.test.ts` | Implemented (57 source overlap pairs tracked in `docs/boundary-overlap-audit.md`) |
| **F02** | Bilingual geography search + numeric indicator, period & quality filters | `src/features/search/GeoSearch.tsx`, `GET /api/geographies`, `searchDatabaseGeographies()` (`pg_trgm` GIN index) | `tests/api/geographies.test.ts`, `tests/features/geography/database-repository.test.ts`, `tests/e2e/map-filter-share.spec.ts` | Implemented with transparent missing-data exclusion counts |
| **F03** | Side-by-side comparison (2–3 places) & multi-province region aggregation | `ComparisonPanel.tsx`, `RegionPanel.tsx`, `GET /api/geographies/compare`, `GET /api/geographies/batch`, `loadComparableDatabaseCatalog()` | `tests/features/comparison.test.ts`, `tests/api/geographies-compare.test.ts`, `tests/features/region-and-comparison-enhancements.test.ts` | Implemented with common-cohort selection, period picker, delta/bars & URL sharing |
| **F04** | Customer needs/wants evidence contract & explicit unavailable state | `survey_studies` / `survey_questions` / `survey_aggregates` (`0013`), `GET /api/decision/evidence`, `RetailScenario.tsx` | `tests/api/decision-evidence.test.ts`, `tests/features/decision.test.ts`, `tests/e2e/retail-scenario.spec.ts` | Contract, DB tables, API & UI implemented; real published survey datasets pending data-owner supply |
| **F05** | Multi-criteria weighted decision support with strict refusal rules | `src/features/decision/model.ts`, `RetailScenario.tsx`, `/decision` (4 sectors + polarity + What-if disclaimer + scenario export) | `tests/features/decision.test.ts` (incl. exact `A=68.35 / B=69.05` benchmark), `tests/e2e/retail-scenario.spec.ts` | Implemented; official scoring refuses ineligible/missing evidence |
| **F06** | Provenance, source license, quality transparency & dual-role release workflow | `source_registry`, `dataset_versions`, `release_batches`, `/internal/releases`, `GET /api/internal/releases` | `tests/db/release-workflow.integration.test.ts`, `tests/features/operator-identity.test.ts` | Implemented with reviewer/steward separation & individual operator audit |
| **F07** | Provenance-aware JSON & formula-safe CSV exports + legal readiness checklist | `GET /api/geographies/export`, `src/lib/csv.ts`, `src/features/regions/export.ts`, `scenario-export.ts`, `LegalReadinessChecklist.tsx` | `tests/api/geographies-export.test.ts`, `tests/features/legal-readiness.test.ts`, `tests/features/inquiry-reporting.test.ts` | Implemented across shortlist, regions, scenarios, legal checklist, and steward reports |

## Acceptance Criteria (T01–T06)

| Requirement | Implementation & Automated Evidence | Status & Remaining External Evidence |
| --- | --- | --- |
| **T01** Map layer & provenance | `tests/e2e/published-release.spec.ts`, `tests/e2e/sprint4-pilot.spec.ts`, `tests/features/geography/database-integrity.test.ts`, `tests/features/geography/topology-repair.test.ts`; per-value quality & opacity differentiation in `ProvinceMap.tsx` + `LayerControls.tsx`. | Automated paths covered. Pinned simplified boundaries have 57 overlapping province pairs (~8.92 km²) documented in [docs/boundary-overlap-audit.md](boundary-overlap-audit.md) awaiting source-owner revision. |
| **T02** Search & numeric filters | `tests/api/geographies.test.ts`, `tests/features/geography/database-repository.test.ts`, `tests/e2e/map-filter-share.spec.ts`, `tests/e2e/retail-scenario.spec.ts`. | Accented search, level filter, indicator/period/quality numeric thresholds, and transparent missing-data exclusion counts covered in both map filter and general search. |
| **T03** Compare 2–3 areas | `tests/features/comparison.test.ts`, `tests/api/geographies-compare.test.ts`, `tests/features/geography/database-repository.test.ts`. | Source/dataset identity, common-cohort selection, period selection, per-row partial comparison, and mismatch reasons covered. |
| **T04** Customer needs evidence | `tests/api/decision-evidence.test.ts`, `tests/features/decision.test.ts`, `tests/e2e/retail-scenario.spec.ts`. | Both data-absent and data-present API/model contracts covered; real field survey data awaits data-owner publication. |
| **T05** Weighted decision score | `tests/features/decision.test.ts`, `tests/e2e/retail-scenario.spec.ts`. | Higher/lower polarity, exact DOCX `68.35 / 69.05` benchmark, normalization sensitivity warning, and refusal rules covered. |
| **T06** Traceability & legal advisory | `tests/e2e/published-release.spec.ts`, `tests/api/geographies-export.test.ts`, `tests/features/legal-readiness.test.ts`. | Source, license, quality, and advisory-only legal readiness checklist (`legal_references`, `entry_requirements`) verified; formal legal review stays with external counsel. |
