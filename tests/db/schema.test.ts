import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import {
	datasetVersions,
	geographyVersions,
	geoUnits,
	indicatorDefinitions,
	infrastructurePois,
	inquiryAudit,
	investorInquiries,
	legalReadinessAudit,
	observations,
	siteVerificationAudit,
	siteVerificationEvidence,
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
	const migration = readdirSync("drizzle")
		.filter((file) => file.endsWith(".sql"))
		.map((file) => readFileSync(`drizzle/${file}`, "utf8"))
		.join("\n");

	expect(migration).toContain('CREATE EXTENSION IF NOT EXISTS "postgis"');
	expect(migration).toContain('CREATE SCHEMA "market_entry"');
	expect(migration).toContain('CREATE TABLE "market_entry"."observations"');
	expect(migration).toContain("observations_value_check");
	expect(migration).toContain("observations_dataset_source_fkey");
	expect(migration).toContain("geo_units_parent_fkey");
	expect(migration).toContain(
		'CREATE TABLE "market_entry"."investor_inquiries"',
	);
	expect(migration).toContain("inquiry_status_check");
	expect(migration).toContain("inquiry_audit");
	expect(migration).toContain(
		'CREATE TABLE "market_entry"."inquiry_notifications"',
	);
	expect(migration).toContain("'industrial_park'");
	expect(migration).toContain("'seaport'");
	expect(migration).toContain('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
	expect(migration).toContain("geo_units_normalized_name_trgm_idx");
});

test("infrastructure POIs retain classification and operational evidence", () => {
	expect(infrastructurePois.airportClassification).toBeDefined();
	expect(infrastructurePois.operationalStatus).toBeDefined();
	expect(infrastructurePois.portType).toBeDefined();
	expect(infrastructurePois.classificationSourceUrl).toBeDefined();

	const migration = readdirSync("drizzle")
		.filter((file) => file.endsWith(".sql"))
		.map((file) => readFileSync(`drizzle/${file}`, "utf8"))
		.join("\n");
	expect(migration).toContain("airport_classification");
	expect(migration).toContain("operational_status");
	expect(migration).toContain("port_type");
	expect(migration).toContain("classification_source_url");
});

test("review workflow schema exposes current records and append-only audit tables", () => {
	expect(siteVerificationEvidence).toBeDefined();
	expect(siteVerificationAudit).toBeDefined();
	expect(legalReadinessAudit).toBeDefined();
	const migration = readdirSync("drizzle")
		.filter((file) => file.endsWith(".sql"))
		.map((file) => readFileSync(`drizzle/${file}`, "utf8"))
		.join("\n");
	expect(migration).toContain(
		'CREATE TABLE "market_entry"."site_verification_evidence"',
	);
	expect(migration).toContain(
		'CREATE TABLE "market_entry"."site_verification_audit"',
	);
	expect(migration).toContain(
		'CREATE TABLE "market_entry"."legal_readiness_audit"',
	);
});

test("all working-tree migrations are registered with the Drizzle journal", () => {
	const journal = JSON.parse(
		readFileSync("drizzle/meta/_journal.json", "utf8"),
	) as { entries: Array<{ tag: string }> };
	const tags = new Set(journal.entries.map((entry) => entry.tag));
	expect(tags.has("0017_infrastructure_evidence")).toBe(true);
	expect(tags.has("0018_api_observability")).toBe(true);
	expect(tags.has("0019_review_workflows")).toBe(true);
});
