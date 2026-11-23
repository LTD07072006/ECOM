import { spreadsheetCsvCell } from "../../../lib/csv";
import { countSlaOverdue } from "./sla";
import type { InquiryMetrics, InquiryRow } from "./types";

export type SectorBreakdownItem = {
	sector: string;
	count: number;
	percent: number;
};

export type CountryBreakdownItem = {
	country: string;
	count: number;
};

export type StewardInquirySummary = {
	totalLoaded: number;
	openCount: number;
	closedCount: number;
	slaOverdueCount: number;
	slaOnTrackPercent: number | null;
	corpusTotal: number | null;
	topSectors: SectorBreakdownItem[];
	topCountries: CountryBreakdownItem[];
};

function aggregateFieldFromRows(
	rows: readonly InquiryRow[],
	pick: (row: InquiryRow) => string | null,
): Record<string, number> {
	const displayNames = new Map<string, string>();
	const counts = new Map<string, number>();
	for (const row of rows) {
		const normalized = pick(row)?.trim().replace(/\s+/g, " ");
		if (!normalized) continue;
		const bucketKey = normalized.toLocaleLowerCase();
		if (!displayNames.has(bucketKey)) {
			displayNames.set(bucketKey, normalized);
		}
		counts.set(bucketKey, (counts.get(bucketKey) ?? 0) + 1);
	}
	const result: Record<string, number> = {};
	for (const [bucketKey, count] of counts.entries()) {
		const label = displayNames.get(bucketKey) ?? bucketKey;
		result[label] = count;
	}
	return result;
}

function validEntries(map: Record<string, number>): Array<[string, number]> {
	return Object.entries(map).filter(
		([label, count]) =>
			label.trim().length > 0 && Number.isFinite(count) && count > 0,
	);
}

export function summarizeStewardInquiries(
	rows: readonly InquiryRow[],
	metrics: InquiryMetrics | null,
	nowMs = Date.now(),
): StewardInquirySummary {
	const totalLoaded = rows.length;
	const closedCount = rows.filter((row) => row.status === "closed").length;
	const openCount = totalLoaded - closedCount;
	const slaOverdueCount = countSlaOverdue(rows, nowMs);
	const slaOnTrackPercent =
		totalLoaded === 0
			? null
			: Math.round(((totalLoaded - slaOverdueCount) / totalLoaded) * 100);

	const metricsSectors = metrics ? validEntries(metrics.bySector) : [];
	const sectorEntries =
		metricsSectors.length > 0
			? metricsSectors
			: validEntries(aggregateFieldFromRows(rows, (row) => row.sector));
	const sectorBaseTotal = sectorEntries.reduce(
		(sum, [, count]) => sum + count,
		0,
	);

	const topSectors: SectorBreakdownItem[] = sectorEntries
		.sort(([nameA, countA], [nameB, countB]) =>
			countB !== countA ? countB - countA : nameA.localeCompare(nameB),
		)
		.slice(0, 6)
		.map(([sector, count]) => ({
			sector,
			count,
			percent:
				sectorBaseTotal > 0 ? Math.round((count / sectorBaseTotal) * 100) : 0,
		}));

	const metricsCountries = metrics ? validEntries(metrics.byCountry) : [];
	const countryEntries =
		metricsCountries.length > 0
			? metricsCountries
			: validEntries(aggregateFieldFromRows(rows, (row) => row.country));

	const topCountries: CountryBreakdownItem[] = countryEntries
		.sort(([nameA, countA], [nameB, countB]) =>
			countB !== countA ? countB - countA : nameA.localeCompare(nameB),
		)
		.slice(0, 6)
		.map(([country, count]) => ({ country, count }));

	return {
		totalLoaded,
		openCount,
		closedCount,
		slaOverdueCount,
		slaOnTrackPercent,
		corpusTotal:
			metrics && Number.isFinite(metrics.total) ? metrics.total : null,
		topSectors,
		topCountries,
	};
}

export function buildStewardSummaryCsv(summary: StewardInquirySummary): string {
	const lines: string[] = [
		["section", "label", "value", "share_percent"]
			.map((cell) => spreadsheetCsvCell(cell))
			.join(","),
		[
			spreadsheetCsvCell("kpi"),
			spreadsheetCsvCell("total_loaded"),
			spreadsheetCsvCell(summary.totalLoaded),
			spreadsheetCsvCell(""),
		].join(","),
		[
			spreadsheetCsvCell("kpi"),
			spreadsheetCsvCell("open_pipeline"),
			spreadsheetCsvCell(summary.openCount),
			spreadsheetCsvCell(""),
		].join(","),
		[
			spreadsheetCsvCell("kpi"),
			spreadsheetCsvCell("closed"),
			spreadsheetCsvCell(summary.closedCount),
			spreadsheetCsvCell(""),
		].join(","),
		[
			spreadsheetCsvCell("kpi"),
			spreadsheetCsvCell("sla_overdue"),
			spreadsheetCsvCell(summary.slaOverdueCount),
			spreadsheetCsvCell(""),
		].join(","),
		[
			spreadsheetCsvCell("kpi"),
			spreadsheetCsvCell("sla_on_track_percent"),
			spreadsheetCsvCell(
				summary.slaOnTrackPercent === null ? "" : summary.slaOnTrackPercent,
			),
			spreadsheetCsvCell(""),
		].join(","),
	];

	for (const item of summary.topSectors) {
		lines.push(
			[
				spreadsheetCsvCell("sector"),
				spreadsheetCsvCell(item.sector, true),
				spreadsheetCsvCell(item.count),
				spreadsheetCsvCell(item.percent),
			].join(","),
		);
	}

	for (const item of summary.topCountries) {
		lines.push(
			[
				spreadsheetCsvCell("country"),
				spreadsheetCsvCell(item.country, true),
				spreadsheetCsvCell(item.count),
				spreadsheetCsvCell(""),
			].join(","),
		);
	}

	return `\uFEFF${lines.join("\r\n")}\r\n`;
}
