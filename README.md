# Vietnam Market Intelligence

Map-first investor attraction platform for exploring Vietnam with transparent market context.

## Stack

- Bun runtime and package manager
- Next.js App Router for frontend and backend Route Handlers
- Drizzle ORM schema and migrations
- PostgreSQL 16 + PostGIS 3.4 in Docker Compose
- MapLibre with provincial boundaries stored in PostGIS

## Local setup

Install Git and [Bun](https://bun.sh) with both on your PATH. Start [Docker Desktop](https://docs.docker.com/desktop/) in Linux container mode, or run Docker Engine with the Compose plugin on Linux.

```sh
git clone https://github.com/LTD07072006/ECOM.git
cd ECOM
bun run setup:local
```

The setup command installs pinned dependencies, generates a local database password and separate reviewer and steward tokens in `.env`, starts PostgreSQL/PostGIS, applies all migrations, imports the official catalog and Wave 2 data, then starts the app. Open the URL printed by Next.js, normally `http://127.0.0.1:3000`. The first run downloads dependencies and the PostGIS image.

Use `bun run setup:local --setup-only` to prepare the database without starting the web server. Once the database is running, `bun run dev --hostname 127.0.0.1` restarts the web app on the loopback interface.

### Investor inquiry pilot

Visitors can submit an inquiry from a geography profile or saved shortlist. Steward access is at `/internal/inquiries`, and dataset review is at `/internal/releases`. Copy your locally generated role token from `.env` into the corresponding form on your machine. The shared steward token identifies the role. Inquiry status changes and notes are audited transactionally. Review the retention cleanup count with `bun run db:cleanup:inquiries`.

Sprint 4 adds internal dataset review at `/internal/releases`. See the
[release runbook and acceptance checklist](docs/sprint4-release-runbook.md) for
pilot setup, role tokens, staged publication, monitoring, backups and rollback.
The direct `--publish` commands above are for local bootstrap.

## Environment

Each clone generates its own secrets. Keep them in the ignored `.env` file or a secret manager. `.env.example` documents the variable names. The database and development server bind to loopback.

Setup reuses an existing `.env`. For a database volume initialized previously, keep the password that PostgreSQL already uses in both `POSTGRES_PASSWORD` and `DATABASE_URL`. If you see `28P01`, restore the matching local credentials and keep the volume. For a second checkout on the same machine, choose a different `ECOM_DB_PORT`, `ECOM_DB_CONTAINER` and `COMPOSE_PROJECT_NAME` before its first setup.

## Verification

```powershell
bun run test
bun run build
```

Run `bun run test:e2e` against a running app. Set `E2E_BASE_URL` when it uses a port other than 3000.
Install Chromium with `bunx playwright install chromium` or specify `E2E_CHROMIUM_PATH` for an existing compatible installation.

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
