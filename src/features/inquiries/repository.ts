import { randomBytes } from "node:crypto";
import type postgres from "postgres";
import { databasePool } from "../../db/pool";
import type { InquiryProvenance, InquirySubmission } from "./types";
import type { InquiryReportFilters, InquiryReportRow } from "./reporting";
import { nextInquiryStatus, type InquiryCloseReason, type InquiryStatus } from "./validation";

export function makeInquiryReference(now = new Date()) {
  const year = now.getUTCFullYear();
  return `INQ-${year}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function resolveProvenance(tx: postgres.TransactionSql, geographyIds: string[]) {
  const release = await tx<{
    geography_version_id: string;
    geography_code: string;
    dataset_version_id: string;
    dataset_code: string;
    version_label: string;
    source_id: string;
  }[]>`
    select geography.geography_version_id, geography.code as geography_code,
      dataset.dataset_version_id, dataset.dataset_code, dataset.version_label, dataset.source_id
    from market_entry.geography_versions as geography
    join market_entry.dataset_versions as dataset on dataset.dataset_version_id = geography.dataset_version_id
    join market_entry.source_registry as source on source.source_id = dataset.source_id
    where geography.status = 'active' and geography.effective_from <= current_date
      and (geography.effective_to is null or geography.effective_to >= current_date)
      and dataset.publication_status = 'published'
      and source.access_right = 'public' and source.status = 'active'
    order by geography.effective_from desc, dataset.published_at desc
    limit 1
  `;
  if (!release[0]) throw new Error("No published geography release is available.");

  const units = await tx<{ geo_id: string }[]>`
    select geo_id from market_entry.geo_units
    where geography_version_id = ${release[0].geography_version_id}
      and geo_id = any(${geographyIds}::uuid[])
      and valid_from <= current_date and (valid_to is null or valid_to >= current_date)
  `;
  if (units.length !== geographyIds.length) throw new Error("One or more geography IDs are not available in the published release.");

  const provenance: InquiryProvenance = {
    capturedAt: new Date().toISOString(),
    geographyVersionId: release[0].geography_version_id,
    geographyVersionCode: release[0].geography_code,
    geographyIds,
    datasets: [{
      id: release[0].dataset_version_id,
      code: release[0].dataset_code,
      version: release[0].version_label,
      sourceId: release[0].source_id,
    }],
  };
  return provenance;
}

export async function createInquiry(submission: InquirySubmission, now = new Date()) {
  return databasePool().begin(async (tx) => {
    const provenance = await resolveProvenance(tx, submission.geographyIds);
    const referenceCode = makeInquiryReference(now);
    const retentionAt = new Date(now);
    retentionAt.setUTCFullYear(retentionAt.getUTCFullYear() + 1);
    const [inquiry] = await tx<{ inquiry_id: string; reference_code: string }[]>`
      insert into market_entry.investor_inquiries
        (reference_code, email, message, name, organization, country, sector,
         geography_ids, provenance, status, retention_at, created_at, updated_at)
      values (${referenceCode}, ${submission.email}, ${submission.message}, ${submission.name ?? null},
        ${submission.organization ?? null}, ${submission.country ?? null}, ${submission.sector ?? null},
        ${submission.geographyIds}::uuid[], ${tx.json(provenance)}, 'new',
        ${retentionAt}, ${now}, ${now})
      returning inquiry_id, reference_code
    `;
    await tx`
      insert into market_entry.inquiry_audit (inquiry_id, actor, action, to_status, happened_at)
      values (${inquiry.inquiry_id}, 'public', 'submitted', 'new', ${now})
    `;
    return { referenceCode: inquiry.reference_code };
  });
}

export async function updateInquiry(
  referenceCode: string,
  update: { status?: InquiryStatus; closeReason?: InquiryCloseReason; note?: string },
  actor = "steward",
) {
  return databasePool().begin(async (tx) => {
    const [current] = await tx<{ inquiry_id: string; status: InquiryStatus; close_reason: InquiryCloseReason | null }[]>`
      select inquiry_id, status, close_reason from market_entry.investor_inquiries
      where reference_code = ${referenceCode} for update
    `;
    if (!current) throw new Error("Inquiry not found.");
    if (update.status) {
      const transition = nextInquiryStatus(current.status, update.status, update.closeReason);
      if (!transition.ok) throw new Error(transition.error);
      const [changed] = await tx`
        update market_entry.investor_inquiries
        set status = ${update.status}, close_reason = ${update.closeReason ?? null}, updated_at = clock_timestamp()
        where inquiry_id = ${current.inquiry_id}
      `;
      void changed;
      await tx`
        insert into market_entry.inquiry_audit (inquiry_id, actor, action, from_status, to_status, happened_at)
        values (${current.inquiry_id}, ${actor}, 'status_changed', ${current.status}, ${update.status}, clock_timestamp())
      `;
    }
    if (update.note) {
      await tx`
        insert into market_entry.inquiry_audit (inquiry_id, actor, action, note, happened_at)
        values (${current.inquiry_id}, ${actor}, 'note_added', ${update.note}, clock_timestamp())
      `;
      await tx`update market_entry.investor_inquiries set updated_at = clock_timestamp() where inquiry_id = ${current.inquiry_id}`;
    }
    return { ok: true };
  });
}

export async function listInquiries(filters: InquiryReportFilters) {
  const pageSize = Math.min(Math.max(filters.pageSize ?? 50, 1), 100);
  const page = Math.max(filters.page ?? 1, 1);
  const offset = (page - 1) * pageSize;
  return databasePool()<Array<{
    reference_code: string;
    status: InquiryStatus;
    close_reason: InquiryCloseReason | null;
    country: string | null;
    sector: string | null;
    geography_ids: string[];
    created_at: Date;
    updated_at: Date;
    anonymized_at: Date | null;
  }>>`
    select reference_code, status, close_reason, country, sector, geography_ids,
      created_at, updated_at, anonymized_at
    from market_entry.investor_inquiries
    where (${filters.status ?? null}::text is null or status = ${filters.status ?? null})
      and (${filters.country ?? null}::text is null or country ilike ${filters.country ? `%${filters.country}%` : null})
      and (${filters.sector ?? null}::text is null or sector ilike ${filters.sector ? `%${filters.sector}%` : null})
      and (${filters.referenceCode ?? null}::text is null or reference_code = ${filters.referenceCode ?? null})
      and (${filters.from ?? null}::timestamptz is null or created_at >= ${filters.from ?? null})
      and (${filters.to ?? null}::timestamptz is null or created_at < ${filters.to ?? null})
      and (${filters.geographyIds ?? null}::uuid[] is null or geography_ids && ${filters.geographyIds ?? null}::uuid[])
    order by updated_at desc, reference_code desc limit ${pageSize} offset ${offset}
  `;
}

export async function inquiryReportRows(filters: InquiryReportFilters): Promise<InquiryReportRow[]> {
  return databasePool()<InquiryReportRow[]>`
    select reference_code, status, close_reason, country, sector, geography_ids,
      created_at, updated_at, anonymized_at
    from market_entry.investor_inquiries
    where (${filters.status ?? null}::text is null or status = ${filters.status ?? null})
      and (${filters.country ?? null}::text is null or country ilike ${filters.country ? `%${filters.country}%` : null})
      and (${filters.sector ?? null}::text is null or sector ilike ${filters.sector ? `%${filters.sector}%` : null})
      and (${filters.referenceCode ?? null}::text is null or reference_code = ${filters.referenceCode ?? null})
      and (${filters.from ?? null}::timestamptz is null or created_at >= ${filters.from ?? null})
      and (${filters.to ?? null}::timestamptz is null or created_at < ${filters.to ?? null})
      and (${filters.geographyIds ?? null}::uuid[] is null or geography_ids && ${filters.geographyIds ?? null}::uuid[])
    order by updated_at desc, reference_code desc
  `;
}

export async function countInquiryReportRows(filters: InquiryReportFilters) {
  const [row] = await databasePool()<[{ count: string }]>`
    select count(*)::text as count
    from market_entry.investor_inquiries
    where (${filters.status ?? null}::text is null or status = ${filters.status ?? null})
      and (${filters.country ?? null}::text is null or country ilike ${filters.country ? `%${filters.country}%` : null})
      and (${filters.sector ?? null}::text is null or sector ilike ${filters.sector ? `%${filters.sector}%` : null})
      and (${filters.referenceCode ?? null}::text is null or reference_code = ${filters.referenceCode ?? null})
      and (${filters.from ?? null}::timestamptz is null or created_at >= ${filters.from ?? null})
      and (${filters.to ?? null}::timestamptz is null or created_at < ${filters.to ?? null})
      and (${filters.geographyIds ?? null}::uuid[] is null or geography_ids && ${filters.geographyIds ?? null}::uuid[])
  `;
  return Number(row?.count ?? 0);
}

export async function getInquiry(referenceCode: string) {
  const [inquiry] = await databasePool()<{
    inquiry_id: string;
    reference_code: string;
    email: string | null;
    message: string | null;
    name: string | null;
    organization: string | null;
    country: string | null;
    sector: string | null;
    geography_ids: string[];
    provenance: unknown;
    status: InquiryStatus;
    close_reason: InquiryCloseReason | null;
    created_at: Date;
    updated_at: Date;
    retention_at: Date;
    anonymized_at: Date | null;
  }[]>`
    select inquiry_id, reference_code, email, message, name, organization, country, sector,
      geography_ids, provenance, status, close_reason, created_at, updated_at, retention_at, anonymized_at
    from market_entry.investor_inquiries where reference_code = ${referenceCode}
  `;
  if (!inquiry) return null;
  const audit = await databasePool()<{
    actor: string;
    action: string;
    from_status: string | null;
    to_status: string | null;
    note: string | null;
    happened_at: Date;
  }[]>`
    select actor, action, from_status, to_status, note, happened_at
    from market_entry.inquiry_audit where inquiry_id = ${inquiry.inquiry_id}
    order by happened_at desc
  `;
  return { inquiry, audit };
}

export async function cleanupExpiredInquiries(apply = false, now = new Date()) {
  if (!apply) {
    const [row] = await databasePool()<[{ count: string }]>`
      select count(*)::text as count from market_entry.investor_inquiries
      where retention_at <= ${now} and anonymized_at is null
    `;
    return { count: Number(row?.count ?? 0), applied: false };
  }
  return databasePool().begin(async (tx) => {
    const rows = await tx<{ inquiry_id: string; reference_code: string }[]>`
      update market_entry.investor_inquiries
      set email = null, message = null, name = null, organization = null,
          country = null, sector = null, anonymized_at = ${now}, updated_at = ${now}
      where retention_at <= ${now} and anonymized_at is null
      returning inquiry_id, reference_code
    `;
    for (const row of rows) {
      await tx`
        insert into market_entry.inquiry_audit (inquiry_id, actor, action, happened_at)
        values (${row.inquiry_id}, 'retention_job', 'anonymized', ${now})
      `;
    }
    return { count: rows.length, applied: true };
  });
}
