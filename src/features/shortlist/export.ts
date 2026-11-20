import type { Profile } from "../geography/types";

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  const safe = typeof value === "string" && /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function profilesToCsv(profiles: Profile[]): string {
  const header = ["geo_id", "display_name", "level", "geography_version", "dataset_version", "indicator", "label", "value", "unit", "period", "period_start", "period_end", "quality", "missing_reason", "publisher", "citation", "license", "access", "updated_at", "method", "limitations"];
  const rows = profiles.flatMap((profile) => profile.observations.map((observation) => [
    profile.id,
    profile.displayName,
    profile.level,
    profile.geographyVersion,
    observation.datasetVersion,
    observation.indicator,
    observation.label,
    observation.value,
    observation.unit,
    observation.period,
    observation.periodStart,
    observation.periodEnd,
    observation.quality,
    observation.missingReason,
    observation.source.publisher,
    observation.source.citation,
    observation.source.license,
    observation.source.access,
    observation.source.updatedAt,
    observation.method,
    observation.limitations,
  ].map(csvCell).join(",")));
  return [header.map(csvCell).join(","), ...rows].join("\n");
}
