import { expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import {
  datasetVersions,
  geoUnits,
  geographyVersions,
  indicatorDefinitions,
  inquiryAudit,
  investorInquiries,
  observations,
  sourceRegistry,
} from "../../src/db/schema";

test("Release 1 Drizzle schema exposes provenance-aware market data tables", () => {
  expect(sourceRegistry).toBeDefined();
  expect(datasetVersions).toBeDefined();
  expect(geographyVersions).toBeDefined();
  expect(geoUnits).toBeDefined();
  expect(indicatorDefinitions).toBeDefined();
  expect(observations).toBeDefined();
  expect(investorInquiries).toBeDefined();
  expect(inquiryAudit).toBeDefined();
});

test("initial migration enables PostGIS and creates the market_entry schema", () => {
  const migration = readdirSync("drizzle").filter((file) => file.endsWith(".sql")).map((file) => readFileSync(`drizzle/${file}`, "utf8")).join("\n");

  expect(migration).toContain('CREATE EXTENSION IF NOT EXISTS "postgis"');
  expect(migration).toContain('CREATE SCHEMA "market_entry"');
  expect(migration).toContain('CREATE TABLE "market_entry"."observations"');
  expect(migration).toContain('observations_value_check');
  expect(migration).toContain('observations_dataset_source_fkey');
  expect(migration).toContain('geo_units_parent_fkey');
  expect(migration).toContain('CREATE TABLE "market_entry"."investor_inquiries"');
  expect(migration).toContain('inquiry_status_check');
  expect(migration).toContain('inquiry_audit');
});
