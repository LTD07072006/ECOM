CREATE TABLE "market_entry"."entry_requirements" (
	"requirement_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"legal_reference_id" uuid NOT NULL,
	"sector" text NOT NULL,
	"geo_id" uuid,
	"investor_type" text DEFAULT 'foreign_investor' NOT NULL,
	"channel" text DEFAULT 'both' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"title_vi" text NOT NULL,
	"title_en" text NOT NULL,
	"checklist_item_vi" text NOT NULL,
	"checklist_item_en" text NOT NULL,
	"review_status" text DEFAULT 'to_verify' NOT NULL,
	"advisory_note_vi" text,
	"advisory_note_en" text,
	CONSTRAINT "entry_requirements_code_unique" UNIQUE("code"),
	CONSTRAINT "entry_requirements_sector_check" CHECK ("market_entry"."entry_requirements"."sector" in ('retail', 'manufacturing', 'logistics', 'enterprise')),
	CONSTRAINT "entry_requirements_channel_check" CHECK ("market_entry"."entry_requirements"."channel" in ('online', 'offline', 'both')),
	CONSTRAINT "entry_requirements_review_status_check" CHECK ("market_entry"."entry_requirements"."review_status" in ('to_verify', 'needs_specialist_review', 'verified_by_counsel', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "market_entry"."legal_references" (
	"legal_reference_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_code" text NOT NULL,
	"title_vi" text NOT NULL,
	"title_en" text NOT NULL,
	"issuing_authority_vi" text NOT NULL,
	"issuing_authority_en" text NOT NULL,
	"issued_on" date NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"official_url" text NOT NULL,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"review_note" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legal_references_document_code_unique" UNIQUE("document_code"),
	CONSTRAINT "legal_references_url_check" CHECK ("market_entry"."legal_references"."official_url" ~ '^https://'),
	CONSTRAINT "legal_references_status_check" CHECK ("market_entry"."legal_references"."status" in ('pending_review', 'effective', 'partially_effective', 'expired', 'repealed')),
	CONSTRAINT "legal_references_effective_check" CHECK ("market_entry"."legal_references"."effective_to" is null or "market_entry"."legal_references"."effective_to" >= "market_entry"."legal_references"."effective_from")
);
--> statement-breakpoint
ALTER TABLE "market_entry"."inquiry_report_snapshots" ALTER COLUMN "time_zone" SET DEFAULT 'Asia/Ho_Chi_Minh';--> statement-breakpoint
ALTER TABLE "market_entry"."inquiry_report_snapshots" ALTER COLUMN "formula_version" SET DEFAULT 'inquiry-funnel-v4';--> statement-breakpoint
ALTER TABLE "market_entry"."entry_requirements" ADD CONSTRAINT "entry_requirements_legal_reference_id_legal_references_legal_reference_id_fk" FOREIGN KEY ("legal_reference_id") REFERENCES "market_entry"."legal_references"("legal_reference_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."entry_requirements" ADD CONSTRAINT "entry_requirements_geo_id_geo_units_geo_id_fk" FOREIGN KEY ("geo_id") REFERENCES "market_entry"."geo_units"("geo_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entry_requirements_sector_geo_idx" ON "market_entry"."entry_requirements" USING btree ("sector","geo_id");