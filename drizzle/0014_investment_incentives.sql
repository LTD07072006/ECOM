CREATE TABLE "market_entry"."investment_incentives" (
	"incentive_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"legal_reference_id" uuid NOT NULL,
	"sector" text,
	"geo_id" uuid,
	"zone_tier" text DEFAULT 'standard' NOT NULL,
	"incentive_type" text NOT NULL,
	"investor_type" text DEFAULT 'foreign_investor' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"title_vi" text NOT NULL,
	"title_en" text NOT NULL,
	"headline_benefit_vi" text NOT NULL,
	"headline_benefit_en" text NOT NULL,
	"description_vi" text NOT NULL,
	"description_en" text NOT NULL,
	"eligibility_note_vi" text NOT NULL,
	"eligibility_note_en" text NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"status" text DEFAULT 'published' NOT NULL,
	CONSTRAINT "investment_incentives_code_unique" UNIQUE("code"),
	CONSTRAINT "investment_incentives_sector_check" CHECK ("market_entry"."investment_incentives"."sector" is null or "market_entry"."investment_incentives"."sector" in ('retail', 'manufacturing', 'logistics', 'enterprise')),
	CONSTRAINT "investment_incentives_zone_tier_check" CHECK ("market_entry"."investment_incentives"."zone_tier" in ('special_difficult_area', 'difficult_area', 'economic_zone_hightech', 'industrial_park', 'sector_encouraged', 'standard')),
	CONSTRAINT "investment_incentives_type_check" CHECK ("market_entry"."investment_incentives"."incentive_type" in ('cit_rate_holiday', 'land_rent_exemption', 'import_duty_exemption', 'rd_accelerated_depreciation')),
	CONSTRAINT "investment_incentives_status_check" CHECK ("market_entry"."investment_incentives"."status" in ('draft', 'review', 'published', 'expired')),
	CONSTRAINT "investment_incentives_valid_dates_check" CHECK ("market_entry"."investment_incentives"."valid_to" is null or "market_entry"."investment_incentives"."valid_to" >= "market_entry"."investment_incentives"."valid_from")
);
--> statement-breakpoint
ALTER TABLE "market_entry"."investment_incentives" ADD CONSTRAINT "investment_incentives_legal_reference_id_legal_references_legal_reference_id_fk" FOREIGN KEY ("legal_reference_id") REFERENCES "market_entry"."legal_references"("legal_reference_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."investment_incentives" ADD CONSTRAINT "investment_incentives_geo_id_geo_units_geo_id_fk" FOREIGN KEY ("geo_id") REFERENCES "market_entry"."geo_units"("geo_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "investment_incentives_sector_geo_idx" ON "market_entry"."investment_incentives" USING btree ("sector","geo_id","status");