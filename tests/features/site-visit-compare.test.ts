import { describe, expect, test } from "bun:test";
import {
	compareCandidateRoutes,
	limitCandidates,
} from "../../src/features/site-visit/compare";

describe("site visit compare mode", () => {
	test("limits comparison to three candidates without scoring them", () => {
		const candidates = ["a", "b", "c", "d"];
		expect(limitCandidates(candidates)).toEqual(["a", "b", "c"]);
	});

	test("aligns route metrics by the same destination", () => {
		const rows = compareCandidateRoutes([
			{
				candidateId: "a",
				destinationCode: "port",
				distanceMeters: 10,
				durationSeconds: 20,
			},
			{
				candidateId: "b",
				destinationCode: "port",
				distanceMeters: 30,
				durationSeconds: 40,
			},
		]);
		expect(rows).toEqual([{ destinationCode: "port", routes: rows[0].routes }]);
		expect(rows[0].routes.map((route) => route.candidateId)).toEqual([
			"a",
			"b",
		]);
	});
});
