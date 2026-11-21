import { loadProvinceMap } from "../../../../features/geography/database-repository";
import { error, json } from "../../../../lib/http";
import { boundedQuery, observeApi, reportUnavailable } from "../../../../lib/api-operations";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return observeApi("boundaries", request, () => provinces(request));
}

async function provinces(request: Request) {
  if (!boundedQuery(request)) return error("Invalid map parameters.", 400);
  try {
    const { dataset, ...features } = await loadProvinceMap();
    if (!dataset || !features.features.length) reportUnavailable("boundaries");
    return json({ data: features, meta: { dataset } });
  } catch {
    reportUnavailable("boundaries");
    return error("Province boundaries are temporarily unavailable.", 503);
  }
}
