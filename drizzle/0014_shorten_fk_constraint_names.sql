ALTER TABLE "market_entry"."entry_requirements" RENAME CONSTRAINT "entry_requirements_legal_reference_id_legal_references_legal_re" TO "entry_requirements_legal_reference_fkey";
--> statement-breakpoint
ALTER TABLE "market_entry"."geo_boundaries" RENAME CONSTRAINT "geo_boundaries_dataset_version_id_dataset_versions_dataset_vers" TO "geo_boundaries_dataset_version_fkey";
--> statement-breakpoint
ALTER TABLE "market_entry"."geo_units" RENAME CONSTRAINT "geo_units_geography_version_id_geography_versions_geography_ver" TO "geo_units_geography_version_fkey";
--> statement-breakpoint
ALTER TABLE "market_entry"."geography_versions" RENAME CONSTRAINT "geography_versions_authority_source_id_source_registry_source_i" TO "geography_versions_authority_source_fkey";
--> statement-breakpoint
ALTER TABLE "market_entry"."inquiry_notifications" RENAME CONSTRAINT "inquiry_notifications_inquiry_id_investor_inquiries_inquiry_id_" TO "inquiry_notifications_inquiry_fkey";
--> statement-breakpoint
ALTER TABLE "market_entry"."observations" RENAME CONSTRAINT "observations_dataset_version_id_dataset_versions_dataset_versio" TO "observations_dataset_version_fkey";
--> statement-breakpoint
ALTER TABLE "market_entry"."release_members" RENAME CONSTRAINT "release_members_dataset_version_id_dataset_versions_dataset_ver" TO "release_members_dataset_version_fkey";
