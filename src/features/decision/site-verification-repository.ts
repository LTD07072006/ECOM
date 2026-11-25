import { databasePool } from "../../db/pool";
import {
	transitionVerificationStatus,
	type VerificationAction,
	type VerificationStatus,
} from "./site-verification";

export type VerificationEvidenceRecord = {
	evidenceId: string;
	parkId: string;
	field: string;
	value: unknown;
	sourceUrl: string;
	verifiedOn: string;
	expiresOn: string | null;
	status: VerificationStatus;
	reviewer: string | null;
	reviewNote: string | null;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
};

type EvidenceRow = Omit<VerificationEvidenceRecord, "value"> & {
	value: unknown;
};

export async function listVerificationEvidence(): Promise<
	VerificationEvidenceRecord[]
> {
	const rows = await databasePool()<EvidenceRow[]>`
    select evidence_id as "evidenceId", park_id as "parkId", field, value,
      source_url as "sourceUrl", verified_on::text as "verifiedOn", expires_on::text as "expiresOn",
      case when expires_on is not null and expires_on < current_date then 'expired' else status end as status,
      reviewer, review_note as "reviewNote", created_by as "createdBy",
      created_at::text as "createdAt", updated_at::text as "updatedAt"
    from market_entry.site_verification_evidence
    order by status, park_id, field
  `;
	return rows;
}

export async function createVerificationEvidenceRecord(input: {
	parkId: string;
	field: string;
	value: unknown;
	sourceUrl: string;
	verifiedOn: string;
	expiresOn?: string;
	actor: string;
}): Promise<{ evidenceId: string; status: VerificationStatus }> {
	const sql = databasePool();
	return sql.begin(async (tx) => {
		const [row] = await tx<{ evidenceId: string }[]>`
      insert into market_entry.site_verification_evidence
        (park_id, field, value, source_url, verified_on, expires_on, status, created_by)
			values (${input.parkId}, ${input.field}, ${JSON.stringify(input.value ?? null)}, ${input.sourceUrl}, ${input.verifiedOn}::date,
        ${input.expiresOn ?? null}::date, 'pending_review', ${input.actor})
      on conflict (park_id, field) do update set
        value = excluded.value, source_url = excluded.source_url, verified_on = excluded.verified_on,
        expires_on = excluded.expires_on, status = 'pending_review', reviewer = null,
        review_note = null, reviewed_at = null, updated_at = now()
      returning evidence_id as "evidenceId"
    `;
		if (!row) throw new Error("Unable to store verification evidence");
		await tx`
      insert into market_entry.site_verification_audit
        (evidence_id, actor, action, to_status, note)
      values (${row.evidenceId}, ${input.actor}, 'created', 'pending_review', 'Evidence submitted for review.')
    `;
		return { evidenceId: row.evidenceId, status: "pending_review" };
	});
}

export async function reviewVerificationEvidence(input: {
	evidenceId: string;
	action: VerificationAction;
	note: string;
	actor: string;
}): Promise<{ evidenceId: string; status: VerificationStatus } | null> {
	const sql = databasePool();
	return sql.begin(async (tx) => {
		const [current] = await tx<{ status: VerificationStatus }[]>`
      select status from market_entry.site_verification_evidence where evidence_id = ${input.evidenceId}::uuid for update
    `;
		if (!current) return null;
		const next = transitionVerificationStatus(current.status, input.action);
		if (next === current.status) return null;
		const auditAction =
			input.action === "approve"
				? "approved"
				: input.action === "reject"
					? "rejected"
					: "revalidated";
		await tx`
      update market_entry.site_verification_evidence
      set status = ${next}, reviewer = ${input.actor}, review_note = ${input.note}, reviewed_at = now(), updated_at = now()
      where evidence_id = ${input.evidenceId}::uuid
    `;
		await tx`
      insert into market_entry.site_verification_audit
        (evidence_id, actor, action, from_status, to_status, note)
      values (${input.evidenceId}::uuid, ${input.actor}, ${auditAction}, ${current.status}, ${next}, ${input.note})
    `;
		return { evidenceId: input.evidenceId, status: next };
	});
}
