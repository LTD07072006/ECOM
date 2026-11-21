# Acceptance matrix for ECOM

The matrix tracks the current implementation and its evidence. Automated checks run in Release checks. A passed automated check does not replace pilot-owner UAT or source-owner approval.

| Requirement | Implementation and automated evidence | Status and remaining evidence |
| --- | --- | --- |
| T01 Map layer | `tests/e2e/published-release.spec.ts`, `tests/e2e/sprint4-pilot.spec.ts`; layer source and quality in `LayerControls`. | Automated paths covered. The pinned boundary release has 57 overlapping province pairs totalling approximately 8.92 km², requiring source-owner review. |
| T02 Search and numeric filters | `tests/api/geographies.test.ts`, `tests/e2e/retail-scenario.spec.ts`. | Province thresholds and missing-value exclusion covered in retail. Numeric filtering of communes and general map search is not implemented. |
| T03 Compare | `tests/features/comparison.test.ts`, `tests/features/geography/database-repository.test.ts`, `tests/e2e/investor-workspace.spec.ts`. | Compatible rows and mismatch reasons covered. |
| T04 Customer insight | `tests/e2e/retail-scenario.spec.ts` and `tests/features/decision.test.ts`. | Unavailable state covered. No real customer-needs study is integrated, so the available-study path is not demonstrated with published data. |
| T05 Decision score | `tests/features/decision.test.ts` and `tests/e2e/retail-scenario.spec.ts`. | Weighted formula covered using synthetic approved observations. Real retail data is currently ineligible and the interface refuses a score. |
| T06 Traceability | `tests/e2e/published-release.spec.ts`, `tests/api/geographies-export.test.ts`. | Source and value quality are displayed. Verify source license and approval with the data owner for the deployment. |

The release job also checks authentication, inquiry retention, snapshots, migrations and browser flows using isolated data. Named operator identity must be configured for staging and production.
