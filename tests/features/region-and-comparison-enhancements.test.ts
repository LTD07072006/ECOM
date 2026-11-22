import { expect, test } from "bun:test";
import { demoCatalog } from "../../src/db/seed-data";
import { getProfile } from "../../src/features/geography/domain";
import {
	buildRegionExport,
	regionExportToCsv,
} from "../../src/features/regions/export";
import { computeComparisonRowMetrics } from "../../src/features/comparison/metrics";

test("buildRegionExport and regionExportToCsv preserve provenance, compute deltas, and neutralize CSV formulas", () => {
	const raw = demoCatalog.geographies
		.slice(1, 3)
		.map((geo) => getProfile(demoCatalog, geo.id));
	const [p1, p2] = raw.filter(
		(item): item is NonNullable<typeof item> => item !== null,
	);
	const sharedDataset = {
		id: "ds-same",
		code: "VN_POP",
		version: "2025.01",
		owner: "Authority",
		dataAsOf: "2025-12-31",
		reviewedAt: "2025-12-31T00:00:00.000Z",
		reviewDueAt: "2026-12-31T00:00:00.000Z",
		freshness: "current" as const,
		publicationStatus: "published" as const,
		source: p1.observations[0].source,
	};
	const profA = {
		...p1,
		displayName: "=CMD|'/C calc'!A0",
		observations: [
			{
				...p1.observations[0],
				indicator: "POP_AVG",
				value: 200,
				quality: "verified" as const,
				dataset: sharedDataset,
			},
		],
	};
	const profB = {
		...p2,
		observations: [
			{
				...p2.observations[0],
				indicator: "POP_AVG",
				value: 250,
				quality: "verified" as const,
				dataset: sharedDataset,
			},
		],
	};

	const payload = buildRegionExport([[profA.id], [profB.id]], {
		[profA.id]: profA,
		[profB.id]: profB,
	});
	const pop = payload.metrics.find((row) => row.indicator === "POP_AVG");
	expect(pop?.regionAValue).toBe(200);
	expect(pop?.regionBValue).toBe(250);
	expect(pop?.compatible).toBe(true);
	expect(pop?.deltaBMinusA).toBe(50);
	expect(pop?.deltaPercent).toBe(25);

	const csv = regionExportToCsv(payload);
	expect(csv.startsWith("\uFEFF")).toBe(true);
	expect(csv).toContain("POP_AVG");
	expect(csv).toContain("\"'=CMD|'/C calc'!A0\"");
});

test("computeComparisonRowMetrics calculates proportional bars, percentage deltas, and percentage points", () => {
	const stats = computeComparisonRowMetrics([200, 250, null], 0, "billion VND");
	expect(stats[0]).toMatchObject({
		barPercent: 80,
		isBaseline: true,
		delta: null,
	});
	expect(stats[1]).toMatchObject({
		barPercent: 100,
		isBaseline: false,
		delta: 50,
		deltaPercent: 25,
		deltaKind: "pct",
	});
	expect(stats[2]).toMatchObject({
		barPercent: 0,
		isBaseline: false,
		delta: null,
	});

	const pctUnit = computeComparisonRowMetrics([6.5, 8.0], 0, "%");
	expect(pctUnit[1]?.deltaKind).toBe("pp");
	expect(pctUnit[1]?.delta).toBeCloseTo(1.5, 5);

	const zeroBaseline = computeComparisonRowMetrics([0, 10], 0, "million USD");
	expect(zeroBaseline[1]).toMatchObject({
		delta: 10,
		deltaPercent: null,
		deltaKind: null,
	});
});
