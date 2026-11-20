CREATE TABLE "market_entry"."geo_boundaries" (
	"geo_id" uuid NOT NULL,
	"dataset_version_id" uuid NOT NULL,
	"geom" geometry NOT NULL,
	CONSTRAINT "geo_boundaries_geo_id_dataset_version_id_pk" PRIMARY KEY("geo_id","dataset_version_id"),
	CONSTRAINT "geo_boundaries_geometry_check" CHECK (ST_SRID("market_entry"."geo_boundaries"."geom") = 4326 AND ST_NDims("market_entry"."geo_boundaries"."geom") = 2
    AND ST_GeometryType("market_entry"."geo_boundaries"."geom") IN ('ST_Polygon', 'ST_MultiPolygon')
    AND NOT ST_IsEmpty("market_entry"."geo_boundaries"."geom") AND ST_IsValid("market_entry"."geo_boundaries"."geom"))
);
--> statement-breakpoint
ALTER TABLE "market_entry"."dataset_versions" ADD COLUMN "owner_name" text;--> statement-breakpoint
ALTER TABLE "market_entry"."dataset_versions" ADD COLUMN "data_as_of" date;--> statement-breakpoint
ALTER TABLE "market_entry"."dataset_versions" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "market_entry"."dataset_versions" ADD COLUMN "review_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "market_entry"."dataset_versions" ADD COLUMN "publication_status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "market_entry"."geo_units" ADD COLUMN "geometry_status" text DEFAULT 'point_only' NOT NULL;--> statement-breakpoint
ALTER TABLE "market_entry"."geography_versions" ADD COLUMN "dataset_version_id" uuid;--> statement-breakpoint
ALTER TABLE "market_entry"."geo_boundaries" ADD CONSTRAINT "geo_boundaries_geo_id_geo_units_geo_id_fk" FOREIGN KEY ("geo_id") REFERENCES "market_entry"."geo_units"("geo_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."geo_boundaries" ADD CONSTRAINT "geo_boundaries_dataset_version_id_dataset_versions_dataset_version_id_fk" FOREIGN KEY ("dataset_version_id") REFERENCES "market_entry"."dataset_versions"("dataset_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."geography_versions" ADD CONSTRAINT "geography_dataset_source_fkey" FOREIGN KEY ("dataset_version_id","authority_source_id") REFERENCES "market_entry"."dataset_versions"("dataset_version_id","source_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."dataset_versions" ADD CONSTRAINT "dataset_publication_status_check" CHECK ("market_entry"."dataset_versions"."publication_status" in ('draft', 'validated', 'published', 'retired'));--> statement-breakpoint
ALTER TABLE "market_entry"."dataset_versions" ADD CONSTRAINT "dataset_review_dates_check" CHECK ("market_entry"."dataset_versions"."review_due_at" >= "market_entry"."dataset_versions"."reviewed_at");--> statement-breakpoint
ALTER TABLE "market_entry"."dataset_versions" ADD CONSTRAINT "dataset_validation_metadata_check" CHECK ("market_entry"."dataset_versions"."publication_status" not in ('validated', 'published') or (
    nullif(btrim("market_entry"."dataset_versions"."owner_name"), '') is not null and "market_entry"."dataset_versions"."data_as_of" is not null
    and "market_entry"."dataset_versions"."reviewed_at" is not null and "market_entry"."dataset_versions"."review_due_at" is not null
    and ("market_entry"."dataset_versions"."checksum" ~ '^[a-f0-9]{64}$') is true
  ));--> statement-breakpoint
ALTER TABLE "market_entry"."dataset_versions" ADD CONSTRAINT "dataset_publication_date_check" CHECK ("market_entry"."dataset_versions"."publication_status" <> 'published' or "market_entry"."dataset_versions"."published_at" is not null);--> statement-breakpoint
ALTER TABLE "market_entry"."geo_units" ADD CONSTRAINT "geo_geometry_status_check" CHECK ("market_entry"."geo_units"."geometry_status" in ('not_available', 'point_only', 'boundary_available', 'boundary_verified', 'restricted'));