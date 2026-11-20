import { json } from "../../../lib/http";
import { loadPublicCatalog } from "../../../features/geography/catalog";

export async function GET() {
  const catalog = await loadPublicCatalog();
  const ready = catalog.mode === "database";
  return json({
    status: ready ? "ok" : "degraded",
    database: ready ? "ready" : "unavailable",
    mode: catalog.mode,
    publicationStatus: catalog.publicationStatus,
  });
}
