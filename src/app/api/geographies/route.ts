import { z } from "zod";
import { error, json } from "../../../lib/http";
import { searchGeographies } from "../../../features/geography/domain";
import { loadPublicCatalog } from "../../../features/geography/catalog";
import { boundedQuery, observeApi } from "../../../lib/api-operations";

const querySchema = z.object({
  q: z.string().trim().min(2, "Search query must be at least 2 characters.").max(120),
  level: z.enum(["country", "province", "commune"]).optional(),
});

export function GET(request: Request) {
  return observeApi("search", request, () => search(request));
}

async function search(request: Request) {
  const params = boundedQuery(request, "q", "level");
  if (!params) return error("Invalid search parameters.", 400);
  const parsed = querySchema.safeParse({ q: params.get("q") ?? "", level: params.get("level") ?? undefined });
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid search query.", 400);

  const catalog = await loadPublicCatalog(undefined, false);
  if (catalog.mode === "unavailable") return error("The geography catalog is temporarily unavailable.", 503);
  return json({
    data: searchGeographies(catalog, parsed.data.q, parsed.data.level),
    meta: { query: parsed.data.q.toLowerCase(), level: parsed.data.level ?? null, dataStatus: catalog.mode, dataset: catalog.dataset ?? null },
  });
}
