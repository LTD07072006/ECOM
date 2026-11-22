import { expect, test } from "bun:test";
import {
	buildInquiryAnalytics,
	buildInquiryMetrics,
	inquiryRowsCsv,
	inquiryRowsCsvStream,
	isoWeekKey,
} from "../../src/features/inquiries/reporting";
import { buildSnapshotComparison } from "../../src/features/inquiries/snapshots";
import { spreadsheetCsvCell } from "../../src/lib/csv";

const rows = [
	{
		reference_code: "INQ-2026-AAAAAAAA",
		status: "new" as const,
		close_reason: null,
		country: null,
		sector: "Logistics",
		geography_ids: ["geo-1"],
		created_at: new Date("2026-01-01T00:00:00Z"),
		updated_at: new Date("2026-01-01T00:00:00Z"),
		anonymized_at: null,
	},
	{
		reference_code: "INQ-2026-BBBBBBBB",
		status: "contacted" as const,
		close_reason: null,
		country: "VN",
		sector: "Retail",
		geography_ids: ["geo-2"],
		created_at: new Date("2026-01-01T00:00:00Z"),
		updated_at: new Date("2026-01-01T06:00:00Z"),
		anonymized_at: null,
	},
	{
		reference_code: "INQ-2026-CCCCCCCC",
		status: "closed" as const,
		close_reason: "resolved",
		country: "VN",
		sector: "Retail",
		geography_ids: ["geo-2"],
		created_at: new Date("2026-01-01T00:00:00Z"),
		updated_at: new Date("2026-01-02T00:00:00Z"),
		anonymized_at: null,
	},
];

test("builds funnel metrics without private fields", () => {
	const metrics = buildInquiryMetrics(rows);
	expect(metrics.total).toBe(3);
	expect(metrics.byStatus).toEqual({
		new: 1,
		contacted: 1,
		qualified: 0,
		closed: 1,
	});
	expect(metrics.byCloseReason).toEqual({ resolved: 1 });
	expect(metrics.contactedRate).toBe(0);
	expect(metrics.qualifiedRate).toBe(0);
});

test("exports safe rows CSV without email, message, or notes", () => {
	const csv = inquiryRowsCsv(rows);
	expect(csv).toContain("country_self_reported");
	expect(csv).toContain("INQ-2026-AAAAAAAA");
	expect(csv).not.toContain("email");
	expect(csv).not.toContain("message");
	expect(csv).not.toContain("note");
});

test("CSV keeps user-provided spreadsheet prefixes as text and preserves ordinary values", () => {
	expect(
		inquiryRowsCsv([
			{ ...rows[0], country: " ＝1", sector: 'Example "A",\r\nB' },
		]),
	).toContain(`,"' ＝1","Example ""A"",\r\nB",geo-1`);
	expect(
		["=1", "+1", "-1", "@example", "\ttext", "\rtext"].map((value) =>
			spreadsheetCsvCell(value),
		),
	).toEqual([
		'"\'=1"',
		'"\'+1"',
		'"\'-1"',
		'"\'@example"',
		'"\'\ttext"',
		'"\'\rtext"',
	]);
	expect(spreadsheetCsvCell(-12)).toBe("-12");
	expect(spreadsheetCsvCell("Việt Nam")).toBe("Việt Nam");
});

test("funnel KPIs derive timing from transition events rather than mutable updated_at (ECOM-06)", () => {
	const base = new Date("2026-11-01T00:00:00Z");
	const withTransitions = [
		// Direct new -> closed: NOT contacted, NOT qualified
		{
			...rows[2],
			created_at: base,
			updated_at: new Date("2026-11-11T00:00:00Z"),
			contacted_at: null,
			qualified_at: null,
		},
		// Contacted at +2h, then note added 10 days later (updated_at changes, contacted_at stays +2h)
		{
			...rows[1],
			created_at: base,
			updated_at: new Date("2026-11-11T00:00:00Z"),
			contacted_at: new Date("2026-11-01T02:00:00Z"),
			qualified_at: null,
		},
		// Contacted at +4h, qualified at +8h
		{
			...rows[1],
			reference_code: "INQ-2026-DDDDDDDD",
			status: "qualified" as const,
			created_at: base,
			updated_at: new Date("2026-11-20T00:00:00Z"),
			contacted_at: new Date("2026-11-01T04:00:00Z"),
			qualified_at: new Date("2026-11-01T08:00:00Z"),
		},
	];
	const metrics = buildInquiryMetrics(withTransitions);
	expect(metrics.contactedRate).toBeCloseTo(2 / 3, 6);
	expect(metrics.qualifiedRate).toBeCloseTo(1 / 3, 6);
	expect(metrics.averageHoursToContacted).toBe(3);
	expect(metrics.averageHoursToQualified).toBe(8);
});

test("weekly trends compute ISO weeks in Asia/Ho_Chi_Minh including midnight and year boundaries (ECOM-07)", () => {
	// 2026-11-22T16:30:00Z is Sunday 23:30 ICT -> 2026-W47
	expect(isoWeekKey(new Date("2026-11-22T16:30:00Z"))).toBe("2026-W47");
	// 2026-11-22T17:30:00Z is Monday 00:30 ICT (2026-11-23) -> 2026-W48
	expect(isoWeekKey(new Date("2026-11-22T17:30:00Z"))).toBe("2026-W48");
	// 2025-12-31T17:30:00Z is Thursday 2026-01-01 00:30 ICT -> 2026-W01
	expect(isoWeekKey(new Date("2025-12-31T17:30:00Z"))).toBe("2026-W01");
	// 2026-12-31T17:30:00Z is Friday 2027-01-01 00:30 ICT -> 2026-W53
	expect(isoWeekKey(new Date("2026-12-31T17:30:00Z"))).toBe("2026-W53");

	const analytics = buildInquiryAnalytics([
		{ ...rows[0], created_at: new Date("2026-11-22T16:30:00Z") },
		{ ...rows[1], created_at: new Date("2026-11-22T17:30:00Z") },
	]);
	expect(analytics.weeklyTrend).toEqual({ "2026-W47": 1, "2026-W48": 1 });
	const weekSum = Object.values(analytics.weeklyTrend).reduce(
		(a, b) => a + b,
		0,
	);
	expect(weekSum).toBe(analytics.total);

	const compared = buildSnapshotComparison(
		{
			snapshotId: "s1",
			periodStart: "2026-11-01T00:00:00Z",
			periodEnd: "2026-11-30T00:00:00Z",
			timeZone: "UTC",
			formulaVersion: "inquiry-funnel-v3",
			filters: {},
			metrics: analytics,
		},
		{
			snapshotId: "s2",
			periodStart: "2026-11-01T00:00:00Z",
			periodEnd: "2026-11-30T00:00:00Z",
			timeZone: "Asia/Ho_Chi_Minh",
			formulaVersion: "inquiry-funnel-v4",
			filters: {},
			metrics: analytics,
		},
	);
	expect(compared.compatible).toBe(false);
	expect(compared.diagnostics.timeZone).toBe(true);
	expect(compared.diagnostics.formulaVersion).toBe(true);
});

test("streaming CSV export matches buffered inquiryRowsCsv output (ECOM-10)", async () => {
	for (const data of [rows, []]) {
		const streamed = new Uint8Array(
			await new Response(inquiryRowsCsvStream(data, 1)).arrayBuffer(),
		);
		expect(Array.from(streamed.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
		expect(streamed).toEqual(new TextEncoder().encode(inquiryRowsCsv(data)));
	}
});
