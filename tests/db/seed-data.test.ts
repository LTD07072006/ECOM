import { expect, test } from "bun:test";
import { demoCatalog, ids } from "../../src/db/seed-data";

test("seed catalog is public, versioned, and provenance-aware", () => {
  expect(demoCatalog.publicationStatus).toBe("published");
  expect(demoCatalog.source?.access).toBe("public");
  expect(demoCatalog.source?.status).toBe("active");
  expect(demoCatalog.geographies.some((geo) => geo.code === "DEMO-VN")).toBe(true);
  expect(demoCatalog.geographies.filter((geo) => geo.level === "province").length).toBeGreaterThan(3);
  expect(demoCatalog.observations.every((observation) => observation.source.id === ids.source)).toBe(true);
  expect(demoCatalog.observations.some((observation) => observation.unit === "people")).toBe(true);
});

test("profile context indicators include population, area, and density without inventing values", () => {
  const indicators = new Set(demoCatalog.observations.map((observation) => observation.indicator));

  expect(indicators).toEqual(new Set(["POP_TOTAL", "AREA_TOTAL", "POP_DENSITY"]));
  expect(demoCatalog.observations.every((observation) => observation.value === null)).toBe(true);
  expect(demoCatalog.observations.some((observation) => observation.unit === "km²")).toBe(true);
  expect(demoCatalog.observations.some((observation) => observation.unit === "people/km²")).toBe(true);
});

test("Sprint 2 preserves Sprint 1 population observation identities", () => {
  demoCatalog.geographies.forEach((geo, index) => {
    expect(demoCatalog.observations.find((o) => o.geoId === geo.id && o.indicator === "POP_TOTAL")?.id)
      .toBe(`20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);
  });
});
