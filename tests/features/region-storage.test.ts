import { expect, test } from "bun:test";
import { readSavedRegions, type SavedRegionComparison } from "../../src/features/regions/storage";
const a = "12345678-1234-4234-8234-123456789abc";
const b = "12345678-1234-4234-8234-123456789abd";
test("reads valid saved comparisons and rejects malformed or overlapping selections", () => {
  const valid: SavedRegionComparison = { name: "North", savedAt: "2026-11-22", regions: [[a], [b]] };
  expect(readSavedRegions(JSON.stringify([valid]))).toEqual([valid]);
  expect(readSavedRegions("invalid")).toEqual([]);
  expect(readSavedRegions(JSON.stringify([{ ...valid, regions: [[a], [a]] }]))).toEqual([]);
  expect(readSavedRegions(JSON.stringify([{ ...valid, regions: [["invalid"], []] }]))).toEqual([]);
});
