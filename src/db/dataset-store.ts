import type postgres from "postgres";
import type { DatasetInput } from "./release-data";
import { safeSourceUrl } from "../lib/source-url";

export async function registerDataset(tx: postgres.TransactionSql, dataset: DatasetInput) {
  const source = dataset.source;
  if (!safeSourceUrl(source.url)) throw new Error("Dataset source must be a valid HTTPS URL without credentials.");
  await tx`
    insert into market_entry.source_registry
      (source_id, publisher, title, url, source_type, license, access_right, citation_text, verified_at)
    values (${source.id}, ${source.publisher}, ${source.title}, ${source.url}, ${source.type},
      ${source.license}, 'public', ${source.citation}, ${dataset.reviewedOn}::date::timestamptz)
    on conflict (source_id) do nothing
  `;
  const [registered] = await tx<{ matches: boolean }[]>`
    select url = ${source.url} and license = ${source.license} and publisher = ${source.publisher}
      and title = ${source.title} and citation_text = ${source.citation} and source_type = ${source.type}
      and access_right = 'public' and status = 'active' as matches
    from market_entry.source_registry where source_id = ${source.id}
  `;
  if (!registered.matches) {
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
  const [version] = await tx<{ dataset_version_id: string; matches: boolean; publication_status: string }[]>`
    select dataset_version_id, publication_status, checksum = ${dataset.sha256} and owner_name = ${dataset.owner}
      and data_as_of = ${dataset.dataAsOf}::date and reviewed_at = ${dataset.reviewedOn}::date::timestamptz
      and review_due_at = (${dataset.reviewedOn}::date + ${dataset.reviewIntervalDays}::int)::timestamptz as matches
    from market_entry.dataset_versions
    where source_id = ${source.id} and dataset_code = ${dataset.datasetCode} and version_label = ${dataset.version}
  `;
  if (!version.matches || !["validated", "published"].includes(version.publication_status)) {
    throw new Error(`Immutable dataset conflict for ${dataset.datasetCode} ${dataset.version}`);
  }
  return { id: version.dataset_version_id, published: version.publication_status === "published" };
}
