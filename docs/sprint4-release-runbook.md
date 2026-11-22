# Sprint 4 — Release operations and pilot readiness

## Baseline

The local Git tag `v0.3.0-rc1` pins Sprint 3 at `167006308922c2ea925a7761a746fca8adba31b6`.
Migration `0003_sprint4_release_operations` adds four operations tables. The public geography types and migrations `0000` through `0002` retain their baseline versions. Search, profile, compare, export, map and health keep their response envelopes. A rejected quota returns HTTP 429 with `Retry-After`.

## Acceptance checklist

### 1. Public workflows

- [x] Map and boundary attribution load from the published PostGIS release. The browser can use place search when boundary loading fails.
- [x] Search resolves province and commune names and administrative codes. The profile includes source, effective geography, period, coverage notes and limitations.
- [x] Shortlist, comparison for two or three places, and CSV/JSON export preserve provenance and unavailable values. Export accepts up to 20 unique places. Formula-like CSV text is escaped.
- [x] API query validation rejects unexpected or duplicate parameters and enforces query size and ID limits.
- [x] Browser checks cover keyboard search, visible focus, search announcements, mobile viewport, reduced motion, reload recovery and larger boundary payloads.
- [ ] Complete device and screen-reader UAT with the pilot participants.
- [x] Public inquiry can be submitted from a profile or shortlist, returns a reference code, and stores published geography/dataset provenance.
- [x] Steward inquiry dashboard is protected by `RELEASE_STEWARD_TOKEN`, supports filtering, detail review, notes, status transitions, close reasons and audit history.
- [x] Steward reporting exposes aggregate funnel metrics and a filtered CSV containing no email, inquiry message or internal notes.
- [x] Phase 3 reporting uses shared date/geography/status/country/sector filters; rows paginate while metrics and CSV use the complete filtered set.
- [x] Weekly trend and geography/country/sector breakdowns are derived without duplicating multi-geography inquiries in totals.
- [x] Weekly snapshots store only period, filters and non-sensitive computed metrics.
- [x] Phase 4 snapshots are immutable and store period, timezone, filters, formula version, creation time, retention time and optional correction lineage.
- [x] Snapshot compare/export reads stored metrics; create/export/compare actions are steward-only and audited.
- [x] Snapshot consistency requires status counts to reconcile to total; corrections create new snapshots and retain the original for traceability.
- [x] Snapshot cleanup is dry-run by default and can be applied with `bun run db:cleanup:reports -- --apply`; expired snapshot audit rows are removed with their snapshot rows.
- [x] Release verification: `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run test:release db|workflow|e2e`, `bun run test:pilot`, and `bun run build` run fail-closed in `.github/workflows/release-checks.yml` with zero skipped required tests.
- [ ] Run the inquiry E2E suite against the pilot build with a disposable or approved test record.

### 2. Data release

- [x] Repository fixtures verify checksums, administrative hierarchy, observation period, geo coverage and the published source filters.
- [x] The dashboard shows publisher, citation and HTTPS source, license/access, owner, as-of/review/due dates, geography, province coverage, missing values, methods, limitations, checksums, validation and publication status.
- [x] Approve, publish and retire run in a transaction with the audit event. Publication requires approval and an eligible target geography. Invalid geometry, incomplete provenance and overdue review block staged publications.
- [x] A fresh PostGIS database is used to exercise release visibility before approval, after publication and after Wave 2 retirement. The original public dataset values are the baseline for the restore test.
- [ ] Record human approval and applicable licensing decisions for the pilot release.

### 3. Operations

- [x] Local backup was restored into a separate PostGIS database and checked against the Sprint 1–3 integration suite.
- [x] Application pools have bounded size and server-side timeouts. API counters are shared across production replicas using PostgreSQL. Application telemetry records route labels, status and latency.
- [ ] Provision the managed PostgreSQL/PostGIS service, TLS, restricted ingress, secret store and alert collector.
- [ ] Run load and accessibility checks against pilot infrastructure. Attach the sign-off and rollback owner to the pilot ticket.
- [x] Inquiry retention defaults to a dry-run and requires `--apply` for anonymization; email, message and notes are excluded from operational logs.

## Dataset release workflow

1. Pin the source and manifest in version control. Review license, usage rights, geography, coverage, missing values, source freshness, publication status and how the values were produced. Keep investment claims limited to observed context.
2. Use `bun run db:import --validate` for the foundation and `bun run db:import:wave2 --validate` for Wave 2. Pass a manifest path after the flag to review a newer candidate.
3. Set `REQUIRE_RELEASE_APPROVAL=1` on the importer and run the relevant command with `--stage`. Stage foundation first. Publish foundation before staging Wave 2.
4. Open `/internal/releases` using the reviewer token. Open each dataset in the batch and check the recorded evidence, manifest fingerprint and release notes. Select **Approve batch** and record the review ticket and decision.
5. A separate operator opens the dashboard with the steward token. Confirm the fingerprint, choose **Publish batch** and record the publication ticket. Verify the health response, boundary attribution, sample profiles, comparison and export.
6. Use **Retire batch** for a Wave 2 batch published through this workflow. Retirement hides all its members from public output and preserves audit history. A corrected release uses new immutable dataset versions. Foundation replacements and historic, unregistered publications require a coordinated database operation with a restore rehearsal.

An exact manifest can be staged again without duplicating audit events. A release batch groups immutable full snapshots with compatible status. Use new version labels for all datasets in a replacement batch and keep unchanged source files pinned. Published legacy datasets can be registered by staging their original manifest. Registration records their previous status and requires a separate human review for pilot sign-off.

For the automated workflow test, point `DATABASE_URL` at a fresh disposable PostGIS database named with the prefix `ecom_sprint4_workflow_`. Apply migrations, stage the foundation, then run `bun test tests/db/release-workflow.integration.test.ts` with `RUN_RELEASE_WORKFLOW_TESTS=1`. The test changes publication state in that database. For the dashboard browser test, use an isolated preview and supply its disposable reviewer token as `E2E_RELEASE_REVIEWER_TOKEN`.

## Configure and secure staging

- Set `DATABASE_URL` through the platform secret manager. Use managed PostgreSQL with PostGIS, verified TLS and separate runtime and migration credentials. Give the runtime role catalog reads, quota table reads and writes, audit inserts, snapshot permissions and the updates needed for publication. The quota limiter deletes stale client buckets. Grant the runtime role `EXECUTE` on `market_entry.protect_inquiry_snapshot_filters(jsonb)`. Keep reads of the private key table, schema ownership, bulk retention and data-import privileges with operators. Restrict database access to approved networks.
- Configure `ECOM_OPERATORS` in the secret store with one stable operator ID, role and unique cryptographically random 32-byte base64url token per person. Production rejects shared role tokens. Revoke a person by removing their entry or rotating their token and redeploying the secret. Inquiry, snapshot and release audit events record the authenticated operator ID. The internal dashboard exchanges the operator token via `POST /api/internal/session` for a short-lived signed `HttpOnly; SameSite=Strict` cookie (`ecom_operator_session`) with explicit sign-out (`DELETE /api/internal/session`) and instant revocation when `ECOM_OPERATORS` changes.
- Put public endpoints and the internal routes behind the pilot gateway over HTTPS. Enforce individual request budgets and request timeouts at ingress, and restrict internal routes to the operator network or authenticated operator group. Exclude authorization headers, database URLs and query strings from logs.
- Configure a dedicated random `ECOM_TRUSTED_PROXY_TOKEN` on the server and its reverse proxy. The proxy must overwrite `X-Ecom-Ingress-Token` with that secret and `X-Ecom-Client-IP` with the verified peer address. With Nginx as the outermost trusted proxy, use `$remote_addr` for the latter. With an upstream load balancer, configure an explicit trust list before accepting its client address. Restrict the application listener to the proxy network. Guarded APIs reject missing or invalid proxy proof when configured. Direct loopback previews without proxy configuration share one bucket per route.
- PostgreSQL shares client buckets and route ceilings across replicas. Inquiry submission allows 10 requests per client per minute and 100 globally. Search and profile each allow 180 per client, comparison 60, export 30 and internal operations 120. The global ceiling is ten times the client limit. Internal operations use separate budgets for unauthenticated traffic and each validated role. Client keys use a scoped HMAC of the IPv4 address or IPv6 /64. No plaintext address or token is written to quotas or application logs. Honor `Retry-After`. The runtime allows five connections per process with a four-second connection timeout, eight-second statement timeout and three-second lock timeout.
- Before enabling real inquiries, the operator approves the notice text and processing basis for the deployment and sets `INQUIRY_PRIVACY_CONTROLLER` and `INQUIRY_PRIVACY_EMAIL`. This form uses explicit consent for handling and responding to the inquiry. The submitted audit event records the version shown and timestamp. The privacy contact receives requests for access, correction, deletion or withdrawal. Verify the requester and handle the request with the data owner before recording its resolution in the restricted privacy log.

### Inquiry and report retention

- Apply the current migrations, then run `bun run db:retention:scheduler` as a supervised singleton service with the maintenance database credentials. The service runs immediately, repeats daily and retries failures after an hour. For local Compose use the optional `retention` profile. Check `bun run db:retention:monitor` at least hourly and alert on a nonzero exit or an unhealthy container. The run table records start, completion, outcome and counts without inquiry content. A restarted scheduler marks an interrupted run failed before starting another. The advisory lock prevents concurrent cleanup jobs.

- Anonymize an inquiry 12 months after submission or the last steward update. Cleanup clears contact details, message, free-text country/sector and audit note content in one transaction. Keep the status, geography/provenance context, reference, notice version and event timestamps for restricted operational reporting.
- Snapshots preserve aggregate counts and correction lineage. Migration `0007` removes stored self-reported country and sector labels and replaces raw text filters with keyed fingerprints, including in existing snapshots. Historical CSV bytes for these fields change once during migration. Restrict access to the snapshot filter HMAC key and keep it consistent with the stored snapshots. Keep snapshot totals, including small groups, within the steward role. Snapshot export and comparison use audited POST actions. List and detail reads leave the audit trail unchanged.
- Restrict downloaded live inquiry CSVs to authorized operators and delete them when their purpose expires. Live CSV includes self-reported fields, so treat it as restricted data. Configure an expiry for encrypted backups. After restoring an older copy, apply current migrations and run inquiry retention before reopening it to operators. Keep privacy text, request headers, source IPs and inquiry fields out of operational logs.

## Backup, restore and rollback

Configure PostgreSQL client service aliases using the secret store. Choose a new, empty restore database with PostGIS support. Keep the backup file in encrypted storage outside the repository.

```powershell
pg_dump --format=custom --file="$env:RELEASE_BACKUP_PATH" --dbname="service=market-backup"
pg_restore --exit-on-error --no-owner --dbname="service=market-restore" "$env:RELEASE_BACKUP_PATH"
```

Validate the restored catalog with `RUN_DB_TESTS=1` and `bun run test:db`, and verify health and the pilot smoke paths against a preview connected to the restored database.

On an application regression, switch traffic to the prior known-good build after checking API and migration compatibility. The `0007` snapshot filter storage and audited POST contract require a build that understands both. On a publication regression in Wave 2, have the steward retire the batch and verify the public catalog again. For a managed data or foundation failure, pause publish/import, rehearse switching traffic to the verified restore point, obtain the incident owner's approval, and preserve current and restored databases for reconciliation. Keep Docker volumes available during local exercises.

## Runtime and monitoring

1. Verify the tagged baseline and migration history. Back up the target and test restore before applying `bun run db:migrate`.
2. Build with `bun run build` and deploy with `bun run start`. Keep runtime credentials scoped to the server.
3. Run `bun run test:pilot https://<pilot-host> 12` against the authorized environment. It verifies search, profile, three-place compare, a 20-place export, province boundaries, layers and published health, then measures end-to-end p50/p95 and payload size. Account for the shared quota while testing.
4. Check structured `api_request` and `data_unavailable` events. Plot p95 latency and 5xx/429 counts by route, and monitor database/catalog failures, export failures and boundary failures. Poll `/api/health` for `status=ok` and `publicationStatus=published`. Inspect freshness, restricted/revoked sources and invalid geometry in the internal view.
5. During pilot, review error logs, feedback and public release status daily. Check new source coverage, due dates, boundary consistency and restore readiness each week. Assign an owner and deadline to every blocker.

The smoke check (`bun run test:pilot`) exits nonzero when p95 exceeds 2.5 seconds for search (province or commune), profile, compare or layers, 2 seconds for health, 5 seconds for export, boundaries or initial page load, or when response payload bytes exceed configured budgets (64 KB search/profile, 96 KB compare, 256 KB layers, 512 KB export, 3 MB boundaries). For high-volume inquiry benchmarking on a disposable local database (`ecom_bench_*`), run `bun run bench:inquiries`. Configure a log collector and alerts for the deployment to aggregate the existing structured events. Check retention through `bun run db:retention:monitor`.

## Local verification

The production build passed type checking. Forty-nine tests passed against the restored local PostGIS database, the release workflow test passed on a separate fresh database, and all 11 Chromium tests passed. The browser checks included ten consecutive map reloads and a response with three times the usual boundary vertices. The production-mode export quota returned 429 with `Retry-After`. The local catalog retained matching dataset checksums and record counts after migration and after restore.

In 12 mixed-request rounds against the local production build, the initial HTML request took 181 ms and the measured p95 was 836 ms for search, 675 ms for profile, 935 ms for a three-place comparison, 829 ms for a 20-place JSON export and 762 ms for the boundary response. Use these as local measurements when comparing results from the pilot environment.

## Prioritized issues

| Priority | Open item | Exit condition |
| --- | --- | --- |
| P0 | Pilot environment and owners pending | Managed PostGIS, TLS, operator access, monitoring alerts and rollback ownership are confirmed in staging. |
| P0 | Human data approval and UAT pending | Named reviewer and pilot owner sign the release evidence and acceptance record. |
| P1 | Boundary overlap review (57 pairs, ~8.92 km²) | Source owner reviews `docs/boundary-overlap-audit.md` and supplies an updated official boundary release. |
| P1 | Published field survey data (F04/T04) | Data owner supplies approved customer needs/wants studies for `survey_studies` / `survey_aggregates`. |
| P1 | Boundary payload on mobile networks | The 34-province response is approximately 2 MB before compression. Measure real-device map readiness on the pilot network. |
| P1 | Full accessibility and device coverage | Verify real-device browsers, screen reader announcements and all color/contrast states with participants. |
| P2 | Partial batch refresh | Review the cost of repinning unchanged datasets during replacements and define the governance for reused members before enabling partial publication. |

Use the [pilot feedback and sign-off form](sprint4-pilot-uat.md) to track acceptance.
