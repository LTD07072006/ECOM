import { expect, test } from "bun:test";
import { screenLocations } from "../../src/features/decision/site-screening";
import { infrastructurePrioritiesFromFacilities } from "../../src/features/decision/site-screening";
import { nationalAirportRegistry } from "../../src/features/map/airport-registry";

test("national airport registry keeps operational and planned records separate", () => {
	expect(nationalAirportRegistry).toHaveLength(24);
	expect(
		nationalAirportRegistry.filter(
			(airport) =>
				airport.classification === "international" &&
				airport.operationalStatus === "operational",
		),
	).toHaveLength(12);
	expect(
		nationalAirportRegistry.find((airport) => airport.id === "VVNS"),
	).toMatchObject({
		classification: "domestic",
		operationalStatus: "not_operational",
		latitude: null,
		longitude: null,
	});
});

test("only operational international airports and verified deep-sea ports satisfy infrastructure criteria", () => {
	const airport = (
		airportStatus: "operational" | "planned",
		airportClassification: "international" | "domestic",
	) => ({
		kind: "airport" as const,
		airportStatus,
		airportClassification,
	});
	const port = (portType: "deep_sea" | "river") => ({
		kind: "seaport" as const,
		operationalStatus: "operational" as const,
		portType,
	});

	expect(
		infrastructurePrioritiesFromFacilities([
			airport("operational", "international"),
		]),
	).toEqual(["international_airport"]);
	expect(
		infrastructurePrioritiesFromFacilities([
			airport("operational", "domestic"),
		]),
	).toEqual([]);
	expect(
		infrastructurePrioritiesFromFacilities([
			airport("planned", "international"),
		]),
	).toEqual([]);
	expect(infrastructurePrioritiesFromFacilities([port("deep_sea")])).toEqual([
		"deep_port",
	]);
	expect(infrastructurePrioritiesFromFacilities([port("river")])).toEqual([]);
});

test("unknown facility classification stays unknown instead of becoming a match", () => {
	expect(
		infrastructurePrioritiesFromFacilities([{ kind: "airport" }]),
	).toBeNull();
});

test("missing evidence is reported even when the corresponding filter is inactive", () => {
	const result = screenLocations(
		{ sector: "retail", areaM2: null, infrastructure: "any", region: "any" },
		[
			{
				id: "partial",
				provinceId: "p",
				sectors: ["retail"],
				availableAreaM2: null,
				infrastructure: null,
				wageRegion: null,
			},
		],
	);
	expect(result.matches).toEqual([]);
	expect(result.needsVerification[0]).toMatchObject({
		id: "partial",
		missing: ["area", "infrastructure", "region"],
	});
});

test("separates unknown measurements from proven matches and rejects known failures", () => {
	const base = {
		provinceId: "p",
		sectors: ["retail"] as const,
		wageRegion: "I" as const,
		infrastructure: ["expressway"] as const,
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
