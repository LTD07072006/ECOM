import { describe, expect, test } from "bun:test";
import { resolveRouteAssessment } from "../../src/features/site-visit/route-assessment";

describe("site visit route fallback", () => {
	test("returns a dated baseline when the live provider fails", async () => {
		const result = await resolveRouteAssessment({
			origin: [105.5294, 21.0042],
			destination: {
				code: "VNHPH-LH",
				name: "Lach Huyen",
				coordinates: [106.8897, 20.8086],
			},
			requestRoute: async () => {
				throw new Error("provider unavailable");
			},
			baseline: {
				distanceMeters: 1000,
				durationSeconds: 120,
				observedOn: "2026-01-01",
				sourceUrl: "https://example.test",
			},
		});
		expect(result).toMatchObject({
			mode: "baseline",
			distanceMeters: 1000,
			fallback: true,
		});
	});

	test("returns an explicit unavailable assessment when no baseline exists", async () => {
		const result = await resolveRouteAssessment({
			origin: [105.5294, 21.0042],
			destination: {
				code: "UNKNOWN",
				name: "Unknown destination",
				coordinates: [106, 21],
			},
			requestRoute: async () => {
				throw new Error("provider unavailable");
			},
			baseline: null,
		});
		expect(result).toMatchObject({
			mode: "unavailable",
			fallback: false,
			distanceMeters: 0,
			durationSeconds: 0,
		});
		expect(result.disclaimer).toContain("advisory");
	});
});
