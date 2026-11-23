CREATE TABLE "market_entry"."inquiry_access_audit" (
	"access_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"inquiry_id" uuid,
	"row_count" integer,
	"ticket_ref" text,
	"happened_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "inquiry_access_audit_action_check" CHECK ("market_entry"."inquiry_access_audit"."action" in ('viewed_detail', 'exported_live_csv', 'erased_by_request', 'consent_withdrawn')),
	CONSTRAINT "inquiry_access_audit_row_count_check" CHECK ("market_entry"."inquiry_access_audit"."row_count" is null or "market_entry"."inquiry_access_audit"."row_count" >= 0),
	CONSTRAINT "inquiry_access_audit_ticket_ref_check" CHECK ("market_entry"."inquiry_access_audit"."ticket_ref" is null or char_length("market_entry"."inquiry_access_audit"."ticket_ref") between 3 and 64)
);
--> statement-breakpoint
ALTER TABLE "market_entry"."inquiry_access_audit" ADD CONSTRAINT "inquiry_access_audit_inquiry_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "market_entry"."investor_inquiries"("inquiry_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inquiry_access_audit_happened_idx" ON "market_entry"."inquiry_access_audit" USING btree ("happened_at");
--> statement-breakpoint
UPDATE "market_entry"."investor_inquiries"
SET "retention_at" = LEAST("retention_at", ("created_at" AT TIME ZONE 'UTC' + interval '2 years') AT TIME ZONE 'UTC')
WHERE "anonymized_at" IS NULL;
