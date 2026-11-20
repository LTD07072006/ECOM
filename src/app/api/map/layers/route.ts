import { loadMapLayers } from "../../../../features/map/layer-repository";
import { error, json } from "../../../../lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json({ data: await loadMapLayers() });
  } catch {
    return error("Map layers are temporarily unavailable.", 503);
  }
}
