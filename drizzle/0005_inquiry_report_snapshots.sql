CREATE TABLE "market_entry"."inquiry_report_snapshots" (
  "snapshot_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "period_start" timestamp with time zone NOT NULL,
  "period_end" timestamp with time zone NOT NULL,
  "filters" jsonb NOT NULL,
  "metrics" jsonb NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "inquiry_report_snapshots_period_idx" ON "market_entry"."inquiry_report_snapshots" USING btree ("period_start", "period_end");
