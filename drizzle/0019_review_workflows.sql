CREATE TABLE "market_entry"."site_verification_evidence" (
	"evidence_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"park_id" text NOT NULL,
	"field" text NOT NULL,
	"value" jsonb NOT NULL,
	"source_url" text NOT NULL,
	"verified_on" date NOT NULL,
	"expires_on" date,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"reviewer" text,
	"review_note" text,
	"reviewed_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_verification_evidence_key_unique" UNIQUE("park_id", "field"),
	CONSTRAINT "site_verification_evidence_url_check" CHECK ("source_url" ~ '^https://'),
	CONSTRAINT "site_verification_evidence_status_check" CHECK ("status" in ('unverified', 'pending_review', 'verified', 'expired')),
	CONSTRAINT "site_verification_evidence_dates_check" CHECK ("expires_on" is null or "expires_on" >= "verified_on"),
	CONSTRAINT "site_verification_evidence_field_check" CHECK ("field" in ('area', 'region', 'power', 'wastewater', 'sector', 'infrastructure')),
	CONSTRAINT "site_verification_evidence_note_check" CHECK ("review_note" is null or length("review_note") between 1 and 1000)
);
--> statement-breakpoint
CREATE INDEX "site_verification_evidence_status_idx" ON "market_entry"."site_verification_evidence" USING btree ("status", "expires_on");
--> statement-breakpoint
CREATE TABLE "market_entry"."site_verification_audit" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evidence_id" uuid NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"note" text,
	"happened_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_verification_audit_action_check" CHECK ("action" in ('created', 'approved', 'rejected', 'revalidated', 'expired')),
	CONSTRAINT "site_verification_audit_note_check" CHECK ("note" is null or length("note") between 1 and 1000)
);
--> statement-breakpoint
ALTER TABLE "market_entry"."site_verification_audit" ADD CONSTRAINT "site_verification_audit_evidence_fkey" FOREIGN KEY ("evidence_id") REFERENCES "market_entry"."site_verification_evidence"("evidence_id");
--> statement-breakpoint
ALTER TABLE "market_entry"."legal_references" ADD COLUMN "reviewed_by" text;
--> statement-breakpoint
ALTER TABLE "market_entry"."legal_references" ADD COLUMN "review_due_at" date;
--> statement-breakpoint
ALTER TABLE "market_entry"."entry_requirements" ADD COLUMN "reviewed_by" text;
--> statement-breakpoint
ALTER TABLE "market_entry"."entry_requirements" ADD COLUMN "review_due_at" date;
--> statement-breakpoint
CREATE TABLE "market_entry"."legal_readiness_audit" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"note" text NOT NULL,
	"happened_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legal_readiness_audit_entity_check" CHECK ("entity_type" in ('reference', 'requirement')),
	CONSTRAINT "legal_readiness_audit_action_check" CHECK ("action" in ('reviewed', 'revalidated', 'retired')),
	CONSTRAINT "legal_readiness_audit_note_check" CHECK (length("note") between 10 and 1000)
);
--> statement-breakpoint
CREATE INDEX "legal_readiness_audit_entity_idx" ON "market_entry"."legal_readiness_audit" USING btree ("entity_type", "entity_id", "happened_at");
