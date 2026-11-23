import { expect, test } from "bun:test";
import {
	colorScale,
	layerColor,
	missingColor,
	type StatisticalLayer,
} from "../../src/features/map/layers";

function makeLayer(
	values: Record<string, number | null>,
	indicator = "POP_AVG",
): StatisticalLayer {
	return {
		id: `layer-${indicator}`,
		indicator,
		label: "Test indicator",
		definition: "Test definition",
		geographyVersion: "VN_ADMIN_2025_07",
		period: "2025",
		periodStart: "2025-01-01",
		periodEnd: "2025-12-31",
		unit: "people",
		scope: "province",
		limitations: "None",
		method: "Direct",
		dataset: {
			id: "ds-1",
			code: "TEST_DS",
			version: "v1",
			owner: "NSO",
			dataAsOf: "2025-12-31",
			reviewedAt: "2025-12-31",
			reviewDueAt: "2026-12-31",
			freshness: "current",
			publicationStatus: "published",
			source: {
				id: "src-1",
				publisher: "NSO",
				title: "Test source",
				url: "https://example.test",
				citation: "NSO 2025",
				license: "Public",
				access: "public",
				status: "active",
				updatedAt: "2025-12-31",
			},
		},
		values,
	};
}

test("colorScale produces monotonic non-empty quantile bins for skewed distributions", () => {
	// Skewed population-like values with large outliers (similar to 34 provinces)
	const values: Record<string, number | null> = {
		p01: 501163,
		p02: 562929,
		p03: 667417,
		p04: 820632,
		p05: 1190336,
		p06: 1335144,
		p07: 1341225,
		p08: 1411579,
		p09: 1594134,
		p10: 1675666,
		p11: 1711576,
		p12: 1748247,
		p13: 1881239,
		p14: 1898547,
		p15: 2150443,
		p16: 2849199,
		p17: 2856383,
		p18: 2980280,
		p19: 3182652,
		p20: 3224937,
		p21: 3235167,
		p22: 3356375,
		p23: 3379606,
		p24: 3403776,
		p25: 3497754,
		p26: 3572353,
		p27: 3694596,
		p28: 3701533,
		p29: 3771769,
		p30: 3843770,
		p31: 4149871,
		p32: 4493699,
		p33: 8857526,
		p34: 13803797,
		pMissing: null,
	};
	const bins = colorScale(makeLayer(values));
	expect(bins).toHaveLength(5);

	const nums = Object.values(values).filter((v): v is number => v !== null);
	for (let i = 0; i < bins.length; i += 1) {
		expect(bins[i].min).toBeLessThanOrEqual(bins[i].max);
		if (i > 0) {
			expect(bins[i - 1].max).toBeLessThan(bins[i].min);
		}
		const countInBin = nums.filter(
			(v) => v >= bins[i].min && v <= bins[i].max,
		).length;
		expect(countInBin).toBeGreaterThan(0);
	}
	expect(layerColor(null, bins)).toBe(missingColor);
	expect(layerColor(501163, bins)).toBe(bins[0].color);
	expect(layerColor(13803797, bins)).toBe(bins[4].color);
});

test("colorScale keeps every bin non-empty with heavy ties and reduces bins when distinct values < 5", () => {
	const tied = colorScale(
		makeLayer({
			a: 1,
			b: 1,
			c: 1,
			d: 1,
			e: 1,
			f: 2,
			g: 3,
			h: 4,
			i: 5,
		}),
	);
	expect(tied).toHaveLength(5);
	for (let i = 1; i < tied.length; i += 1) {
		expect(tied[i - 1].max).toBeLessThan(tied[i].min);
	}
	expect(layerColor(1, tied)).toBe(tied[0].color);
	expect(layerColor(5, tied)).toBe(tied[4].color);

	const threeDistinct = colorScale(
		makeLayer({ a: 10, b: 10, c: 20, d: 30, e: 30 }),
	);
	expect(threeDistinct).toHaveLength(3);
	expect(threeDistinct.map((bin) => [bin.min, bin.max])).toEqual([
		[10, 10],
		[20, 20],
		[30, 30],
	]);
	expect(layerColor(10, threeDistinct)).toBe(threeDistinct[0].color);
	expect(layerColor(20, threeDistinct)).toBe(threeDistinct[1].color);
	expect(layerColor(30, threeDistinct)).toBe(threeDistinct[2].color);
});

test("colorScale collapses to a single bin when min equals max and returns empty for no values", () => {
	const flat = colorScale(makeLayer({ a: 42, b: 42, c: null }));
	expect(flat).toHaveLength(1);
	expect(flat[0].min).toBe(42);
	expect(flat[0].max).toBe(42);
	expect(layerColor(42, flat)).toBe(flat[0].color);

	expect(colorScale(makeLayer({ a: null, b: null }))).toEqual([]);
});
