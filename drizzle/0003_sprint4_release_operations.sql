CREATE TABLE "market_entry"."api_quotas" (
	"route" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"requests" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_entry"."release_audit" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"action" text NOT NULL,
	"actor" text NOT NULL,
	"note" text,
	"happened_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "release_audit_batch_action_unique" UNIQUE("batch_id","action"),
	CONSTRAINT "release_audit_action_check" CHECK ("market_entry"."release_audit"."action" in ('import', 'approve', 'publish', 'retire', 'local_publish'))
);
--> statement-breakpoint
CREATE TABLE "market_entry"."release_batches" (
	"batch_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"geography_code" text NOT NULL,
	"fingerprint" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "release_batches_fingerprint_unique" UNIQUE("fingerprint"),
	CONSTRAINT "release_batch_kind_check" CHECK ("market_entry"."release_batches"."kind" in ('foundation', 'wave2'))
);
--> statement-breakpoint
CREATE TABLE "market_entry"."release_members" (
	"batch_id" uuid NOT NULL,
	"dataset_version_id" uuid NOT NULL,
	CONSTRAINT "release_members_batch_id_dataset_version_id_pk" PRIMARY KEY("batch_id","dataset_version_id")
);
--> statement-breakpoint
ALTER TABLE "market_entry"."release_audit" ADD CONSTRAINT "release_audit_batch_id_release_batches_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "market_entry"."release_batches"("batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."release_members" ADD CONSTRAINT "release_members_batch_id_release_batches_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "market_entry"."release_batches"("batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."release_members" ADD CONSTRAINT "release_members_dataset_version_id_dataset_versions_dataset_version_id_fk" FOREIGN KEY ("dataset_version_id") REFERENCES "market_entry"."dataset_versions"("dataset_version_id") ON DELETE no action ON UPDATE no action;