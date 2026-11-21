import { error, json } from "../../../lib/http";
import { loadPublicCatalog } from "../../../features/geography/catalog";
import { boundedQuery, observeApi } from "../../../lib/api-operations";

export function GET(request: Request) {
  return observeApi("health", request, () => health(request));
}

async function health(request: Request) {
  if (!boundedQuery(request)) return error("Invalid health parameters.", 400);
  const catalog = await loadPublicCatalog([], false);
  const ready = catalog.mode === "database";
  return json({
    status: ready && catalog.publicationStatus === "published" ? "ok" : "degraded",
    database: ready ? "ready" : "unavailable",
    mode: catalog.mode,
    publicationStatus: catalog.publicationStatus,
  });
}
