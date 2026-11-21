CREATE TABLE "market_entry"."api_client_quotas" (
  "route" text NOT NULL,
  "client_key" text NOT NULL,
  "window_start" timestamptz NOT NULL,
  "requests" integer NOT NULL,
  PRIMARY KEY ("route", "client_key")
);
--> statement-breakpoint
CREATE INDEX "api_client_quotas_window_idx" ON "market_entry"."api_client_quotas" ("window_start");
--> statement-breakpoint
ALTER TABLE "market_entry"."inquiry_audit" ADD COLUMN "notice_version" text;
--> statement-breakpoint
CREATE TABLE "market_entry"."inquiry_snapshot_privacy_key" (
  "id" boolean PRIMARY KEY DEFAULT true,
  "key" bytea NOT NULL,
  CONSTRAINT "inquiry_snapshot_privacy_key_id_check" CHECK ("id")
);
--> statement-breakpoint
INSERT INTO "market_entry"."inquiry_snapshot_privacy_key" ("key") VALUES (gen_random_bytes(32));
--> statement-breakpoint
CREATE FUNCTION "market_entry"."protect_inquiry_snapshot_filters"(input jsonb) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT (input - ARRAY['country', 'sector', 'referenceCode']) ||
    COALESCE((
      SELECT jsonb_build_object('protectedFilters', jsonb_object_agg(field,
        encode(public.hmac(convert_to(field || ':' || CASE WHEN field = 'referenceCode'
          THEN btrim(value) ELSE lower(btrim(value)) END, 'UTF8'), secret.key, 'sha256'), 'hex')))
      FROM jsonb_each_text(input) AS entry(field, value)
      CROSS JOIN market_entry.inquiry_snapshot_privacy_key AS secret
      WHERE field IN ('country', 'sector', 'referenceCode') AND btrim(value) <> ''
      HAVING count(*) > 0
    ), '{}'::jsonb)
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "market_entry"."protect_inquiry_snapshot_filters"(jsonb) FROM PUBLIC;
--> statement-breakpoint
UPDATE "market_entry"."inquiry_report_snapshots"
SET "filters" = "market_entry"."protect_inquiry_snapshot_filters"("filters"),
    "metrics" = "metrics" || '{"byCountry":{},"bySector":{}}'::jsonb;
--> statement-breakpoint
UPDATE "market_entry"."investor_inquiries"
SET "retention_at" = ("updated_at" AT TIME ZONE 'UTC' + interval '1 year') AT TIME ZONE 'UTC'
WHERE "anonymized_at" IS NULL;
--> statement-breakpoint
UPDATE "market_entry"."inquiry_audit" AS event SET "note" = NULL
FROM "market_entry"."investor_inquiries" AS inquiry
WHERE inquiry.inquiry_id = event.inquiry_id AND inquiry.anonymized_at IS NOT NULL AND event.note IS NOT NULL;
