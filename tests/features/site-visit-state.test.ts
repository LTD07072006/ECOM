import { describe, expect, test } from "bun:test";
import {
	createPinnedCandidate,
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

	test("creates a shareable candidate for a map-pinned location", () => {
		const candidate = createPinnedCandidate(105.8123, 21.0345);
		expect(candidate).toEqual({
			label: "Pinned location",
			longitude: 105.8123,
			latitude: 21.0345,
		});
		const parsed = parseSiteVisitState(
			`?${serializeSiteVisitState({ candidate, destination: null })}`,
		);
		expect(parsed.candidate).toEqual(candidate);
	});

	test("rejects invalid coordinates and unknown destinations", () => {
		expect(
			parseSiteVisitState("?lng=999&lat=21&destination=not-a-destination"),
		).toEqual({ candidate: null, destination: null });
	});

	test("keeps zero coordinates only when explicitly supplied", () => {
		expect(parseSiteVisitState("?label=Site&lat=0").candidate).toBeNull();
		expect(
			parseSiteVisitState("?label=Site&lng=%20&lat=0").candidate,
		).toBeNull();
		expect(parseSiteVisitState("?label=Site&lng=0&lat=0").candidate).toEqual({
			label: "Site",
			longitude: 0,
			latitude: 0,
		});
	});

	test("preserves itinerary stops when sharing site visit state", () => {
		const state: SiteVisitState = {
			candidate: { label: "Hoa Lac", longitude: 105.5294, latitude: 21.0042 },
			destination: "VNHPH-LH",
			itineraryStops: [
				{ label: "Hoa Lac", longitude: 105.5294, latitude: 21.0042 },
				{ label: "DEEP C, Gate | B", longitude: 106.7745, latitude: 20.8315 },
			],
		};
		const parsed = parseSiteVisitState(`?${serializeSiteVisitState(state)}`);
		expect(parsed).toEqual(state);
	});

	test("reads existing itinerary and comparison links and drops incomplete stops", () => {
		const state = parseSiteVisitState(
			"?stops=Valid%7C105.5%7C21,Bad%7C%7C21&compare=Old%7C106%7C22",
		);
		expect(state.itineraryStops).toEqual([
			{ label: "Valid", longitude: 105.5, latitude: 21 },
		]);
		expect(state.compareCandidates).toEqual([
			{ label: "Old", longitude: 106, latitude: 22 },
		]);
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
