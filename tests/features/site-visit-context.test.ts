import { describe, expect, test } from "bun:test";
import { haversineKm } from "../../src/features/map/layers";
import { toSiteVisitContext } from "../../src/features/site-visit/site-context";

describe("site visit context", () => {
	test("returns normalized published infrastructure features", () => {
		const result = toSiteVisitContext({
			longitude: 105.5294,
			latitude: 21.0042,
		});
		expect(result.type).toBe("FeatureCollection");
		expect(result.features.length).toBeGreaterThan(0);
		expect(result.features[0].properties).toMatchObject({
			kind: expect.any(String),
			name: expect.any(String),
		});
	});

	test("filters context to published infrastructure near the candidate", () => {
		const result = toSiteVisitContext({
			longitude: 105.5294,
			latitude: 21.0042,
		});
		expect(result.features.length).toBeGreaterThan(0);
		expect(
			result.features.every(
				(feature) =>
					haversineKm(
						21.0042,
						105.5294,
						feature.properties.latitude,
						feature.properties.longitude,
					) <= 150,
			),
		).toBe(true);
	});

	test("does not present distant infrastructure as local context", () => {
		const result = toSiteVisitContext({ longitude: 0, latitude: 0 });
		expect(result.features).toEqual([]);
	});
});
