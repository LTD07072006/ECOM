import type postgres from "postgres";
import type { DatasetInput } from "./release-data";

export async function registerDataset(tx: postgres.TransactionSql, dataset: DatasetInput) {
  const source = dataset.source;
  await tx`
    insert into market_entry.source_registry
      (source_id, publisher, title, url, source_type, license, access_right, citation_text, verified_at)
    values (${source.id}, ${source.publisher}, ${source.title}, ${source.url}, ${source.type},
      ${source.license}, 'public', ${source.citation}, ${dataset.reviewedOn}::date::timestamptz)
    on conflict (source_id) do nothing
  `;
  const [registered] = await tx<{ url: string; license: string; access_right: string; status: string }[]>`
    select url, license, access_right, status from market_entry.source_registry where source_id = ${source.id}
  `;
  if (registered.url !== source.url || registered.license !== source.license
    || registered.access_right !== "public" || registered.status !== "active") {
    throw new Error(`Registered source ${source.id} does not match the release or is not public and active`);
  }
  await tx`
    insert into market_entry.dataset_versions
      (source_id, dataset_code, version_label, checksum, owner_name, data_as_of, reviewed_at, review_due_at, publication_status)
    values (${source.id}, ${dataset.datasetCode}, ${dataset.version}, ${dataset.sha256}, ${dataset.owner}, ${dataset.dataAsOf},
      ${dataset.reviewedOn}::date::timestamptz,
      (${dataset.reviewedOn}::date + ${dataset.reviewIntervalDays}::int)::timestamptz, 'validated')
    on conflict (source_id, dataset_code, version_label) do nothing
  `;
  const [version] = await tx<{ dataset_version_id: string; checksum: string; publication_status: string }[]>`
    select dataset_version_id, checksum, publication_status from market_entry.dataset_versions
    where source_id = ${source.id} and dataset_code = ${dataset.datasetCode} and version_label = ${dataset.version}
  `;
  if (version.checksum !== dataset.sha256 || !["validated", "published"].includes(version.publication_status)) {
    throw new Error(`Immutable dataset conflict for ${dataset.datasetCode} ${dataset.version}`);
  }
  return version.dataset_version_id;
}
