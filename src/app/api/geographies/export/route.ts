import { csvDownload, error, json } from "../../../../lib/http";
import { loadPublicCatalog } from "../../../../features/geography/catalog";
import { getProfile } from "../../../../features/geography/domain";
import { profilesToCsv } from "../../../../features/shortlist/export";
import { boundedQuery, observeApi, uuidPattern } from "../../../../lib/api-operations";

export function GET(request: Request) {
  return observeApi("export", request, () => exportProfiles(request));
}

async function exportProfiles(request: Request) {
  const params = boundedQuery(request, "ids", "format");
  if (!params) return error("Invalid export parameters.", 400);
  const ids = (params.get("ids") ?? "").split(",").map((id) => id.trim().toLowerCase());
  const format = params.get("format") ?? "";
  if (!ids[0] || ids.length > 20 || new Set(ids).size !== ids.length) return error("Provide one to twenty unique geography IDs.", 400);
  if (ids.some((id) => !uuidPattern.test(id))) return error("Export IDs must be valid geography IDs.", 400);
  if (format !== "json" && format !== "csv") return error("Export format must be json or csv.", 400);

  const catalog = await loadPublicCatalog(ids);
  if (catalog.mode === "unavailable") return error("The geography catalog is temporarily unavailable.", 503);
  const profiles = ids.map((id) => getProfile(catalog, id));
  if (profiles.some((profile) => !profile)) return error("One or more geography units were not found.", 404);
  const resolvedProfiles = profiles.filter((profile): profile is NonNullable<typeof profile> => profile !== null);
  const exportedAt = new Date().toISOString();
  const filename = `vietnam-market-context-${exportedAt.slice(0, 10)}.${format}`;
  const headers = { "Content-Disposition": `attachment; filename="${filename}"` };

  if (format === "csv") {
    return csvDownload(profilesToCsv(resolvedProfiles), filename);
  }

  return json({
    data: resolvedProfiles,
    meta: {
      exportedAt,
      dataStatus: catalog.mode,
      limitations: "Context only. Export contains no demand, profitability, ROI, eligibility, or investment ranking.",
    },
  }, { headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
}
