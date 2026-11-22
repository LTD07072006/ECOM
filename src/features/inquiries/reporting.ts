import { spreadsheetCsvCell } from "../../lib/csv";
import type { InquiryStatus } from "./validation";

export const VIETNAM_REPORT_TIME_ZONE = "Asia/Ho_Chi_Minh";
export const MAX_INQUIRY_CSV_EXPORT_ROWS = 5_000;
const dayMs = 86_400_000;

export function vietnamCalendarDay(now: Date, daysAgo = 0) {
	return new Date(now.getTime() + 7 * 3_600_000 - daysAgo * dayMs)
		.toISOString()
		.slice(0, 10);
}

export function vietnamDateRange(firstDay: string, lastDay: string) {
	return {
		from: firstDay
			? new Date(`${firstDay}T00:00:00+07:00`).toISOString()
			: undefined,
		to: lastDay
			? new Date(Date.parse(`${lastDay}T00:00:00+07:00`) + dayMs).toISOString()
			: undefined,
	};
}

export type InquiryReportFilters = {
	status?: InquiryStatus;
	country?: string;
	sector?: string;
	referenceCode?: string;
	from?: Date;
	to?: Date;
	geographyIds?: string[];
	page?: number;
	pageSize?: number;
};

export type InquiryReportRow = {
	reference_code: string;
	status: InquiryStatus;
	close_reason: string | null;
	country: string | null;
	sector: string | null;
	geography_ids: string[];
	created_at: Date;
	updated_at: Date;
	anonymized_at: Date | null;
	contacted_at?: Date | null;
	qualified_at?: Date | null;
};

export type InquiryMetrics = {
	total: number;
	byStatus: Record<InquiryStatus, number>;
	byCloseReason: Record<string, number>;
	contactedRate: number;
	qualifiedRate: number;
	averageHoursToContacted: number | null;
	averageHoursToQualified: number | null;
};

export type InquiryAnalytics = InquiryMetrics & {
	weeklyTrend: Record<string, number>;
	byGeography: Record<string, number>;
	byCountry: Record<string, number>;
	bySector: Record<string, number>;
};

export function normalizeSelfReported(value: string | null | undefined) {
	const normalized = value
		?.normalize("NFKC")
		.trim()
		.replace(/\s+/g, " ")
		.toLocaleLowerCase();
	return normalized || null;
}

export function isoWeekKey(date: Date) {
	const vietnam = new Date(date.getTime() + 7 * 3_600_000);
	const day = new Date(
		Date.UTC(
			vietnam.getUTCFullYear(),
			vietnam.getUTCMonth(),
			vietnam.getUTCDate(),
		),
	);
	const weekday = day.getUTCDay() || 7;
	day.setUTCDate(day.getUTCDate() + 4 - weekday);
	const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
	const week = Math.ceil(
		((day.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
	);
	return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function increment(bucket: Record<string, number>, key: string | null) {
	if (key) bucket[key] = (bucket[key] ?? 0) + 1;
}

export function buildInquiryAnalytics(
	rows: InquiryReportRow[],
): InquiryAnalytics {
	const metrics = buildInquiryMetrics(rows);
	const weeklyTrend: Record<string, number> = {};
	const byGeography: Record<string, number> = {};
	const byCountry: Record<string, number> = {};
	const bySector: Record<string, number> = {};
	for (const row of rows) {
		increment(weeklyTrend, isoWeekKey(row.created_at));
		for (const geographyId of new Set(row.geography_ids))
			increment(byGeography, geographyId);
		increment(byCountry, normalizeSelfReported(row.country));
		increment(bySector, normalizeSelfReported(row.sector));
	}
	return { ...metrics, weeklyTrend, byGeography, byCountry, bySector };
}

export function paginateRows(
	rows: InquiryReportRow[],
	page: number,
	pageSize: number,
) {
	const safePageSize = Math.min(Math.max(Math.floor(pageSize), 1), 100);
	const totalPages = Math.max(Math.ceil(rows.length / safePageSize), 1);
	const safePage = Math.min(Math.max(Math.floor(page), 1), totalPages);
	return {
		rows: rows.slice((safePage - 1) * safePageSize, safePage * safePageSize),
		page: safePage,
		pageSize: safePageSize,
		total: rows.length,
		totalPages,
		hasNext: safePage < totalPages,
		hasPrevious: safePage > 1,
	};
}

export function buildInquiryMetrics(rows: InquiryReportRow[]): InquiryMetrics {
	const byStatus: Record<InquiryStatus, number> = {
		new: 0,
		contacted: 0,
		qualified: 0,
		closed: 0,
	};
	const byCloseReason: Record<string, number> = {};
	let contactedHours = 0;
	let contactedCount = 0;
	let qualifiedHours = 0;
	let qualifiedCount = 0;
	for (const row of rows) {
		byStatus[row.status] += 1;
		if (row.close_reason)
			byCloseReason[row.close_reason] =
				(byCloseReason[row.close_reason] ?? 0) + 1;
		if (row.contacted_at) {
			contactedHours +=
				(row.contacted_at.getTime() - row.created_at.getTime()) / 3_600_000;
			contactedCount += 1;
		}
		if (row.qualified_at) {
			qualifiedHours +=
				(row.qualified_at.getTime() - row.created_at.getTime()) / 3_600_000;
			qualifiedCount += 1;
		}
	}
	const total = rows.length;
	return {
		total,
		byStatus,
		byCloseReason,
		contactedRate: total ? contactedCount / total : 0,
		qualifiedRate: total ? qualifiedCount / total : 0,
		averageHoursToContacted: contactedCount
			? contactedHours / contactedCount
			: null,
		averageHoursToQualified: qualifiedCount
			? qualifiedHours / qualifiedCount
			: null,
	};
}

const INQUIRY_CSV_HEADER = [
	"reference_code",
	"status",
	"close_reason",
	"country_self_reported",
	"sector_self_reported",
	"geography_ids",
	"created_at",
	"updated_at",
	"anonymized_at",
].join(",");

function formatInquiryCsvRow(row: InquiryReportRow) {
	return [
		row.reference_code,
		row.status,
		row.close_reason,
		row.country,
		row.sector,
		row.geography_ids.join("|"),
		row.created_at.toISOString(),
		row.updated_at.toISOString(),
		row.anonymized_at?.toISOString() ?? null,
	]
		.map((value) => spreadsheetCsvCell(value))
		.join(",");
}

export function inquiryRowsCsv(rows: InquiryReportRow[]) {
	const lines = rows.map(formatInquiryCsvRow);
	return `\uFEFF${[INQUIRY_CSV_HEADER, ...lines].join("\r\n")}\r\n`;
}

export function inquiryRowsCsvStream(
	rows: InquiryReportRow[],
	chunkSize = 200,
) {
	const encoder = new TextEncoder();
	let offset = 0;
	let sentHeader = false;
	return new ReadableStream<Uint8Array>({
		pull(controller) {
			if (!sentHeader) {
				sentHeader = true;
				controller.enqueue(encoder.encode(`\uFEFF${INQUIRY_CSV_HEADER}\r\n`));
				if (rows.length === 0) controller.close();
				return;
			}
			if (offset >= rows.length) {
				controller.close();
				return;
			}
			const slice = rows.slice(offset, offset + chunkSize);
			offset += slice.length;
			controller.enqueue(
				encoder.encode(`${slice.map(formatInquiryCsvRow).join("\r\n")}\r\n`),
			);
			if (offset >= rows.length) controller.close();
		},
	});
}
