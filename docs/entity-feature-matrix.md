# Entity-to-Feature Matrix & Engineering Governance

- **Version:** 1.0.0
- **Updated:** 2026-11-23
- **Canonical Runtime Schema:** [src/db/schema.ts](../src/db/schema.ts) + [drizzle/](../drizzle/) (applied via `bun run db:migrate`)
- **Prototype Reference SQL:** [database/market-entry/](../database/market-entry/) *(design reference only — do not run against production)*

## 1. Runtime Drizzle Tables (28) vs Prototype SQL Design

| Runtime Table (`market_entry.*`) | Migration | Active Feature(s) | Prototype SQL Equivalent |
| --- | --- | --- | --- |
| `source_registry` | `0000` | Data provenance, license & public visibility | `source_registry` |
| `dataset_versions` | `0000` | Versioned releases, ETag caching, cohort selection | `dataset_versions` |
| `geography_versions` | `0000` | Active administrative release (`VN_ADMIN_2025_07`) | `geography_versions` |
| `geo_units` | `0000`, `0011` | 3,356 geographies + `pg_trgm` GIN search | `geo_units` |
| `geo_boundaries` | `0001` | 34 provincial PostGIS polygons (`SRID 4326`) | `geo_boundaries` |
| `indicator_definitions` | `0000` | Indicator metadata, units, `score_eligible` | `indicator_definitions` |
| `observations` | `0000` | Statistical values, quality, time-series history | `observations` |
| `infrastructure_pois` | `0002`, `0010` | Airports, seaports, industrial parks, ICDs, expressways + PostGIS `ST_DWithin` proximity | `infrastructure_pois` |
| `release_batches`, `release_members`, `release_audit` | `0003` | Dual-role reviewer/steward release workflow | Governance extension |
| `api_quotas`, `api_client_quotas` | `0003`, `0007` | Per-client HMAC quotas + global emergency ceilings | Operations extension |
| `investor_inquiries`, `inquiry_audit` | `0004`, `0007` | Public inquiry submission, consent, status lookup, steward triage | `investment_inquiries` |
| `inquiry_notifications` | `0009` | Bilingual email acknowledgement + non-PII steward alert queue | Operations extension |
| `inquiry_retention_runs` | `0008` | Scheduled retention cleanup proof & monitoring | Privacy extension |
| `inquiry_report_snapshots`, `inquiry_report_snapshot_audit`, `inquiry_snapshot_privacy_key` | `0005`–`0007` | Immutable weekly snapshots, HMAC filter protection, diff/export audit | Reporting extension |
| `legal_references`, `entry_requirements` | `0012` | Sector-specific advisory legal readiness checklist (`ECOM-17`) | `legal_references`, `entry_requirements` |
| `survey_studies`, `survey_questions`, `survey_aggregates` | `0013` | Customer needs/wants evidence contract & Steward survey management (`/internal/surveys`) | `survey_studies`, `survey_questions`, `survey_aggregates` |
| `investment_incentives` | `0014` | Sector × Location investment incentives lookup (`GET /api/decision/incentives`) | `investment_incentives` |
| `investment_opportunities` | `0015` | Industrial park & FDI project micro-profiles (`GET /api/opportunities`) | `investment_opportunities` |
| `investment_contacts` | `0015` | Provincial IPA & Industrial Zone Authority inquiry routing | `investment_contacts` |

### Prototype-Only Entities (Not in B-Lite Runtime)
Full multi-tenant CRM/auth tables in `database/market-entry/` (`users`, `organizations`, `roles`, `investment_opportunities`, `investment_incentives`, `investment_contacts`, `investor_profiles`, `shortlist_items`, `conversion_events`, `decision_scenarios`) remain design references for future phases beyond B-Lite.

## 2. Manual SQL Migration Procedure (ECOM-21)

1. For standard table/column/index changes represented in `src/db/schema.ts`, run:
   ```bash
   bun run db:generate --name <descriptive_name>
   ```
2. For PostgreSQL-specific DDL not expressed in Drizzle schema (extensions like `pg_trgm`, custom GIN operator classes, triggers, or PL/pgSQL functions such as `0011_geo_units_pg_trgm_search.sql`), run:
   ```bash
   bun --bun drizzle-kit generate --custom --name <descriptive_name>
   ```
   Then edit the generated `.sql` file so Drizzle updates `drizzle/meta/_journal.json` and `drizzle/meta/<idx>_snapshot.json` automatically.
3. Always verify metadata integrity and clean application before committing:
   ```bash
   bun --bun drizzle-kit check
   bun run db:migrate
   ```

## 3. Linting, Typechecking & Exception Policy (ECOM-22)

- `bun run typecheck`: runs `tsc --noEmit` (strict TypeScript check).
- `bun run lint`: runs `biome lint src tests scripts` (Biome recommended ruleset).
- `bun run format:check`: verifies formatting across `src`, `tests`, and `scripts`.
- CI (`.github/workflows/release-checks.yml`) executes all three as distinct mandatory steps.
- Documented exceptions in `biome.json`:
  - `a11y.useSemanticElements`: disabled only where custom ARIA map/dialog regions cannot use native HTML equivalents.
  - `a11y.noNoninteractiveTabindex`: disabled so programmatic focus targets (`tabIndex={-1}` on dialogs/regions) can receive keyboard focus safely.
- Inline `biome-ignore` comments must include a concrete justification and stay narrowly scoped to a single node.
