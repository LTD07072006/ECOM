import { error, json } from "../../../../lib/http";
import { loadPublicCatalog } from "../../../../features/geography/catalog";
import { compareProfiles, getProfile } from "../../../../features/geography/domain";
import { boundedQuery, observeApi, uuidPattern } from "../../../../lib/api-operations";

export function GET(request: Request) {
  return observeApi("compare", () => compare(request));
}

async function compare(request: Request) {
  const params = boundedQuery(request, "ids");
  if (!params) return error("Invalid comparison parameters.", 400);
  const ids = (params.get("ids") ?? "").split(",").map((id) => id.trim().toLowerCase());
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
