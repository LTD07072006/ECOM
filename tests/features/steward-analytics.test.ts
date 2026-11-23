import { describe, expect, test } from "bun:test";
import {
	buildStewardSummaryCsv,
	summarizeStewardInquiries,
} from "../../src/features/inquiries/dashboard/steward-analytics";
import type {
	InquiryMetrics,
	InquiryRow,
} from "../../src/features/inquiries/dashboard/types";

describe("Steward inquiry analytics & SLA summary", () => {
	test("returns null slaOnTrackPercent when no rows are loaded", () => {
		const summary = summarizeStewardInquiries([], null);
		expect(summary.totalLoaded).toBe(0);
		expect(summary.openCount).toBe(0);
		expect(summary.closedCount).toBe(0);
		expect(summary.slaOverdueCount).toBe(0);
		expect(summary.slaOnTrackPercent).toBeNull();
		expect(summary.topSectors).toEqual([]);
		expect(summary.topCountries).toEqual([]);
	});

	test("computes open pipeline, overdue SLA counts, and row-derived sector/country breakdown", () => {
		const nowMs = Date.parse("2026-11-23T12:00:00Z");
		const rows: InquiryRow[] = [
			{
				reference_code: "INQ-01",
				status: "new",
				close_reason: null,
				country: "Japan",
				sector: "Electronics",
				geography_ids: ["g1"],
				created_at: "2026-11-20T00:00:00Z", // > 48h overdue
				updated_at: "2026-11-20T00:00:00Z",
			},
			{
				reference_code: "INQ-02",
				status: "new",
				close_reason: null,
				country: "South Korea",
				sector: "Electronics",
				geography_ids: ["g2"],
				created_at: "2026-11-23T06:00:00Z", // on track
				updated_at: "2026-11-23T06:00:00Z",
			},
			{
				reference_code: "INQ-03",
				status: "qualified",
				close_reason: null,
				country: "Japan",
				sector: "Logistics",
				geography_ids: ["g1"],
				created_at: "2026-11-10T00:00:00Z", // not 'new', so not overdue
				updated_at: "2026-11-22T00:00:00Z",
			},
			{
				reference_code: "INQ-04",
				status: "closed",
				close_reason: "resolved",
				country: "Singapore",
				sector: "Retail",
				geography_ids: ["g3"],
				created_at: "2026-11-01T00:00:00Z",
				updated_at: "2026-11-05T00:00:00Z",
			},
		];

		const summary = summarizeStewardInquiries(rows, null, nowMs);
		expect(summary.totalLoaded).toBe(4);
		expect(summary.openCount).toBe(3);
		expect(summary.closedCount).toBe(1);
		expect(summary.slaOverdueCount).toBe(1);
		expect(summary.slaOnTrackPercent).toBe(75);
		expect(summary.topSectors).toEqual([
			{ sector: "Electronics", count: 2, percent: 50 },
			{ sector: "Logistics", count: 1, percent: 25 },
			{ sector: "Retail", count: 1, percent: 25 },
		]);
		expect(summary.topCountries).toEqual([
			{ country: "Japan", count: 2 },
			{ country: "Singapore", count: 1 },
			{ country: "South Korea", count: 1 },
		]);
	});

	test("prefers metrics aggregates when available and neutralizes spreadsheet formulas in CSV", () => {
		const metrics: InquiryMetrics = {
			total: 10,
			byStatus: { new: 4, contacted: 3, qualified: 2, closed: 1 },
			byCloseReason: { resolved: 1 },
			contactedRate: 0.6,
			qualifiedRate: 0.3,
			averageHoursToContacted: 12,
			averageHoursToQualified: 36,
			weeklyTrend: {},
			byGeography: {},
			byCountry: { "=CMD('calc')": 3, Vietnam: 2 },
			bySector: { "+SUM(1,2)": 5 },
		};
		const summary = summarizeStewardInquiries([], metrics);
		expect(summary.corpusTotal).toBe(10);
		expect(summary.topSectors[0]).toEqual({
			sector: "+SUM(1,2)",
			count: 5,
			percent: 100,
		});

		const csv = buildStewardSummaryCsv(summary);
		expect(csv.startsWith("\uFEFF")).toBe(true);
		expect(csv).toContain(`"'+SUM(1,2)"`);
		expect(csv).toContain(`"'=CMD('calc')"`);
	});

	test("merges case/whitespace-duplicate labels from rows and ignores non-finite metric counts", () => {
		const summaryRows = summarizeStewardInquiries(
			[
				{
					reference_code: "INQ-A",
					status: "new",
					close_reason: null,
					country: "  Japan ",
					sector: "Electronics",
					geography_ids: [],
					updated_at: "2026-11-23T00:00:00Z",
				},
				{
					reference_code: "INQ-B",
					status: "contacted",
					close_reason: null,
					country: "japan",
					sector: " electronics ",
					geography_ids: [],
					updated_at: "2026-11-23T00:00:00Z",
				},
			],
			null,
		);
		expect(summaryRows.topSectors).toEqual([
			{ sector: "Electronics", count: 2, percent: 100 },
		]);
		expect(summaryRows.topCountries).toEqual([{ country: "Japan", count: 2 }]);

		const withBadMetrics = summarizeStewardInquiries([], {
			total: 2,
			byStatus: { new: 2, contacted: 0, qualified: 0, closed: 0 },
			byCloseReason: {},
			contactedRate: 0,
			qualifiedRate: 0,
			averageHoursToContacted: null,
			averageHoursToQualified: null,
			weeklyTrend: {},
			byGeography: {},
			byCountry: { Singapore: 2, Broken: Number.NaN, Negative: -1 },
			bySector: { Retail: 2, InfinitySector: Number.POSITIVE_INFINITY },
		});
		expect(withBadMetrics.topCountries).toEqual([
			{ country: "Singapore", count: 2 },
		]);
		expect(withBadMetrics.topSectors).toEqual([
			{ sector: "Retail", count: 2, percent: 100 },
		]);
	});
});
