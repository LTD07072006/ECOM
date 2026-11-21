ALTER TABLE "market_entry"."inquiry_report_snapshots"
  ADD COLUMN "time_zone" text DEFAULT 'UTC' NOT NULL,
  ADD COLUMN "formula_version" text NOT NULL DEFAULT 'inquiry-funnel-v3',
  ADD COLUMN "corrects_snapshot_id" uuid,
  ADD COLUMN "retention_at" timestamp with time zone NOT NULL DEFAULT (now() + interval '2 years');
--> statement-breakpoint
ALTER TABLE "market_entry"."inquiry_report_snapshots"
  ADD CONSTRAINT "inquiry_report_snapshots_corrects_fk" FOREIGN KEY ("corrects_snapshot_id") REFERENCES "market_entry"."inquiry_report_snapshots"("snapshot_id");
--> statement-breakpoint
CREATE TABLE "market_entry"."inquiry_report_snapshot_audit" (
  "event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "snapshot_id" uuid NOT NULL,
  "actor" text NOT NULL,
  "action" text NOT NULL,
  "happened_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inquiry_report_snapshot_audit_action_check" CHECK ("market_entry"."inquiry_report_snapshot_audit"."action" in ('created', 'exported', 'compared'))
);
--> statement-breakpoint
ALTER TABLE "market_entry"."inquiry_report_snapshot_audit" ADD CONSTRAINT "inquiry_report_snapshot_audit_snapshot_fk" FOREIGN KEY ("snapshot_id") REFERENCES "market_entry"."inquiry_report_snapshots"("snapshot_id");
--> statement-breakpoint
CREATE INDEX "inquiry_report_snapshot_audit_snapshot_idx" ON "market_entry"."inquiry_report_snapshot_audit" USING btree ("snapshot_id", "happened_at");
