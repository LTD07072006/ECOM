CREATE TABLE "market_entry"."inquiry_audit" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"note" text,
	"happened_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiry_audit_action_check" CHECK ("market_entry"."inquiry_audit"."action" in ('submitted', 'status_changed', 'note_added', 'anonymized')),
	CONSTRAINT "inquiry_audit_note_length_check" CHECK ("market_entry"."inquiry_audit"."note" is null or length("market_entry"."inquiry_audit"."note") between 1 and 5000)
);
--> statement-breakpoint
CREATE TABLE "market_entry"."investor_inquiries" (
	"inquiry_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_code" text NOT NULL,
	"email" text,
	"message" text,
	"name" text,
	"organization" text,
	"country" text,
	"sector" text,
	"geography_ids" uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
	"provenance" jsonb NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"close_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retention_at" timestamp with time zone NOT NULL,
	"anonymized_at" timestamp with time zone,
	CONSTRAINT "investor_inquiries_reference_code_unique" UNIQUE("reference_code"),
	CONSTRAINT "inquiry_status_check" CHECK ("market_entry"."investor_inquiries"."status" in ('new', 'contacted', 'qualified', 'closed')),
	CONSTRAINT "inquiry_close_reason_check" CHECK ("market_entry"."investor_inquiries"."close_reason" is null or "market_entry"."investor_inquiries"."close_reason" in ('spam', 'duplicate', 'out_of_scope', 'resolved')),
	CONSTRAINT "inquiry_closed_reason_required_check" CHECK (("market_entry"."investor_inquiries"."status" = 'closed') = ("market_entry"."investor_inquiries"."close_reason" is not null)),
	CONSTRAINT "inquiry_email_length_check" CHECK ("market_entry"."investor_inquiries"."email" is null or length("market_entry"."investor_inquiries"."email") between 3 and 254),
	CONSTRAINT "inquiry_message_length_check" CHECK ("market_entry"."investor_inquiries"."message" is null or length("market_entry"."investor_inquiries"."message") between 10 and 5000)
);
--> statement-breakpoint
ALTER TABLE "market_entry"."inquiry_audit" ADD CONSTRAINT "inquiry_audit_inquiry_id_investor_inquiries_inquiry_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "market_entry"."investor_inquiries"("inquiry_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inquiry_audit_inquiry_happened_idx" ON "market_entry"."inquiry_audit" USING btree ("inquiry_id","happened_at");--> statement-breakpoint
CREATE INDEX "investor_inquiries_status_updated_idx" ON "market_entry"."investor_inquiries" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "investor_inquiries_geography_ids_idx" ON "market_entry"."investor_inquiries" USING gin ("geography_ids");
