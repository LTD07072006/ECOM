import { spreadsheetCsvCell } from "../../lib/csv";
import type { ReleaseOverview } from "./operations";

export type FreshnessState = "overdue" | "due_soon" | "fresh" | "unknown";

export type DatasetAuditRow = {
	datasetVersionId: string;
	code: string;
	version: string;
	status: string;
	sourceStatus: string;
	coveredProvinces: number;
	expectedProvinces: number;
	coveragePercent: number | null;
	isIncomplete: boolean;
	asOf: string | null;
	due: string | null;
	freshnessState: FreshnessState;
	validationIssues: number;
	missingCount: number;
	needsAttention: boolean;
};

export type CoverageMatrixSummary = {
	rows: DatasetAuditRow[];
	totalDatasets: number;
	fullCoverageCount: number;
	incompleteCount: number;
	overdueCount: number;
	dueSoonCount: number;
	validationIssueCount: number;
	attentionCount: number;
};

const DAY_MS = 86_400_000;

export function buildCoverageFreshnessMatrix(
	datasets: ReleaseOverview["datasets"],
	nowMs = Date.now(),
	dueSoonDays = 30,
): CoverageMatrixSummary {
	const dueSoonThresholdMs = nowMs + Math.max(dueSoonDays, 0) * DAY_MS;

	const rows: DatasetAuditRow[] = datasets.map((dataset) => {
		const expected = Math.max(0, dataset.expected_provinces || 0);
		const covered = Math.max(0, dataset.covered_provinces || 0);
		const coveragePercent =
			expected > 0
				? Math.min(100, Math.round((covered / expected) * 100))
				: null;
		const isIncomplete = expected > 0 && covered < expected;

		const dueMs = dataset.due ? Date.parse(dataset.due) : Number.NaN;
		let freshnessState: FreshnessState = "unknown";
		if (dataset.stale || (Number.isFinite(dueMs) && dueMs < nowMs)) {
			freshnessState = "overdue";
		} else if (Number.isFinite(dueMs)) {
			freshnessState = dueMs <= dueSoonThresholdMs ? "due_soon" : "fresh";
		}

		const validationIssues =
			Math.max(0, dataset.invalid_geometry || 0) +
			Math.max(0, dataset.invalid_observations || 0);

		const needsAttention =
			freshnessState === "overdue" ||
			freshnessState === "due_soon" ||
			isIncomplete ||
			validationIssues > 0 ||
			dataset.source_status !== "active";

		return {
			datasetVersionId: dataset.dataset_version_id,
			code: dataset.code,
			version: dataset.version,
			status: dataset.status,
			sourceStatus: dataset.source_status,
			coveredProvinces: covered,
			expectedProvinces: expected,
			coveragePercent,
			isIncomplete,
			asOf: dataset.as_of ?? null,
			due: dataset.due ?? null,
			freshnessState,
			validationIssues,
			missingCount: Math.max(0, dataset.missing || 0),
			needsAttention,
		};
	});

	let fullCoverageCount = 0;
	let incompleteCount = 0;
	let overdueCount = 0;
	let dueSoonCount = 0;
	let validationIssueCount = 0;
	let attentionCount = 0;

	for (const row of rows) {
		if (row.coveragePercent === 100) fullCoverageCount++;
		if (row.isIncomplete) incompleteCount++;
		if (row.freshnessState === "overdue") overdueCount++;
		if (row.freshnessState === "due_soon") dueSoonCount++;
		if (row.validationIssues > 0) validationIssueCount++;
		if (row.needsAttention) attentionCount++;
	}

	return {
		rows,
		totalDatasets: rows.length,
		fullCoverageCount,
		incompleteCount,
		overdueCount,
		dueSoonCount,
		validationIssueCount,
		attentionCount,
	};
}

export function buildCoverageMatrixCsv(
	rows: readonly DatasetAuditRow[],
): string {
	const header = [
		"dataset_code",
		"version",
		"publication_status",
		"source_status",
		"covered_provinces",
		"expected_provinces",
		"coverage_percent",
		"as_of",
		"review_due",
		"freshness_state",
		"validation_issues",
		"missing_records",
		"needs_attention",
	]
		.map((col) => spreadsheetCsvCell(col))
		.join(",");

	const body = rows.map((row) =>
		[
			spreadsheetCsvCell(row.code, true),
			spreadsheetCsvCell(row.version, true),
			spreadsheetCsvCell(row.status),
			spreadsheetCsvCell(row.sourceStatus),
			spreadsheetCsvCell(row.coveredProvinces),
			spreadsheetCsvCell(row.expectedProvinces),
			spreadsheetCsvCell(row.coveragePercent ?? ""),
			spreadsheetCsvCell(row.asOf ?? ""),
			spreadsheetCsvCell(row.due ?? ""),
			spreadsheetCsvCell(row.freshnessState),
			spreadsheetCsvCell(row.validationIssues),
			spreadsheetCsvCell(row.missingCount),
			spreadsheetCsvCell(row.needsAttention ? "yes" : "no"),
		].join(","),
	);

	return `\uFEFF${[header, ...body].join("\r\n")}\r\n`;
}
