import type { InquiryAnalytics } from "../reporting";
import type { buildSnapshotComparison } from "../snapshots";
import type { MessageKey } from "../../../lib/i18n";

export type OperatorSession = {
	actor: string;
	role: "steward" | "reviewer";
};

export type InquiryRow = {
	reference_code: string;
	status: string;
	close_reason: string | null;
	country: string | null;
	sector: string | null;
	geography_ids: string[];
	created_at?: string;
	updated_at: string;
};

export type InquiryMetrics = InquiryAnalytics;

export type InquiryPagination = {
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
	hasNext: boolean;
	hasPrevious: boolean;
};

export type SnapshotAudit = {
	event_id: string;
	actor: string;
	action: string;
	happened_at: string;
};

export type SnapshotRecord = {
	snapshot_id: string;
	period_start: string;
	period_end: string;
	filters: Record<string, unknown>;
	time_zone: string;
	formula_version: string;
	corrects_snapshot_id: string | null;
	created_at: string;
	metrics: InquiryMetrics;
	audit?: SnapshotAudit[];
	geography_names?: Record<string, string>;
};

export type GeographyOption = {
	id: string;
	name: string;
	displayName: string;
	level: string;
	code: string;
};

export type SnapshotComparison = ReturnType<typeof buildSnapshotComparison>;

export type InquiryDetail = {
	inquiry: {
		reference_code: string;
		email: string | null;
		message: string | null;
		status: string;
		close_reason: string | null;
		geography_ids: string[];
		created_at?: string;
		provenance: {
			geographyVersionCode?: string;
			datasets?: Array<{ code: string; version: string }>;
		};
		anonymized_at: string | null;
	};
	audit: Array<{
		actor: string;
		action: string;
		from_status: string | null;
		to_status: string | null;
		note: string | null;
		happened_at: string;
	}>;
};

export const filterLabelKeys: Record<string, MessageKey> = {
	status: "admin.status",
	country: "admin.country",
	sector: "admin.sector",
	referenceCode: "reports.referenceCode",
	geographyIds: "reports.geography",
	timeZone: "reports.timeZone",
	formulaVersion: "reports.formulaVersion",
};

export const statusOptions: Array<{ value: string; key: MessageKey }> = [
	{ value: "new", key: "admin.new" },
	{ value: "contacted", key: "admin.contacted" },
	{ value: "qualified", key: "admin.qualified" },
	{ value: "closed", key: "admin.closed" },
];

export const closeReasons: Array<{ value: string; key: MessageKey }> = [
	{ value: "spam", key: "admin.reasonSpam" },
	{ value: "duplicate", key: "admin.reasonDuplicate" },
	{ value: "out_of_scope", key: "admin.reasonOutOfScope" },
	{ value: "resolved", key: "admin.reasonResolved" },
];

export function saveCsv(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.append(link);
	link.click();
	link.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatStatusLabel(
	value: string,
	t: (key: MessageKey) => string,
): string {
	const option = statusOptions.find((item) => item.value === value);
	return option ? t(option.key) : value;
}

export function formatReportPeriod(
	snapshot: Pick<SnapshotRecord, "period_start" | "period_end" | "time_zone">,
	formatDate: (
		value: string,
		options?: { timeZone?: string; includeTime?: boolean },
	) => string,
): string {
	const lastIncluded = new Date(
		Date.parse(snapshot.period_end) - 1,
	).toISOString();
	return `${formatDate(snapshot.period_start, { timeZone: snapshot.time_zone })} – ${formatDate(lastIncluded, { timeZone: snapshot.time_zone })}`;
}

export function formatFilterValue(
	key: string,
	value: unknown,
	names: Record<string, string>,
	t: (key: MessageKey) => string,
): string {
	if (value == null) return t("admin.all");
	if (key === "geographyIds" && Array.isArray(value)) {
		return value.map((id) => names[String(id)] ?? String(id)).join(", ");
	}
	if (key === "status") return formatStatusLabel(String(value), t);
	return String(value);
}

export function formatFilterSummary(
	filters: Record<string, unknown>,
	names: Record<string, string>,
	t: (key: MessageKey) => string,
): string {
	const entries = Object.entries(filters).filter(
		([key, value]) =>
			key in filterLabelKeys &&
			value != null &&
			value !== "" &&
			!(Array.isArray(value) && !value.length),
	);
	return entries.length
		? entries
				.map(
					([key, value]) =>
						`${t(filterLabelKeys[key])}: ${formatFilterValue(key, value, names, t)}`,
				)
				.join(" · ")
		: t("reports.allInquiries");
}
