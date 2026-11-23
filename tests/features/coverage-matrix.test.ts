import { describe, expect, test } from "bun:test";
import {
	buildCoverageFreshnessMatrix,
	buildCoverageMatrixCsv,
} from "../../src/features/releases/coverage-matrix";
import type { ReleaseOverview } from "../../src/features/releases/operations";

type DatasetItem = ReleaseOverview["datasets"][number];

function makeDataset(overrides: Partial<DatasetItem> = {}): DatasetItem {
	return {
		dataset_version_id: "dv-1",
		source_id: "src-1",
		batch_id: null,
		code: "GRDP_PROVINCE",
		version: "2025.1",
		status: "published",
		owner: "NSO",
		checksum: null,
		as_of: "2025-07-01",
		reviewed: "2026-06-01",
		due: "2027-06-01",
		stale: false,
		publisher: "NSO",
		citation: "NSO",
		license: "Open",
		access: "public",
		source_status: "active",
		url: null,
		units: 34,
		provinces: 34,
		communes: 0,
		expected_provinces: 34,
		covered_provinces: 34,
		boundaries: 34,
		observations: 34,
		missing: 0,
		points: 0,
		invalid_geometry: 0,
		invalid_observations: 0,
		geographies: ["VN"],
		periods: ["2025"],
		methods: [],
		limitations: [],
		...overrides,
	};
}

describe("Release coverage & freshness matrix", () => {
	test("classifies fresh, due_soon, overdue, unknown freshness and missing coverage", () => {
		const nowMs = Date.parse("2026-11-23T00:00:00Z");
		const datasets: DatasetItem[] = [
			makeDataset({
				dataset_version_id: "d-fresh",
				code: "FRESH_34",
				due: "2027-06-01",
				covered_provinces: 34,
				expected_provinces: 34,
			}),
			makeDataset({
				dataset_version_id: "d-soon",
				code: "DUE_SOON",
				due: "2026-12-05",
				covered_provinces: 30,
				expected_provinces: 34,
			}),
			makeDataset({
				dataset_version_id: "d-overdue",
				code: "OVERDUE_DS",
				stale: true,
				due: "2026-10-01",
				invalid_geometry: 2,
			}),
			makeDataset({
				dataset_version_id: "d-unknown",
				code: "NO_EXPECTED",
				due: null,
				expected_provinces: 0,
				covered_provinces: 0,
			}),
		];

		const summary = buildCoverageFreshnessMatrix(datasets, nowMs, 30);
		expect(summary.totalDatasets).toBe(4);
		expect(summary.fullCoverageCount).toBe(2);
		expect(summary.incompleteCount).toBe(1);
		expect(summary.overdueCount).toBe(1);
		expect(summary.dueSoonCount).toBe(1);
		expect(summary.validationIssueCount).toBe(1);
		expect(summary.attentionCount).toBe(2);

		expect(summary.rows[0].freshnessState).toBe("fresh");
		expect(summary.rows[0].needsAttention).toBe(false);
		expect(summary.rows[1].freshnessState).toBe("due_soon");
		expect(summary.rows[1].coveragePercent).toBe(88);
		expect(summary.rows[1].isIncomplete).toBe(true);
		expect(summary.rows[2].freshnessState).toBe("overdue");
		expect(summary.rows[2].validationIssues).toBe(2);
		expect(summary.rows[3].freshnessState).toBe("unknown");
		expect(summary.rows[3].coveragePercent).toBeNull();
	});

	test("escapes formula prefixes in CSV export", () => {
		const summary = buildCoverageFreshnessMatrix([
			makeDataset({ code: '=HYPERLINK("bad")', version: "+1.0" }),
		]);
		const csv = buildCoverageMatrixCsv(summary.rows);
		expect(csv.startsWith("\uFEFF")).toBe(true);
		expect(csv).toContain(`"'=HYPERLINK(""bad"")"`);
		expect(csv).toContain(`"'+1.0"`);
	});
});
