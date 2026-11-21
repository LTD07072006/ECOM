CREATE TABLE "market_entry"."inquiry_retention_runs" (
	"run_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text NOT NULL,
	"inquiries_processed" integer,
	"snapshots_processed" integer,
	CONSTRAINT "inquiry_retention_runs_status_check" CHECK ("market_entry"."inquiry_retention_runs"."status" in ('running', 'succeeded', 'failed'))
);
--> statement-breakpoint
CREATE INDEX "inquiry_retention_runs_started_idx" ON "market_entry"."inquiry_retention_runs" USING btree ("started_at");