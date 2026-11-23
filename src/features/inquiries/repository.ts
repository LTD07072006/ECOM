import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type postgres from "postgres";
import { databasePool } from "../../db/pool";
import { loadPublishedGeography } from "../geography/database-repository";
import {
	enqueueInquiryNotifications,
	type NotificationLocale,
} from "./notifications";
import {
	type InquiryReportFilters,
	type InquiryReportRow,
	MAX_INQUIRY_CSV_EXPORT_ROWS,
	VIETNAM_REPORT_TIME_ZONE,
} from "./reporting";
import type { InquiryProvenance, InquirySubmission } from "./types";
import {
	type InquiryCloseReason,
	type InquiryErasureReason,
	type InquiryStatus,
	nextInquiryStatus,
} from "./validation";

export class InquiryError extends Error {
	readonly status: 400 | 404 | 409;

	constructor(message: string, status: 400 | 404 | 409) {
		super(message);
		this.name = "InquiryError";
		this.status = status;
	}
}

export type InquiryAccessAction =
	| "viewed_detail"
	| "exported_live_csv"
	| "erased_by_request"
	| "consent_withdrawn";

export type InquiryAccessEvent = {
	actor: string;
	action: InquiryAccessAction;
	inquiryId?: string | null;
	rowCount?: number | null;
	ticketRef?: string | null;
};

const erasureAccessAction: Record<InquiryErasureReason, InquiryAccessAction> = {
	erasure_request: "erased_by_request",
	consent_withdrawn: "consent_withdrawn",
};

export async function recordInquiryAccess(
	event: InquiryAccessEvent,
	tx?: postgres.TransactionSql,
) {
	const insert = async (sql: postgres.TransactionSql) => {
		await sql`
      insert into market_entry.inquiry_access_audit
        (actor, action, inquiry_id, row_count, ticket_ref)
      values (
        ${event.actor},
        ${event.action},
        ${event.inquiryId ?? null},
        ${event.rowCount ?? null},
        ${event.ticketRef ?? null}
      )
    `;
	};
	if (tx) {
		await insert(tx);
		return;
	}
	await databasePool().begin(insert);
}

export function makeInquiryReference(now = new Date()) {
	const year = now.getUTCFullYear();
	return `INQ-${year}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function resolveProvenance(
	tx: postgres.TransactionSql,
	geographyIds: string[],
) {
	const release = await loadPublishedGeography(tx);
	if (!release) throw new Error("No published geography release is available.");

	const units = await tx<{ geo_id: string }[]>`
    select geo_id from market_entry.geo_units
    where geography_version_id = ${release.geography_version_id}
      and geo_id = any(${geographyIds}::uuid[])
      and valid_from <= current_date and (valid_to is null or valid_to >= current_date)
  `;
	if (units.length !== geographyIds.length)
		throw new InquiryError(
			"One or more selected places are no longer available.",
			400,
		);

	const provenance: InquiryProvenance = {
		capturedAt: new Date().toISOString(),
		geographyVersionId: release.geography_version_id,
		geographyVersionCode: release.geography_code,
		geographyIds,
		datasets: [
			{
				id: release.dataset_id,
				code: release.dataset_code,
				version: release.version_label,
				sourceId: release.source_id,
			},
		],
	};
	return provenance;
}

export async function createInquiry(
	submission: InquirySubmission,
	now = new Date(),
	referenceFor = makeInquiryReference,
	locale: NotificationLocale = "en",
) {
	return databasePool().begin(async (tx) => {
		const provenance = await resolveProvenance(tx, submission.geographyIds);
		for (let attempt = 0; attempt < 5; attempt++) {
			const [inquiry] = await tx<
				{ inquiry_id: string; reference_code: string }[]
			>`
        insert into market_entry.investor_inquiries
          (reference_code, email, message, name, organization, country, sector,
           geography_ids, provenance, scenario_snapshot, status, retention_at, created_at, updated_at)
        values (${referenceFor(now)}, ${submission.email}, ${submission.message}, ${submission.name ?? null},
          ${submission.organization ?? null}, ${submission.country ?? null}, ${submission.sector ?? null},
          ${submission.geographyIds}::uuid[], ${tx.json(provenance)}, ${submission.scenarioSnapshot ? tx.json(submission.scenarioSnapshot) : null}, 'new',
          (${now}::timestamptz at time zone 'UTC' + interval '1 year') at time zone 'UTC', ${now}, ${now})
        on conflict (reference_code) do nothing
        returning inquiry_id, reference_code
      `;
			if (!inquiry) continue;
			await tx`
        insert into market_entry.inquiry_audit (inquiry_id, actor, action, to_status, happened_at, notice_version)
        values (${inquiry.inquiry_id}, 'public', 'submitted', 'new', ${now}, ${submission.noticeVersion})
      `;
			await enqueueInquiryNotifications(tx, inquiry.inquiry_id, locale);
			return {
				inquiryId: inquiry.inquiry_id,
				referenceCode: inquiry.reference_code,
			};
		}
		throw new Error("Unable to allocate an inquiry reference.");
	});
}

export async function updateInquiry(
	referenceCode: string,
	update: {
		status?: InquiryStatus;
		closeReason?: InquiryCloseReason;
		note?: string;
	},
	actor = "steward",
) {
	return databasePool().begin(async (tx) => {
		const [current] = await tx<
			{
				inquiry_id: string;
				status: InquiryStatus;
				anonymized_at: Date | null;
			}[]
		>`
      select inquiry_id, status, anonymized_at from market_entry.investor_inquiries
      where reference_code = ${referenceCode} for update
    `;
		if (!current) throw new InquiryError("Inquiry not found.", 404);
		if (update.note && current.anonymized_at)
			throw new InquiryError("Cannot add notes to an anonymized inquiry.", 409);
		if (update.status) {
			const transition = nextInquiryStatus(
				current.status,
				update.status,
				update.closeReason,
			);
			if (!transition.ok) throw new InquiryError(transition.error, 409);
			await tx`
        update market_entry.investor_inquiries
        set status = ${update.status}, close_reason = ${update.closeReason ?? null}
        where inquiry_id = ${current.inquiry_id}
      `;
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
		}
		if (update.status || update.note) {
			await tx`update market_entry.investor_inquiries set updated_at = statement_timestamp(),
        retention_at = case when anonymized_at is null
          then least(
            (statement_timestamp() at time zone 'UTC' + interval '1 year') at time zone 'UTC',
            (created_at at time zone 'UTC' + interval '2 years') at time zone 'UTC'
          )
          else retention_at end
        where inquiry_id = ${current.inquiry_id}`;
		}
		return { ok: true };
	});
}

function likePattern(value: string | undefined): string | null {
	if (!value) return null;
	return `%${value.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

export async function listInquiries(filters: InquiryReportFilters) {
	const pageSize = Math.min(Math.max(filters.pageSize ?? 50, 1), 100);
	const page = Math.max(filters.page ?? 1, 1);
	const offset = (page - 1) * pageSize;
	const countryPattern = likePattern(filters.country);
	const sectorPattern = likePattern(filters.sector);
	return databasePool()<
		Array<{
			reference_code: string;
			status: InquiryStatus;
			close_reason: InquiryCloseReason | null;
			country: string | null;
			sector: string | null;
			geography_ids: string[];
			created_at: Date;
			updated_at: Date;
			anonymized_at: Date | null;
		}>
	>`
    select reference_code, status, close_reason, country, sector, geography_ids,
      created_at, updated_at, anonymized_at
    from market_entry.investor_inquiries
    where (${filters.status ?? null}::text is null or status = ${filters.status ?? null})
      and (${countryPattern}::text is null or country ilike ${countryPattern} escape '\\')
      and (${sectorPattern}::text is null or sector ilike ${sectorPattern} escape '\\')
      and (${filters.referenceCode ?? null}::text is null or reference_code = ${filters.referenceCode ?? null})
      and (${filters.from ?? null}::timestamptz is null or created_at >= ${filters.from ?? null})
      and (${filters.to ?? null}::timestamptz is null or created_at < ${filters.to ?? null})
      and (${filters.geographyIds ?? null}::uuid[] is null or geography_ids && ${filters.geographyIds ?? null}::uuid[])
    order by updated_at desc, reference_code desc limit ${pageSize} offset ${offset}
  `;
}

export async function inquiryReportRows(
	filters: InquiryReportFilters,
	limit = MAX_INQUIRY_CSV_EXPORT_ROWS,
): Promise<InquiryReportRow[]> {
	const countryPattern = likePattern(filters.country);
	const sectorPattern = likePattern(filters.sector);
	const boundedLimit = Math.min(
		Math.max(Math.floor(limit), 1),
		MAX_INQUIRY_CSV_EXPORT_ROWS,
	);
	return databasePool()<InquiryReportRow[]>`
    select reference_code, status, close_reason, country, sector, geography_ids,
      created_at, updated_at, anonymized_at
    from market_entry.investor_inquiries
    where (${filters.status ?? null}::text is null or status = ${filters.status ?? null})
      and (${countryPattern}::text is null or country ilike ${countryPattern} escape '\\')
      and (${sectorPattern}::text is null or sector ilike ${sectorPattern} escape '\\')
      and (${filters.referenceCode ?? null}::text is null or reference_code = ${filters.referenceCode ?? null})
      and (${filters.from ?? null}::timestamptz is null or created_at >= ${filters.from ?? null})
      and (${filters.to ?? null}::timestamptz is null or created_at < ${filters.to ?? null})
      and (${filters.geographyIds ?? null}::uuid[] is null or geography_ids && ${filters.geographyIds ?? null}::uuid[])
    order by updated_at desc, reference_code desc
    limit ${boundedLimit}
  `;
}

export async function inquiryAnalytics(
	filters: InquiryReportFilters,
	timeZone = VIETNAM_REPORT_TIME_ZONE,
) {
	const countryPattern = likePattern(filters.country);
	const sectorPattern = likePattern(filters.sector);
	const [result] = await databasePool()<
		[{ metrics: import("./reporting").InquiryAnalytics }]
	>`
    with filtered as (
      select i.*,
        (select min(a.happened_at) from market_entry.inquiry_audit a
          where a.inquiry_id = i.inquiry_id and a.action = 'status_changed' and a.to_status = 'contacted') as contacted_at,
        (select min(a.happened_at) from market_entry.inquiry_audit a
          where a.inquiry_id = i.inquiry_id and a.action = 'status_changed' and a.to_status = 'qualified') as qualified_at
      from market_entry.investor_inquiries i
      where (${filters.status ?? null}::text is null or i.status = ${filters.status ?? null})
        and (${countryPattern}::text is null or i.country ilike ${countryPattern} escape '\\')
        and (${sectorPattern}::text is null or i.sector ilike ${sectorPattern} escape '\\')
        and (${filters.referenceCode ?? null}::text is null or i.reference_code = ${filters.referenceCode ?? null})
        and (${filters.from ?? null}::timestamptz is null or i.created_at >= ${filters.from ?? null})
        and (${filters.to ?? null}::timestamptz is null or i.created_at < ${filters.to ?? null})
        and (${filters.geographyIds ?? null}::uuid[] is null or i.geography_ids && ${filters.geographyIds ?? null}::uuid[])
    ), totals as (
      select count(*)::int total,
        count(*) filter (where status='new')::int new_count,
        count(*) filter (where status='contacted')::int contacted_count,
        count(*) filter (where status='qualified')::int qualified_count,
        count(*) filter (where status='closed')::int closed_count,
        count(contacted_at)::float / nullif(count(*), 0) contacted_rate,
        count(qualified_at)::float / nullif(count(*), 0) qualified_rate,
        avg(extract(epoch from (contacted_at-created_at))/3600)::float contacted_hours,
        avg(extract(epoch from (qualified_at-created_at))/3600)::float qualified_hours
      from filtered
    )
    select jsonb_build_object(
      'total', total, 'byStatus', jsonb_build_object('new',new_count,'contacted',contacted_count,'qualified',qualified_count,'closed',closed_count),
      'byCloseReason', coalesce((select jsonb_object_agg(k,n) from (select close_reason k,count(*) n from filtered where close_reason is not null group by 1) x), '{}'::jsonb),
      'contactedRate',coalesce(contacted_rate,0), 'qualifiedRate',coalesce(qualified_rate,0),
      'averageHoursToContacted',contacted_hours, 'averageHoursToQualified',qualified_hours,
      'weeklyTrend',coalesce((select jsonb_object_agg(k,n) from (select to_char(created_at at time zone ${timeZone},'IYYY-"W"IW') k,count(*) n from filtered group by 1) x),'{}'::jsonb),
      'byGeography',coalesce((select jsonb_object_agg(k,n) from (select geo::text k,count(*) n from filtered cross join lateral (select distinct unnest(geography_ids) geo) g group by 1) x),'{}'::jsonb),
      'byCountry',coalesce((select jsonb_object_agg(k,n) from (select lower(regexp_replace(btrim(normalize(country, NFKC)), '\\s+', ' ', 'g')) k,count(*) n from filtered where country is not null and btrim(country) <> '' group by 1) x),'{}'::jsonb),
      'bySector',coalesce((select jsonb_object_agg(k,n) from (select lower(regexp_replace(btrim(normalize(sector, NFKC)), '\\s+', ' ', 'g')) k,count(*) n from filtered where sector is not null and btrim(sector) <> '' group by 1) x),'{}'::jsonb)
    ) metrics from totals
  `;
	return result.metrics;
}

export async function countInquiryReportRows(filters: InquiryReportFilters) {
	const countryPattern = likePattern(filters.country);
	const sectorPattern = likePattern(filters.sector);
	const [row] = await databasePool()<[{ count: string }]>`
    select count(*)::text as count
    from market_entry.investor_inquiries
    where (${filters.status ?? null}::text is null or status = ${filters.status ?? null})
      and (${countryPattern}::text is null or country ilike ${countryPattern} escape '\\')
      and (${sectorPattern}::text is null or sector ilike ${sectorPattern} escape '\\')
      and (${filters.referenceCode ?? null}::text is null or reference_code = ${filters.referenceCode ?? null})
      and (${filters.from ?? null}::timestamptz is null or created_at >= ${filters.from ?? null})
      and (${filters.to ?? null}::timestamptz is null or created_at < ${filters.to ?? null})
      and (${filters.geographyIds ?? null}::uuid[] is null or geography_ids && ${filters.geographyIds ?? null}::uuid[])
  `;
	return Number(row?.count ?? 0);
}

export async function getInquiry(referenceCode: string) {
	const [inquiry] = await databasePool()<
		{
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
		}[]
	>`
    select inquiry_id, reference_code, email, message, name, organization, country, sector,
      geography_ids, provenance, status, close_reason, created_at, updated_at, retention_at, anonymized_at
    from market_entry.investor_inquiries where reference_code = ${referenceCode}
  `;
	if (!inquiry) return null;
	const audit = await databasePool()<
		{
			actor: string;
			action: string;
			from_status: string | null;
			to_status: string | null;
			note: string | null;
			notice_version: string | null;
			happened_at: Date;
		}[]
	>`
    select actor, action, from_status, to_status, note, happened_at, notice_version
    from market_entry.inquiry_audit where inquiry_id = ${inquiry.inquiry_id}
    order by happened_at desc
  `;
	return { inquiry, audit };
}

async function anonymizeInquiries(
	tx: postgres.TransactionSql,
	ids: string[],
	actor: string,
	now = new Date(),
): Promise<string[]> {
	if (!ids.length) return [];
	const rows = await tx<{ inquiry_id: string }[]>`
    update market_entry.investor_inquiries
    set email = null, message = null, name = null, organization = null,
        country = null, sector = null, scenario_snapshot = null, anonymized_at = ${now}, updated_at = ${now}
    where inquiry_id = any(${ids}::uuid[]) and anonymized_at is null
    returning inquiry_id
  `;
	const anonymizedIds = rows.map(({ inquiry_id }) => inquiry_id);
	if (anonymizedIds.length) {
		await tx`
      insert into market_entry.inquiry_audit (inquiry_id, actor, action, happened_at)
      select inquiry_id, ${actor}, 'anonymized', ${now}
      from unnest(${anonymizedIds}::uuid[]) as target(inquiry_id)
    `;
		await tx`
      update market_entry.inquiry_notifications
      set status = 'skipped', last_error = 'inquiry anonymized'
      where inquiry_id = any(${anonymizedIds}::uuid[])
        and status in ('pending', 'failed')
    `;
		await tx`
      update market_entry.inquiry_audit
      set note = null
      where inquiry_id = any(${anonymizedIds}::uuid[]) and note is not null
    `;
	}
	return anonymizedIds;
}

export async function eraseInquiryByRequest(
	referenceCode: string,
	input: { reason: InquiryErasureReason; ticket: string },
	actor: string,
	now = new Date(),
) {
	return databasePool().begin(async (tx) => {
		const [current] = await tx<
			{ inquiry_id: string; anonymized_at: Date | null }[]
		>`
      select inquiry_id, anonymized_at from market_entry.investor_inquiries
      where reference_code = ${referenceCode} for update
    `;
		if (!current) throw new InquiryError("Inquiry not found.", 404);
		const alreadyAnonymized = Boolean(current.anonymized_at);
		if (!alreadyAnonymized) {
			await anonymizeInquiries(tx, [current.inquiry_id], actor, now);
		}
		await recordInquiryAccess(
			{
				actor,
				action: erasureAccessAction[input.reason],
				inquiryId: current.inquiry_id,
				ticketRef: input.ticket,
			},
			tx,
		);
		return { alreadyAnonymized };
	});
}

export async function cleanupExpiredInquiries(apply = false, now = new Date()) {
	if (!apply) {
		const [row] = await databasePool()<[{ count: string }]>`
      select count(*)::text as count from market_entry.investor_inquiries
      where (retention_at <= ${now} and anonymized_at is null)
        or (anonymized_at is not null and exists (
          select 1 from market_entry.inquiry_audit as event
          where event.inquiry_id = investor_inquiries.inquiry_id and event.note is not null))
    `;
		return { count: Number(row?.count ?? 0), applied: false };
	}
	return databasePool().begin(async (tx) => {
		const expired = await tx<{ inquiry_id: string }[]>`
      select inquiry_id from market_entry.investor_inquiries
      where retention_at <= ${now} and anonymized_at is null
      for update
    `;
		const anonymizedIds = await anonymizeInquiries(
			tx,
			expired.map(({ inquiry_id }) => inquiry_id),
			"retention_job",
			now,
		);
		const redacted = await tx<{ inquiry_id: string }[]>`
      update market_entry.inquiry_audit as event set note = null
      from market_entry.investor_inquiries as inquiry
      where inquiry.inquiry_id = event.inquiry_id and inquiry.anonymized_at is not null and event.note is not null
      returning event.inquiry_id
    `;
		return {
			count: new Set([
				...anonymizedIds,
				...redacted.map(({ inquiry_id }) => inquiry_id),
			]).size,
			applied: true,
		};
	});
}

export type PublicInquiryTimelineEvent = {
	action: "submitted" | "status_changed";
	fromStatus: InquiryStatus | null;
	toStatus: InquiryStatus | null;
	happenedAt: string;
};

export type PublicInquiryStatus = {
	referenceCode: string;
	status: InquiryStatus;
	closeReason: InquiryCloseReason | null;
	submittedAt: string;
	updatedAt: string;
	geographyCount: number;
	timeline: PublicInquiryTimelineEvent[];
};

const emailCompareKey = randomBytes(32);

export function emailsMatchConstantTime(
	storedEmail: string,
	candidateEmail: string,
): boolean {
	const left = createHmac("sha256", emailCompareKey)
		.update(storedEmail.trim().toLowerCase())
		.digest();
	const right = createHmac("sha256", emailCompareKey)
		.update(candidateEmail.trim().toLowerCase())
		.digest();
	return timingSafeEqual(left, right);
}

export async function lookupPublicInquiryStatus(
	referenceCode: string,
	email: string,
): Promise<PublicInquiryStatus | null> {
	const [inquiry] = await databasePool()<
		{
			inquiry_id: string;
			reference_code: string;
			email: string | null;
			status: InquiryStatus;
			close_reason: InquiryCloseReason | null;
			geography_ids: string[];
			created_at: Date;
			updated_at: Date;
			anonymized_at: Date | null;
		}[]
	>`
    select inquiry_id, reference_code, email, status, close_reason,
      geography_ids, created_at, updated_at, anonymized_at
    from market_entry.investor_inquiries
    where reference_code = ${referenceCode}
  `;

	if (!inquiry || inquiry.anonymized_at || !inquiry.email) return null;
	if (!emailsMatchConstantTime(inquiry.email, email)) return null;

	const events = await databasePool()<
		{
			action: "submitted" | "status_changed";
			from_status: InquiryStatus | null;
			to_status: InquiryStatus | null;
			happened_at: Date;
		}[]
	>`
    select action, from_status, to_status, happened_at
    from market_entry.inquiry_audit
    where inquiry_id = ${inquiry.inquiry_id}
      and action in ('submitted', 'status_changed')
    order by happened_at asc
  `;

	return {
		referenceCode: inquiry.reference_code,
		status: inquiry.status,
		closeReason: inquiry.status === "closed" ? inquiry.close_reason : null,
		submittedAt: inquiry.created_at.toISOString(),
		updatedAt: inquiry.updated_at.toISOString(),
		geographyCount: inquiry.geography_ids.length,
		timeline: events.map((event) => ({
			action: event.action,
			fromStatus: event.from_status,
			toStatus: event.to_status,
			happenedAt: event.happened_at.toISOString(),
		})),
	};
}
