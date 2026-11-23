import { expect, test } from "bun:test";
import {
	readShortlist,
	removeFromShortlist,
	selectForComparison,
	toggleShortlist,
} from "../../src/features/shortlist/store";

test("shortlist adds and removes stable IDs without duplicates", () => {
	expect(toggleShortlist([], "a")).toEqual(["a"]);
	expect(toggleShortlist(["a"], "a")).toEqual([]);
	expect(toggleShortlist(["a", "a"], "b")).toEqual(["a", "b"]);
});
test("handles corrupted storage, non-UUID strings, and arbitrary object records", () => {
	const validA = "10000000-0000-4000-8000-000000000002";
	const validB = "10000000-0000-4000-8000-000000000003";
	expect(readShortlist("invalid")).toEqual([]);
	expect(readShortlist('["a", "a", 3, {"id":"x"}]')).toEqual([]);
	expect(
		readShortlist(
			JSON.stringify([
				validA,
				validA,
				"../etc/passwd",
				"00000000-0000-0000-0000-000000000000",
				validB,
				3,
				{ id: "x" },
			]),
		),
	).toEqual([validA, validB]);
	expect(readShortlist(null)).toEqual([]);
});

test("shortlist tray removes records and caps comparison selection at three", () => {
	expect(removeFromShortlist(["a", "b", "c"], "b")).toEqual(["a", "c"]);
	expect(selectForComparison(["a", "b", "c", "d"])).toEqual(["a", "b", "c"]);
	expect(selectForComparison(["a", "a", "b"])).toEqual(["a", "b"]);
});
