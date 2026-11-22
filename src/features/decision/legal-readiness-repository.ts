import { databasePool } from "../../db/pool";
import { safeSourceUrl } from "../../lib/source-url";
import {
	canonicalLegalReferences,
	defaultLegalChecklistBySector,
	type LegalChecklistBySector,
	type LegalReadinessItem,
} from "./legal-readiness";
import type { SectorId } from "./model";

type LegalChecklistRow = {
	requirement_id: string;
	code: string;
	sector: SectorId;
	geo_id: string | null;
	investor_type: string;
	channel: "online" | "offline" | "both";
	display_order: number;
	title_vi: string;
	title_en: string;
	checklist_item_vi: string;
	checklist_item_en: string;
	review_status: LegalReadinessItem["reviewStatus"];
	advisory_note_vi: string | null;
	advisory_note_en: string | null;
	document_code: string;
	ref_title_vi: string;
	ref_title_en: string;
	issuing_authority_vi: string;
	issuing_authority_en: string;
	issued_on: string;
	effective_from: string;
	effective_to: string | null;
	official_url: string;
	ref_status: LegalReadinessItem["reference"]["status"];
};

const sectorIds: readonly SectorId[] = [
	"retail",
	"manufacturing",
	"logistics",
	"enterprise",
];

function cloneDefaults(): LegalChecklistBySector {
	return {
		retail: [...defaultLegalChecklistBySector.retail],
		manufacturing: [...defaultLegalChecklistBySector.manufacturing],
		logistics: [...defaultLegalChecklistBySector.logistics],
		enterprise: [...defaultLegalChecklistBySector.enterprise],
	};
}

export async function loadLegalChecklistBySector(): Promise<LegalChecklistBySector> {
	try {
		const rows = await databasePool()<LegalChecklistRow[]>`
      select
        req.requirement_id,
        req.code,
        req.sector,
        req.geo_id,
        req.investor_type,
        req.channel,
        req.display_order,
        req.title_vi,
        req.title_en,
        req.checklist_item_vi,
        req.checklist_item_en,
        req.review_status,
        req.advisory_note_vi,
        req.advisory_note_en,
        ref.document_code,
        ref.title_vi as ref_title_vi,
        ref.title_en as ref_title_en,
        ref.issuing_authority_vi,
        ref.issuing_authority_en,
        ref.issued_on::text,
        ref.effective_from::text,
        ref.effective_to::text,
        ref.official_url,
        ref.status as ref_status
      from market_entry.entry_requirements as req
      join market_entry.legal_references as ref
        on ref.legal_reference_id = req.legal_reference_id
      where req.review_status <> 'retired'
        and ref.status <> 'repealed'
      order by req.sector asc, req.display_order asc, req.code asc
    `;

		if (rows.length === 0) return cloneDefaults();

		const grouped: LegalChecklistBySector = {
			retail: [],
			manufacturing: [],
			logistics: [],
			enterprise: [],
		};

		for (const row of rows) {
			const safeUrl = safeSourceUrl(row.official_url);
			if (!safeUrl) continue;
			grouped[row.sector].push({
				id: row.requirement_id,
				code: row.code,
				sector: row.sector,
				geoId: row.geo_id,
				investorType: row.investor_type,
				channel: row.channel,
				displayOrder: row.display_order,
				title: { vi: row.title_vi, en: row.title_en },
				checklistItem: {
					vi: row.checklist_item_vi,
					en: row.checklist_item_en,
				},
				advisoryNote:
					row.advisory_note_vi && row.advisory_note_en
						? { vi: row.advisory_note_vi, en: row.advisory_note_en }
						: null,
				reviewStatus: row.review_status,
				reference: {
					documentCode: row.document_code,
					title: { vi: row.ref_title_vi, en: row.ref_title_en },
					issuingAuthority: {
						vi: row.issuing_authority_vi,
						en: row.issuing_authority_en,
					},
					issuedOn: row.issued_on,
					effectiveFrom: row.effective_from,
					effectiveTo: row.effective_to,
					officialUrl: safeUrl,
					status: row.ref_status,
				},
			});
		}

		for (const sector of sectorIds) {
			if (grouped[sector].length === 0) {
				grouped[sector] = [...defaultLegalChecklistBySector[sector]];
			}
		}

		return grouped;
	} catch {
		return cloneDefaults();
	}
}

export async function seedDefaultLegalReadiness() {
	const sql = databasePool();
	return sql.begin(async (tx) => {
		const refIdByCode = new Map<string, string>();
		for (const ref of canonicalLegalReferences) {
			const [saved] = await tx<{ legal_reference_id: string }[]>`
        insert into market_entry.legal_references (
          document_code, title_vi, title_en, issuing_authority_vi, issuing_authority_en,
          issued_on, effective_from, effective_to, official_url, status
        )
        values (
          ${ref.documentCode}, ${ref.title.vi}, ${ref.title.en},
          ${ref.issuingAuthority.vi}, ${ref.issuingAuthority.en},
          ${ref.issuedOn}::date, ${ref.effectiveFrom}::date, ${ref.effectiveTo}::date,
          ${ref.officialUrl}, ${ref.status}
        )
        on conflict (document_code) do update set
          title_vi = excluded.title_vi,
          title_en = excluded.title_en,
          issuing_authority_vi = excluded.issuing_authority_vi,
          issuing_authority_en = excluded.issuing_authority_en,
          effective_from = excluded.effective_from,
          effective_to = excluded.effective_to,
          official_url = excluded.official_url,
          status = excluded.status
        returning legal_reference_id
      `;
			if (saved) refIdByCode.set(ref.documentCode, saved.legal_reference_id);
		}

		let requirementCount = 0;
		for (const sector of sectorIds) {
			for (const item of defaultLegalChecklistBySector[sector]) {
				const legalReferenceId = refIdByCode.get(item.reference.documentCode);
				if (!legalReferenceId) continue;
				await tx`
          insert into market_entry.entry_requirements (
            code, legal_reference_id, sector, geo_id, investor_type, channel,
            display_order, title_vi, title_en, checklist_item_vi, checklist_item_en,
            review_status, advisory_note_vi, advisory_note_en
          )
          values (
            ${item.code}, ${legalReferenceId}, ${item.sector}, ${item.geoId},
            ${item.investorType}, ${item.channel}, ${item.displayOrder},
            ${item.title.vi}, ${item.title.en},
            ${item.checklistItem.vi}, ${item.checklistItem.en},
            ${item.reviewStatus},
            ${item.advisoryNote?.vi ?? null}, ${item.advisoryNote?.en ?? null}
          )
          on conflict (code) do update set
            legal_reference_id = excluded.legal_reference_id,
            sector = excluded.sector,
            channel = excluded.channel,
            display_order = excluded.display_order,
            title_vi = excluded.title_vi,
            title_en = excluded.title_en,
            checklist_item_vi = excluded.checklist_item_vi,
            checklist_item_en = excluded.checklist_item_en,
            review_status = excluded.review_status,
            advisory_note_vi = excluded.advisory_note_vi,
            advisory_note_en = excluded.advisory_note_en
        `;
				requirementCount += 1;
			}
		}

		return {
			references: refIdByCode.size,
			requirements: requirementCount,
		};
	});
}
