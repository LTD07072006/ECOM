CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "geo_units_normalized_name_trgm_idx" ON "market_entry"."geo_units" USING gin ("normalized_name" gin_trgm_ops);
