import { databasePool } from "../../db/pool";
import { safeSourceUrl } from "../../lib/source-url";
import {
	canonicalInvestmentOpportunities,
	filterOpportunities,
	type InvestmentOpportunityItem,
	type OpportunityLegalStatus,
	type OpportunityReadiness,
	type OpportunityType,
} from "./investment-opportunities";
import type { SectorId } from "./model";

type OpportunityRow = {
	opportunity_id: string;
	code: string;
	province_code: string;
	province_name: string | null;
	sector: SectorId;
	opportunity_type: OpportunityType;
	title_vi: string;
	title_en: string;
	description_vi: string;
	description_en: string;
	total_area_ha: string | null;
	available_area_ha: string | null;
	occupancy_percent: string | null;
	investment_min_usd_m: string | null;
	investment_max_usd_m: string | null;
	power_capacity_mw: string | null;
	wastewater_m3_day: string | null;
	readiness_status: OpportunityReadiness;
	legal_status: OpportunityLegalStatus;
	official_url: string;
};

export async function loadInvestmentOpportunities(options?: {
	sector?: SectorId;
	provinceCodes?: readonly string[];
}): Promise<InvestmentOpportunityItem[]> {
	try {
		const rows = await databasePool()<OpportunityRow[]>`
      select
        opp.opportunity_id,
        opp.code,
        opp.province_code,
        max(geo.display_name) as province_name,
        opp.sector,
        opp.opportunity_type,
        opp.title_vi,
        opp.title_en,
        opp.description_vi,
        opp.description_en,
        opp.total_area_ha::text,
        opp.available_area_ha::text,
        opp.occupancy_percent::text,
        opp.investment_min_usd_m::text,
        opp.investment_max_usd_m::text,
        opp.power_capacity_mw::text,
        opp.wastewater_m3_day::text,
        opp.readiness_status,
        opp.legal_status,
        opp.official_url
      from market_entry.investment_opportunities as opp
      left join market_entry.geo_units as geo
        on geo.admin_code = opp.province_code and geo.level = 'province'
      where opp.status = 'published'
      group by opp.opportunity_id
      order by opp.province_code asc, opp.code asc
    `;

		const sourceItems: InvestmentOpportunityItem[] =
			rows.length > 0
				? rows.map((row) => ({
						id: row.opportunity_id,
						code: row.code,
						provinceCode: row.province_code,
						provinceName: row.province_name ?? row.province_code,
						sector: row.sector,
						opportunityType: row.opportunity_type,
						title: { vi: row.title_vi, en: row.title_en },
						description: { vi: row.description_vi, en: row.description_en },
						totalAreaHa: Number(row.total_area_ha ?? 0),
						availableAreaHa: Number(row.available_area_ha ?? 0),
						occupancyPercent: Number(row.occupancy_percent ?? 0),
						investmentMinUsdM:
							row.investment_min_usd_m === null
								? null
								: Number(row.investment_min_usd_m),
						investmentMaxUsdM:
							row.investment_max_usd_m === null
								? null
								: Number(row.investment_max_usd_m),
						powerCapacityMw:
							row.power_capacity_mw === null
								? null
								: Number(row.power_capacity_mw),
						wastewaterM3Day:
							row.wastewater_m3_day === null
								? null
								: Number(row.wastewater_m3_day),
						readinessStatus: row.readiness_status,
						legalStatus: row.legal_status,
						officialUrl: safeSourceUrl(row.official_url) ?? row.official_url,
					}))
				: [...canonicalInvestmentOpportunities];

		return filterOpportunities(sourceItems, options ?? {});
	} catch {
		return filterOpportunities(canonicalInvestmentOpportunities, options ?? {});
	}
}
