CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "postgis";
--> statement-breakpoint
CREATE SCHEMA "market_entry";
--> statement-breakpoint
CREATE TABLE "market_entry"."dataset_versions" (
	"dataset_version_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"dataset_code" text NOT NULL,
	"version_label" text NOT NULL,
	"checksum" text,
	"published_at" timestamp with time zone,
	CONSTRAINT "dataset_source_code_version_unique" UNIQUE("source_id","dataset_code","version_label"),
	CONSTRAINT "dataset_source_identity_unique" UNIQUE("dataset_version_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "market_entry"."geo_units" (
	"geo_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"geography_version_id" uuid NOT NULL,
	"admin_code" text NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"level" text NOT NULL,
	"parent_geo_id" uuid,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"geom" geometry,
	"parent_level" text GENERATED ALWAYS AS (CASE level WHEN 'province' THEN 'country' WHEN 'commune' THEN 'province' END) STORED,
	CONSTRAINT "geo_units_version_admin_unique" UNIQUE("geography_version_id","admin_code"),
	CONSTRAINT "geo_units_identity_unique" UNIQUE("geo_id","geography_version_id","level"),
	CONSTRAINT "geo_level_check" CHECK ("market_entry"."geo_units"."level" in ('country', 'province', 'commune')),
	CONSTRAINT "geo_dates_check" CHECK ("market_entry"."geo_units"."valid_to" is null or "market_entry"."geo_units"."valid_to" >= "market_entry"."geo_units"."valid_from"),
	CONSTRAINT "geo_units_parent_check" CHECK (("market_entry"."geo_units"."level" = 'country') = ("market_entry"."geo_units"."parent_geo_id" IS NULL)),
	CONSTRAINT "geo_units_coordinates_check" CHECK (("market_entry"."geo_units"."latitude" IS NULL AND "market_entry"."geo_units"."longitude" IS NULL) OR ("market_entry"."geo_units"."latitude" BETWEEN -90 AND 90 AND "market_entry"."geo_units"."longitude" BETWEEN -180 AND 180)),
	CONSTRAINT "geo_units_geometry_check" CHECK ("market_entry"."geo_units"."geom" IS NULL OR (ST_SRID("market_entry"."geo_units"."geom") = 4326 AND ST_IsValid("market_entry"."geo_units"."geom")))
);
--> statement-breakpoint
CREATE TABLE "market_entry"."geography_versions" (
	"geography_version_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"authority_source_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" text DEFAULT 'draft' NOT NULL,
	CONSTRAINT "geography_versions_code_unique" UNIQUE("code"),
	CONSTRAINT "geography_status_check" CHECK ("market_entry"."geography_versions"."status" in ('draft', 'active', 'retired')),
	CONSTRAINT "geography_dates_check" CHECK ("market_entry"."geography_versions"."effective_to" is null or "market_entry"."geography_versions"."effective_to" >= "market_entry"."geography_versions"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "market_entry"."indicator_definitions" (
	"indicator_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"domain" text NOT NULL,
	"value_type" text NOT NULL,
	"unit" text NOT NULL,
	"period_type" text NOT NULL,
	"polarity" text DEFAULT 'context_only' NOT NULL,
	"is_proxy" boolean DEFAULT false NOT NULL,
	"score_eligible" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	CONSTRAINT "indicator_definitions_code_unique" UNIQUE("code"),
	CONSTRAINT "indicator_unit_value_type_unique" UNIQUE("indicator_id","unit","value_type"),
	CONSTRAINT "indicator_value_type_check" CHECK ("market_entry"."indicator_definitions"."value_type" in ('integer', 'decimal', 'percent', 'text', 'category')),
	CONSTRAINT "indicator_period_type_check" CHECK ("market_entry"."indicator_definitions"."period_type" in ('point', 'month', 'quarter', 'year', 'survey')),
	CONSTRAINT "indicator_polarity_check" CHECK ("market_entry"."indicator_definitions"."polarity" in ('higher', 'lower', 'neutral', 'context_only')),
	CONSTRAINT "indicator_score_check" CHECK ("market_entry"."indicator_definitions"."polarity" <> 'context_only' or not "market_entry"."indicator_definitions"."score_eligible"),
	CONSTRAINT "indicator_status_check" CHECK ("market_entry"."indicator_definitions"."status" in ('draft', 'active', 'retired')),
	CONSTRAINT "indicator_unit_check" CHECK (btrim("market_entry"."indicator_definitions"."unit") <> '')
);
--> statement-breakpoint
CREATE TABLE "market_entry"."observations" (
	"observation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"geo_id" uuid NOT NULL,
	"indicator_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"period_label" text NOT NULL,
	"value_numeric" numeric,
	"value_text" text,
	"value_type" text NOT NULL,
	"unit" text NOT NULL,
	"scope" text NOT NULL,
	"source_id" uuid NOT NULL,
	"dataset_version_id" uuid NOT NULL,
	"quality_status" text NOT NULL,
	"missing_reason" text,
	"verified_at" timestamp with time zone,
	"method_note" text,
	"limitations" text,
	CONSTRAINT "observations_natural_key" UNIQUE("geo_id","indicator_id","period_start","period_end","scope","dataset_version_id"),
	CONSTRAINT "observation_quality_check" CHECK ("market_entry"."observations"."quality_status" in ('verified', 'supported', 'unavailable')),
	CONSTRAINT "observation_missing_reason_check" CHECK ("market_entry"."observations"."missing_reason" is null or "market_entry"."observations"."missing_reason" in ('no_data', 'not_applicable', 'not_comparable', 'restricted')),
	CONSTRAINT "observation_period_check" CHECK ("market_entry"."observations"."period_end" >= "market_entry"."observations"."period_start"),
	CONSTRAINT "observation_scope_check" CHECK (btrim("market_entry"."observations"."scope") <> ''),
	CONSTRAINT "observations_value_check" CHECK (CASE
    WHEN "market_entry"."observations"."quality_status" = 'unavailable' THEN "market_entry"."observations"."value_numeric" IS NULL AND "market_entry"."observations"."value_text" IS NULL AND "market_entry"."observations"."missing_reason" IS NOT NULL
    WHEN "market_entry"."observations"."value_type" IN ('text', 'category') THEN "market_entry"."observations"."value_numeric" IS NULL AND "market_entry"."observations"."value_text" IS NOT NULL AND btrim("market_entry"."observations"."value_text") <> '' AND "market_entry"."observations"."missing_reason" IS NULL
    ELSE "market_entry"."observations"."value_numeric" IS NOT NULL AND "market_entry"."observations"."value_text" IS NULL AND "market_entry"."observations"."missing_reason" IS NULL
      AND "market_entry"."observations"."value_numeric" > '-Infinity'::numeric AND "market_entry"."observations"."value_numeric" < 'Infinity'::numeric
      AND ("market_entry"."observations"."value_type" <> 'integer' OR "market_entry"."observations"."value_numeric" = trunc("market_entry"."observations"."value_numeric"))
      AND ("market_entry"."observations"."value_type" <> 'percent' OR "market_entry"."observations"."value_numeric" BETWEEN 0 AND 100)
    END)
);
--> statement-breakpoint
CREATE TABLE "market_entry"."source_registry" (
	"source_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publisher" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"source_type" text NOT NULL,
	"license" text NOT NULL,
	"access_right" text NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	"citation_text" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	CONSTRAINT "source_type_check" CHECK ("market_entry"."source_registry"."source_type" in ('official', 'survey', 'partner', 'model', 'manual')),
	CONSTRAINT "access_right_check" CHECK ("market_entry"."source_registry"."access_right" in ('public', 'internal', 'restricted')),
	CONSTRAINT "source_status_check" CHECK ("market_entry"."source_registry"."status" in ('active', 'expired', 'revoked')),
	CONSTRAINT "source_license_check" CHECK (btrim("market_entry"."source_registry"."license") <> '')
);
--> statement-breakpoint
ALTER TABLE "market_entry"."dataset_versions" ADD CONSTRAINT "dataset_versions_source_id_source_registry_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "market_entry"."source_registry"("source_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."geo_units" ADD CONSTRAINT "geo_units_geography_version_id_geography_versions_geography_version_id_fk" FOREIGN KEY ("geography_version_id") REFERENCES "market_entry"."geography_versions"("geography_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."geo_units" ADD CONSTRAINT "geo_units_parent_fkey" FOREIGN KEY ("parent_geo_id","geography_version_id","parent_level") REFERENCES "market_entry"."geo_units"("geo_id","geography_version_id","level") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."geography_versions" ADD CONSTRAINT "geography_versions_authority_source_id_source_registry_source_id_fk" FOREIGN KEY ("authority_source_id") REFERENCES "market_entry"."source_registry"("source_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."observations" ADD CONSTRAINT "observations_geo_id_geo_units_geo_id_fk" FOREIGN KEY ("geo_id") REFERENCES "market_entry"."geo_units"("geo_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."observations" ADD CONSTRAINT "observations_indicator_id_indicator_definitions_indicator_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "market_entry"."indicator_definitions"("indicator_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."observations" ADD CONSTRAINT "observations_source_id_source_registry_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "market_entry"."source_registry"("source_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."observations" ADD CONSTRAINT "observations_dataset_version_id_dataset_versions_dataset_version_id_fk" FOREIGN KEY ("dataset_version_id") REFERENCES "market_entry"."dataset_versions"("dataset_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."observations" ADD CONSTRAINT "observations_indicator_fkey" FOREIGN KEY ("indicator_id","unit","value_type") REFERENCES "market_entry"."indicator_definitions"("indicator_id","unit","value_type") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."observations" ADD CONSTRAINT "observations_dataset_source_fkey" FOREIGN KEY ("dataset_version_id","source_id") REFERENCES "market_entry"."dataset_versions"("dataset_version_id","source_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "geo_units_normalized_name_idx" ON "market_entry"."geo_units" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "geo_units_parent_idx" ON "market_entry"."geo_units" USING btree ("parent_geo_id");--> statement-breakpoint
CREATE INDEX "observations_indicator_period_idx" ON "market_entry"."observations" USING btree ("indicator_id","period_start","period_end");
