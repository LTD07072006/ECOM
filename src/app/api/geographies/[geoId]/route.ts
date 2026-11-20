import { error, json } from "../../../../lib/http";
import { getProfile } from "../../../../features/geography/domain";
import { loadPublicCatalog } from "../../../../features/geography/catalog";

export async function GET(_request: Request, context: { params: Promise<{ geoId: string }> }) {
  const { geoId } = await context.params;
  const catalog = await loadPublicCatalog();
  if (catalog.mode === "unavailable") return error("The geography catalog is temporarily unavailable.", 503);
  const profile = getProfile(catalog, geoId);
  if (!profile) return error("Geography unit not found.", 404);
  return json({ data: profile, meta: { dataStatus: catalog.mode } });
}
