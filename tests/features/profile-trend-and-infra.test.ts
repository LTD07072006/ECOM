import { expect, test } from "bun:test";
import { summarizeTrend } from "../../src/features/profile/trend";
import {
	filterInfrastructureByKinds,
	haversineKm,
	type InfrastructureLayer,
} from "../../src/features/map/layers";
import { demoCatalog } from "../../src/db/seed-data";

test("summarizeTrend computes YoY percentage, pp deltas, and SVG polyline coordinates", () => {
	const single = summarizeTrend(
		[
			{
				period: "2025",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				value: 100,
				quality: "supported",
				datasetVersion: "v1",
			},
		],
		"billion VND",
	);
	expect(single.points).toHaveLength(1);
	expect(single.yoy).toBeNull();
	expect(single.polyline).toBe("");

	const multi = summarizeTrend(
		[
			{
				period: "2023",
				periodStart: "2023-01-01",
				periodEnd: "2023-12-31",
				value: 200,
				quality: "verified",
				datasetVersion: "v1",
			},
			{
				period: "2024",
				periodStart: "2024-01-01",
				periodEnd: "2024-12-31",
				value: null,
				quality: "unavailable",
				datasetVersion: "v1",
			},
			{
				period: "2025",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				value: 250,
				quality: "verified",
				datasetVersion: "v2",
			},
		],
		"billion VND",
	);
	expect(multi.points).toHaveLength(2);
	expect(multi.yoy).toEqual({ delta: 25, kind: "pct" });
	expect(multi.polyline.split(" ")).toHaveLength(2);
	expect(multi.lastPoint).not.toBeNull();

	const percentUnit = summarizeTrend(
		[
			{
				period: "2024",
				periodStart: "2024-01-01",
				periodEnd: "2024-12-31",
				value: 6.2,
				quality: "supported",
				datasetVersion: "v1",
			},
			{
				period: "2025",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				value: 7.4,
				quality: "supported",
				datasetVersion: "v2",
			},
		],
		"%",
	);
	expect(percentUnit.yoy?.kind).toBe("pp");
	expect(percentUnit.yoy?.delta).toBeCloseTo(1.2, 5);
});

test("filterInfrastructureByKinds filters multiple infrastructure types and haversineKm estimates distance", () => {
	const sampleLayer: InfrastructureLayer = {
		dataset: {
			id: "ds-infra",
			code: "VN_INFRA",
			version: "2025",
			owner: "Authority",
			dataAsOf: "2025-12-31",
			reviewedAt: "2025-12-31T00:00:00Z",
			reviewDueAt: "2026-12-31T00:00:00Z",
			freshness: "current",
			publicationStatus: "published",
			source: demoCatalog.source ?? {
				id: "src-1",
				publisher: "Authority",
				title: "Infra",
				url: "https://example.test",
				citation: "Authority",
				license: "CC-BY-4.0",
				access: "public",
				status: "active",
				updatedAt: "2025-12-31T00:00:00Z",
			},
		},
		kinds: { airport: 1, seaport: 1, industrial_park: 1 },
		points: {
			type: "FeatureCollection",
			features: [
				{
					type: "Feature",
					id: "air-1",
					geometry: { type: "Point", coordinates: [105.8, 21.22] },
					properties: {
						name: "Noi Bai",
						code: "HAN",
						kind: "airport",
						geoId: "g1",
						province: "Hà Nội",
						url: "https://example.test/han",
					},
				},
				{
					type: "Feature",
					id: "sea-1",
					geometry: { type: "Point", coordinates: [106.7, 20.86] },
					properties: {
						name: "Hai Phong Port",
						code: "HPH",
						kind: "seaport",
						geoId: "g2",
						province: "Hải Phòng",
						url: "https://example.test/hph",
					},
				},
				{
					type: "Feature",
					id: "ip-1",
					geometry: { type: "Point", coordinates: [105.78, 21.13] },
					properties: {
						name: "Thang Long IP",
						code: null,
						kind: "industrial_park",
						geoId: "g1",
						province: "Hà Nội",
						url: "https://example.test/tlip",
					},
				},
			],
		},
	};

	expect(filterInfrastructureByKinds(sampleLayer, [])).toBeNull();
	const parksAndPorts = filterInfrastructureByKinds(sampleLayer, [
		"seaport",
		"industrial_park",
	]);
	expect(parksAndPorts?.points.features.map((f) => f.properties.kind)).toEqual([
		"seaport",
		"industrial_park",
	]);

	// Hanoi center (21.0285, 105.8542) to Noi Bai (21.2212, 105.8072) is ~22 km
	const km = haversineKm(21.0285, 105.8542, 21.2212, 105.8072);
	expect(km).toBeGreaterThanOrEqual(18);
	expect(km).toBeLessThanOrEqual(26);
});
