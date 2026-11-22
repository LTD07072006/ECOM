import { createHash } from "node:crypto";
import type postgres from "postgres";

export async function lockReleases(tx: postgres.TransactionSql) {
	await tx`select pg_advisory_xact_lock(hashtext('market_entry:official_release'))`;
}

export function assertLocalPublish(publish: boolean) {
	if (
		publish &&
		(process.env.NODE_ENV === "production" ||
			process.env.REQUIRE_RELEASE_APPROVAL === "1")
	) {
		throw new Error(
			"Stage the manifest and use the release dashboard for approval and publication.",
		);
	}
}

export async function recordImport(
	tx: postgres.TransactionSql,
	kind: "foundation" | "wave2",
	geographyCode: string,
	manifest: object,
	datasetIds: string[],
) {
	const fingerprint = createHash("sha256")
		.update(JSON.stringify(manifest))
		.digest("hex");
	const [existing] = await tx<{ batch_id: string }[]>`
    select batch_id from market_entry.release_batches where fingerprint = ${fingerprint}
  `;
	if (existing) return existing.batch_id;

	const [state] = await tx<{ statuses: string[]; already_staged: boolean }[]>`
    select array_agg(distinct dataset.publication_status) as statuses,
      bool_or(exists (select 1 from market_entry.release_members member
        where member.dataset_version_id = dataset.dataset_version_id)) as already_staged
    from market_entry.dataset_versions dataset
    where dataset.dataset_version_id = any(${datasetIds}::uuid[])
  `;
	if (
		state.statuses.length !== 1 ||
		!["validated", "published"].includes(state.statuses[0]) ||
		state.already_staged
	) {
		throw new Error(
			"A batch requires a consistent set of new immutable dataset versions or an existing exact manifest.",
		);
	}

	const [batch] = await tx<{ batch_id: string }[]>`
    insert into market_entry.release_batches (kind, geography_code, fingerprint)
    values (${kind}, ${geographyCode}, ${fingerprint}) returning batch_id
  `;
	await tx`
    insert into market_entry.release_members (batch_id, dataset_version_id)
    select ${batch.batch_id}::uuid, unnest(${datasetIds}::uuid[])
  `;
	await tx`
    insert into market_entry.release_audit (batch_id, action, actor, happened_at, note)
    values (${batch.batch_id}, 'import', 'import-cli', clock_timestamp(),
      ${state.statuses[0] === "published" ? "Registered an existing publication. No review recorded." : "Validated manifest staged."})
  `;
	return batch.batch_id;
}

export async function auditLocalPublish(
	tx: postgres.TransactionSql,
	batchId: string,
) {
	await tx`
    insert into market_entry.release_audit (batch_id, action, actor, happened_at)
    values (${batchId}, 'local_publish', 'import-cli', clock_timestamp()) on conflict (batch_id, action) do nothing
  `;
}
