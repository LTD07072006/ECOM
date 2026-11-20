import { loadProvinceMap } from "../../../../features/geography/database-repository";
import { error, json } from "../../../../lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { dataset, ...features } = await loadProvinceMap();
    return json({ data: features, meta: { dataset } });
  } catch {
    return error("Province boundaries are temporarily unavailable.", 503);
  }
}
