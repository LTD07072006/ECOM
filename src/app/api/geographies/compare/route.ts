import { error, json } from "../../../../lib/http";
import { loadPublicCatalog } from "../../../../features/geography/catalog";
import { compareProfiles, getProfile } from "../../../../features/geography/domain";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const rawIds = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = rawIds.split(",").map((id) => id.trim()).filter(Boolean);
  if (ids.length < 2 || ids.length > 3) return error("Select between two and three places to compare.", 400);
  if (new Set(ids).size !== ids.length) return error("A place can only appear once in a comparison.", 400);
  if (ids.some((id) => !uuidPattern.test(id))) return error("Comparison IDs must be valid geography IDs.", 400);

  const catalog = await loadPublicCatalog();
  if (catalog.mode === "unavailable") return error("The geography catalog is temporarily unavailable.", 503);
  const profiles = ids.map((id) => getProfile(catalog, id));
  if (profiles.some((profile) => !profile)) return error("One or more geography units were not found.", 404);

  const resolvedProfiles = profiles.filter((profile): profile is NonNullable<typeof profile> => profile !== null);
  return json({
    data: {
      profiles: resolvedProfiles,
      comparison: compareProfiles(resolvedProfiles),
    },
    meta: { dataStatus: catalog.mode },
  });
}
