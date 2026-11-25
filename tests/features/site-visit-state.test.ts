import { describe, expect, test } from "bun:test";
import {
	parseSiteVisitState,
	type SiteVisitState,
	serializeSiteVisitState,
} from "../../src/features/site-visit/site-visit-state";

describe("site visit URL state", () => {
	test("round-trips a candidate and selected destination", () => {
		const state: SiteVisitState = {
			candidate: { label: "Hoa Lac", longitude: 105.5294, latitude: 21.0042 },
			destination: "VNHPH-LH",
		};
		const parsed = parseSiteVisitState(`?${serializeSiteVisitState(state)}`);
		expect(parsed).toEqual(state);
	});

	test("rejects invalid coordinates and unknown destinations", () => {
		expect(
			parseSiteVisitState("?lng=999&lat=21&destination=not-a-destination"),
		).toEqual({ candidate: null, destination: null });
	});

	test("preserves itinerary stops when sharing site visit state", () => {
		const state: SiteVisitState = {
			candidate: { label: "Hoa Lac", longitude: 105.5294, latitude: 21.0042 },
			destination: "VNHPH-LH",
			itineraryStops: [
				{ label: "Hoa Lac", longitude: 105.5294, latitude: 21.0042 },
				{ label: "DEEP C", longitude: 106.7745, latitude: 20.8315 },
			],
		};
		const parsed = parseSiteVisitState(`?${serializeSiteVisitState(state)}`);
		expect(parsed).toEqual(state);
	});

	test("round-trips at most three comparison candidates", () => {
		const state: SiteVisitState = {
			candidate: { label: "Hoa Lac", longitude: 105.5294, latitude: 21.0042 },
			destination: "VNHPH-LH",
			compareCandidates: [
				{ label: "A", longitude: 105, latitude: 21 },
				{ label: "B", longitude: 106, latitude: 21 },
				{ label: "C", longitude: 107, latitude: 21 },
				{ label: "D", longitude: 108, latitude: 21 },
			],
		};
		const parsed = parseSiteVisitState(`?${serializeSiteVisitState(state)}`);
		expect(parsed.compareCandidates).toEqual(
			state.compareCandidates?.slice(0, 3),
		);
	});
});
