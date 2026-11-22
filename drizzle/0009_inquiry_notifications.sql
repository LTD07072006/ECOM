CREATE TABLE "market_entry"."inquiry_notifications" (
	"notification_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "inquiry_notifications_inquiry_kind_key" UNIQUE("inquiry_id","kind"),
	CONSTRAINT "inquiry_notifications_kind_check" CHECK ("market_entry"."inquiry_notifications"."kind" in ('acknowledgement', 'steward_alert')),
	CONSTRAINT "inquiry_notifications_status_check" CHECK ("market_entry"."inquiry_notifications"."status" in ('pending', 'sent', 'failed', 'skipped')),
	CONSTRAINT "inquiry_notifications_locale_check" CHECK ("market_entry"."inquiry_notifications"."locale" in ('vi', 'en')),
	CONSTRAINT "inquiry_notifications_attempts_check" CHECK ("market_entry"."inquiry_notifications"."attempts" between 0 and 10)
);
--> statement-breakpoint
ALTER TABLE "market_entry"."inquiry_notifications" ADD CONSTRAINT "inquiry_notifications_inquiry_id_investor_inquiries_inquiry_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "market_entry"."investor_inquiries"("inquiry_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inquiry_notifications_status_created_idx" ON "market_entry"."inquiry_notifications" USING btree ("status","created_at");