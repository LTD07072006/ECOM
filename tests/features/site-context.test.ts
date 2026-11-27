import { describe, expect, test } from "bun:test";
import {
	countSiteVisitContextByKind,
	filterSiteVisitContext,
	SITE_CONTEXT_KINDS,
	toSiteVisitContext,
} from "../../src/features/site-visit/site-context";

describe("site visit infrastructure filters", () => {
	test("includes the four survey infrastructure kinds by default", () => {
		const context = toSiteVisitContext({
			longitude: 105.8542,
			latitude: 21.0285,
		});
		const kinds = new Set(
			context.features.map((feature) => feature.properties.kind),
		);
		expect(SITE_CONTEXT_KINDS).toEqual([
			"airport",
			"seaport",
			"icd",
			"industrial_park",
		]);
		expect(kinds.has("airport")).toBe(true);
	});

	test("filters context markers without changing their coordinates", () => {
		const context = toSiteVisitContext({
			longitude: 105.8542,
			latitude: 21.0285,
		});
		const filtered = filterSiteVisitContext(context, ["seaport"]);
		expect(
			filtered.features.every(
				(feature) => feature.properties.kind === "seaport",
			),
		).toBe(true);
		const original = context.features.find(
			(feature) => feature.properties.kind === "seaport",
		);
		const firstFiltered = filtered.features[0];
		expect(firstFiltered).toBeDefined();
		expect(original).toBeDefined();
		if (firstFiltered && original)
			expect(firstFiltered.geometry).toEqual(original.geometry);
	});

	test("counts nearby markers by the four filter kinds", () => {
		const context = toSiteVisitContext({
			longitude: 105.8542,
			latitude: 21.0285,
		});
		const counts = countSiteVisitContextByKind(context);
		expect(Object.keys(counts)).toEqual([
			"airport",
			"seaport",
			"icd",
			"industrial_park",
		]);
		expect(Object.values(counts).every((count) => count >= 0)).toBe(true);
	});
});
