import { z } from "zod";
import { error, json } from "../../../lib/http";
import { searchGeographies } from "../../../features/geography/domain";
import { loadPublicCatalog } from "../../../features/geography/catalog";

const querySchema = z.object({
  q: z.string().trim().min(2, "Search query must be at least 2 characters."),
  level: z.enum(["country", "province", "commune"]).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ q: url.searchParams.get("q") ?? "", level: url.searchParams.get("level") ?? undefined });
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid search query.", 400);

  const catalog = await loadPublicCatalog();
  if (catalog.mode === "unavailable") return error("The geography catalog is temporarily unavailable.", 503);
  return json({
    data: searchGeographies(catalog, parsed.data.q, parsed.data.level),
    meta: { query: parsed.data.q.toLowerCase(), level: parsed.data.level ?? null, dataStatus: catalog.mode, dataset: catalog.dataset ?? null },
  });
}
