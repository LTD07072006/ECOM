import { describe, expect, test } from "bun:test";
import {
	itinerarySummary,
	limitItinerary,
	serializeItinerary,
} from "../../src/features/site-visit/itinerary";

describe("site visit itinerary", () => {
	test("limits an itinerary to five stops", () => {
		expect(limitItinerary(["a", "b", "c", "d", "e", "f"])).toEqual([
			"a",
			"b",
			"c",
			"d",
			"e",
		]);
	});

	test("sums successful legs and preserves failed legs", () => {
		const summary = itinerarySummary([
			{
				fromId: "a",
				toId: "b",
				distanceMeters: 100,
				durationSeconds: 10,
				status: "live",
			},
			{
				fromId: "b",
				toId: "c",
				distanceMeters: 0,
				durationSeconds: 0,
				status: "unavailable",
			},
		]);
		expect(summary).toMatchObject({
			distanceMeters: 100,
			durationSeconds: 10,
			unavailableLegs: 1,
		});
	});

	test("serializes ordered stops for sharing", () => {
		expect(serializeItinerary(["site-a", "port-b"])).toBe(
			"stops=site-a%2Cport-b",
		);
	});
});
