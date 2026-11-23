import { expect, test } from "bun:test";
import {
	catchmentDistanceKm,
	toCatchmentRingsGeoJson,
} from "../../src/features/map/proximity";

test("catchments use closed 64-vertex geodesic rings ordered by radius", () => {
	const result = toCatchmentRingsGeoJson([106, 21], [60, 15, 30, 15]);
	expect(result.features.map((f) => f.properties.radiusKm)).toEqual([
		15, 30, 60,
	]);
	for (const { geometry, properties } of result.features) {
		const ring = geometry.coordinates[0];
		expect(ring).toHaveLength(65);
		expect(ring[64]).toEqual(ring[0]);
		for (const [lng, lat] of ring)
			expect(catchmentDistanceKm([106, 21], [lng, lat])).toBeCloseTo(
				properties.radiusKm,
				4,
			);
	}
});

test("no selection or enabled radii clears catchments", () => {
	expect(toCatchmentRingsGeoJson(null, [15]).features).toEqual([]);
	expect(toCatchmentRingsGeoJson([106, 21], []).features).toEqual([]);
});
