import { describe, expect, test } from "bun:test";
import { normalizeWemapRoute } from "../../src/features/site-visit/route-assessment";

describe("site visit route assessment", () => {
	test("normalizes a WeMap route into an advisory assessment", () => {
		const result = normalizeWemapRoute(
			{
				distance: 12500,
				duration: 1800,
				geometry: {
					type: "LineString",
					coordinates: [
						[105, 21],
						[106, 22],
					],
				},
				provider: "wemap",
			},
			{ code: "VNHPH-LH", name: "Lach Huyen" },
		);
		expect(result).toMatchObject({
			destinationCoordinates: [106, 22],
			distanceMeters: 12500,
			durationSeconds: 1800,
			destinationCode: "VNHPH-LH",
			mode: "live",
		});
		expect(result.disclaimer).toContain("advisory");
	});
});
