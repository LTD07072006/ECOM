# Vietnam Market Intelligence

Map-first investor attraction platform for exploring Vietnam with transparent market context.

## Stack

- Bun runtime and package manager
- Next.js App Router for frontend and backend Route Handlers
- Drizzle ORM schema and migrations
- PostgreSQL 16 + PostGIS 3.4 in Docker Compose
- MapLibre with provincial boundaries stored in PostGIS

## Local setup

1. Install [Bun](https://bun.sh) and Docker Desktop.
2. Install dependencies:

   ```powershell
   bun install
   ```

3. For a new database, create `.env` once with a generated password, then start PostgreSQL/PostGIS on port `55432`.

   ```powershell
   if (-not (Test-Path -LiteralPath '.env')) {
       $devDbPassword = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
       @(
           "POSTGRES_PASSWORD=$devDbPassword"
           "DATABASE_URL=postgresql://market_entry:${devDbPassword}@127.0.0.1:55432/market_entry"
       ) | Set-Content -LiteralPath '.env' -Encoding utf8NoBOM
       Remove-Variable devDbPassword
   }
   docker compose up -d db
   ```

4. Apply migrations and load the official data snapshot:

   ```powershell
   bun run db:migrate
   bun run db:import --validate
   bun run db:import --publish
   bun run db:import:wave2 --validate
   bun run db:import:wave2 --publish
   bun run db:check
   ```

5. Start Next.js:

   ```powershell
   bun run dev
   ```

Open `http://localhost:3000`.

## Environment

Keep real credentials in the ignored `.env` file or inject them at runtime. `.env.example` lists the variable names with blank values. `DATABASE_URL` stays server-side. For an existing Docker volume, use the database role's existing password in `.env`. `POSTGRES_PASSWORD` initializes the role on a new volume.

## Verification

```powershell
bun run test
bun run build
```

Run `bun run test:e2e` against a running app. Set `E2E_BASE_URL` when it uses a port other than 3000.

The PostGIS integration test is opt-in because it requires a running local database:

```powershell
$env:RUN_DB_TESTS = "1"
bun run test:db
```

## Release 1 boundaries

Wave 2 adds thematic province layers, civil airports and source comparison. [Sprint 3 sources, coverage and import workflow](docs/sprint3-wave2.md).

The current vertical slice includes country/province/commune search, provincial boundaries, place profiles, source metadata, unavailable-data states, local shortlist comparison, and JSON/CSV context export.

The synthetic catalog in `src/db/seed-data.ts` is test/demo data only and must not be interpreted as demand, purchasing power, profitability, ROI, legal eligibility, or an investment ranking. DB connection failure is surfaced as `mode: unavailable`; an unpublished database returns an empty catalog. The application does not silently fall back to synthetic demo data.

The initial public release covers the administrative snapshot effective 1 July 2025 and average population estimates for all 34 provinces in 2025. `db:seed` aliases `db:import --publish`. Use `--stage` to load and validate before publication. [Sprint 1 sources and import workflow](docs/sprint1-data-foundation.md).

Comparison requires 2–3 unique places with matching geography level/version, period, unit, definition, and scope. Missing values remain `null`/“Unavailable”; no ranking or score is calculated. Exports include provenance, quality, period, geography version, license/access, update date, and limitations, and are context-only.
