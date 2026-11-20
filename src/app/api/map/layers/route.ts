import { loadMapLayers } from "../../../../features/map/layer-repository";
import { error, json } from "../../../../lib/http";
import { boundedQuery, observeApi, reportUnavailable } from "../../../../lib/api-operations";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return observeApi("layers", () => layers(request));
}

async function layers(request: Request) {
  if (!boundedQuery(request)) return error("Invalid layer parameters.", 400);
  try {
    return json({ data: await loadMapLayers() });
  } catch {
    reportUnavailable("layers");
    return error("Map layers are temporarily unavailable.", 503);
  }
}
