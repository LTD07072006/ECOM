import type { Profile } from "../geography/types";
import { spreadsheetCsvCell } from "../../lib/csv";

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
  ].map((value) => spreadsheetCsvCell(value, true)).join(",")));
  return [header.map((value) => spreadsheetCsvCell(value, true)).join(","), ...rows].join("\n");
}
