import { databasePool } from "../../db/pool";
import { safeSourceUrl } from "../../lib/source-url";
import {
	canonicalInvestmentIncentives,
	type IncentiveType,
	type IncentiveZoneTier,
	type InvestmentIncentiveItem,
} from "./investment-incentives";
import { seedDefaultLegalReadiness } from "./legal-readiness-repository";
import type { SectorId } from "./model";

type IncentiveRow = {
	incentive_id: string;
	code: string;
	sector: SectorId | null;
	geo_id: string | null;
	zone_tier: IncentiveZoneTier;
	incentive_type: IncentiveType;
	investor_type: string;
	display_order: number;
	title_vi: string;
	title_en: string;
	headline_benefit_vi: string;
	headline_benefit_en: string;
	description_vi: string;
	description_en: string;
	eligibility_note_vi: string;
	eligibility_note_en: string;
	valid_from: string;
	valid_to: string | null;
	document_code: string;
	ref_title_vi: string;
	ref_title_en: string;
	issuing_authority_vi: string;
	issuing_authority_en: string;
	official_url: string;
};

export async function loadInvestmentIncentives(
	sector?: SectorId,
): Promise<InvestmentIncentiveItem[]> {
	try {
		const rows = await databasePool()<IncentiveRow[]>`
      select
        inc.incentive_id,
        inc.code,
        inc.sector,
        inc.geo_id,
        inc.zone_tier,
        inc.incentive_type,
        inc.investor_type,
        inc.display_order,
        inc.title_vi,
        inc.title_en,
        inc.headline_benefit_vi,
        inc.headline_benefit_en,
        inc.description_vi,
        inc.description_en,
        inc.eligibility_note_vi,
        inc.eligibility_note_en,
        inc.valid_from::text,
        inc.valid_to::text,
        ref.document_code,
        ref.title_vi as ref_title_vi,
        ref.title_en as ref_title_en,
        ref.issuing_authority_vi,
        ref.issuing_authority_en,
        ref.official_url
      from market_entry.investment_incentives as inc
      join market_entry.legal_references as ref
        on ref.legal_reference_id = inc.legal_reference_id
      where inc.status = 'published'
        and ref.status <> 'repealed'
        and (${sector ?? null}::text is null or inc.sector is null or inc.sector = ${sector ?? null})
      order by inc.display_order asc, inc.code asc
    `;

		if (rows.length === 0) {
			return canonicalInvestmentIncentives.filter(
				(item) => !sector || item.sector === null || item.sector === sector,
			);
		}

		return rows.map((row) => ({
			id: row.incentive_id,
			code: row.code,
			sector: row.sector,
			geoId: row.geo_id,
			zoneTier: row.zone_tier,
			incentiveType: row.incentive_type,
			investorType: row.investor_type,
			displayOrder: row.display_order,
			title: { vi: row.title_vi, en: row.title_en },
			headlineBenefit: {
				vi: row.headline_benefit_vi,
				en: row.headline_benefit_en,
			},
			description: { vi: row.description_vi, en: row.description_en },
			eligibilityNote: {
				vi: row.eligibility_note_vi,
				en: row.eligibility_note_en,
			},
			validFrom: row.valid_from,
			validTo: row.valid_to,
			reference: {
				documentCode: row.document_code,
				title: { vi: row.ref_title_vi, en: row.ref_title_en },
				issuingAuthority: {
					vi: row.issuing_authority_vi,
					en: row.issuing_authority_en,
				},
				officialUrl: safeSourceUrl(row.official_url) ?? row.official_url,
			},
		}));
	} catch {
		return canonicalInvestmentIncentives.filter(
			(item) => !sector || item.sector === null || item.sector === sector,
		);
	}
}

export async function seedDefaultInvestmentIncentives() {
	await seedDefaultLegalReadiness();
	const sql = databasePool();
	return sql.begin(async (tx) => {
		const refs = await tx<
			{ legal_reference_id: string; document_code: string }[]
		>`
      select legal_reference_id, document_code from market_entry.legal_references
    `;
		const refIdByCode = new Map(
			refs.map((row) => [row.document_code, row.legal_reference_id]),
		);

		let count = 0;
		for (const item of canonicalInvestmentIncentives) {
			const legalReferenceId = refIdByCode.get(item.reference.documentCode);
			if (!legalReferenceId) continue;
			await tx`
        insert into market_entry.investment_incentives (
          code, legal_reference_id, sector, geo_id, zone_tier, incentive_type,
          investor_type, display_order, title_vi, title_en,
          headline_benefit_vi, headline_benefit_en,
          description_vi, description_en,
          eligibility_note_vi, eligibility_note_en,
          valid_from, valid_to, status
        )
        values (
          ${item.code}, ${legalReferenceId}, ${item.sector}, ${item.geoId},
          ${item.zoneTier}, ${item.incentiveType}, ${item.investorType},
          ${item.displayOrder}, ${item.title.vi}, ${item.title.en},
          ${item.headlineBenefit.vi}, ${item.headlineBenefit.en},
          ${item.description.vi}, ${item.description.en},
          ${item.eligibilityNote.vi}, ${item.eligibilityNote.en},
          ${item.validFrom}::date, ${item.validTo}::date, 'published'
        )
        on conflict (code) do update set
          legal_reference_id = excluded.legal_reference_id,
          sector = excluded.sector,
          zone_tier = excluded.zone_tier,
          incentive_type = excluded.incentive_type,
          display_order = excluded.display_order,
          title_vi = excluded.title_vi,
          title_en = excluded.title_en,
          headline_benefit_vi = excluded.headline_benefit_vi,
          headline_benefit_en = excluded.headline_benefit_en,
          description_vi = excluded.description_vi,
          description_en = excluded.description_en,
          eligibility_note_vi = excluded.eligibility_note_vi,
          eligibility_note_en = excluded.eligibility_note_en,
          valid_from = excluded.valid_from,
          valid_to = excluded.valid_to,
          status = 'published'
      `;
			count += 1;
		}
		return { incentives: count };
	});
}
