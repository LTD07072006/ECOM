import { expect, test } from "bun:test";
import { readShortlist, toggleShortlist, removeFromShortlist, selectForComparison } from "../../src/features/shortlist/store";

test("shortlist adds and removes stable IDs without duplicates", () => {
  expect(toggleShortlist([], "a")).toEqual(["a"]);
  expect(toggleShortlist(["a"], "a")).toEqual([]);
  expect(toggleShortlist(["a", "a"], "b")).toEqual(["a", "b"]);
});
test("handles corrupted storage and does not accept arbitrary object records", () => {
  expect(readShortlist("invalid")).toEqual([]);
  expect(readShortlist('["a", "a", 3, {"id":"x"}]')).toEqual(["a"]);
  expect(readShortlist(null)).toEqual([]);
});

test("shortlist tray removes records and caps comparison selection at three", () => {
  expect(removeFromShortlist(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  expect(selectForComparison(["a", "b", "c", "d"])).toEqual(["a", "b", "c"]);
  expect(selectForComparison(["a", "a", "b"])).toEqual(["a", "b"]);
});
