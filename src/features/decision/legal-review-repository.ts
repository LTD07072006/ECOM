import { databasePool } from "../../db/pool";

export type LegalReviewRecords = {
	references: Array<Record<string, unknown>>;
	requirements: Array<Record<string, unknown>>;
};

export async function listLegalReviewRecords(): Promise<LegalReviewRecords> {
	const sql = databasePool();
	const [references, requirements] = await Promise.all([
		sql<Record<string, unknown>[]>`
      select legal_reference_id as id, document_code as code, title_en as title,
        status, reviewed_by as "reviewedBy", review_due_at::text as "reviewDueAt", reviewed_at::text as "reviewedAt"
      from market_entry.legal_references order by status, document_code
    `,
		sql<Record<string, unknown>[]>`
      select requirement_id as id, code, sector, review_status as status,
        reviewed_by as "reviewedBy", review_due_at::text as "reviewDueAt"
      from market_entry.entry_requirements order by review_status, code
    `,
	]);
	return { references, requirements };
}

export async function reviewLegalRecord(input: {
	entity: "reference" | "requirement";
	id: string;
	status: string;
	note: string;
	actor: string;
	reviewDueAt?: string;
}): Promise<Record<string, unknown> | null> {
	const sql = databasePool();
	return sql.begin(async (tx) => {
		let current: { status: string } | undefined;
		if (input.entity === "reference") {
			const [reference] = await tx<{ status: string }[]>`
        select status from market_entry.legal_references
        where legal_reference_id = ${input.id}::uuid
        for update
      `;
			current = reference;
		} else {
			const [requirement] = await tx<{ status: string }[]>`
        select review_status as status from market_entry.entry_requirements
        where requirement_id = ${input.id}::uuid
        for update
      `;
			current = requirement;
		}
		if (!current) return null;
		let row: Record<string, unknown> | undefined;
		if (input.entity === "reference") {
			const [reference] = await tx<Record<string, unknown>[]>`
        update market_entry.legal_references
        set status = ${input.status}, reviewed_by = ${input.actor}, reviewed_at = now(), review_due_at = ${input.reviewDueAt ?? null}::date
        where legal_reference_id = ${input.id}::uuid
        returning legal_reference_id as id, status
      `;
			row = reference;
		} else {
			const [requirement] = await tx<Record<string, unknown>[]>`
        update market_entry.entry_requirements
        set review_status = ${input.status}, reviewed_by = ${input.actor}, review_due_at = ${input.reviewDueAt ?? null}::date
        where requirement_id = ${input.id}::uuid
        returning requirement_id as id, review_status as status
      `;
			row = requirement;
		}
		if (!row) return null;
		await tx`
      insert into market_entry.legal_readiness_audit
        (entity_type, entity_id, actor, action, from_status, to_status, note)
      values (${input.entity}, ${input.id}::uuid, ${input.actor}, 'reviewed', ${current.status}, ${input.status}, ${input.note})
    `;
		return row;
	});
}
