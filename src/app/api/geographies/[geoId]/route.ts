import { error, json } from "../../../../lib/http";
import { getProfile } from "../../../../features/geography/domain";
import { loadPublicCatalog } from "../../../../features/geography/catalog";
import { boundedQuery, observeApi, uuidPattern } from "../../../../lib/api-operations";

export function GET(request: Request, context: { params: Promise<{ geoId: string }> }) {
  return observeApi("profile", async () => profile(request, (await context.params).geoId));
}

async function profile(request: Request, geoId: string) {
  if (!boundedQuery(request)) return error("Invalid profile parameters.", 400);
  if (!uuidPattern.test(geoId)) return error("Geography unit not found.", 404);
  const catalog = await loadPublicCatalog();
  if (catalog.mode === "unavailable") return error("The geography catalog is temporarily unavailable.", 503);
  const found = getProfile(catalog, geoId.toLowerCase());
  if (!found) return error("Geography unit not found.", 404);
  return json({ data: found, meta: { dataStatus: catalog.mode } });
}
