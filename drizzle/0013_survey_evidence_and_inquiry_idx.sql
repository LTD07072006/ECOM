CREATE TABLE "market_entry"."survey_aggregates" (
	"aggregate_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"geo_id" uuid NOT NULL,
	"sample_size" integer NOT NULL,
	"option_label" text NOT NULL,
	"value_percent" numeric,
	"value_numeric" numeric,
	"unit" text DEFAULT '%' NOT NULL,
	"quality_status" text DEFAULT 'verified' NOT NULL,
	CONSTRAINT "survey_aggregates_sample_size_check" CHECK ("market_entry"."survey_aggregates"."sample_size" >= 1),
	CONSTRAINT "survey_aggregates_percent_check" CHECK ("market_entry"."survey_aggregates"."value_percent" is null or ("market_entry"."survey_aggregates"."value_percent" >= 0 and "market_entry"."survey_aggregates"."value_percent" <= 100)),
	CONSTRAINT "survey_aggregates_quality_check" CHECK ("market_entry"."survey_aggregates"."quality_status" in ('verified', 'supported', 'unavailable'))
);
--> statement-breakpoint
CREATE TABLE "market_entry"."survey_questions" (
	"question_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_id" uuid NOT NULL,
	"question_code" text NOT NULL,
	"prompt_vi" text NOT NULL,
	"prompt_en" text NOT NULL,
	"response_type" text DEFAULT 'single_choice' NOT NULL,
	CONSTRAINT "survey_questions_study_code_unique" UNIQUE("study_id","question_code"),
	CONSTRAINT "survey_questions_response_type_check" CHECK ("market_entry"."survey_questions"."response_type" in ('single_choice', 'multi_choice', 'scale', 'numeric'))
);
--> statement-breakpoint
CREATE TABLE "market_entry"."survey_studies" (
	"study_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"sector" text NOT NULL,
	"title_vi" text NOT NULL,
	"title_en" text NOT NULL,
	"segment" text NOT NULL,
	"method" text NOT NULL,
	"sample_size" integer NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"period_label" text NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"publication_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "survey_studies_code_unique" UNIQUE("code"),
	CONSTRAINT "survey_studies_sector_check" CHECK ("market_entry"."survey_studies"."sector" in ('retail', 'manufacturing', 'logistics', 'enterprise')),
	CONSTRAINT "survey_studies_sample_size_check" CHECK ("market_entry"."survey_studies"."sample_size" >= 1),
	CONSTRAINT "survey_studies_period_check" CHECK ("market_entry"."survey_studies"."period_end" >= "market_entry"."survey_studies"."period_start"),
	CONSTRAINT "survey_studies_source_url_check" CHECK ("market_entry"."survey_studies"."source_url" is null or "market_entry"."survey_studies"."source_url" ~ '^https://'),
	CONSTRAINT "survey_studies_publication_status_check" CHECK ("market_entry"."survey_studies"."publication_status" in ('draft', 'published', 'retired'))
);
--> statement-breakpoint
ALTER TABLE "market_entry"."survey_aggregates" ADD CONSTRAINT "survey_aggregates_study_id_survey_studies_study_id_fk" FOREIGN KEY ("study_id") REFERENCES "market_entry"."survey_studies"("study_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."survey_aggregates" ADD CONSTRAINT "survey_aggregates_question_id_survey_questions_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "market_entry"."survey_questions"("question_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."survey_aggregates" ADD CONSTRAINT "survey_aggregates_geo_id_geo_units_geo_id_fk" FOREIGN KEY ("geo_id") REFERENCES "market_entry"."geo_units"("geo_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."survey_questions" ADD CONSTRAINT "survey_questions_study_id_survey_studies_study_id_fk" FOREIGN KEY ("study_id") REFERENCES "market_entry"."survey_studies"("study_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "survey_aggregates_study_geo_idx" ON "market_entry"."survey_aggregates" USING btree ("study_id","geo_id");--> statement-breakpoint
CREATE INDEX "survey_studies_sector_status_idx" ON "market_entry"."survey_studies" USING btree ("sector","publication_status");--> statement-breakpoint
CREATE INDEX "investor_inquiries_created_at_idx" ON "market_entry"."investor_inquiries" USING btree ("created_at");