CREATE TABLE "market_entry"."infrastructure_pois" (
	"dataset_version_id" uuid NOT NULL,
	"geo_id" uuid NOT NULL,
	"source_key" text NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"kind" text NOT NULL,
	"reference_url" text NOT NULL,
	"geom" geometry NOT NULL,
	CONSTRAINT "infrastructure_pois_dataset_version_id_source_key_pk" PRIMARY KEY("dataset_version_id","source_key"),
	CONSTRAINT "infrastructure_pois_kind_check" CHECK ("market_entry"."infrastructure_pois"."kind" = 'airport'),
	CONSTRAINT "infrastructure_pois_point_check" CHECK (CASE WHEN ST_SRID("market_entry"."infrastructure_pois"."geom") = 4326
    AND ST_NDims("market_entry"."infrastructure_pois"."geom") = 2 AND ST_GeometryType("market_entry"."infrastructure_pois"."geom") = 'ST_Point' AND NOT ST_IsEmpty("market_entry"."infrastructure_pois"."geom")
    THEN ST_X("market_entry"."infrastructure_pois"."geom") BETWEEN -180 AND 180 AND ST_Y("market_entry"."infrastructure_pois"."geom") BETWEEN -90 AND 90 ELSE false END)
);
--> statement-breakpoint
ALTER TABLE "market_entry"."infrastructure_pois" ADD CONSTRAINT "infrastructure_pois_dataset_fkey" FOREIGN KEY ("dataset_version_id") REFERENCES "market_entry"."dataset_versions"("dataset_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."infrastructure_pois" ADD CONSTRAINT "infrastructure_pois_geo_fkey" FOREIGN KEY ("geo_id") REFERENCES "market_entry"."geo_units"("geo_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "infrastructure_pois_geo_idx" ON "market_entry"."infrastructure_pois" USING btree ("geo_id");