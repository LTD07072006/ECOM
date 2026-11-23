-- Idempotent least-privilege grants for runtime and retention database roles.
-- Execute as the schema owner / DBA after applying database migrations.
-- Does not use ALTER DEFAULT PRIVILEGES; re-run this script when adding tables.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'ecom_runtime') then
    create role ecom_runtime nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'ecom_retention') then
    create role ecom_retention nologin;
  end if;
end
$$;

revoke all on schema market_entry from public;
grant usage on schema market_entry to ecom_runtime, ecom_retention;

-- Reset existing privileges so repeated runs remove any stale grants.
revoke all on all tables in schema market_entry from public, ecom_runtime, ecom_retention;
revoke all on all sequences in schema market_entry from public, ecom_runtime, ecom_retention;
revoke all on function market_entry.protect_inquiry_snapshot_filters(jsonb) from public, ecom_runtime, ecom_retention;

-- Private HMAC key table remains inaccessible to all non-owner roles.
revoke all on market_entry.inquiry_snapshot_privacy_key from public, ecom_runtime, ecom_retention;

-- Read-only catalog, geography, legal readiness, survey, retention run, and release metadata for ecom_runtime.
grant select on
  market_entry.source_registry,
  market_entry.geo_boundaries,
  market_entry.infrastructure_pois,
  market_entry.indicator_definitions,
  market_entry.observations,
  market_entry.legal_references,
  market_entry.entry_requirements,
  market_entry.survey_studies,
  market_entry.survey_questions,
  market_entry.survey_aggregates,
  market_entry.release_batches,
  market_entry.release_members,
  market_entry.inquiry_retention_runs
to ecom_runtime;

-- Runtime writable tables used by web routes, release workflow, and mail worker.
grant select, insert, update on
  market_entry.api_quotas,
  market_entry.investor_inquiries,
  market_entry.inquiry_notifications
to ecom_runtime;

grant select, insert, update, delete on
  market_entry.api_client_quotas
to ecom_runtime;

grant select, update on
  market_entry.dataset_versions,
  market_entry.geography_versions,
  market_entry.geo_units
to ecom_runtime;

grant select, insert on
  market_entry.inquiry_report_snapshots
to ecom_runtime;

-- Append-only audit tables for ecom_runtime (no DELETE; inquiry_audit allows column-level note redaction for DSAR erasure).
grant select, insert on
  market_entry.release_audit,
  market_entry.inquiry_report_snapshot_audit,
  market_entry.inquiry_access_audit,
  market_entry.inquiry_audit
to ecom_runtime;

grant update (note) on market_entry.inquiry_audit to ecom_runtime;

-- Snapshot filter protection helper (SECURITY DEFINER reads inquiry_snapshot_privacy_key).
grant execute on function market_entry.protect_inquiry_snapshot_filters(jsonb) to ecom_runtime;

-- Grant sequence usage if any sequences exist in market_entry.
grant usage on all sequences in schema market_entry to ecom_runtime;

-- Retention worker role: only the exact privileges required by cleanupExpiredInquiries,
-- cleanupExpiredInquiryReportSnapshots (including LOCK TABLE IN SHARE ROW EXCLUSIVE MODE),
-- and inquiry_retention_runs tracking.
grant select, update on
  market_entry.investor_inquiries,
  market_entry.inquiry_notifications
to ecom_retention;

grant select, insert on market_entry.inquiry_audit to ecom_retention;
grant update (note) on market_entry.inquiry_audit to ecom_retention;

grant select, update, delete on market_entry.inquiry_report_snapshots to ecom_retention;
grant select, delete on market_entry.inquiry_report_snapshot_audit to ecom_retention;
grant select, insert, update on market_entry.inquiry_retention_runs to ecom_retention;
