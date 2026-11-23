CREATE TABLE "market_entry"."investment_contacts" (
	"contact_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"organization_vi" text NOT NULL,
	"organization_en" text NOT NULL,
	"department_vi" text NOT NULL,
	"department_en" text NOT NULL,
	"sector" text,
	"geo_id" uuid,
	"province_code" text,
	"public_email" text NOT NULL,
	"official_url" text NOT NULL,
	"routing_priority" integer DEFAULT 100 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	CONSTRAINT "investment_contacts_code_unique" UNIQUE("code"),
	CONSTRAINT "investment_contacts_sector_check" CHECK ("market_entry"."investment_contacts"."sector" is null or "market_entry"."investment_contacts"."sector" in ('retail', 'manufacturing', 'logistics', 'enterprise')),
	CONSTRAINT "investment_contacts_priority_check" CHECK ("market_entry"."investment_contacts"."routing_priority" > 0),
	CONSTRAINT "investment_contacts_url_check" CHECK ("market_entry"."investment_contacts"."official_url" ~ '^https://'),
	CONSTRAINT "investment_contacts_status_check" CHECK ("market_entry"."investment_contacts"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
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
CREATE TABLE "market_entry"."investment_opportunities" (
	"opportunity_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"geo_id" uuid,
	"province_code" text NOT NULL,
	"sector" text NOT NULL,
	"opportunity_type" text NOT NULL,
	"title_vi" text NOT NULL,
	"title_en" text NOT NULL,
	"description_vi" text NOT NULL,
	"description_en" text NOT NULL,
	"total_area_ha" numeric,
	"available_area_ha" numeric,
	"occupancy_percent" numeric,
	"investment_min_usd_m" numeric,
	"investment_max_usd_m" numeric,
	"power_capacity_mw" numeric,
	"wastewater_m3_day" numeric,
	"readiness_status" text DEFAULT 'available' NOT NULL,
	"legal_status" text DEFAULT 'source_recorded' NOT NULL,
	"official_url" text NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	CONSTRAINT "investment_opportunities_code_unique" UNIQUE("code"),
	CONSTRAINT "investment_opportunities_sector_check" CHECK ("market_entry"."investment_opportunities"."sector" in ('retail', 'manufacturing', 'logistics', 'enterprise')),
	CONSTRAINT "investment_opportunities_type_check" CHECK ("market_entry"."investment_opportunities"."opportunity_type" in ('industrial_park', 'high_tech_park', 'logistics_hub', 'project')),
	CONSTRAINT "investment_opportunities_occupancy_check" CHECK ("market_entry"."investment_opportunities"."occupancy_percent" is null or ("market_entry"."investment_opportunities"."occupancy_percent" >= 0 and "market_entry"."investment_opportunities"."occupancy_percent" <= 100)),
	CONSTRAINT "investment_opportunities_readiness_check" CHECK ("market_entry"."investment_opportunities"."readiness_status" in ('early_stage', 'available', 'under_review', 'closed')),
	CONSTRAINT "investment_opportunities_legal_check" CHECK ("market_entry"."investment_opportunities"."legal_status" in ('not_reviewed', 'source_recorded', 'needs_check', 'verified_separately')),
	CONSTRAINT "investment_opportunities_status_check" CHECK ("market_entry"."investment_opportunities"."status" in ('draft', 'review', 'published', 'expired', 'archived')),
	CONSTRAINT "investment_opportunities_url_check" CHECK ("market_entry"."investment_opportunities"."official_url" ~ '^https://')
);
--> statement-breakpoint
ALTER TABLE "market_entry"."investor_inquiries" ADD COLUMN "scenario_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "market_entry"."investment_contacts" ADD CONSTRAINT "investment_contacts_geo_id_geo_units_geo_id_fk" FOREIGN KEY ("geo_id") REFERENCES "market_entry"."geo_units"("geo_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."investment_incentives" ADD CONSTRAINT "investment_incentives_legal_reference_id_legal_references_legal_reference_id_fk" FOREIGN KEY ("legal_reference_id") REFERENCES "market_entry"."legal_references"("legal_reference_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."investment_incentives" ADD CONSTRAINT "investment_incentives_geo_id_geo_units_geo_id_fk" FOREIGN KEY ("geo_id") REFERENCES "market_entry"."geo_units"("geo_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_entry"."investment_opportunities" ADD CONSTRAINT "investment_opportunities_geo_id_geo_units_geo_id_fk" FOREIGN KEY ("geo_id") REFERENCES "market_entry"."geo_units"("geo_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "investment_contacts_routing_idx" ON "market_entry"."investment_contacts" USING btree ("province_code","sector","routing_priority");--> statement-breakpoint
CREATE INDEX "investment_incentives_sector_geo_idx" ON "market_entry"."investment_incentives" USING btree ("sector","geo_id","status");--> statement-breakpoint
CREATE INDEX "investment_opportunities_prov_sector_idx" ON "market_entry"."investment_opportunities" USING btree ("province_code","sector","status");