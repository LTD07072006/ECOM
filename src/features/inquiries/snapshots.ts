import { databasePool } from "../../db/pool";
import { spreadsheetCsvCell } from "../../lib/csv";
import {
	VIETNAM_REPORT_TIME_ZONE,
	type InquiryAnalytics,
	type InquiryReportFilters,
} from "./reporting";

export const FORMULA_VERSION = "inquiry-funnel-v4";

export type SnapshotMetrics = InquiryAnalytics;

export function canonicalSnapshotInput(input: {
	periodStart: Date;
	periodEnd: Date;
	timeZone: string;
	filters: InquiryReportFilters;
}) {
	const filters = Object.fromEntries(
		Object.entries(input.filters)
			.map(
				([key, value]) =>
					[key, typeof value === "string" ? value.trim() : value] as const,
			)
			.filter(
				([key, value]) =>
					!["page", "pageSize", "from", "to"].includes(key) &&
					value !== undefined &&
					value !== "",
			),
	);
	return {
		periodStart: input.periodStart,
		periodEnd: input.periodEnd,
		timeZone: input.timeZone,
		formulaVersion: FORMULA_VERSION,
		filters,
	};
}

export function validateSnapshotMetrics(metrics: SnapshotMetrics) {
	const statusTotal = Object.values(metrics.byStatus).reduce(
		(sum, value) => sum + value,
		0,
	);
	return statusTotal === metrics.total
		? { ok: true as const }
		: {
				ok: false as const,
				error: "Snapshot status counts do not reconcile to total.",
			};
}

export type SnapshotComparable = {
	snapshotId: string;
	periodStart: string;
	periodEnd: string;
	timeZone: string;
	formulaVersion: string;
	filters: Record<string, unknown>;
	metrics: SnapshotMetrics;
};

function comparisonFilters(filters: Record<string, unknown>) {
	const { protectedFilters, ...visible } = filters;
	const entries = Object.entries(visible).map(
		([key, value]): [string, unknown] => {
			if (key === "geographyIds" && Array.isArray(value)) {
				return [
					key,
					[...new Set(value.map((id) => String(id).toLowerCase()))].sort(),
				];
			}
			if (typeof value !== "string") return [key, value];
			return [
				key,
				["country", "sector"].includes(key)
					? value.trim().toLowerCase()
					: value.trim(),
			];
		},
	);
	const result = Object.fromEntries(
		entries.filter(
			([key, value]) =>
				!["page", "pageSize", "from", "to"].includes(key) &&
				value != null &&
				value !== "" &&
				!(Array.isArray(value) && value.length === 0),
		),
	);
	if (protectedFilters && typeof protectedFilters === "object") {
		for (const field of ["country", "sector", "referenceCode"]) {
			const fingerprint = (protectedFilters as Record<string, unknown>)[field];
			if (typeof fingerprint === "string") result[field] = { fingerprint };
		}
	}
	return result;
}

export function buildSnapshotComparison(
	left: SnapshotComparable,
	right: SnapshotComparable,
) {
	const leftFilters = comparisonFilters(left.filters);
	const rightFilters = comparisonFilters(right.filters);
	const fields = [
		...new Set([...Object.keys(leftFilters), ...Object.keys(rightFilters)]),
	].sort();
	const display = (value: unknown) =>
		value && typeof value === "object" && "fingerprint" in value
			? "Giá trị được ẩn"
			: (value ?? null);
	const differences = fields
		.filter(
			(key) =>
				JSON.stringify(leftFilters[key]) !== JSON.stringify(rightFilters[key]),
		)
		.map((field) => ({
			field,
			left: display(leftFilters[field]),
			right: display(rightFilters[field]),
		}));
	const diagnostics = {
		filters: differences.length > 0,
		timeZone: left.timeZone !== right.timeZone,
		formulaVersion: left.formulaVersion !== right.formulaVersion,
	};
	if (diagnostics.timeZone)
		differences.push({
			field: "timeZone",
			left: left.timeZone,
			right: right.timeZone,
		});
	if (diagnostics.formulaVersion)
		differences.push({
			field: "formulaVersion",
			left: left.formulaVersion,
			right: right.formulaVersion,
		});
	const compatible =
		!diagnostics.filters &&
		!diagnostics.timeZone &&
		!diagnostics.formulaVersion;
	const byStatus = Object.fromEntries(
		Object.keys({ ...left.metrics.byStatus, ...right.metrics.byStatus }).map(
			(status) => [
				status,
				(right.metrics.byStatus[
					status as keyof typeof right.metrics.byStatus
				] ?? 0) -
					(left.metrics.byStatus[
						status as keyof typeof left.metrics.byStatus
					] ?? 0),
			],
		),
	);
	return {
		compatible,
		diagnostics,
		differences,
		left: {
			snapshotId: left.snapshotId,
			periodStart: left.periodStart,
			periodEnd: left.periodEnd,
			timeZone: left.timeZone,
			total: left.metrics.total,
			byStatus: left.metrics.byStatus,
		},
		right: {
			snapshotId: right.snapshotId,
			periodStart: right.periodStart,
			periodEnd: right.periodEnd,
			timeZone: right.timeZone,
			total: right.metrics.total,
			byStatus: right.metrics.byStatus,
		},
		delta: { total: right.metrics.total - left.metrics.total, byStatus },
	};
}

export function snapshotMetricsCsv(snapshot: SnapshotComparable) {
	const rows: (string | number)[][] = [];
	const add = (metric: string, value: number) =>
		rows.push([
			snapshot.snapshotId,
			snapshot.periodStart,
			snapshot.periodEnd,
			snapshot.timeZone,
			snapshot.formulaVersion,
			metric,
			value,
		]);
	add("total", snapshot.metrics.total);
	for (const [key, value] of Object.entries(snapshot.metrics.byStatus))
		add(`by_status.${key}`, value);
	for (const [key, value] of Object.entries(snapshot.metrics.byCloseReason))
		add(`by_close_reason.${key}`, value);
	for (const [key, value] of Object.entries(snapshot.metrics.weeklyTrend))
		add(`weekly_trend.${key}`, value);
	for (const [key, value] of Object.entries(snapshot.metrics.byGeography))
		add(`by_geography.${key}`, value);
	for (const [key, value] of Object.entries(snapshot.metrics.byCountry))
		add(`by_country.${key}`, value);
	for (const [key, value] of Object.entries(snapshot.metrics.bySector))
		add(`by_sector.${key}`, value);
	return `${["snapshot_id,period_start,period_end,time_zone,formula_version,metric,value", ...rows.map((row) => row.map((value) => spreadsheetCsvCell(value)).join(","))].join("\r\n")}\r\n`;
}

export type InquiryReportSnapshot = {
	snapshot_id: string;
	period_start: Date;
	period_end: Date;
	filters: InquiryReportFilters & { protectedFilters?: Record<string, string> };
	metrics: InquiryAnalytics;
	time_zone: string;
	formula_version: string;
	corrects_snapshot_id: string | null;
	retention_at: Date;
	created_by: string;
	created_at: Date;
};

export type InquiryReportSnapshotAudit = {
	event_id: string;
	snapshot_id: string;
	actor: string;
	action: "created" | "exported" | "compared";
	happened_at: Date;
};

export function visibleSnapshot<T extends InquiryReportSnapshot>(snapshot: T) {
	const { protectedFilters, ...filters } = snapshot.filters;
	const hidden = Object.fromEntries(
		Object.keys(protectedFilters ?? {}).map((field) => [
			field,
			"Giá trị được ẩn",
		]),
	);
	return { ...snapshot, filters: { ...filters, ...hidden } };
}

export async function createInquiryReportSnapshot(input: {
	periodStart: Date;
	periodEnd: Date;
	filters: InquiryReportFilters;
	metrics: InquiryAnalytics;
	timeZone?: string;
	formulaVersion?: string;
	correctsSnapshotId?: string;
	createdBy: string;
}) {
	const snapshot = await databasePool().begin(async (tx) => {
		const metrics = { ...input.metrics, byCountry: {}, bySector: {} };
		const [created] = await tx<InquiryReportSnapshot[]>`
    insert into market_entry.inquiry_report_snapshots
      (period_start, period_end, filters, metrics, time_zone, formula_version, corrects_snapshot_id, retention_at, created_by)
    values (${input.periodStart}, ${input.periodEnd}, market_entry.protect_inquiry_snapshot_filters(${tx.json(input.filters)}),
      ${tx.json(metrics)}, ${input.timeZone ?? VIETNAM_REPORT_TIME_ZONE}, ${input.formulaVersion ?? FORMULA_VERSION}, ${input.correctsSnapshotId ?? null}, now() + interval '2 years', ${input.createdBy})
    returning snapshot_id, period_start, period_end, filters, metrics, time_zone, formula_version, corrects_snapshot_id, retention_at, created_by, created_at
    `;
		await tx`insert into market_entry.inquiry_report_snapshot_audit (snapshot_id, actor, action) values (${created.snapshot_id}, ${input.createdBy}, 'created')`;
		return created;
	});
	return snapshot;
}

export async function listInquiryReportSnapshots() {
	return databasePool()<InquiryReportSnapshot[]>`
    select snapshot_id, period_start, period_end, filters, metrics, time_zone, formula_version, corrects_snapshot_id, retention_at, created_by, created_at
    from market_entry.inquiry_report_snapshots
    order by period_end desc, created_at desc
    limit 52
  `;
}

export async function getInquiryReportSnapshot(snapshotId: string) {
	const [snapshot] = await databasePool()<InquiryReportSnapshot[]>`
    select snapshot_id, period_start, period_end, filters, metrics, time_zone, formula_version, corrects_snapshot_id, retention_at, created_by, created_at
    from market_entry.inquiry_report_snapshots where snapshot_id = ${snapshotId}
  `;
	if (!snapshot) return null;
	const audit = await databasePool()<InquiryReportSnapshotAudit[]>`
    select event_id, snapshot_id, actor, action, happened_at
    from market_entry.inquiry_report_snapshot_audit
    where snapshot_id = ${snapshotId}
    order by happened_at asc
  `;
	return { ...snapshot, audit };
}

export async function snapshotGeographyNames(ids: string[] = []) {
	if (!ids.length) return {};
	const geographies = await databasePool()<
		{ geo_id: string; display_name: string }[]
	>`
    select geo_id, display_name from market_entry.geo_units where geo_id = any(${ids}::uuid[])
  `;
	return Object.fromEntries(
		geographies.map((row) => [row.geo_id, row.display_name]),
	);
}

export async function auditInquiryReportSnapshots(
	snapshotIds: string[],
	actor: string,
	action: "exported" | "compared",
) {
	await databasePool()`
    insert into market_entry.inquiry_report_snapshot_audit (snapshot_id, actor, action)
    select distinct snapshot_id, ${actor}, ${action} from unnest(${snapshotIds}::uuid[]) as target(snapshot_id)
  `;
}

export async function cleanupExpiredInquiryReportSnapshots(
	apply = false,
	now = new Date(),
) {
	// Keep the ancestry of living corrections so the report history stays traceable.
	const sql = databasePool();
	const candidates = sql`
    with recursive retained(snapshot_id, corrects_snapshot_id) as (
      select snapshot_id, corrects_snapshot_id from market_entry.inquiry_report_snapshots where retention_at > ${now}
      union
      select parent.snapshot_id, parent.corrects_snapshot_id from market_entry.inquiry_report_snapshots parent
      join retained child on parent.snapshot_id = child.corrects_snapshot_id
    )
    select snapshot_id from market_entry.inquiry_report_snapshots
    where retention_at <= ${now} and snapshot_id not in (select snapshot_id from retained)
  `;
	if (!apply) {
		const [row] = await sql<
			[{ count: string }]
		>`select count(*)::text as count from (${candidates}) expired`;
		return { count: Number(row?.count ?? 0), applied: false };
	}
	const result = await sql.begin(async (tx) => {
		// Serialize retention with snapshot creation and audit writes through the existing foreign keys.
		await tx`lock table market_entry.inquiry_report_snapshots in share row exclusive mode`;
		const expired = await tx<
			{ snapshot_id: string }[]
		>`${candidates} for update`;
		if (expired.length === 0) return 0;
		const ids = expired.map(({ snapshot_id }) => snapshot_id);
		await tx`delete from market_entry.inquiry_report_snapshot_audit where snapshot_id = any(${ids}::uuid[])`;
		await tx`delete from market_entry.inquiry_report_snapshots where snapshot_id = any(${ids}::uuid[])`;
		return expired.length;
	});
	return { count: result, applied: true };
}
