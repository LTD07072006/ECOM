import {
  boolean,
  check,
  customType,
  date,
  foreignKey,
  index,
  numeric,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const marketEntry = pgSchema("market_entry");

const geometry = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geometry";
  },
});

export const sourceRegistry = marketEntry.table("source_registry", {
  sourceId: uuid("source_id").defaultRandom().primaryKey(),
  publisher: text("publisher").notNull(),
  title: text("title").notNull(),
  url: text("url"),
  sourceType: text("source_type").notNull(),
  license: text("license").notNull(),
  accessRight: text("access_right").notNull(),
  collectedAt: timestamp("collected_at", { withTimezone: true }).defaultNow().notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  citationText: text("citation_text").notNull(),
  status: text("status").default("active").notNull(),
}, (table) => [
  check("source_type_check", sql`${table.sourceType} in ('official', 'survey', 'partner', 'model', 'manual')`),
  check("access_right_check", sql`${table.accessRight} in ('public', 'internal', 'restricted')`),
  check("source_status_check", sql`${table.status} in ('active', 'expired', 'revoked')`),
  check("source_license_check", sql`btrim(${table.license}) <> ''`),
]);

export const datasetVersions = marketEntry.table("dataset_versions", {
  datasetVersionId: uuid("dataset_version_id").defaultRandom().primaryKey(),
  sourceId: uuid("source_id").notNull().references(() => sourceRegistry.sourceId),
  datasetCode: text("dataset_code").notNull(),
  versionLabel: text("version_label").notNull(),
  checksum: text("checksum"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ownerName: text("owner_name"),
  dataAsOf: date("data_as_of"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewDueAt: timestamp("review_due_at", { withTimezone: true }),
  publicationStatus: text("publication_status").default("draft").notNull(),
}, (table) => [
  unique("dataset_source_code_version_unique").on(table.sourceId, table.datasetCode, table.versionLabel),
  unique("dataset_source_identity_unique").on(table.datasetVersionId, table.sourceId),
  check("dataset_publication_status_check", sql`${table.publicationStatus} in ('draft', 'validated', 'published', 'retired')`),
  check("dataset_review_dates_check", sql`${table.reviewDueAt} >= ${table.reviewedAt}`),
  check("dataset_validation_metadata_check", sql`${table.publicationStatus} not in ('validated', 'published') or (
    nullif(btrim(${table.ownerName}), '') is not null and ${table.dataAsOf} is not null
    and ${table.reviewedAt} is not null and ${table.reviewDueAt} is not null
    and (${table.checksum} ~ '^[a-f0-9]{64}$') is true
  )`),
  check("dataset_publication_date_check", sql`${table.publicationStatus} <> 'published' or ${table.publishedAt} is not null`),
]);

export const geographyVersions = marketEntry.table("geography_versions", {
  geographyVersionId: uuid("geography_version_id").defaultRandom().primaryKey(),
  authoritySourceId: uuid("authority_source_id").notNull().references(() => sourceRegistry.sourceId),
  datasetVersionId: uuid("dataset_version_id"),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  status: text("status").default("draft").notNull(),
}, (table) => [
  check("geography_status_check", sql`${table.status} in ('draft', 'active', 'retired')`),
  check("geography_dates_check", sql`${table.effectiveTo} is null or ${table.effectiveTo} >= ${table.effectiveFrom}`),
  foreignKey({ name: "geography_dataset_source_fkey", columns: [table.datasetVersionId, table.authoritySourceId], foreignColumns: [datasetVersions.datasetVersionId, datasetVersions.sourceId] }),
]);

export const geoUnits = marketEntry.table("geo_units", {
  geoId: uuid("geo_id").defaultRandom().primaryKey(),
  geographyVersionId: uuid("geography_version_id").notNull().references(() => geographyVersions.geographyVersionId),
  adminCode: text("admin_code").notNull(),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  level: text("level").notNull(),
  parentGeoId: uuid("parent_geo_id"),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  geom: geometry("geom"),
  geometryStatus: text("geometry_status").default("point_only").notNull(),
  parentLevel: text("parent_level").generatedAlwaysAs(sql`CASE level WHEN 'province' THEN 'country' WHEN 'commune' THEN 'province' END`),
}, (table) => [
  unique("geo_units_version_admin_unique").on(table.geographyVersionId, table.adminCode),
  index("geo_units_normalized_name_idx").on(table.normalizedName),
  index("geo_units_parent_idx").on(table.parentGeoId),
  check("geo_level_check", sql`${table.level} in ('country', 'province', 'commune')`),
  check("geo_geometry_status_check", sql`${table.geometryStatus} in ('not_available', 'point_only', 'boundary_available', 'boundary_verified', 'restricted')`),
  check("geo_dates_check", sql`${table.validTo} is null or ${table.validTo} >= ${table.validFrom}`),
  unique("geo_units_identity_unique").on(table.geoId, table.geographyVersionId, table.level),
  check("geo_units_parent_check", sql`(${table.level} = 'country') = (${table.parentGeoId} IS NULL)`),
  check("geo_units_coordinates_check", sql`(${table.latitude} IS NULL AND ${table.longitude} IS NULL) OR (${table.latitude} BETWEEN -90 AND 90 AND ${table.longitude} BETWEEN -180 AND 180)`),
  check("geo_units_geometry_check", sql`${table.geom} IS NULL OR (ST_SRID(${table.geom}) = 4326 AND ST_IsValid(${table.geom}))`),
  foreignKey({ name: "geo_units_parent_fkey", columns: [table.parentGeoId, table.geographyVersionId, table.parentLevel], foreignColumns: [table.geoId, table.geographyVersionId, table.level] }),
]);

export const geoBoundaries = marketEntry.table("geo_boundaries", {
  geoId: uuid("geo_id").notNull().references(() => geoUnits.geoId),
  datasetVersionId: uuid("dataset_version_id").notNull().references(() => datasetVersions.datasetVersionId),
  geom: geometry("geom").notNull(),
}, (table) => [
  primaryKey({ columns: [table.geoId, table.datasetVersionId] }),
  check("geo_boundaries_geometry_check", sql`ST_SRID(${table.geom}) = 4326 AND ST_NDims(${table.geom}) = 2
    AND ST_GeometryType(${table.geom}) IN ('ST_Polygon', 'ST_MultiPolygon')
    AND NOT ST_IsEmpty(${table.geom}) AND ST_IsValid(${table.geom})`),
]);

export const infrastructurePois = marketEntry.table("infrastructure_pois", {
  datasetVersionId: uuid("dataset_version_id").notNull(),
  geoId: uuid("geo_id").notNull(),
  sourceKey: text("source_key").notNull(),
  name: text("name").notNull(),
  code: text("code"),
  kind: text("kind").notNull(),
  referenceUrl: text("reference_url").notNull(),
  geom: geometry("geom").notNull(),
}, (table) => [
  primaryKey({ columns: [table.datasetVersionId, table.sourceKey] }),
  foreignKey({ name: "infrastructure_pois_dataset_fkey", columns: [table.datasetVersionId], foreignColumns: [datasetVersions.datasetVersionId] }),
  foreignKey({ name: "infrastructure_pois_geo_fkey", columns: [table.geoId], foreignColumns: [geoUnits.geoId] }),
  index("infrastructure_pois_geo_idx").on(table.geoId),
  check("infrastructure_pois_kind_check", sql`${table.kind} = 'airport'`),
  check("infrastructure_pois_point_check", sql`CASE WHEN ST_SRID(${table.geom}) = 4326
    AND ST_NDims(${table.geom}) = 2 AND ST_GeometryType(${table.geom}) = 'ST_Point' AND NOT ST_IsEmpty(${table.geom})
    THEN ST_X(${table.geom}) BETWEEN -180 AND 180 AND ST_Y(${table.geom}) BETWEEN -90 AND 90 ELSE false END`),
]);

export const indicatorDefinitions = marketEntry.table("indicator_definitions", {
  indicatorId: uuid("indicator_id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  domain: text("domain").notNull(),
  valueType: text("value_type").notNull(),
  unit: text("unit").notNull(),
  periodType: text("period_type").notNull(),
  polarity: text("polarity").default("context_only").notNull(),
  isProxy: boolean("is_proxy").default(false).notNull(),
  scoreEligible: boolean("score_eligible").default(false).notNull(),
  status: text("status").default("draft").notNull(),
}, (table) => [
  unique("indicator_unit_value_type_unique").on(table.indicatorId, table.unit, table.valueType),
  check("indicator_value_type_check", sql`${table.valueType} in ('integer', 'decimal', 'percent', 'text', 'category')`),
  check("indicator_period_type_check", sql`${table.periodType} in ('point', 'month', 'quarter', 'year', 'survey')`),
  check("indicator_polarity_check", sql`${table.polarity} in ('higher', 'lower', 'neutral', 'context_only')`),
  check("indicator_score_check", sql`${table.polarity} <> 'context_only' or not ${table.scoreEligible}`),
  check("indicator_status_check", sql`${table.status} in ('draft', 'active', 'retired')`),
  check("indicator_unit_check", sql`btrim(${table.unit}) <> ''`),
]);

export const observations = marketEntry.table("observations", {
  observationId: uuid("observation_id").defaultRandom().primaryKey(),
  geoId: uuid("geo_id").notNull().references(() => geoUnits.geoId),
  indicatorId: uuid("indicator_id").notNull().references(() => indicatorDefinitions.indicatorId),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  periodLabel: text("period_label").notNull(),
  valueNumeric: numeric("value_numeric"),
  valueText: text("value_text"),
  valueType: text("value_type").notNull(),
  unit: text("unit").notNull(),
  scope: text("scope").notNull(),
  sourceId: uuid("source_id").notNull().references(() => sourceRegistry.sourceId),
  datasetVersionId: uuid("dataset_version_id").notNull().references(() => datasetVersions.datasetVersionId),
  qualityStatus: text("quality_status").notNull(),
  missingReason: text("missing_reason"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  methodNote: text("method_note"),
  limitations: text("limitations"),
}, (table) => [
  unique("observations_natural_key").on(table.geoId, table.indicatorId, table.periodStart, table.periodEnd, table.scope, table.datasetVersionId),
  index("observations_indicator_period_idx").on(table.indicatorId, table.periodStart, table.periodEnd),
  check("observation_quality_check", sql`${table.qualityStatus} in ('verified', 'supported', 'unavailable')`),
  check("observation_missing_reason_check", sql`${table.missingReason} is null or ${table.missingReason} in ('no_data', 'not_applicable', 'not_comparable', 'restricted')`),
  check("observation_period_check", sql`${table.periodEnd} >= ${table.periodStart}`),
  check("observation_scope_check", sql`btrim(${table.scope}) <> ''`),
  foreignKey({ name: "observations_indicator_fkey", columns: [table.indicatorId, table.unit, table.valueType], foreignColumns: [indicatorDefinitions.indicatorId, indicatorDefinitions.unit, indicatorDefinitions.valueType] }),
  foreignKey({ name: "observations_dataset_source_fkey", columns: [table.datasetVersionId, table.sourceId], foreignColumns: [datasetVersions.datasetVersionId, datasetVersions.sourceId] }),
  check("observations_value_check", sql`CASE
    WHEN ${table.qualityStatus} = 'unavailable' THEN ${table.valueNumeric} IS NULL AND ${table.valueText} IS NULL AND ${table.missingReason} IS NOT NULL
    WHEN ${table.valueType} IN ('text', 'category') THEN ${table.valueNumeric} IS NULL AND ${table.valueText} IS NOT NULL AND btrim(${table.valueText}) <> '' AND ${table.missingReason} IS NULL
    ELSE ${table.valueNumeric} IS NOT NULL AND ${table.valueText} IS NULL AND ${table.missingReason} IS NULL
      AND ${table.valueNumeric} > '-Infinity'::numeric AND ${table.valueNumeric} < 'Infinity'::numeric
      AND (${table.valueType} <> 'integer' OR ${table.valueNumeric} = trunc(${table.valueNumeric}))
      AND (${table.valueType} <> 'percent' OR ${table.valueNumeric} BETWEEN 0 AND 100)
    END`),
]);
