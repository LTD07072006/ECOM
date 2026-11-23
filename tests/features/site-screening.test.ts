import { expect, test } from "bun:test";
import { screenLocations } from "../../src/features/decision/site-screening";

test("separates unknown measurements from proven matches and rejects known failures", () => {
	const base = {
		provinceId: "p",
		sectors: ["retail"] as const,
		wageRegion: null,
		infrastructure: null,
	};
	const result = screenLocations(
		{ sector: "retail", areaM2: 50000, infrastructure: "any", region: "any" },
		[
			{ ...base, id: "unknown", availableAreaM2: null },
			{ ...base, id: "low", availableAreaM2: 49999 },
			{ ...base, id: "match", availableAreaM2: 50000 },
		],
	);
	expect(result.matches.map((r) => r.id)).toEqual(["match"]);
	expect(result.needsVerification[0]).toMatchObject({
		id: "unknown",
		missing: ["area"],
	});
});
