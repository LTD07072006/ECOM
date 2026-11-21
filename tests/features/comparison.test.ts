import { expect, test } from "bun:test";
import { demoCatalog } from "../../src/db/seed-data";
import { compareProfiles, getProfile } from "../../src/features/geography/domain";

const profiles = demoCatalog.geographies.slice(1, 3).map((geo) => getProfile(demoCatalog, geo.id)!);

test("comparison exposes all context rows and preserves missing values", () => {
  const comparison = compareProfiles(profiles);
  expect(comparison.compatible).toBe(true);
  expect(comparison.rows.map((row) => row.indicator)).toEqual(["POP_TOTAL", "AREA_TOTAL", "POP_DENSITY"]);
  expect(comparison.rows.every((row) => row.values.every((value) => value === null))).toBe(true);
});

test("comparison refuses different levels, periods, units, definitions and versions", () => {
  for (const changed of [
    { ...profiles[1], level: "commune" as const },
    { ...profiles[1], geographyVersion: "different" },
    ...["periodStart", "periodEnd", "unit", "definition", "scope"].map((key) => ({
      ...profiles[1], observations: profiles[1].observations.map((o) => ({ ...o, [key]: "different" })),
    })),
  ]) {
    const result = compareProfiles([profiles[0], changed]);
    expect(result.compatible).toBe(false);
    expect(result.reason).toBeTruthy();
    expect(result.rows.every((row) => row.values.every((value) => value === null))).toBe(true);
  }
});

test("comparison refuses observations from different dataset snapshots", () => {
  const changed = {
    ...profiles[1],
    observations: profiles[1].observations.map((observation) => ({ ...observation, datasetVersion: "another-published-snapshot" })),
  };

  const result = compareProfiles([profiles[0], changed]);
  expect(result.compatible).toBe(false);
  expect(result.reason).toContain("dataset");
});

test("comparison refuses ambiguous snapshots and incomplete selections", () => {
  expect(compareProfiles([]).compatible).toBe(false);
  expect(compareProfiles([profiles[0]]).compatible).toBe(false);
  const duplicate = { ...profiles[1], observations: [...profiles[1].observations, profiles[1].observations[0]] };
  expect(compareProfiles([profiles[0], duplicate]).compatible).toBe(false);
});

test("compares compatible rows independently and rejects matching version labels from different sources", () => {
  const first = { ...profiles[0], observations: profiles[0].observations.map((o) => ({ ...o, value: 100, quality: "verified" as const })) };
  const second = { ...profiles[1], observations: profiles[1].observations.map((o, index) => ({
    ...o, value: 200, quality: "verified" as const,
    source: index === 0 ? { ...o.source, id: "different-source" } : o.source,
  })) };
  const result = compareProfiles([first, second]);
  expect(result.compatible).toBe(false);
  expect(result.rows[0].reason).toContain("source");
  expect(result.rows[0].values).toEqual([null, null]);
  expect(result.rows[1].values).toEqual([100, 200]);
});
