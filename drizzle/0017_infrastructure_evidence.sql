ALTER TABLE "market_entry"."infrastructure_pois"
  ADD COLUMN "airport_classification" text,
  ADD COLUMN "operational_status" text,
  ADD COLUMN "port_type" text,
  ADD COLUMN "classification_source_url" text;
--> statement-breakpoint
ALTER TABLE "market_entry"."infrastructure_pois"
  ADD CONSTRAINT "infrastructure_pois_airport_classification_check"
  CHECK ("airport_classification" is null or "airport_classification" in ('international', 'domestic')); 
--> statement-breakpoint
ALTER TABLE "market_entry"."infrastructure_pois"
  ADD CONSTRAINT "infrastructure_pois_operational_status_check"
  CHECK ("operational_status" is null or "operational_status" in ('operational', 'planned', 'not_operational'));
--> statement-breakpoint
ALTER TABLE "market_entry"."infrastructure_pois"
  ADD CONSTRAINT "infrastructure_pois_port_type_check"
  CHECK ("port_type" is null or "port_type" in ('deep_sea', 'coastal', 'river', 'container_terminal'));
--> statement-breakpoint
ALTER TABLE "market_entry"."infrastructure_pois"
  ADD CONSTRAINT "infrastructure_pois_classification_source_url_check"
  CHECK ("classification_source_url" is null or "classification_source_url" ~ '^https://');
