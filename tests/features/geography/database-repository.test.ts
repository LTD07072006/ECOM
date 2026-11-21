import { expect, test } from "bun:test";
import { loadDatabaseCatalog, loadProvinceMap } from "../../../src/features/geography/database-repository";
import { loadMapLayers } from "../../../src/features/map/layer-repository";
import { sourcesAreComparable } from "../../../src/features/map/layers";

const databaseTest = process.env.RUN_DB_TESTS === "1" ? test : test.skip;

databaseTest("loads the public geography catalog from PostgreSQL", async () => {
  const catalog = await loadDatabaseCatalog();

  expect(catalog.mode).toBe("database");
  expect(catalog.geographies).toHaveLength(3356);
  const hanoi = catalog.geographies.find((geo) => geo.code === "01");
  expect(hanoi?.displayName).toBe("Hà Nội");
  expect(catalog.geographies.find((geo) => geo.code === "00004")?.parentId).toBe(hanoi?.id);
  expect(catalog.observations.filter((row) => row.indicator === "POP_AVG")).toHaveLength(35);
  expect(catalog.observations.find((row) => row.geoId === hanoi?.id && row.indicator === "POP_AVG")).toMatchObject({
    indicator: "POP_AVG", value: 8857526, period: "2025", quality: "supported",
    dataset: { publicationStatus: "published", owner: "Market Intelligence Data Steward" },
  });
  expect(catalog.geographies.some((geo) => geo.code.startsWith("DEMO-"))).toBe(false);
});

databaseTest("Wave 2 exposes published provincial series, comparable GRDP sources and airport points", async () => {
  const layers = await loadMapLayers();
  const growth = layers.indicators.filter((layer) => layer.indicator === "GRDP_GROWTH");
  expect(growth.map((layer) => Object.keys(layer.values).length)).toEqual([34, 4]);
  expect(sourcesAreComparable(growth[0], growth[1])).toBe(true);

  const fdi = layers.indicators.find((layer) => layer.indicator === "FDI_LICENSED")!;
  expect(Object.values(fdi.values).filter((value) => value === null)).toHaveLength(3);
  expect(Object.values(fdi.values)).toContain(-15.69689842);
  expect(sourcesAreComparable(growth[0], fdi)).toBe(false);
  expect(sourcesAreComparable(growth[0], { ...growth[1], periodStart: "2024-01-01" })).toBe(false);
  expect(layers.infrastructure?.points.features).toHaveLength(22);
  expect(layers.infrastructure?.points.features.find((feature) => feature.properties.code === "HAN")?.properties.province).toBe("Hà Nội");
  expect(layers.infrastructure?.dataset.source.license).toBe("Public Domain");
});

databaseTest("targeted profiles and map use the same selected provincial cohort", async () => {
  const layers = await loadMapLayers();
  const complete = await loadDatabaseCatalog();
  const hanoi = complete.geographies.find((geo) => geo.code === "01")!;
  const targeted = await loadDatabaseCatalog([hanoi.id]);
  expect(targeted.geographies.map((geo) => geo.id)).toEqual([hanoi.id]);
  for (const layer of layers.indicators.filter((item, index, all) =>
    all.findIndex((other) => other.indicator === item.indicator) === index)) {
    const observation = targeted.observations.find((row) => row.indicator === layer.indicator);
    expect(observation?.dataset?.id).toBe(layer.dataset.id);
    expect(observation?.value).toBe(layer.values[hanoi.id] ?? null);
    expect(layer.valueDetails?.[hanoi.id]?.quality).toBe(observation?.quality);
  }
  expect((await loadDatabaseCatalog(undefined, false)).observations).toHaveLength(0);
});

databaseTest("serves only the published province boundary snapshot with its attribution", async () => {
  const map = await loadProvinceMap();
  expect(map.features).toHaveLength(34);
  expect(map.features.every((feature) => ["Polygon", "MultiPolygon"].includes(feature.geometry.type))).toBe(true);
  expect(map.dataset).toMatchObject({ version: "COD-AB v02", source: { license: "CC BY 3.0 IGO" } });
});
